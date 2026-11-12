const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Database pool for ERP-1 Inventory & Warehouses
const pool = makePool('erp1_db');

// Protect all serial routes with JWT authentication
router.use(requireAuth);

// Strict state-machine rules: each status can only move to one next status
const ALLOWED_TRANSITIONS = {
  in_stock: 'reserved',
  reserved: 'sold',
  sold: 'returned',
  returned: 'in_stock'
};

const VALID_STATUSES = Object.keys(ALLOWED_TRANSITIONS);

// In-memory fallback data loaded from mocks/serials.json for offline testing
let inMemorySerials = [];
try {
  const mockPath = path.resolve(__dirname, '../mocks/serials.json');
  if (fs.existsSync(mockPath)) {
    inMemorySerials = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp1] Could not load mock serials:', err.message);
}

/**
 * Checks whether a pg error means PostgreSQL is unreachable or not set up locally.
 */
function isDbUnavailable(err) {
  if (!err) return false;
  const offlineCodes = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '3D000', '28P01', '28000']);
  if (offlineCodes.has(err.code)) return true;
  if (Array.isArray(err.errors)) {
    return err.errors.some(e => offlineCodes.has(e.code));
  }
  return false;
}

/**
 * GET /api/serials
 * Lists serial numbers with optional ?sku=, ?status=, and ?q= filters.
 */
router.get('/serials', async (req, res, next) => {
  try {
    const { sku, status, q } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status filter '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    try {
      const conditions = [];
      const params = [];

      if (sku) {
        params.push(sku.trim());
        conditions.push(`sku = $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
      }
      if (q) {
        params.push(`%${q.trim()}%`);
        conditions.push(`serial_number ILIKE $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT serial_number, sku, batch_no, warehouse_id, status, created_at
         FROM serials
         ${whereClause}
         ORDER BY serial_number ASC`,
        params
      );
      return res.json({ data: result.rows });
    } catch (dbErr) {
      if (!isDbUnavailable(dbErr)) throw dbErr;
    }

    // In-memory fallback when database is offline
    let filtered = inMemorySerials;
    if (sku) {
      filtered = filtered.filter(s => s.sku === sku.trim());
    }
    if (status) {
      filtered = filtered.filter(s => s.status === status);
    }
    if (q) {
      const needle = q.trim().toLowerCase();
      filtered = filtered.filter(s => s.serial_number.toLowerCase().includes(needle));
    }
    return res.json({ data: filtered });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/serials/allocate
 * Finds `qty` in_stock serials for `sku`, marks them as `reserved`, and returns them.
 * Body: { sku, qty }
 */
router.post('/serials/allocate', async (req, res, next) => {
  try {
    const { sku, qty } = req.body || {};

    if (typeof sku !== 'string' || !sku.trim()) {
      return res.status(400).json({ error: 'sku is required' });
    }
    if (qty === undefined || qty === null || qty === '' || typeof qty === 'boolean') {
      return res.status(400).json({ error: 'qty is required and must be a positive integer' });
    }
    const parsedQty = Number(qty);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: 'qty must be a positive integer' });
    }

    const cleanSku = sku.trim();

    // Try PostgreSQL first inside a transaction with row locks (FOR UPDATE)
    let client;
    try {
      client = await pool.connect();
    } catch (connErr) {
      if (!isDbUnavailable(connErr)) throw connErr;
      client = null;
    }

    if (client) {
      try {
        await client.query('BEGIN');

        // Lock matching in_stock serial rows so two concurrent orders cannot grab the same serials
        const selectRes = await client.query(
          `SELECT serial_number
           FROM serials
           WHERE sku = $1 AND status = 'in_stock'
           ORDER BY serial_number ASC
           LIMIT $2
           FOR UPDATE`,
          [cleanSku, parsedQty]
        );

        if (selectRes.rows.length < parsedQty) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Not enough in_stock serials for ${cleanSku}: requested ${parsedQty}, available ${selectRes.rows.length}`
          });
        }

        const serialNumbers = selectRes.rows.map(r => r.serial_number);

        await client.query(
          `UPDATE serials
           SET status = 'reserved'
           WHERE serial_number = ANY($1::varchar[])`,
          [serialNumbers]
        );

        await client.query('COMMIT');

        return res.json({
          data: {
            allocated_serials: serialNumbers,
            status: 'reserved'
          }
        });
      } catch (txErr) {
        await client.query('ROLLBACK').catch(() => {});
        throw txErr;
      } finally {
        client.release();
      }
    }

    // In-memory fallback when database is offline
    const available = inMemorySerials.filter(
      s => s.sku === cleanSku && s.status === 'in_stock'
    );

    if (available.length < parsedQty) {
      return res.status(400).json({
        error: `Not enough in_stock serials for ${cleanSku}: requested ${parsedQty}, available ${available.length}`
      });
    }

    const picked = available.slice(0, parsedQty);
    picked.forEach(s => {
      s.status = 'reserved';
    });

    return res.json({
      data: {
        allocated_serials: picked.map(s => s.serial_number),
        status: 'reserved'
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/serials/:serial/status
 * Enforces allowed serial status moves:
 *   in_stock -> reserved -> sold -> returned -> in_stock
 * Body: { status }
 */
router.patch('/serials/:serial/status', async (req, res, next) => {
  try {
    const serialNumber = req.params.serial;
    const { status: nextStatus } = req.body || {};

    if (typeof nextStatus !== 'string' || !VALID_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        error: `Invalid status '${nextStatus}'. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    // Try PostgreSQL first
    let client;
    try {
      client = await pool.connect();
    } catch (connErr) {
      if (!isDbUnavailable(connErr)) throw connErr;
      client = null;
    }

    if (client) {
      try {
        await client.query('BEGIN');

        const existing = await client.query(
          `SELECT serial_number, sku, batch_no, warehouse_id, status, created_at
           FROM serials
           WHERE serial_number = $1
           FOR UPDATE`,
          [serialNumber]
        );

        if (existing.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Serial '${serialNumber}' not found` });
        }

        const currentStatus = existing.rows[0].status;
        const allowedNext = ALLOWED_TRANSITIONS[currentStatus];

        if (allowedNext !== nextStatus) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Illegal status transition from '${currentStatus}' to '${nextStatus}'. Allowed next status: '${allowedNext}'`
          });
        }

        const updated = await client.query(
          `UPDATE serials
           SET status = $1
           WHERE serial_number = $2
           RETURNING serial_number, sku, batch_no, warehouse_id, status, created_at`,
          [nextStatus, serialNumber]
        );

        await client.query('COMMIT');
        return res.json({ data: updated.rows[0] });
      } catch (txErr) {
        await client.query('ROLLBACK').catch(() => {});
        throw txErr;
      } finally {
        client.release();
      }
    }

    // In-memory fallback when database is offline
    const serial = inMemorySerials.find(s => s.serial_number === serialNumber);
    if (!serial) {
      return res.status(404).json({ error: `Serial '${serialNumber}' not found` });
    }

    const allowedNext = ALLOWED_TRANSITIONS[serial.status];
    if (allowedNext !== nextStatus) {
      return res.status(400).json({
        error: `Illegal status transition from '${serial.status}' to '${nextStatus}'. Allowed next status: '${allowedNext}'`
      });
    }

    serial.status = nextStatus;
    return res.json({ data: serial });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

