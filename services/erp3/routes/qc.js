// services/erp3/routes/qc.js
// Express Router for Quality Control (QC) Inspections [ERP3-D1]
// Auto-mounted by server.js at /api, so paths are /api/qc

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { requireAuth } = require('../../_shared/auth');

// Postgres connection pool using DATABASE_URL or standard local database
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL_ERP3 ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/erp3_db'
});

// Protect all QC routes with authentication middleware
router.use(requireAuth);

// In-memory fallback store for offline development / test environments
let inMemoryQc = [];
try {
  const mockPath = path.resolve(__dirname, '../mocks/qc.json');
  if (fs.existsSync(mockPath)) {
    inMemoryQc = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp3/qc] Could not load mock QC checks:', err.message);
}

let mockQcCounter = inMemoryQc.length + 1;

/**
 * Execute a query safely; returns null if database is offline.
 */
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * Calculate QC inspection result:
 * - pass: failed_qty is 0
 * - fail: failed_qty is more than 20% of checked_qty
 * - rework: otherwise (failed_qty > 0 and <= 20% of checked_qty)
 */
function calculateQcResult(checkedQty, failedQty) {
  if (failedQty === 0) {
    return 'pass';
  }
  if (failedQty > 0.2 * checkedQty) {
    return 'fail';
  }
  return 'rework';
}

// ─── GET /api/qc ─────────────────────────────────────────────────────────────
// Returns all QC inspection records, with optional filtering by wo_id.
router.get('/qc', async (req, res, next) => {
  try {
    const { wo_id } = req.query;
    let query = `
      SELECT id, wo_id, inspector, checked_qty, passed_qty, failed_qty,
             defect_reason, result, checked_at
      FROM qc_checks
    `;
    const conditions = [];
    const values = [];

    if (wo_id) {
      values.push(wo_id.trim());
      conditions.push(`wo_id = $${values.length}`);
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
    let filtered = [...inMemoryQc];
    if (wo_id) {
      filtered = filtered.filter(q => q.wo_id === wo_id.trim());
    }

    return res.json({ data: filtered });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/qc/:id ─────────────────────────────────────────────────────────
// Retrieve a single QC check by ID.
router.get('/qc/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const pgResult = await safeQuery(
      `SELECT id, wo_id, inspector, checked_qty, passed_qty, failed_qty,
              defect_reason, result, checked_at
       FROM qc_checks
       WHERE id = $1`,
      [id]
    );

    if (pgResult) {
      if (pgResult.rows.length === 0) {
        return res.status(404).json({ error: `QC check '${id}' not found` });
      }
      return res.json({ data: pgResult.rows[0] });
    }

    // In-memory fallback
    const found = inMemoryQc.find(q => q.id === id);
    if (!found) {
      return res.status(404).json({ error: `QC check '${id}' not found` });
    }

    return res.json({ data: found });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/qc ────────────────────────────────────────────────────────────
// Create a new QC check record.
// Validations:
// - wo_id and inspector required
// - checked_qty > 0, passed_qty >= 0, failed_qty >= 0
// - passed_qty + failed_qty must equal checked_qty (else 400)
// Calculates result: pass, fail (> 20% failed), or rework.
router.post('/qc', async (req, res, next) => {
  try {
    const {
      wo_id,
      inspector,
      checked_qty,
      passed_qty,
      failed_qty,
      defect_reason = null
    } = req.body;

    // Validate required text fields
    if (!wo_id || typeof wo_id !== 'string' || !wo_id.trim()) {
      return res.status(400).json({ error: 'wo_id is required' });
    }
    if (!inspector || typeof inspector !== 'string' || !inspector.trim()) {
      return res.status(400).json({ error: 'inspector is required' });
    }

    // Validate quantities
    const checked = parseFloat(checked_qty);
    const passed = parseFloat(passed_qty);
    const failed = parseFloat(failed_qty);

    if (isNaN(checked) || checked <= 0) {
      return res.status(400).json({ error: 'checked_qty must be a positive number' });
    }
    if (isNaN(passed) || passed < 0) {
      return res.status(400).json({ error: 'passed_qty must be a non-negative number' });
    }
    if (isNaN(failed) || failed < 0) {
      return res.status(400).json({ error: 'failed_qty must be a non-negative number' });
    }

    // Validate that passed + failed = checked
    if (Math.abs((passed + failed) - checked) > 0.001) {
      return res.status(400).json({
        error: `Invalid quantities: passed_qty (${passed}) + failed_qty (${failed}) must equal checked_qty (${checked})`
      });
    }

    // Calculate result
    const result = calculateQcResult(checked, failed);

    // Insert into database if available
    const pgInsert = await safeQuery(
      `INSERT INTO qc_checks (wo_id, inspector, checked_qty, passed_qty, failed_qty, defect_reason, result)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, wo_id, inspector, checked_qty, passed_qty, failed_qty, defect_reason, result, checked_at`,
      [wo_id.trim(), inspector.trim(), checked, passed, failed, defect_reason || null, result]
    );

    if (pgInsert && pgInsert.rows.length > 0) {
      const created = pgInsert.rows[0];
      inMemoryQc.push(created);
      return res.status(201).json({ data: created });
    }

    // In-memory fallback
    const newId = `QC-${String(mockQcCounter++).padStart(4, '0')}`;
    const newQc = {
      id: newId,
      wo_id: wo_id.trim(),
      inspector: inspector.trim(),
      checked_qty: checked,
      passed_qty: passed,
      failed_qty: failed,
      defect_reason: defect_reason || null,
      result: result,
      checked_at: new Date().toISOString()
    };

    inMemoryQc.push(newQc);
    return res.status(201).json({ data: newQc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
