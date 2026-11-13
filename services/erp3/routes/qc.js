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

// ─── GET /api/qc/summary ──────────────────────────────────────────────────────
// Returns overall pass rate %, per-product breakdown, and count per defect reason [ERP3-D3].
router.get('/qc/summary', async (req, res, next) => {
  try {
    // 1. Overall stats query
    const overallResult = await safeQuery(`
      SELECT
        COALESCE(SUM(checked_qty), 0)::numeric AS total_checked,
        COALESCE(SUM(passed_qty), 0)::numeric  AS total_passed,
        COALESCE(SUM(failed_qty), 0)::numeric  AS total_failed,
        CASE
          WHEN COALESCE(SUM(checked_qty), 0) = 0 THEN 100.00
          ELSE ROUND((SUM(passed_qty) * 100.0) / SUM(checked_qty), 2)
        END::numeric AS pass_rate_pct
      FROM qc_checks
    `);

    // 2. Per-product breakdown query (join via work_orders)
    const perProductResult = await safeQuery(`
      SELECT
        wo.product_sku,
        COALESCE(SUM(q.checked_qty), 0)::numeric AS total_checked,
        COALESCE(SUM(q.passed_qty), 0)::numeric  AS passed_qty,
        COALESCE(SUM(q.failed_qty), 0)::numeric  AS failed_qty,
        CASE
          WHEN COALESCE(SUM(q.checked_qty), 0) = 0 THEN 100.00
          ELSE ROUND((SUM(q.passed_qty) * 100.0) / SUM(q.checked_qty), 2)
        END::numeric AS pass_rate_pct
      FROM qc_checks q
      JOIN work_orders wo ON wo.id = q.wo_id
      GROUP BY wo.product_sku
      ORDER BY wo.product_sku ASC
    `);

    // 3. Count per defect reason query
    const defectResult = await safeQuery(`
      SELECT
        defect_reason,
        COALESCE(SUM(failed_qty), 0)::numeric AS count,
        COALESCE(SUM(failed_qty), 0)::numeric AS total_failed,
        COUNT(*)::int AS occurrences
      FROM qc_checks
      WHERE defect_reason IS NOT NULL AND defect_reason <> ''
      GROUP BY defect_reason
      ORDER BY total_failed DESC, defect_reason ASC
    `);

    if (overallResult && perProductResult && defectResult) {
      const overallRow = overallResult.rows[0] || {
        total_checked: 0,
        total_passed: 0,
        total_failed: 0,
        pass_rate_pct: 100.00
      };

      const passRate = Number(overallRow.pass_rate_pct);
      const totalChecked = Number(overallRow.total_checked);
      const totalPassed = Number(overallRow.total_passed);
      const totalFailed = Number(overallRow.total_failed);

      return res.json({
        data: {
          pass_rate_pct: passRate,
          total_checked: totalChecked,
          total_passed: totalPassed,
          total_failed: totalFailed,
          overall: {
            pass_rate_pct: passRate,
            total_checked: totalChecked,
            total_passed: totalPassed,
            total_failed: totalFailed
          },
          per_product: perProductResult.rows.map(row => ({
            product_sku: row.product_sku,
            total_checked: Number(row.total_checked),
            passed_qty: Number(row.passed_qty),
            failed_qty: Number(row.failed_qty),
            pass_rate_pct: Number(row.pass_rate_pct)
          })),
          defect_reasons: defectResult.rows.map(row => ({
            defect_reason: row.defect_reason,
            count: Number(row.count),
            total_failed: Number(row.total_failed),
            occurrences: Number(row.occurrences)
          }))
        }
      });
    }

    // In-memory fallback calculation for tests / offline mock mode
    let mockWorkOrders = [];
    try {
      const woMockPath = path.resolve(__dirname, '../mocks/work-orders.json');
      if (fs.existsSync(woMockPath)) {
        mockWorkOrders = JSON.parse(fs.readFileSync(woMockPath, 'utf-8'));
      }
    } catch (e) {}

    const totalChecked = inMemoryQc.reduce((sum, q) => sum + Number(q.checked_qty || 0), 0);
    const totalPassed = inMemoryQc.reduce((sum, q) => sum + Number(q.passed_qty || 0), 0);
    const totalFailed = inMemoryQc.reduce((sum, q) => sum + Number(q.failed_qty || 0), 0);
    const passRate = totalChecked > 0 ? Number(((totalPassed * 100) / totalChecked).toFixed(2)) : 100;

    // Per-product map
    const productMap = {};
    for (const q of inMemoryQc) {
      const wo = mockWorkOrders.find(w => w.id === q.wo_id);
      const sku = (wo && wo.product_sku) || 'SKU-0001';
      if (!productMap[sku]) {
        productMap[sku] = { product_sku: sku, total_checked: 0, passed_qty: 0, failed_qty: 0 };
      }
      productMap[sku].total_checked += Number(q.checked_qty || 0);
      productMap[sku].passed_qty += Number(q.passed_qty || 0);
      productMap[sku].failed_qty += Number(q.failed_qty || 0);
    }

    const perProductFallback = Object.values(productMap).map(p => ({
      ...p,
      pass_rate_pct: p.total_checked > 0 ? Number(((p.passed_qty * 100) / p.total_checked).toFixed(2)) : 100
    })).sort((a, b) => a.product_sku.localeCompare(b.product_sku));

    // Defect reasons map
    const defectMap = {};
    for (const q of inMemoryQc) {
      if (q.defect_reason && String(q.defect_reason).trim()) {
        const reason = String(q.defect_reason).trim();
        if (!defectMap[reason]) {
          defectMap[reason] = { defect_reason: reason, count: 0, total_failed: 0, occurrences: 0 };
        }
        const failed = Number(q.failed_qty || 0);
        defectMap[reason].count += failed;
        defectMap[reason].total_failed += failed;
        defectMap[reason].occurrences += 1;
      }
    }

    const defectReasonsFallback = Object.values(defectMap).sort((a, b) => b.total_failed - a.total_failed);

    return res.json({
      data: {
        pass_rate_pct: passRate,
        total_checked: totalChecked,
        total_passed: totalPassed,
        total_failed: totalFailed,
        overall: {
          pass_rate_pct: passRate,
          total_checked: totalChecked,
          total_passed: totalPassed,
          total_failed: totalFailed
        },
        per_product: perProductFallback,
        defect_reasons: defectReasonsFallback
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/work-orders/:id/qc-status ──────────────────────────────────────
// Returns { allowed: true/false } — false if the latest QC result for that work order is 'fail' [ERP3-D3].
// Used by ERP3-C3 (POST /api/work-orders/:id/post-finished) to gate completion.
router.get('/work-orders/:id/qc-status', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Work order ID is required' });
    }

    const trimmedId = id.trim();

    // Query database for the latest inspection check for this work order
    const pgResult = await safeQuery(
      `SELECT id, wo_id, inspector, checked_qty, passed_qty, failed_qty,
              defect_reason, result, checked_at
       FROM qc_checks
       WHERE wo_id = $1
       ORDER BY checked_at DESC, id DESC
       LIMIT 1`,
      [trimmedId]
    );

    if (pgResult) {
      // If there are no QC checks yet, verify if the work order exists
      if (pgResult.rows.length === 0) {
        const woCheck = await safeQuery('SELECT id FROM work_orders WHERE id = $1', [trimmedId]);
        if (woCheck && woCheck.rows.length === 0) {
          return res.status(404).json({ error: `Work order '${trimmedId}' not found` });
        }

        return res.json({
          data: {
            wo_id: trimmedId,
            allowed: true,
            latest_result: null,
            latest_check_id: null,
            message: 'No QC inspections recorded for this work order; permitted by default'
          }
        });
      }

      const latest = pgResult.rows[0];
      const isFail = latest.result === 'fail';

      return res.json({
        data: {
          wo_id: trimmedId,
          allowed: !isFail,
          latest_result: latest.result,
          latest_check_id: latest.id,
          checked_at: latest.checked_at,
          defect_reason: latest.defect_reason || null
        }
      });
    }

    // In-memory fallback
    const matchingChecks = inMemoryQc.filter(q => q.wo_id === trimmedId);

    if (matchingChecks.length === 0) {
      // Check mock work orders if available
      let mockWorkOrders = [];
      try {
        const woMockPath = path.resolve(__dirname, '../mocks/work-orders.json');
        if (fs.existsSync(woMockPath)) {
          mockWorkOrders = JSON.parse(fs.readFileSync(woMockPath, 'utf-8'));
        }
      } catch (e) {}

      if (mockWorkOrders.length > 0 && !mockWorkOrders.some(w => w.id === trimmedId)) {
        return res.status(404).json({ error: `Work order '${trimmedId}' not found` });
      }

      return res.json({
        data: {
          wo_id: trimmedId,
          allowed: true,
          latest_result: null,
          latest_check_id: null,
          message: 'No QC inspections recorded for this work order; permitted by default'
        }
      });
    }

    // Sort by checked_at DESC, then id DESC
    matchingChecks.sort((a, b) => {
      const timeA = new Date(a.checked_at || 0).getTime();
      const timeB = new Date(b.checked_at || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

    const latest = matchingChecks[0];
    const isFail = latest.result === 'fail';

    return res.json({
      data: {
        wo_id: trimmedId,
        allowed: !isFail,
        latest_result: latest.result,
        latest_check_id: latest.id,
        checked_at: latest.checked_at,
        defect_reason: latest.defect_reason || null
      }
    });
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
