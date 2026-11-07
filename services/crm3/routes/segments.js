const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

// Protect all CRM-3 segment routes with authentication middleware
router.use(requireAuth);

// In-memory fallback stores for offline development / test environments
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
 * Filter customers by segment criteria in-memory.
 */
function filterCustomersInMemory(customerType, city) {
  return inMemoryCustomers.filter(cust => {
    if (customerType && customerType.trim() !== '') {
      if (!cust.type || cust.type.toLowerCase() !== customerType.trim().toLowerCase()) {
        return false;
      }
    }
    if (city && city.trim() !== '') {
      if (!cust.city || cust.city.toLowerCase() !== city.trim().toLowerCase()) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Generate next segment ID (e.g. SEG-0005).
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
    const match = id && id.match(/^SEG-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `SEG-${String(nextNum).padStart(4, '0')}`;
}

/**
 * GET /api/segments
 * Returns all customer segments.
 */
router.get('/segments', async (req, res, next) => {
  try {
    const dbResult = await safeQuery(`
      SELECT id, name, customer_type, city, created_at
      FROM segments
      ORDER BY id ASC
    `);

    if (dbResult && dbResult.rows && dbResult.rows.length > 0) {
      return res.json(dbResult.rows);
    }

    return res.json(inMemorySegments);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/segments
 * Creates a new segment: { name, customer_type, city }
 */
router.post('/segments', async (req, res, next) => {
  try {
    const { name, customer_type, city } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Segment name is required' });
    }

    const trimmedName = name.trim();
    const cleanType = (customer_type && typeof customer_type === 'string' && customer_type.trim() !== '')
      ? customer_type.trim().toLowerCase()
      : null;
    const cleanCity = (city && typeof city === 'string' && city.trim() !== '')
      ? city.trim()
      : null;

    const newId = await generateSegmentId();
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

    // Keep in-memory store synchronized
    inMemorySegments.push(newSegment);

    const savedSegment = (dbResult && dbResult.rows && dbResult.rows[0]) || newSegment;
    return res.status(201).json(savedSegment);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/segments/:id
 * Returns segment details.
 */
router.get('/segments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const dbResult = await safeQuery(
      `SELECT id, name, customer_type, city, created_at FROM segments WHERE id = $1`,
      [id]
    );

    if (dbResult && dbResult.rows && dbResult.rows.length > 0) {
      return res.json(dbResult.rows[0]);
    }

    const memSeg = inMemorySegments.find(s => s.id === id);
    if (memSeg) {
      return res.json(memSeg);
    }

    return res.status(404).json({ error: `Segment not found: ${id}` });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/segments/:id/customers
 * Returns matching customers table and count for the specified segment.
 * Blank/null type or city means any.
 */
router.get('/segments/:id/customers', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch segment
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

    // 2. Query matching customers from DB
    let conditions = [];
    let params = [];

    if (customer_type && customer_type.trim() !== '') {
      params.push(customer_type.trim().toLowerCase());
      conditions.push(`LOWER(type) = $${params.length}`);
    }

    if (city && city.trim() !== '') {
      params.push(city.trim().toLowerCase());
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
      matchingCustomers = filterCustomersInMemory(customer_type, city);
    }

    return res.json({
      segment,
      customers: matchingCustomers,
      count: matchingCustomers.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/segments/:id
 * Deletes a segment.
 */
router.delete('/segments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await safeQuery('DELETE FROM segments WHERE id = $1', [id]);
    inMemorySegments = inMemorySegments.filter(s => s.id !== id);

    return res.json({ message: `Segment ${id} deleted successfully` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
