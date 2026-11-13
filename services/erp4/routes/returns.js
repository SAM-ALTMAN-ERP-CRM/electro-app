const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-4 PostgreSQL database
const pool = makePool('erp4_db');

// Protect all returns routes with authentication
router.use(requireAuth);

// In-memory returns store
let inMemoryReturns = [];
try {
  const p = path.resolve(__dirname, '../mocks/returns.json');
  if (fs.existsSync(p)) {
    inMemoryReturns = JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp4] Could not load mock returns:', err.message);
}

let returnCounter = inMemoryReturns.length + 1;

/**
 * Execute query safely; returns null if PostgreSQL database is offline.
 */
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/returns/summary
 * Returns counts of return receipts by status.
 */
router.get('/returns/summary', async (req, res, next) => {
  try {
    const dbRes = await safeQuery(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'requested') as requested,
        COUNT(*) FILTER (WHERE status = 'received') as received,
        COUNT(*) FILTER (WHERE status = 'restocked') as restocked,
        COUNT(*) FILTER (WHERE status = 'scrapped') as scrapped
      FROM returns
    `);

    if (dbRes && dbRes.rows.length > 0) {
      const row = dbRes.rows[0];
      return res.json({
        data: {
          total: parseInt(row.total, 10) || 0,
          requested: parseInt(row.requested, 10) || 0,
          received: parseInt(row.received, 10) || 0,
          restocked: parseInt(row.restocked, 10) || 0,
          scrapped: parseInt(row.scrapped, 10) || 0
        }
      });
    }

    // In-memory fallback
    const counts = { total: inMemoryReturns.length, requested: 0, received: 0, restocked: 0, scrapped: 0 };
    inMemoryReturns.forEach(r => {
      const s = (r.status || '').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });

    return res.json({ data: counts });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/returns
 * Lists all customer return receipts with optional status filter.
 */
router.get('/returns', async (req, res, next) => {
  try {
    const { status, so_id } = req.query;

    const dbRes = await safeQuery(
      `SELECT id, so_id, serial_number, reason, rma_id, outcome, status, created_at
       FROM returns
       WHERE ($1::text IS NULL OR status = $1)
         AND ($2::text IS NULL OR so_id = $2)
       ORDER BY created_at DESC`,
      [status || null, so_id || null]
    );

    if (dbRes) {
      return res.json({ data: dbRes.rows });
    }

    // In-memory fallback
    let list = [...inMemoryReturns];
    if (status) {
      list = list.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }
    if (so_id) {
      list = list.filter(r => r.so_id === so_id);
    }

    return res.json({ data: list });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/returns/:id
 * Retrieves a single return receipt by ID.
 */
router.get('/returns/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const dbRes = await safeQuery(
      `SELECT r.id, r.so_id, r.serial_number, r.reason, r.rma_id, r.outcome, r.status, r.created_at,
              so.customer_id, so.customer_name
       FROM returns r
       LEFT JOIN sales_orders so ON r.so_id = so.id
       WHERE r.id = $1`,
      [id]
    );

    if (dbRes) {
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: `Return ${id} not found` });
      }
      return res.json({ data: dbRes.rows[0] });
    }

    // In-memory fallback
    const found = inMemoryReturns.find(r => r.id === id);
    if (!found) {
      return res.status(404).json({ error: `Return ${id} not found` });
    }

    return res.json({ data: found });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/returns
 * Registers a new customer return request.
 */
router.post('/returns', async (req, res, next) => {
  try {
    const { so_id, serial_number, reason, rma_id, outcome } = req.body || {};

    if (!so_id || !serial_number || !reason) {
      return res.status(400).json({ error: 'so_id, serial_number, and reason are required' });
    }

    const cleanSoId = String(so_id).trim();
    const cleanSerial = String(serial_number).trim();
    const cleanReason = String(reason).trim();
    const cleanRma = rma_id ? String(rma_id).trim() : null;
    const cleanOutcome = outcome || 'credit_note';

    const newRet = {
      id: `RET-${String(returnCounter++).padStart(4, '0')}`,
      so_id: cleanSoId,
      serial_number: cleanSerial,
      reason: cleanReason,
      rma_id: cleanRma,
      outcome: cleanOutcome,
      status: 'requested',
      created_at: new Date().toISOString()
    };

    inMemoryReturns.unshift(newRet);

    return res.status(201).json({ data: newRet });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/returns/:id/status
 * Updates status of a return ('received', 'restocked', 'scrapped').
 */
router.patch('/returns/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const validStatuses = ['requested', 'received', 'restocked', 'scrapped'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const found = inMemoryReturns.find(r => r.id === id);
    if (!found) {
      return res.status(404).json({ error: `Return ${id} not found` });
    }

    found.status = status;

    return res.json({ data: found });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
