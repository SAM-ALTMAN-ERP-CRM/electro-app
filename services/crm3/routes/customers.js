const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

// Protect all customer routes with authentication middleware
router.use(requireAuth);

const VALID_CUSTOMER_TYPES = ['retail', 'corporate', 'dealer'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

// In-Memory Fallback Stores
let inMemoryCustomers = [];
try {
  const custMockPath = path.resolve(__dirname, '../mocks/customers.json');
  if (fs.existsSync(custMockPath)) {
    inMemoryCustomers = JSON.parse(fs.readFileSync(custMockPath, 'utf-8'));
  }
} catch (e) {
  console.warn('[crm3] Could not load mock customers:', e.message);
}

let inMemoryTags = [];
try {
  const tagsMockPath = path.resolve(__dirname, '../mocks/customer_tags.json');
  if (fs.existsSync(tagsMockPath)) {
    inMemoryTags = JSON.parse(fs.readFileSync(tagsMockPath, 'utf-8'));
  }
} catch (e) {
  console.warn('[crm3] Could not load mock tags:', e.message);
}

/**
 * GET /api/customers
 * Supports query parameters:
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

    const result = await pool.query(query, values);
    return res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id
 * Fetches a single customer by ID (including gstin and tags). Used by ERP-4, ERP-5, CRM-5.
 */
router.get('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let customer = null;

    try {
      const result = await pool.query(
        `SELECT id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at
         FROM customers
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Customer with ID '${id}' not found` });
      }
      customer = { ...result.rows[0] };
    } catch (dbErr) {
      const memCust = inMemoryCustomers.find(c => c.id === id);
      if (!memCust) {
        return res.status(404).json({ error: `Customer with ID '${id}' not found` });
      }
      customer = { ...memCust };
    }

    // Attach tags (CRM3-C3)
    try {
      const tagsRes = await pool.query(
        'SELECT tag FROM customer_tags WHERE customer_id = $1 ORDER BY tag ASC',
        [id]
      );
      customer.tags = tagsRes.rows.map(r => r.tag);
    } catch (e) {
      customer.tags = inMemoryTags
        .filter(t => t.customer_id === id)
        .map(t => t.tag);
    }

    return res.json({ data: customer });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers
 * Creates a new customer with auto-generated CUST-xxxx ID from customers_seq.
 * Enforces email uniqueness at API level (to allow merge duplicate rows in shared seed).
 */
