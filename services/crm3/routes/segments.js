const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

// Protect all CRM-3 segment routes with authentication middleware
router.use(requireAuth);

// In-memory fallback stores for offline testing / mock mode
let inMemorySegments = [];
let inMemoryCustomers = [];

try {
  const segMockPath = path.resolve(__dirname, '../mocks/segments.json');
  if (fs.existsSync(segMockPath)) {
    inMemorySegments = JSON.parse(fs.readFileSync(segMockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[crm3] Could not pre-load mock segments:', err.message);
}

try {
  const custMockPath = path.resolve(__dirname, '../mocks/customers.json');
  if (fs.existsSync(custMockPath)) {
    inMemoryCustomers = JSON.parse(fs.readFileSync(custMockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[crm3] Could not pre-load mock customers:', err.message);
}

/**
 * Execute a query safely against crm3_db.
 * Returns query result or null if the database is offline or query fails.
 */
async function safeQuery(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.warn(`[crm3 safeQuery] DB query failed (${err.code || err.message}), falling back to in-memory/mock`);
    return null;
  }
}

/**
 * Filter customers by segment criteria in-memory.
 * Blank or null customer_type or city means any.
 */
function filterCustomersInMemory(customerType, city) {
  return inMemoryCustomers.filter(cust => {
    if (customerType && String(customerType).trim() !== '') {
      const typeVal = String(customerType).trim().toLowerCase();
      if (!cust.type || cust.type.toLowerCase() !== typeVal) {
        return false;
      }
    }
    if (city && String(city).trim() !== '') {
      const cityVal = String(city).trim().toLowerCase();
      if (!cust.city || cust.city.toLowerCase() !== cityVal) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Generate next segment ID in the format SEG-0001.
 */
async function generateSegmentId() {
  const dbResult = await safeQuery('SELECT id FROM segments');
  let allIds = [];
  if (dbResult && dbResult.rows) {
    allIds = dbResult.rows.map(r => r.id);
  } else {
    allIds = inMemorySegments.map(s => s.id);
  }

  let maxNum = 0;
  for (const id of allIds) {
    const match = id && String(id).match(/^SEG-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `SEG-${String(nextNum).padStart(4, '0')}`;
}

const ALLOWED_CUSTOMER_TYPES = ['retail', 'corporate', 'dealer'];

/**
 * GET /api/segments
 * Returns all segments ordered by id ASC.
 */
router.get('/segments', async (req, res, next) => {
  try {
    const dbResult = await safeQuery(`
      SELECT id, name, customer_type, city, created_at
      FROM segments
      ORDER BY id ASC
    `);

    if (dbResult && dbResult.rows && dbResult.rows.length > 0) {
      return res.json({ data: dbResult.rows });
    }

    // Fallback to in-memory segments
    return res.json({ data: inMemorySegments });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/segments
 * Create a new segment: { name, customer_type, city }
 */
router.post('/segments', async (req, res, next) => {
  try {
    const { name, customer_type, city, id } = req.body || {};

    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Segment name is required' });
    }

    const trimmedName = name.trim();

    // Validate and normalize customer_type (nullable)
    let cleanType = null;
    if (customer_type !== undefined && customer_type !== null) {
      const typeStr = String(customer_type).trim().toLowerCase();
      if (typeStr !== '') {
        if (!ALLOWED_CUSTOMER_TYPES.includes(typeStr)) {
          return res.status(400).json({
            error: `Invalid customer_type: '${customer_type}'. Allowed values: ${ALLOWED_CUSTOMER_TYPES.join(', ')}`
          });
        }
        cleanType = typeStr;
      }
    }

    // Normalize city (nullable)
    let cleanCity = null;
    if (city !== undefined && city !== null) {
      const cityStr = String(city).trim();
      if (cityStr !== '') {
        cleanCity = cityStr;
      }
    }

    const newId = (id && String(id).trim()) || await generateSegmentId();
    const createdAt = new Date().toISOString();

    const newSegment = {
      id: newId,
      name: trimmedName,
      customer_type: cleanType,
      city: cleanCity,
      created_at: createdAt
    };

    // Attempt DB insert
    const dbResult = await safeQuery(
      `INSERT INTO segments (id, name, customer_type, city, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, customer_type, city, created_at`,
      [newId, trimmedName, cleanType, cleanCity, createdAt]
    );

    // Keep in-memory store in sync
    const existingIndex = inMemorySegments.findIndex(s => s.id === newId);
    if (existingIndex >= 0) {
      inMemorySegments[existingIndex] = newSegment;
    } else {
      inMemorySegments.push(newSegment);
    }

    const savedSegment = (dbResult && dbResult.rows && dbResult.rows[0]) || newSegment;
    return res.status(201).json({ data: savedSegment });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/segments/:id/customers
 * Returns customers matching the segment's customer_type and city.
 * Blank / null filter means any. Calls this service's own customers table.
 */
router.get('/segments/:id/customers', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch the segment definition
    let segment = null;
    const segDb = await safeQuery(
      `SELECT id, name, customer_type, city, created_at FROM segments WHERE id = $1`,
      [id]
    );

    if (segDb && segDb.rows && segDb.rows.length > 0) {
      segment = segDb.rows[0];
    } else {
      segment = inMemorySegments.find(s => s.id === id);
    }

    if (!segment) {
      return res.status(404).json({ error: `Segment not found: ${id}` });
    }

    const { customer_type, city } = segment;

    // 2. Query matching customers from this service's own customers table
    const conditions = [];
    const params = [];

    if (customer_type && String(customer_type).trim() !== '') {
      params.push(String(customer_type).trim().toLowerCase());
      conditions.push(`LOWER(type) = $${params.length}`);
    }

    if (city && String(city).trim() !== '') {
      params.push(String(city).trim().toLowerCase());
      conditions.push(`LOWER(city) = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const queryText = `
      SELECT id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at
      FROM customers
      ${whereClause}
      ORDER BY id ASC
    `;

    const custDb = await safeQuery(queryText, params);

    let matchingCustomers = [];
    if (custDb && custDb.rows) {
      matchingCustomers = custDb.rows;
    } else {
      // In-memory / mock fallback if DB customers query returned null
      matchingCustomers = filterCustomersInMemory(customer_type, city);
    }

    return res.json({
      data: matchingCustomers,
      segment,
      customers: matchingCustomers,
      count: matchingCustomers.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/segments/:id
 * Returns single segment by ID.
 */
router.get('/segments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const dbResult = await safeQuery(
      `SELECT id, name, customer_type, city, created_at FROM segments WHERE id = $1`,
      [id]
    );

    if (dbResult && dbResult.rows && dbResult.rows.length > 0) {
      return res.json({ data: dbResult.rows[0] });
    }

    const memSeg = inMemorySegments.find(s => s.id === id);
    if (memSeg) {
      return res.json({ data: memSeg });
    }

    return res.status(404).json({ error: `Segment not found: ${id}` });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/segments/:id
 * Full update of a segment.
 */
router.put('/segments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, customer_type, city } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Segment name is required' });
    }

    const trimmedName = name.trim();

    let cleanType = null;
    if (customer_type !== undefined && customer_type !== null) {
      const typeStr = String(customer_type).trim().toLowerCase();
      if (typeStr !== '') {
        if (!ALLOWED_CUSTOMER_TYPES.includes(typeStr)) {
          return res.status(400).json({
            error: `Invalid customer_type: '${customer_type}'. Allowed values: ${ALLOWED_CUSTOMER_TYPES.join(', ')}`
          });
        }
        cleanType = typeStr;
      }
    }

    let cleanCity = null;
    if (city !== undefined && city !== null) {
      const cityStr = String(city).trim();
      if (cityStr !== '') {
        cleanCity = cityStr;
      }
    }

    // Check if segment exists
    const checkDb = await safeQuery('SELECT id FROM segments WHERE id = $1', [id]);
    const memIndex = inMemorySegments.findIndex(s => s.id === id);

    if ((!checkDb || checkDb.rows.length === 0) && memIndex < 0) {
      return res.status(404).json({ error: `Segment not found: ${id}` });
    }

    const dbResult = await safeQuery(
      `UPDATE segments
       SET name = $1, customer_type = $2, city = $3
       WHERE id = $4
       RETURNING id, name, customer_type, city, created_at`,
      [trimmedName, cleanType, cleanCity, id]
    );

    const updated = (dbResult && dbResult.rows && dbResult.rows[0]) || {
      id,
      name: trimmedName,
      customer_type: cleanType,
      city: cleanCity,
      created_at: (inMemorySegments[memIndex] && inMemorySegments[memIndex].created_at) || new Date().toISOString()
    };

    if (memIndex >= 0) {
      inMemorySegments[memIndex] = { ...inMemorySegments[memIndex], ...updated };
    }

    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/segments/:id
 * Partial update of a segment.
 */
router.patch('/segments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, customer_type, city } = req.body || {};

    // Retrieve existing segment
    let current = null;
    const curDb = await safeQuery('SELECT * FROM segments WHERE id = $1', [id]);
    if (curDb && curDb.rows && curDb.rows.length > 0) {
      current = curDb.rows[0];
    } else {
      current = inMemorySegments.find(s => s.id === id);
    }

    if (!current) {
      return res.status(404).json({ error: `Segment not found: ${id}` });
    }

    const updatedName = (name !== undefined) ? (typeof name === 'string' ? name.trim() : current.name) : current.name;
    if (name !== undefined && updatedName === '') {
      return res.status(400).json({ error: 'Segment name cannot be empty' });
    }

    let updatedType = current.customer_type;
    if (customer_type !== undefined) {
      if (customer_type === null || String(customer_type).trim() === '') {
        updatedType = null;
      } else {
        const typeStr = String(customer_type).trim().toLowerCase();
        if (!ALLOWED_CUSTOMER_TYPES.includes(typeStr)) {
          return res.status(400).json({
            error: `Invalid customer_type: '${customer_type}'. Allowed values: ${ALLOWED_CUSTOMER_TYPES.join(', ')}`
          });
        }
        updatedType = typeStr;
      }
    }

    let updatedCity = current.city;
    if (city !== undefined) {
      if (city === null || String(city).trim() === '') {
        updatedCity = null;
      } else {
        updatedCity = String(city).trim();
      }
    }

    const dbResult = await safeQuery(
      `UPDATE segments
       SET name = $1, customer_type = $2, city = $3
       WHERE id = $4
       RETURNING id, name, customer_type, city, created_at`,
      [updatedName, updatedType, updatedCity, id]
    );

    const updated = (dbResult && dbResult.rows && dbResult.rows[0]) || {
      id,
      name: updatedName,
      customer_type: updatedType,
      city: updatedCity,
      created_at: current.created_at
    };

    const memIndex = inMemorySegments.findIndex(s => s.id === id);
    if (memIndex >= 0) {
      inMemorySegments[memIndex] = { ...inMemorySegments[memIndex], ...updated };
    }

    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/segments/:id
 * Deletes a segment by ID.
 */
router.delete('/segments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if segment exists
    const checkDb = await safeQuery('SELECT id FROM segments WHERE id = $1', [id]);
    const memIndex = inMemorySegments.findIndex(s => s.id === id);

    if ((!checkDb || checkDb.rows.length === 0) && memIndex < 0) {
      return res.status(404).json({ error: `Segment not found: ${id}` });
    }

    await safeQuery('DELETE FROM segments WHERE id = $1', [id]);

    if (memIndex >= 0) {
      inMemorySegments.splice(memIndex, 1);
    }

    return res.json({
      data: {
        message: `Segment ${id} deleted successfully`,
        id
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
