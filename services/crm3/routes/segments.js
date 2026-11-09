const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Database pool for CRM-3 Customer 360
const pool = makePool('crm3_db');

// Protect all CRM-3 segment endpoints with authentication middleware
router.use(requireAuth);

const ALLOWED_CUSTOMER_TYPES = ['retail', 'corporate', 'dealer'];

// In-memory fallback store for offline development / test environments
let inMemorySegments = [];
let inMemoryCustomers = [];

try {
  const segMockPath = path.resolve(__dirname, '../mocks/segments.json');
  if (fs.existsSync(segMockPath)) {
    inMemorySegments = JSON.parse(fs.readFileSync(segMockPath, 'utf-8'));
  }
  const custMockPath = path.resolve(__dirname, '../mocks/customers.json');
  if (fs.existsSync(custMockPath)) {
    inMemoryCustomers = JSON.parse(fs.readFileSync(custMockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[crm3] Could not pre-load mock data:', err.message);
}

let mockSegIdCounter = inMemorySegments.length + 1;

/**
 * Helper to safely execute parameterised database queries without throwing on offline DB.
 */
async function safeQuery(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * Helper to escape CSV values according to RFC 4180
 */
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/segments
 * Returns all defined customer segments ordered by id ASC.
 */
router.get('/segments', async (req, res, next) => {
  try {
    const pgResult = await safeQuery(
      'SELECT id, name, customer_type, city, created_at FROM segments ORDER BY id ASC'
    );
    if (pgResult) {
      return res.json({ data: pgResult.rows });
    }
    return res.json({ data: inMemorySegments });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/segments
 * Creates a new segment with validation rules.
 * Body: { name, customer_type?, city? }
 */
router.post('/segments', async (req, res, next) => {
  try {
    const { name, customer_type, city } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
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

    try {
      let id;
      try {
        const seqResult = await pool.query("SELECT nextval('segment_id_seq') AS n");
        const nextNum = seqResult.rows[0].n;
        id = `SEG-${String(nextNum).padStart(4, '0')}`;
      } catch (seqErr) {
        const maxRes = await pool.query(
          "SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) + 1 AS next_n FROM segments WHERE id LIKE 'SEG-%'"
        );
        id = `SEG-${String(maxRes.rows[0].next_n).padStart(4, '0')}`;
      }

      const insertResult = await pool.query(
        `INSERT INTO segments (id, name, customer_type, city)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, customer_type, city, created_at`,
        [id, trimmedName, cleanType, cleanCity]
      );

      const saved = insertResult.rows[0];
      inMemorySegments.push(saved);
      return res.status(201).json({ data: saved });
    } catch (dbErr) {
      const id = `SEG-${String(mockSegIdCounter++).padStart(4, '0')}`;
      const saved = {
        id,
        name: trimmedName,
        customer_type: cleanType,
        city: cleanCity,
        created_at: new Date().toISOString()
      };
      inMemorySegments.push(saved);
      return res.status(201).json({ data: saved });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/segments/:id/export.csv
 * Exports customers matching segment criteria as Excel-compatible CSV.
 * Columns: name, email, phone, city
 */
router.get('/segments/:id/export.csv', async (req, res, next) => {
  try {
    const { id } = req.params;

    let segment = null;
    const segRes = await safeQuery('SELECT id, name, customer_type, city FROM segments WHERE id = $1', [id]);
    if (segRes && segRes.rows.length > 0) {
      segment = segRes.rows[0];
    } else {
      segment = inMemorySegments.find(s => s.id === id);
    }

    if (!segment) {
      return res.status(404).json({ error: `Segment with ID '${id}' not found` });
    }

    const targetType = segment.customer_type ? segment.customer_type.trim().toLowerCase() : null;
    const targetCity = segment.city ? segment.city.trim() : null;

    let customers = [];
    let query = `
      SELECT name, email, phone, city
      FROM customers
    `;
    const conditions = [];
    const values = [];

    if (targetType) {
      values.push(targetType);
      conditions.push(`LOWER(type) = $${values.length}`);
    }

    if (targetCity) {
      values.push(targetCity);
      conditions.push(`LOWER(city) = LOWER($${values.length})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY id ASC';

    const custRes = await safeQuery(query, values);
    if (custRes) {
      customers = custRes.rows;
    } else {
      customers = [...inMemoryCustomers];
      if (targetType) {
        customers = customers.filter(c => c.type && c.type.toLowerCase() === targetType);
      }
      if (targetCity) {
        customers = customers.filter(c => c.city && c.city.toLowerCase() === targetCity.toLowerCase());
      }
    }

    const headerRow = 'name,email,phone,city';
    const dataRows = customers.map(c =>
      [
        escapeCsv(c.name),
        escapeCsv(c.email),
        escapeCsv(c.phone),
        escapeCsv(c.city)
      ].join(',')
    );

    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n') + '\r\n';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="segment-${id}-export.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/segments/:id
 * Fetches single segment details.
 */
router.get('/segments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pgRes = await safeQuery('SELECT id, name, customer_type, city, created_at FROM segments WHERE id = $1', [id]);
    if (pgRes) {
      if (pgRes.rows.length === 0) {
        return res.status(404).json({ error: `Segment with ID '${id}' not found` });
      }
      return res.json({ data: pgRes.rows[0] });
    }

    const match = inMemorySegments.find(s => s.id === id);
    if (!match) {
      return res.status(404).json({ error: `Segment with ID '${id}' not found` });
    }
    return res.json({ data: match });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/segments/:id/customers
 * Evaluates segment filter rules against customers table.
 * Blank/null customer_type or city matches any.
 */
router.get('/segments/:id/customers', async (req, res, next) => {
  try {
    const { id } = req.params;

    let segment = null;
    const segRes = await safeQuery('SELECT id, name, customer_type, city FROM segments WHERE id = $1', [id]);
    if (segRes && segRes.rows.length > 0) {
      segment = segRes.rows[0];
    } else {
      segment = inMemorySegments.find(s => s.id === id);
    }

    if (!segment) {
      return res.status(404).json({ error: `Segment with ID '${id}' not found` });
    }

    const targetType = segment.customer_type ? segment.customer_type.trim().toLowerCase() : null;
    const targetCity = segment.city ? segment.city.trim() : null;

    let query = `
      SELECT id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at
      FROM customers
    `;
    const conditions = [];
    const values = [];

    if (targetType) {
      values.push(targetType);
      conditions.push(`LOWER(type) = $${values.length}`);
    }

    if (targetCity) {
      values.push(targetCity);
      conditions.push(`LOWER(city) = LOWER($${values.length})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY id ASC';

    const custRes = await safeQuery(query, values);
    if (custRes) {
      return res.json({
        data: custRes.rows,
        segment: {
          id: segment.id,
          name: segment.name,
          customer_type: segment.customer_type,
          city: segment.city
        },
        customers: custRes.rows,
        count: custRes.rows.length
      });
    }

    let matched = [...inMemoryCustomers];
    if (targetType) {
      matched = matched.filter(c => c.type && c.type.toLowerCase() === targetType);
    }
    if (targetCity) {
      matched = matched.filter(c => c.city && c.city.toLowerCase() === targetCity.toLowerCase());
    }

    return res.json({
      data: matched,
      segment: {
        id: segment.id,
        name: segment.name,
        customer_type: segment.customer_type,
        city: segment.city
      },
      customers: matched,
      count: matched.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/segments/:id
 */
router.put('/segments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, customer_type, city } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
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

    const updateRes = await safeQuery(
      `UPDATE segments
       SET name = $1, customer_type = $2, city = $3
       WHERE id = $4
       RETURNING id, name, customer_type, city, created_at`,
      [trimmedName, cleanType, cleanCity, id]
    );

    if (updateRes && updateRes.rows.length > 0) {
      const updated = updateRes.rows[0];
      const memIdx = inMemorySegments.findIndex(s => s.id === id);
      if (memIdx !== -1) inMemorySegments[memIdx] = updated;
      return res.json({ data: updated });
    }

    const memIdx = inMemorySegments.findIndex(s => s.id === id);
    if (memIdx === -1) {
      return res.status(404).json({ error: `Segment with ID '${id}' not found` });
    }

    const updated = {
      ...inMemorySegments[memIdx],
      name: trimmedName,
      customer_type: cleanType,
      city: cleanCity
    };
    inMemorySegments[memIdx] = updated;
    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/segments/:id
 */
router.delete('/segments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const delRes = await safeQuery('DELETE FROM segments WHERE id = $1 RETURNING id, name', [id]);
    if (delRes && delRes.rows.length > 0) {
      inMemorySegments = inMemorySegments.filter(s => s.id !== id);
      return res.json({ data: { message: 'Segment deleted successfully', id } });
    }

    const match = inMemorySegments.find(s => s.id === id);
    if (!match) {
      return res.status(404).json({ error: `Segment with ID '${id}' not found` });
    }
    inMemorySegments = inMemorySegments.filter(s => s.id !== id);
    return res.json({ data: { message: 'Segment deleted successfully', id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
