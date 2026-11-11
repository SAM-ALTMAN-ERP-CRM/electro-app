// services/erp3/routes/workOrders.js
// Express Router for Manufacturing Work Orders [ERP3-B1]
// Auto-mounted by server.js at /api, so paths are /api/work-orders

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

// Protect every route — caller must be authenticated
router.use(requireAuth);

// In-memory fallback store for offline development / test environments
let inMemoryWorkOrders = [];
try {
  const mockPath = path.resolve(__dirname, '../mocks/work-orders.json');
  if (fs.existsSync(mockPath)) {
    inMemoryWorkOrders = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp3/work-orders] Could not load mock work orders:', err.message);
}

let mockWoCounter = inMemoryWorkOrders.length + 1;

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
 * Validates legal status transitions:
 * - planned -> in_progress
 * - in_progress -> completed
 * - planned -> cancelled (cancel only from planned)
 */
function isValidStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  if (currentStatus === 'planned') {
    return nextStatus === 'in_progress' || nextStatus === 'cancelled';
  }
  if (currentStatus === 'in_progress') {
    return nextStatus === 'completed';
  }
  // Once completed or cancelled, no further transitions are allowed
  return false;
}

// ─── GET /api/work-orders ────────────────────────────────────────────────────
// List work orders with optional filtering by status and source.
router.get('/work-orders', async (req, res, next) => {
  try {
    const { status, source } = req.query;
    let query = `
      SELECT id, bom_id, product_sku, quantity, status, source,
             planned_start, planned_end, created_at, completed_at
      FROM work_orders
    `;
    const conditions = [];
    const values = [];

    if (status) {
      values.push(status.trim().toLowerCase());
      conditions.push(`LOWER(status) = $${values.length}`);
    }

    if (source) {
      values.push(source.trim().toLowerCase());
      conditions.push(`LOWER(source) = $${values.length}`);
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
    let filtered = [...inMemoryWorkOrders];
    if (status) {
      filtered = filtered.filter(
        wo => wo.status && wo.status.toLowerCase() === status.trim().toLowerCase()
      );
    }
    if (source) {
      filtered = filtered.filter(
        wo => wo.source && wo.source.toLowerCase() === source.trim().toLowerCase()
      );
    }

    return res.json({ data: filtered });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/work-orders/:id ────────────────────────────────────────────────
// Retrieve a single work order by ID.
router.get('/work-orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const pgResult = await safeQuery(
      `SELECT id, bom_id, product_sku, quantity, status, source,
              planned_start, planned_end, created_at, completed_at
       FROM work_orders
       WHERE id = $1`,
      [id]
    );

    if (pgResult) {
      if (pgResult.rows.length === 0) {
        return res.status(404).json({ error: `Work order '${id}' not found` });
      }
      return res.json({ data: pgResult.rows[0] });
    }

    // In-memory fallback
    const found = inMemoryWorkOrders.find(wo => wo.id === id);
    if (!found) {
      return res.status(404).json({ error: `Work order '${id}' not found` });
    }

    return res.json({ data: found });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/work-orders ───────────────────────────────────────────────────
// Create a new work order. Default status is 'planned'.
router.post('/work-orders', async (req, res, next) => {
  try {
    const {
      bom_id,
      product_sku,
      quantity,
      source = 'manual',
      planned_start = null,
      planned_end = null
    } = req.body;

    // Validate required fields
    if (!bom_id || typeof bom_id !== 'string' || !bom_id.trim()) {
      return res.status(400).json({ error: 'bom_id is required' });
    }
    if (!product_sku || typeof product_sku !== 'string' || !product_sku.trim()) {
      return res.status(400).json({ error: 'product_sku is required' });
    }

    // Validate quantity
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: 'quantity must be a positive number' });
    }

    // Validate source
    const normalizedSource = (source || 'manual').trim().toLowerCase();
    if (!['manual', 'shortage'].includes(normalizedSource)) {
      return res.status(400).json({ error: "source must be either 'manual' or 'shortage'" });
    }

    // Try database insertion
    const pgInsert = await safeQuery(
      `INSERT INTO work_orders (bom_id, product_sku, quantity, status, source, planned_start, planned_end)
       VALUES ($1, $2, $3, 'planned', $4, $5, $6)
       RETURNING id, bom_id, product_sku, quantity, status, source, planned_start, planned_end, created_at, completed_at`,
      [bom_id.trim(), product_sku.trim(), parsedQty, normalizedSource, planned_start, planned_end]
    );

    if (pgInsert && pgInsert.rows.length > 0) {
      const created = pgInsert.rows[0];
      inMemoryWorkOrders.push(created);
      return res.status(201).json({ data: created });
    }

    // In-memory fallback
    const newId = `WO-${String(mockWoCounter++).padStart(4, '0')}`;
    const newWo = {
      id: newId,
      bom_id: bom_id.trim(),
      product_sku: product_sku.trim(),
      quantity: parsedQty,
      status: 'planned',
      source: normalizedSource,
      planned_start: planned_start || null,
      planned_end: planned_end || null,
      created_at: new Date().toISOString(),
      completed_at: null
    };

    inMemoryWorkOrders.push(newWo);
    return res.status(201).json({ data: newWo });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/work-orders/:id/status ───────────────────────────────────────
// Update work order status with strict lifecycle checks:
// planned -> in_progress -> completed; cancel ONLY from planned.
router.patch('/work-orders/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const nextStatus = status.trim().toLowerCase();
    const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(nextStatus)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Fetch existing work order
    const existingResult = await safeQuery(
      `SELECT id, bom_id, product_sku, quantity, status, source, planned_start, planned_end, created_at, completed_at
       FROM work_orders
       WHERE id = $1`,
      [id]
    );

    let current = null;
    if (existingResult) {
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: `Work order '${id}' not found` });
      }
      current = existingResult.rows[0];
    } else {
      current = inMemoryWorkOrders.find(wo => wo.id === id);
      if (!current) {
        return res.status(404).json({ error: `Work order '${id}' not found` });
      }
    }

    const currentStatus = current.status;
    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      return res.status(400).json({
        error: `Cannot transition status from '${currentStatus}' to '${nextStatus}'. Legal transitions: planned -> in_progress, in_progress -> completed, planned -> cancelled.`
      });
    }

    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null;

    // Update in database
    const updateResult = await safeQuery(
      `UPDATE work_orders
       SET status = $1,
           completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $2
       RETURNING id, bom_id, product_sku, quantity, status, source, planned_start, planned_end, created_at, completed_at`,
      [nextStatus, id]
    );

    if (updateResult && updateResult.rows.length > 0) {
      const updated = updateResult.rows[0];
      const idx = inMemoryWorkOrders.findIndex(wo => wo.id === id);
      if (idx !== -1) inMemoryWorkOrders[idx] = updated;
      return res.json({ data: updated });
    }

    // In-memory fallback update
    current.status = nextStatus;
    if (nextStatus === 'completed') {
      current.completed_at = completedAt;
    }

    return res.json({ data: current });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/work-orders/:id ────────────────────────────────────────────────
// Update editable work order fields.
router.put('/work-orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bom_id, product_sku, quantity, planned_start, planned_end } = req.body;

    const parsedQty = quantity !== undefined ? parseFloat(quantity) : undefined;
    if (parsedQty !== undefined && (isNaN(parsedQty) || parsedQty <= 0)) {
      return res.status(400).json({ error: 'quantity must be a positive number' });
    }

    const pgResult = await safeQuery(
      `UPDATE work_orders
       SET bom_id = COALESCE($1, bom_id),
           product_sku = COALESCE($2, product_sku),
           quantity = COALESCE($3, quantity),
           planned_start = COALESCE($4, planned_start),
           planned_end = COALESCE($5, planned_end)
       WHERE id = $6
       RETURNING id, bom_id, product_sku, quantity, status, source, planned_start, planned_end, created_at, completed_at`,
      [bom_id, product_sku, parsedQty, planned_start, planned_end, id]
    );

    if (pgResult) {
      if (pgResult.rows.length === 0) {
        return res.status(404).json({ error: `Work order '${id}' not found` });
      }
      return res.json({ data: pgResult.rows[0] });
    }

    // In-memory fallback
    const wo = inMemoryWorkOrders.find(w => w.id === id);
    if (!wo) {
      return res.status(404).json({ error: `Work order '${id}' not found` });
    }

    if (bom_id !== undefined) wo.bom_id = bom_id;
    if (product_sku !== undefined) wo.product_sku = product_sku;
    if (parsedQty !== undefined) wo.quantity = parsedQty;
    if (planned_start !== undefined) wo.planned_start = planned_start;
    if (planned_end !== undefined) wo.planned_end = planned_end;

    return res.json({ data: wo });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/work-orders/:id ─────────────────────────────────────────────
// Delete a work order (allowed only if status is 'planned' or 'cancelled').
router.delete('/work-orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const checkResult = await safeQuery(
      `SELECT id, status FROM work_orders WHERE id = $1`,
      [id]
    );

    if (checkResult) {
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: `Work order '${id}' not found` });
      }
      if (['in_progress', 'completed'].includes(checkResult.rows[0].status)) {
        return res.status(400).json({
          error: `Cannot delete work order in status '${checkResult.rows[0].status}'`
        });
      }

      await safeQuery(`DELETE FROM work_orders WHERE id = $1`, [id]);
      const idx = inMemoryWorkOrders.findIndex(w => w.id === id);
      if (idx !== -1) inMemoryWorkOrders.splice(idx, 1);

      return res.json({ data: { message: 'Work order deleted successfully', id } });
    }

    // In-memory fallback
    const idx = inMemoryWorkOrders.findIndex(w => w.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Work order '${id}' not found` });
    }
    if (['in_progress', 'completed'].includes(inMemoryWorkOrders[idx].status)) {
      return res.status(400).json({
        error: `Cannot delete work order in status '${inMemoryWorkOrders[idx].status}'`
      });
    }

    inMemoryWorkOrders.splice(idx, 1);
    return res.json({ data: { message: 'Work order deleted successfully', id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

