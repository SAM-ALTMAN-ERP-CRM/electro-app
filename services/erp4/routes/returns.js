const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const store = require('../store');

// Connect to ERP-4 PostgreSQL database
const pool = makePool('erp4_db');

// Protect all returns routes with authentication
router.use(requireAuth);

// In-memory returns store from shared store
const inMemoryReturns = store.inMemoryReturns;
const inMemoryDispatches = store.inMemoryDispatches;
const inMemoryDispatchSerials = store.inMemoryDispatchSerials;

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
 * Helper to check whether a serial number was dispatched for a given order
 */
async function verifySerialForOrder(soId, serialNumber) {
  const dbRes = await safeQuery(
    `SELECT ds.id, d.so_id
     FROM dispatch_serials ds
     JOIN dispatches d ON ds.dispatch_id = d.id
     WHERE d.so_id = $1 AND ds.serial_number = $2
     LIMIT 1`,
    [soId, serialNumber]
  );
  if (dbRes) {
    return dbRes.rows.length > 0;
  }

  // In-memory fallback
  const dsp = inMemoryDispatches.find(d => d.so_id === soId);
  if (!dsp) return false;
  return inMemoryDispatchSerials.some(s => s.dispatch_id === dsp.id && s.serial_number === serialNumber);
}

/**
 * Helper to find the order ID for a given dispatched serial number
 */
async function findOrderForDispatchedSerial(serialNumber) {
  const dbRes = await safeQuery(
    `SELECT d.so_id
     FROM dispatch_serials ds
     JOIN dispatches d ON ds.dispatch_id = d.id
     WHERE ds.serial_number = $1
     LIMIT 1`,
    [serialNumber]
  );
  if (dbRes) {
    return dbRes.rows.length > 0 ? dbRes.rows[0].so_id : null;
  }

  // In-memory fallback
  const match = inMemoryDispatchSerials.find(s => s.serial_number === serialNumber);
  if (!match) return null;
  const dsp = inMemoryDispatches.find(d => d.id === match.dispatch_id);
  return dsp ? dsp.so_id : null;
}

/**
 * GET /api/returns/summary
 * Returns counts of return receipts by status and by reason.
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
 * Lists all customer return receipts with optional status and so_id filters.
 */
router.get('/returns', async (req, res, next) => {
  try {
    const { status, so_id } = req.query;

    const dbRes = await safeQuery(
      `SELECT r.id, r.so_id, r.serial_number, r.reason, r.rma_id, r.outcome, r.status, r.created_at,
              so.customer_id, so.customer_name
       FROM returns r
       LEFT JOIN sales_orders so ON r.so_id = so.id
       WHERE ($1::text IS NULL OR r.status = $1)
         AND ($2::text IS NULL OR r.so_id = $2)
       ORDER BY r.created_at DESC`,
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
 * Acceptance criteria: checks that serial exists in dispatch_serials for that order (else 400).
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
    const cleanOutcome = outcome ? String(outcome).trim() : 'credit_note';

    // Verify that the serial was actually dispatched for this order
    const isDispatched = await verifySerialForOrder(cleanSoId, cleanSerial);
    if (!isDispatched) {
      return res.status(400).json({
        error: `Serial number ${cleanSerial} was not dispatched for order ${cleanSoId}`
      });
    }

    // Check duplicate RMA if provided
    if (cleanRma) {
      const dbCheck = await safeQuery('SELECT * FROM returns WHERE rma_id = $1', [cleanRma]);
      if (dbCheck && dbCheck.rows.length > 0) {
        return res.status(200).json({ data: dbCheck.rows[0] });
      }
      const existingInMemory = inMemoryReturns.find(r => r.rma_id === cleanRma);
      if (existingInMemory) {
        return res.status(200).json({ data: existingInMemory });
      }
    }

    // Insert into PostgreSQL if connected
    const insertSql = `
      INSERT INTO returns (so_id, serial_number, reason, rma_id, outcome, status)
      VALUES ($1, $2, $3, $4, $5, 'requested')
      RETURNING *
    `;
    const dbInsert = await safeQuery(insertSql, [
      cleanSoId,
      cleanSerial,
      cleanReason,
      cleanRma,
      cleanOutcome
    ]);
    if (dbInsert && dbInsert.rows.length > 0) {
      return res.status(201).json({ data: dbInsert.rows[0] });
    }

    // In-memory fallback
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
 * POST /api/returns/from-rma
 * Integration endpoint called by CRM-2 (Tickets & RMA service).
 * Finds the order from dispatch_serials by serial (400 if serial was never dispatched).
 * A repeated rma_id returns the existing return with HTTP 200.
 */
router.post('/returns/from-rma', async (req, res, next) => {
  try {
    const { rma_id, serial_number, reason, outcome } = req.body || {};

    if (!rma_id || !serial_number || !reason) {
      return res.status(400).json({ error: 'rma_id, serial_number, and reason are required' });
    }

    const cleanRma = String(rma_id).trim();
    const cleanSerial = String(serial_number).trim();
    const cleanReason = String(reason).trim();
    const cleanOutcome = outcome ? String(outcome).trim() : 'replacement';

    // 1. Idempotency check: repeated rma_id returns existing return with 200
    const dbExisting = await safeQuery('SELECT * FROM returns WHERE rma_id = $1', [cleanRma]);
    if (dbExisting && dbExisting.rows.length > 0) {
      return res.status(200).json({ data: dbExisting.rows[0] });
    }
    const memExisting = inMemoryReturns.find(r => r.rma_id === cleanRma);
    if (memExisting) {
      return res.status(200).json({ data: memExisting });
    }

    // 2. Find order from dispatch_serials by serial
    const resolvedSoId = await findOrderForDispatchedSerial(cleanSerial);
    if (!resolvedSoId) {
      return res.status(400).json({
        error: `Serial number ${cleanSerial} was never dispatched`
      });
    }

    // 3. Create return with status requested
    const insertSql = `
      INSERT INTO returns (so_id, serial_number, reason, rma_id, outcome, status)
      VALUES ($1, $2, $3, $4, $5, 'requested')
      RETURNING *
    `;
    const dbInsert = await safeQuery(insertSql, [
      resolvedSoId,
      cleanSerial,
      cleanReason,
      cleanRma,
      cleanOutcome
    ]);
    if (dbInsert && dbInsert.rows.length > 0) {
      return res.status(201).json({ data: dbInsert.rows[0] });
    }

    // In-memory fallback
    const newRet = {
      id: `RET-${String(returnCounter++).padStart(4, '0')}`,
      so_id: resolvedSoId,
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

    // Database update
    const dbRes = await safeQuery(
      `UPDATE returns SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
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

    found.status = status;

    return res.json({ data: found });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