router.post('/customers', async (req, res, next) => {
  try {
    const {
      name,
      type,
      email,
      phone,
      gstin,
      billing_address,
      shipping_address,
      city
    } = req.body || {};

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    if (!type || !VALID_CUSTOMER_TYPES.includes(String(type).trim().toLowerCase())) {
      return res.status(400).json({
        error: `Customer type must be one of: ${VALID_CUSTOMER_TYPES.join(', ')}`
      });
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    const cleanPhone = phone ? String(phone).trim().replace(/\D/g, '') : '';
    if (!cleanPhone || !PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ error: 'City is required' });
    }

    if (!billing_address || typeof billing_address !== 'string' || !billing_address.trim()) {
      return res.status(400).json({ error: 'Billing address is required' });
    }

    const resolvedShipping = shipping_address && typeof shipping_address === 'string' && shipping_address.trim()
      ? shipping_address.trim()
      : billing_address.trim();

    const normalizedType = String(type).trim().toLowerCase();
    const cleanGstin = gstin && typeof gstin === 'string' && gstin.trim() ? gstin.trim().toUpperCase() : null;

    if (cleanGstin && cleanGstin.length !== 15) {
      return res.status(400).json({ error: 'GSTIN must be exactly 15 characters' });
    }

    // 2. Check email uniqueness in API code
    const existingEmail = await pool.query(
      'SELECT id FROM customers WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: `Customer with email '${cleanEmail}' already exists` });
    }

    // 3. Generate ID from sequence
    const seqResult = await pool.query("SELECT nextval('customers_seq') AS n");
    const nextNum = seqResult.rows[0].n;
    const id = `CUST-${String(nextNum).padStart(4, '0')}`;

    // 4. Insert customer
    const insertResult = await pool.query(
      `INSERT INTO customers (
        id, name, type, email, phone, gstin, billing_address, shipping_address, city
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at`,
      [
        id,
        name.trim(),
        normalizedType,
        cleanEmail,
        cleanPhone,
        cleanGstin,
        billing_address.trim(),
        resolvedShipping,
        city.trim()
      ]
    );

    return res.status(201).json({ data: insertResult.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/customers/:id
 * Updates customer details.
 */
router.put('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      email,
      phone,
      gstin,
      billing_address,
      shipping_address,
      city
    } = req.body || {};

    // 1. Verify existence
    const currentRes = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }
    const current = currentRes.rows[0];

    // 2. Validate updated fields
    let updatedType = current.type;
    if (type !== undefined) {
      const normalizedType = String(type).trim().toLowerCase();
      if (!VALID_CUSTOMER_TYPES.includes(normalizedType)) {
        return res.status(400).json({
          error: `Customer type must be one of: ${VALID_CUSTOMER_TYPES.join(', ')}`
        });
      }
      updatedType = normalizedType;
    }

    let updatedEmail = current.email;
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        return res.status(400).json({ error: 'A valid email address is required' });
      }
      // Check email uniqueness excluding current record
      const dupCheck = await pool.query(
        'SELECT id FROM customers WHERE LOWER(email) = $1 AND id != $2 LIMIT 1',
        [cleanEmail, id]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ error: `Customer with email '${cleanEmail}' already exists` });
      }
      updatedEmail = cleanEmail;
    }

    let updatedPhone = current.phone;
    if (phone !== undefined) {
      const cleanPhone = String(phone).trim().replace(/\D/g, '');
      if (!cleanPhone || !PHONE_REGEX.test(cleanPhone)) {
        return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
      }
      updatedPhone = cleanPhone;
    }

    let updatedGstin = current.gstin;
    if (gstin !== undefined) {
      const cleanGstin = gstin ? String(gstin).trim().toUpperCase() : null;
      if (cleanGstin && cleanGstin.length !== 15) {
        return res.status(400).json({ error: 'GSTIN must be exactly 15 characters' });
      }
      updatedGstin = cleanGstin;
    }

    const updatedName = name !== undefined ? String(name).trim() : current.name;
    if (!updatedName) {
      return res.status(400).json({ error: 'Customer name cannot be empty' });
    }

    const updatedBilling = billing_address !== undefined ? String(billing_address).trim() : current.billing_address;
    if (!updatedBilling) {
      return res.status(400).json({ error: 'Billing address cannot be empty' });
    }

    const updatedShipping = shipping_address !== undefined
      ? String(shipping_address).trim()
      : current.shipping_address;

    const updatedCity = city !== undefined ? String(city).trim() : current.city;
    if (!updatedCity) {
      return res.status(400).json({ error: 'City cannot be empty' });
    }

    // 3. Update database
    const updateRes = await pool.query(
      `UPDATE customers
       SET name = $1,
           type = $2,
           email = $3,
           phone = $4,
           gstin = $5,
           billing_address = $6,
           shipping_address = $7,
           city = $8
       WHERE id = $9
       RETURNING id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at`,
      [
        updatedName,
        updatedType,
        updatedEmail,
        updatedPhone,
        updatedGstin,
        updatedBilling,
        updatedShipping,
        updatedCity,
        id
      ]
    );

    return res.json({ data: updateRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/customers/:id
 * Deletes customer and cascades delete to contacts.
 */
router.delete('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleteRes = await pool.query(
      'DELETE FROM customers WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }

    return res.json({
      data: {
        message: 'Customer deleted successfully',
        id: deleteRes.rows[0].id,
        name: deleteRes.rows[0].name
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id/contacts
 * Returns all contacts associated with a customer.
 */
router.get('/customers/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify customer exists
    const customerCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }

    const contactsRes = await pool.query(
      `SELECT id, customer_id, name, phone, email, designation, created_at
       FROM contacts
       WHERE customer_id = $1
       ORDER BY id ASC`,
      [id]
    );

    return res.json({ data: contactsRes.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers/:id/contacts
 * Adds a new contact under customer with auto-generated CON-xxxx ID.
 */
router.post('/customers/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, designation } = req.body || {};

    // 1. Verify customer exists
    const customerCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }

    // 2. Validate input
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Contact name is required' });
    }

    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim() : null;
    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid contact email format' });
    }

    const cleanPhone = phone && typeof phone === 'string' && phone.trim() ? phone.trim() : null;
    const cleanDesignation = designation && typeof designation === 'string' && designation.trim()
      ? designation.trim()
      : null;

    // 3. Generate CON-xxxx ID
    const seqResult = await pool.query("SELECT nextval('contacts_seq') AS n");
    const nextNum = seqResult.rows[0].n;
    const contactId = `CON-${String(nextNum).padStart(4, '0')}`;

    // 4. Insert contact
    const insertRes = await pool.query(
      `INSERT INTO contacts (id, customer_id, name, phone, email, designation)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, customer_id, name, phone, email, designation, created_at`,
      [contactId, id, name.trim(), cleanPhone, cleanEmail, cleanDesignation]
    );

    return res.status(201).json({ data: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

// =============================================================
// CUSTOMER TAGS ENDPOINTS (CRM3-C3)
// =============================================================

/**
 * GET /api/customers/:id/tags
 * Returns all tags assigned to customer :id.
 */
router.get('/customers/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify customer exists
    let customerExists = false;
    try {
      const custCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
      customerExists = custCheck.rows.length > 0;
    } catch (e) {
      customerExists = inMemoryCustomers.some(c => c.id === id);
    }

    if (!customerExists) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }

    try {
      const tagsRes = await pool.query(
        'SELECT tag FROM customer_tags WHERE customer_id = $1 ORDER BY tag ASC',
        [id]
      );
      return res.json({ data: tagsRes.rows.map(r => r.tag) });
    } catch (e) {
      const tags = inMemoryTags
        .filter(t => t.customer_id === id)
        .map(t => t.tag);
      return res.json({ data: tags });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers/:id/tags
 * Adds a tag to customer :id.
 * Body: { tag: "VIP" }
 */
router.post('/customers/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;
    let { tag } = req.body || {};

    if (!tag && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        tag = parsed.tag;
      } catch (e) {
        tag = req.body;
      }
    }
    if (!tag && req.query.tag) {
      tag = req.query.tag;
    }

    // 1. Verify customer exists
    let customerExists = false;
    try {
      const custCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
      customerExists = custCheck.rows.length > 0;
    } catch (e) {
      customerExists = inMemoryCustomers.some(c => c.id === id);
    }

    if (!customerExists) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }

    // 2. Validate tag
    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      return res.status(400).json({ error: 'Tag cannot be empty' });
    }

    const cleanTag = tag.trim();

    // 3. Insert tag into database
    try {
      await pool.query(
        `INSERT INTO customer_tags (customer_id, tag)
         VALUES ($1, $2)
         ON CONFLICT (customer_id, tag) DO NOTHING`,
        [id, cleanTag]
      );
    } catch (e) {
      console.warn('[crm3] DB insert tag fallback:', e.message);
    }

    // Update in-memory fallback store
    const alreadyInMem = inMemoryTags.some(
      t => t.customer_id === id && t.tag.toLowerCase() === cleanTag.toLowerCase()
    );
    if (!alreadyInMem) {
      inMemoryTags.push({ customer_id: id, tag: cleanTag });
    }

    let allTags = [];
    try {
      const tagsRes = await pool.query(
        'SELECT tag FROM customer_tags WHERE customer_id = $1 ORDER BY tag ASC',
        [id]
      );
      allTags = tagsRes.rows.map(r => r.tag);
    } catch (e) {
      allTags = inMemoryTags.filter(t => t.customer_id === id).map(t => t.tag);
    }

    return res.status(201).json({
      data: {
        customer_id: id,
        tag: cleanTag,
        tags: allTags
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/customers/:id/tags/:tag
 * and DELETE /api/customers/:id/tags (with tag in body or query param)
 * Removes a tag from customer :id.
 */
const handleTagDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    let tag = req.params.tag || (req.body && req.body.tag) || req.query.tag;

    // 1. Verify customer exists
    let customerExists = false;
    try {
      const custCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
      customerExists = custCheck.rows.length > 0;
    } catch (e) {
      customerExists = inMemoryCustomers.some(c => c.id === id);
    }

    if (!customerExists) {
      return res.status(404).json({ error: `Customer with ID '${id}' not found` });
    }

    // 2. Validate tag
    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      return res.status(400).json({ error: 'Tag name is required for removal' });
    }

    const cleanTag = decodeURIComponent(tag).trim();

    // 3. Delete from database
    try {
      await pool.query(
        'DELETE FROM customer_tags WHERE customer_id = $1 AND LOWER(tag) = LOWER($2)',
        [id, cleanTag]
      );
    } catch (e) {
      console.warn('[crm3] DB delete tag fallback:', e.message);
    }

    // Remove from in-memory store
    inMemoryTags = inMemoryTags.filter(
      t => !(t.customer_id === id && t.tag.toLowerCase() === cleanTag.toLowerCase())
    );

    let allTags = [];
    try {
      const tagsRes = await pool.query(
        'SELECT tag FROM customer_tags WHERE customer_id = $1 ORDER BY tag ASC',
        [id]
      );
      allTags = tagsRes.rows.map(r => r.tag);
    } catch (e) {
      allTags = inMemoryTags.filter(t => t.customer_id === id).map(t => t.tag);
    }

    return res.json({
      data: {
        message: `Tag '${cleanTag}' removed successfully`,
        customer_id: id,
        tag: cleanTag,
        tags: allTags
      }
    });
  } catch (err) {
    next(err);
  }
};

router.delete('/customers/:id/tags/:tag', handleTagDelete);
router.delete('/customers/:id/tags', handleTagDelete);

module.exports = router;
