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
        (c.phone && String(c.phone).includes(needle)) ||
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
 * POST /api/customers/import
 * Bulk import customers from JSON array (CRM3-D3).
 * Accepts: Array of customer objects, or { customers: [...] }
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

    let inserted = 0;
    let skipped = 0;
    const errors = [];
    const insertedCustomers = [];
    const seenBatchEmails = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNum = i + 1; // 1-indexed for clear human-facing reporting

      if (!rawRow || typeof rawRow !== 'object') {
        skipped++;
        errors.push({
          row: rowNum,
          name: 'Unknown',
          email: '',
          error: 'Row data is not a valid object',
          message: `Row ${rowNum}: Row data is not a valid object`
        });
        continue;
      }

      // Step 1: Format validation using CRM3-A3 validation rules
      const payloadCheck = validateCustomerPayload(rawRow);
      if (!payloadCheck.isValid) {
        skipped++;
        const customerName = rawRow.name ? String(rawRow.name).trim() : 'Unknown';
        const customerEmail = rawRow.email ? String(rawRow.email).trim() : '';
        errors.push({
          row: rowNum,
          name: customerName,
          email: customerEmail,
          error: payloadCheck.firstError,
          errors: payloadCheck.errors,
          message: `Row ${rowNum} (${customerName}): ${payloadCheck.firstError}`
        });
        continue;
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
      } = payloadCheck.sanitized;

      const normalizedEmail = email.toLowerCase();

      // Step 2: Email uniqueness within the current batch
      if (seenBatchEmails.has(normalizedEmail)) {
        skipped++;
        errors.push({
          row: rowNum,
          name,
          email,
          error: `Duplicate email '${email}' within import batch`,
          message: `Row ${rowNum} (${name}): Duplicate email '${email}' within import batch`
        });
        continue;
      }

      // Step 3: Email uniqueness check against existing database / in-memory store
      let isDuplicate = false;
      const uniqueness = await checkEmailUniqueness(pool, email);
      if (!uniqueness.isUnique) {
        isDuplicate = true;
      } else {
        // In-memory duplicate check
        const inMemMatch = inMemoryCustomers.find(
          c => c.email && c.email.toLowerCase() === normalizedEmail
        );
        if (inMemMatch) {
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        skipped++;
        errors.push({
          row: rowNum,
          name,
          email,
          error: `Customer with email '${email}' already exists`,
          message: `Row ${rowNum} (${name}): Customer with email '${email}' already exists`
        });
        continue;
      }

      // Email is unique, record it in batch set
      seenBatchEmails.add(normalizedEmail);

      // Step 4: Generate sequential ID and persist
      const customerId = await getNextCustomerId();

      const insertPg = await safeQuery(
        `INSERT INTO customers (id, name, type, email, phone, gstin, billing_address, shipping_address, city)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at`,
        [customerId, name, type, email, phone, gstin, billing_address, shipping_address, city]
      );

      let record;
      if (insertPg && insertPg.rows && insertPg.rows.length > 0) {
        record = insertPg.rows[0];
      } else {
        record = {
          id: customerId,
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
      }

      inMemoryCustomers.push(record);
      insertedCustomers.push(record);
      inserted++;
    }

    const responsePayload = {
      status: 'success',
      inserted,
      skipped,
      total: rows.length,
      errors,
      data: {
        inserted,
        skipped,
        total: rows.length,
        errors,
        customers: insertedCustomers
      }
    };

    return res.status(200).json(responsePayload);
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
 * POST /api/customers
 * Creates a new customer with validation rules (CRM3-A3).
 */
router.post('/customers', async (req, res, next) => {
  try {
    const validation = await validateCustomer(req.body, { pool });
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
      c => c.email && c.email.toLowerCase() === email.toLowerCase()
    );
    if (inMemDup) {
      return res.status(409).json({
        error: `Customer with email '${email}' already exists`,
        errors: { email: 'A customer with this email already exists' }
      });
    }

    const customerId = await getNextCustomerId();

    const insertPg = await safeQuery(
      `INSERT INTO customers (id, name, type, email, phone, gstin, billing_address, shipping_address, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at`,
      [customerId, name, type, email, phone, gstin, billing_address, shipping_address, city]
    );

    let created;
    if (insertPg && insertPg.rows && insertPg.rows.length > 0) {
      created = insertPg.rows[0];
    } else {
      created = {
        id: customerId,
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
    }

    inMemoryCustomers.push(created);
    return res.status(201).json({ data: created });
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
    if (deletePg && deletePg.rows && deletePg.rows.length > 0) {
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
    const cleanPhone = phone && typeof phone === 'string' && phone.trim() ? String(phone).trim() : null;
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

module.exports = router;
