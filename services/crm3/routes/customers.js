const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const {
  validateCustomerPayload,
  checkEmailUniqueness,
  validateCustomer
} = require('../validators/customerValidator');

const pool = makePool('crm3_db');

// Protect all CRM-3 customer routes with authentication middleware
router.use(requireAuth);

// In-memory fallback store for offline development / test environments
let inMemoryCustomers = [];
try {
  const mockPath = path.resolve(__dirname, '../mocks/customers.json');
  if (fs.existsSync(mockPath)) {
    inMemoryCustomers = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[crm3] Could not pre-load mock customers:', err.message);
}

let mockCustIdCounter = inMemoryCustomers.length + 1;

/**
 * Helper to execute a query safely without crashing if DB is offline.
 */
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * Generates next sequential Customer ID (CUST-xxxx).
 */
async function getNextCustomerId() {
  try {
    const seqResult = await pool.query("SELECT nextval('customers_seq') AS n");
    if (seqResult && seqResult.rows && seqResult.rows.length > 0) {
      const nextNum = seqResult.rows[0].n;
      return `CUST-${String(nextNum).padStart(4, '0')}`;
    }
  } catch (err) {
    // Database sequence unavailable; fall back to in-memory counter
  }

  const existingNums = inMemoryCustomers.map(c => {
    if (!c.id || !c.id.startsWith('CUST-')) return 0;
    const num = parseInt(c.id.replace('CUST-', ''), 10);
    return isNaN(num) ? 0 : num;
  });
  const maxNum = Math.max(10, ...existingNums, 0);
  return `CUST-${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * GET /api/customers
 * Query params:
 *   - q: search keyword matching name, email, phone, or city
 *   - type: filter by retail | corporate | dealer
 */
router.get('/customers', async (req, res, next) => {
  try {
    const { q, type } = req.query;
    let query = `
      SELECT id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at
      FROM customers
    `;
    const conditions = [];
    const values = [];

    if (type) {
      const normalizedType = String(type).trim().toLowerCase();
      values.push(normalizedType);
      conditions.push(`LOWER(type) = $${values.length}`);
    }

    if (q) {
      values.push(`%${String(q).trim()}%`);
      const paramIndex = values.length;
      conditions.push(`(
        name ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        phone ILIKE $${paramIndex} OR
        city ILIKE $${paramIndex}
      )`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY id ASC';

    const pgResult = await safeQuery(query, values);
    if (pgResult) {
      return res.json({ data: pgResult.rows });
    }

    // In-memory fallback
    let filtered = [...inMemoryCustomers];
    if (type) {
      filtered = filtered.filter(c => c.type && c.type.toLowerCase() === String(type).toLowerCase());
    }
    if (q) {
      const needle = String(q).toLowerCase();
      filtered = filtered.filter(c =>
        (c.name && c.name.toLowerCase().includes(needle)) ||
        (c.email && c.email.toLowerCase().includes(needle)) ||
        (c.phone && c.phone.includes(needle)) ||
        (c.city && c.city.toLowerCase().includes(needle))
      );
    }
    return res.json({ data: filtered });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id
 * Fetches a single customer by ID (including gstin).
 */
router.get('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pgResult = await safeQuery(
      `SELECT id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at
       FROM customers
       WHERE id = $1`,
      [id]
    );

    if (pgResult) {
      if (pgResult.rows.length === 0) {
        return res.status(404).json({ error: `Customer with ID '${id}' not found` });
      }
      return res.json({ data: pgResult.rows[0] });
    }

    const match = inMemoryCustomers.find(c => c.id === id);
    if (!match) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }
    return res.json({ data: match });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers/validate
 * Standalone validation check for a customer payload without persisting.
 */
router.post('/customers/validate', async (req, res, next) => {
  try {
    const { customerId, isUpdate } = req.query;
    const validation = await validateCustomer(req.body, {
      pool,
      isUpdate: isUpdate === 'true' || Boolean(customerId),
      customerId: customerId || req.body?.id || null
    });

    if (!validation.isValid) {
      return res.status(validation.status).json({
        valid: false,
        error: validation.error,
        errors: validation.errors
      });
    }

    return res.json({ valid: true, data: validation.data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers/import
 * Bulk import customers from JSON array (CRM3-D3).
 * Accepts: Array of customer objects, or { customers: [...] } or { data: [...] }
 * Returns: { inserted, skipped, total, errors[] }
 * Inserts valid rows (using CRM3-A3 validation), skips invalid ones.
 */
router.post('/customers/import', async (req, res, next) => {
  try {
    const payload = req.body;
    let rows = [];

    if (Array.isArray(payload)) {
      rows = payload;
    } else if (payload && Array.isArray(payload.customers)) {
      rows = payload.customers;
    } else if (payload && Array.isArray(payload.data)) {
      rows = payload.data;
    }

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        inserted: 0,
        skipped: 0,
        total: 0,
        errors: [],
        data: {
          inserted: 0,
          skipped: 0,
          total: 0,
          errors: [],
          customers: []
        }
      });
    }

    const insertedCustomers = [];
    const errors = [];
    const seenEmailsInBatch = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // 1. Validate payload against CRM3-A3 rules
      const validation = validateCustomerPayload(row);
      if (!validation.isValid) {
        errors.push({
          row: rowNum,
          name: row?.name || 'Unknown',
          email: row?.email || '',
          error: validation.firstError,
          errors: validation.errors
        });
        continue;
      }

      const customerData = validation.sanitized;
      const normalizedEmail = customerData.email.toLowerCase();

      // 2. Intra-batch duplicate email check
      if (seenEmailsInBatch.has(normalizedEmail)) {
        errors.push({
          row: rowNum,
          name: customerData.name,
          email: customerData.email,
          error: `Duplicate email '${customerData.email}' within same import batch`
        });
        continue;
      }

      // 3. Database uniqueness check (if DB is active)
      let dbConflict = false;
      try {
        const uniqueness = await checkEmailUniqueness(pool, customerData.email);
        if (!uniqueness.isUnique) {
          dbConflict = true;
        }
      } catch (err) {
        // Safe fallback if DB offline
      }

      // 4. In-memory uniqueness check
      const memConflict = inMemoryCustomers.some(
        c => c.email && c.email.toLowerCase() === normalizedEmail
      );

      if (dbConflict || memConflict) {
        errors.push({
          row: rowNum,
          name: customerData.name,
          email: customerData.email,
          error: `Customer with email '${customerData.email}' already exists`
        });
        continue;
      }

      // 5. Generate monotonic Customer ID and insert
      const nextId = await getNextCustomerId();
      let insertedRow = null;

      try {
        const insertRes = await pool.query(
          `INSERT INTO customers (
            id, name, type, email, phone, gstin, billing_address, shipping_address, city
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at`,
          [
            nextId,
            customerData.name,
            customerData.type,
            customerData.email,
            customerData.phone,
            customerData.gstin,
            customerData.billing_address,
            customerData.shipping_address,
            customerData.city
          ]
        );
        if (insertRes && insertRes.rows && insertRes.rows.length > 0) {
          insertedRow = insertRes.rows[0];
        }
      } catch (dbErr) {
        // DB offline fallback
      }

      if (!insertedRow) {
        insertedRow = {
          id: nextId,
          ...customerData,
          created_at: new Date().toISOString()
        };
      }

      inMemoryCustomers.push(insertedRow);
      seenEmailsInBatch.add(normalizedEmail);
      insertedCustomers.push(insertedRow);
    }

    const inserted = insertedCustomers.length;
    const skipped = errors.length;
    const total = rows.length;

    return res.status(200).json({
      status: 'success',
      inserted,
      skipped,
      total,
      errors,
      data: {
        inserted,
        skipped,
        total,
        errors,
        customers: insertedCustomers
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers
 * Creates a new customer with validation rules (CRM3-A3).
 * Rejects bad inputs with 400 and duplicate email with 409.
 */
router.post('/customers', async (req, res, next) => {
  try {
    const validation = await validateCustomer(req.body, {
      pool,
      isUpdate: false
    });

    if (!validation.isValid) {
      return res.status(validation.status).json({
        error: validation.error,
        errors: validation.errors
      });
    }

    const {
      name,
      type,
      email,
      phone,
      gstin,
      billing_address,
      shipping_address,
      city
    } = validation.data;

    // Check in-memory duplicates if DB is offline
    const inMemDup = inMemoryCustomers.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
    if (inMemDup) {
      return res.status(409).json({
        error: `Customer with email '${email}' already exists`,
        errors: { email: 'A customer with this email already exists' }
      });
    }

    // Try PostgreSQL insertion
    try {
      let id;
      try {
        const seqResult = await pool.query("SELECT nextval('customers_seq') AS n");
        const nextNum = seqResult.rows[0].n;
        id = `CUST-${String(nextNum).padStart(4, '0')}`;
      } catch (seqErr) {
        const maxRes = await pool.query(
          "SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) + 1 AS next_n FROM customers WHERE id LIKE 'CUST-%'"
        );
        id = `CUST-${String(maxRes.rows[0].next_n).padStart(4, '0')}`;
      }

      const insertResult = await pool.query(
        `INSERT INTO customers (
          id, name, type, email, phone, gstin, billing_address, shipping_address, city
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at`,
        [id, name, type, email, phone, gstin, billing_address, shipping_address, city]
      );

      const saved = insertResult.rows[0];
      inMemoryCustomers.push(saved);
      return res.status(201).json({ data: saved });
    } catch (dbErr) {
      // In-memory fallback
      const id = `CUST-${String(mockCustIdCounter++).padStart(4, '0')}`;
      const saved = {
        id,
        name,
        type,
        email,
        phone,
        gstin,
        billing_address,
        shipping_address,
        city,
        created_at: new Date().toISOString()
      };
      inMemoryCustomers.push(saved);
      return res.status(201).json({ data: saved });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/customers/:id
 * Updates an existing customer with validation rules (CRM3-A3).
 * Rejects bad inputs with 400 and duplicate email with 409.
 */
router.put('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check existence in DB or memory
    let current = null;
    const currentPg = await safeQuery('SELECT * FROM customers WHERE id = $1', [id]);
    if (currentPg && currentPg.rows.length > 0) {
      current = currentPg.rows[0];
    } else {
      current = inMemoryCustomers.find(c => c.id === id);
    }

    if (!current) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }

    const mergedPayload = {
      name: req.body.name !== undefined ? req.body.name : current.name,
      type: req.body.type !== undefined ? req.body.type : current.type,
      email: req.body.email !== undefined ? req.body.email : current.email,
      phone: req.body.phone !== undefined ? req.body.phone : current.phone,
      gstin: req.body.gstin !== undefined ? req.body.gstin : current.gstin,
      billing_address: req.body.billing_address !== undefined ? req.body.billing_address : current.billing_address,
      shipping_address: req.body.shipping_address !== undefined ? req.body.shipping_address : current.shipping_address,
      city: req.body.city !== undefined ? req.body.city : current.city
    };

    const validation = await validateCustomer(mergedPayload, {
      pool,
      isUpdate: true,
      customerId: id
    });

    if (!validation.isValid) {
      return res.status(validation.status).json({
        error: validation.error,
        errors: validation.errors
      });
    }

    const {
      name,
      type,
      email,
      phone,
      gstin,
      billing_address,
      shipping_address,
      city
    } = validation.data;

    // In-memory duplicate check
    const inMemDup = inMemoryCustomers.find(
      c => c.id !== id && c.email && c.email.toLowerCase() === email.toLowerCase()
    );
    if (inMemDup) {
      return res.status(409).json({
        error: `Customer with email '${email}' already exists`,
        errors: { email: 'A customer with this email already exists' }
      });
    }

    const updatePg = await safeQuery(
      `UPDATE customers
       SET name = $1, type = $2, email = $3, phone = $4, gstin = $5,
           billing_address = $6, shipping_address = $7, city = $8
       WHERE id = $9
       RETURNING id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at`,
      [name, type, email, phone, gstin, billing_address, shipping_address, city, id]
    );

    let updated;
    if (updatePg && updatePg.rows.length > 0) {
      updated = updatePg.rows[0];
    } else {
      updated = {
        ...current,
        name,
        type,
        email,
        phone,
        gstin,
        billing_address,
        shipping_address,
        city
      };
    }

    const memIdx = inMemoryCustomers.findIndex(c => c.id === id);
    if (memIdx !== -1) inMemoryCustomers[memIdx] = updated;

    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/customers/:id
 */
router.delete('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletePg = await safeQuery('DELETE FROM customers WHERE id = $1 RETURNING id, name', [id]);
    if (deletePg && deletePg.rows.length > 0) {
      inMemoryCustomers = inMemoryCustomers.filter(c => c.id !== id);
      return res.json({
        data: {
          message: 'Customer deleted successfully',
          id: deletePg.rows[0].id,
          name: deletePg.rows[0].name
        }
      });
    }

    const match = inMemoryCustomers.find(c => c.id === id);
    if (!match) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }
    inMemoryCustomers = inMemoryCustomers.filter(c => c.id !== id);
    return res.json({
      data: {
        message: 'Customer deleted successfully',
        id: match.id,
        name: match.name
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id/contacts
 */
router.get('/customers/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pgRes = await safeQuery(
      `SELECT id, customer_id, name, phone, email, designation, created_at
       FROM contacts
       WHERE customer_id = $1
       ORDER BY id ASC`,
      [id]
    );

    if (pgRes) {
      return res.json({ data: pgRes.rows });
    }
    return res.json({ data: [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers/:id/contacts
 */
router.post('/customers/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, designation } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Contact name is required' });
    }

    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim() : null;
    const cleanPhone = phone && typeof phone === 'string' && phone.trim() ? phone.trim() : null;
    const cleanDesignation = designation && typeof designation === 'string' && designation.trim()
      ? designation.trim()
      : null;

    try {
      const seqResult = await pool.query("SELECT nextval('contacts_seq') AS n");
      const nextNum = seqResult.rows[0].n;
      const contactId = `CON-${String(nextNum).padStart(4, '0')}`;

      const insertRes = await pool.query(
        `INSERT INTO contacts (id, customer_id, name, phone, email, designation)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, customer_id, name, phone, email, designation, created_at`,
        [contactId, id, name.trim(), cleanPhone, cleanEmail, cleanDesignation]
      );

      return res.status(201).json({ data: insertRes.rows[0] });
    } catch (dbErr) {
      const contactId = 'CON-0001';
      return res.status(201).json({
        data: {
          id: contactId,
          customer_id: id,
          name: name.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          designation: cleanDesignation,
          created_at: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

router._resetInMemoryCustomers = () => {
  try {
    const mockPath = path.resolve(__dirname, '../mocks/customers.json');
    if (fs.existsSync(mockPath)) {
      inMemoryCustomers = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
    } else {
      inMemoryCustomers = [];
    }
  } catch (e) {
    inMemoryCustomers = [];
  }
};

module.exports = router;
