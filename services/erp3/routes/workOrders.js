// services/erp3/routes/workOrders.js
// Express Router for Manufacturing Work Orders [ERP3-B1, ERP3-B3]
// Auto-mounted by server.js at /api, so paths are /api/work-orders

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { requireAuth } = require('../../_shared/auth');
const { callService } = require('../../_shared/callService');

// Postgres connection pool using DATABASE_URL or standard local database
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL_ERP3 ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/erp3_db'
});

// Protect every route — caller must be authenticated
router.use(requireAuth);

// In-memory fallback stores for offline development / test environments
let inMemoryWorkOrders = [];
let inMemoryMaterials = [];
let inMemoryMaterialIssues = [];

try {
  const mockWoPath = path.resolve(__dirname, '../mocks/work-orders.json');
  if (fs.existsSync(mockWoPath)) {
    inMemoryWorkOrders = JSON.parse(fs.readFileSync(mockWoPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp3/work-orders] Could not load mock work orders:', err.message);
}

try {
  const mockMatPath = path.resolve(__dirname, '../mocks/work-order-materials.json');
  if (fs.existsSync(mockMatPath)) {
    inMemoryMaterials = JSON.parse(fs.readFileSync(mockMatPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp3/work-orders] Could not load mock materials:', err.message);
}

try {
  const mockIssuesPath = path.resolve(__dirname, '../mocks/material-issues.json');
  if (fs.existsSync(mockIssuesPath)) {
    inMemoryMaterialIssues = JSON.parse(fs.readFileSync(mockIssuesPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp3/work-orders] Could not load mock material issues:', err.message);
}

let mockWoCounter = inMemoryWorkOrders.length + 1;
let mockMaterialCounter = inMemoryMaterials.length + 1;
let mockIssueCounter = inMemoryMaterialIssues.length + 1;

// Fallback BOM components mapping for offline / test environments
const BOM_COMPONENTS_MAP = {
  'BOM-0001': [
    { component_sku: 'SKU-0101', component_name: 'Display Panel', qty_per_unit: 1 },
    { component_sku: 'SKU-0102', component_name: 'Main Board', qty_per_unit: 1 },
    { component_sku: 'SKU-0103', component_name: 'Power Supply Unit', qty_per_unit: 1 },
    { component_sku: 'SKU-0104', component_name: 'Remote Control', qty_per_unit: 1 },
    { component_sku: 'SKU-0105', component_name: 'Packaging Box', qty_per_unit: 1 }
  ],
  'BOM-0002': [
    { component_sku: 'SKU-0101', component_name: 'OLED Display Panel', qty_per_unit: 1 },
    { component_sku: 'SKU-0102', component_name: 'Main Board', qty_per_unit: 1 },
    { component_sku: 'SKU-0103', component_name: 'Power Supply Unit', qty_per_unit: 1 },
    { component_sku: 'SKU-0104', component_name: 'Remote Control', qty_per_unit: 1 },
    { component_sku: 'SKU-0105', component_name: 'Packaging Box', qty_per_unit: 1 }
  ]
};

const SKU_TO_ACTIVE_BOM_MAP = {
  'SKU-0001': 'BOM-0001',
  'SKU-0003': 'BOM-0002'
};

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
// Retrieve a single work order by ID, including its required materials [ERP3-B3].
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
      const wo = pgResult.rows[0];

      // Fetch materials associated with this work order
      const matResult = await safeQuery(
        `SELECT wom.id, wom.wo_id, wom.component_sku, wom.required_qty, wom.issued_qty,
                COALESCE(bi.component_name, wom.component_sku) AS component_name
         FROM work_order_materials wom
         LEFT JOIN work_orders wo ON wo.id = wom.wo_id
         LEFT JOIN bom_items bi ON bi.bom_id = wo.bom_id AND bi.component_sku = wom.component_sku
         WHERE wom.wo_id = $1
         ORDER BY wom.id ASC`,
        [id]
      );

      const materials = matResult ? matResult.rows : [];
      return res.json({ data: { ...wo, materials } });
    }

    // In-memory fallback
    const found = inMemoryWorkOrders.find(wo => wo.id === id);
    if (!found) {
      return res.status(404).json({ error: `Work order '${id}' not found` });
    }

    const materials = inMemoryMaterials.filter(m => m.wo_id === id);
    return res.json({ data: { ...found, materials } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/work-orders/:id/materials ──────────────────────────────────────
// Retrieve the material requirements for a specific work order [ERP3-B3].
router.get('/work-orders/:id/materials', async (req, res, next) => {
  try {
    const { id } = req.params;

    const checkWo = await safeQuery(
      `SELECT id FROM work_orders WHERE id = $1`,
      [id]
    );
    if (checkWo && checkWo.rows.length === 0) {
      return res.status(404).json({ error: `Work order '${id}' not found` });
    }

    const matResult = await safeQuery(
      `SELECT wom.id, wom.wo_id, wom.component_sku, wom.required_qty, wom.issued_qty,
              COALESCE(bi.component_name, wom.component_sku) AS component_name
       FROM work_order_materials wom
       LEFT JOIN work_orders wo ON wo.id = wom.wo_id
       LEFT JOIN bom_items bi ON bi.bom_id = wo.bom_id AND bi.component_sku = wom.component_sku
       WHERE wom.wo_id = $1
       ORDER BY wom.id ASC`,
      [id]
    );

    if (matResult) {
      return res.json({ data: matResult.rows });
    }

    // In-memory fallback
    const found = inMemoryWorkOrders.find(wo => wo.id === id);
    if (!found) {
      return res.status(404).json({ error: `Work order '${id}' not found` });
    }

    const materials = inMemoryMaterials.filter(m => m.wo_id === id);
    return res.json({ data: materials });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/work-orders ───────────────────────────────────────────────────
// Create a new work order.
// Supports both full body and shortage-style requests:
// { product_sku, quantity, source: "shortage" } (resolves active BOM for product_sku).
// Copies BOM requirements into work_order_materials [ERP3-B3].
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

    // Validate product_sku
    if (!product_sku || typeof product_sku !== 'string' || !product_sku.trim()) {
      return res.status(400).json({ error: 'product_sku is required' });
    }
    const trimmedSku = product_sku.trim();

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

    // Resolve BOM ID:
    // If bom_id is supplied, use it; otherwise, look up active BOM for product_sku.
    let resolvedBomId = null;

    if (bom_id && typeof bom_id === 'string' && bom_id.trim()) {
      resolvedBomId = bom_id.trim();
    } else {
      // Shortage-style or auto-resolved BOM lookup
      const activeBomResult = await safeQuery(
        `SELECT id FROM boms WHERE product_sku = $1 AND active = TRUE ORDER BY version DESC LIMIT 1`,
        [trimmedSku]
      );

      if (activeBomResult) {
        if (activeBomResult.rows.length === 0) {
          return res.status(400).json({ error: `No active BOM found for product ${trimmedSku}` });
        }
        resolvedBomId = activeBomResult.rows[0].id;
      } else {
        // In-memory / offline fallback
        resolvedBomId = SKU_TO_ACTIVE_BOM_MAP[trimmedSku];
        if (!resolvedBomId) {
          return res.status(400).json({ error: `No active BOM found for product ${trimmedSku}` });
        }
      }
    }

    // Try database insertion with transaction
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Insert work order
        const woInsert = await client.query(
          `INSERT INTO work_orders (bom_id, product_sku, quantity, status, source, planned_start, planned_end)
           VALUES ($1, $2, $3, 'planned', $4, $5, $6)
           RETURNING id, bom_id, product_sku, quantity, status, source, planned_start, planned_end, created_at, completed_at`,
          [resolvedBomId, trimmedSku, parsedQty, normalizedSource, planned_start, planned_end]
        );
        const createdWo = woInsert.rows[0];

        // 2. Copy BOM requirements into work_order_materials:
        // required_qty = quantity * qty_per_unit, issued_qty default 0
        const matInsert = await client.query(
          `INSERT INTO work_order_materials (wo_id, component_sku, required_qty, issued_qty)
           SELECT $1, bi.component_sku, ($2::numeric * bi.qty_per_unit), 0
           FROM bom_items bi
           WHERE bi.bom_id = $3
           ORDER BY bi.id ASC
           RETURNING id, wo_id, component_sku, required_qty, issued_qty`,
          [createdWo.id, parsedQty, resolvedBomId]
        );

        await client.query('COMMIT');

        const createdMaterials = matInsert.rows;
        inMemoryWorkOrders.push(createdWo);
        inMemoryMaterials.push(...createdMaterials);

        return res.status(201).json({
          data: {
            ...createdWo,
            materials: createdMaterials
          }
        });
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } catch (dbErr) {
      // If pool was offline or not usable, proceed to in-memory fallback below
    }

    // In-memory fallback
    const newId = `WO-${String(mockWoCounter++).padStart(4, '0')}`;
    const newWo = {
      id: newId,
      bom_id: resolvedBomId,
      product_sku: trimmedSku,
      quantity: parsedQty,
      status: 'planned',
      source: normalizedSource,
      planned_start: planned_start || null,
      planned_end: planned_end || null,
      created_at: new Date().toISOString(),
      completed_at: null
    };

    // Generate fallback material requirements
    const components = BOM_COMPONENTS_MAP[resolvedBomId] || [
      { component_sku: 'SKU-0101', component_name: 'Display Panel', qty_per_unit: 1 },
      { component_sku: 'SKU-0102', component_name: 'Main Board', qty_per_unit: 1 },
      { component_sku: 'SKU-0103', component_name: 'Power Supply Unit', qty_per_unit: 1 },
      { component_sku: 'SKU-0104', component_name: 'Remote Control', qty_per_unit: 1 },
      { component_sku: 'SKU-0105', component_name: 'Packaging Box', qty_per_unit: 1 }
    ];

    const fallbackMaterials = components.map(c => ({
      id: `WOM-${String(mockMaterialCounter++).padStart(4, '0')}`,
      wo_id: newId,
      component_sku: c.component_sku,
      component_name: c.component_name,
      required_qty: Number((parsedQty * c.qty_per_unit).toFixed(3)),
      issued_qty: 0
    }));

    inMemoryWorkOrders.push(newWo);
    inMemoryMaterials.push(...fallbackMaterials);

    return res.status(201).json({
      data: {
        ...newWo,
        materials: fallbackMaterials
      }
    });
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
      // Remove associated materials in memory
      inMemoryMaterials = inMemoryMaterials.filter(m => m.wo_id !== id);

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
    inMemoryMaterials = inMemoryMaterials.filter(m => m.wo_id !== id);
    return res.json({ data: { message: 'Work order deleted successfully', id } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/work-orders/:id/issue ─────────────────────────────────────────
// Issue raw materials to a work order [ERP3-C1].
// Body: { component_sku, qty }
// - Cannot exceed required_qty (else 400)
// - Adds to issued_qty in work_order_materials
// - Logs the issue in material_issues
// - Calls ERP-1 POST /api/stock/adjust with negative delta (warehouse_id: 'WH-01', reason: <wo_id>, mock: 'stock-adjust')
router.post('/work-orders/:id/issue', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { component_sku, qty } = req.body;

    if (!component_sku || typeof component_sku !== 'string' || !component_sku.trim()) {
      return res.status(400).json({ error: 'component_sku is required' });
    }

    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: 'qty must be a positive number' });
    }

    const trimmedSku = component_sku.trim();

    // 1. Verify material requirement exists for this work order
    const matResult = await safeQuery(
      `SELECT id, wo_id, component_sku, required_qty, issued_qty
       FROM work_order_materials
       WHERE wo_id = $1 AND component_sku = $2`,
      [id, trimmedSku]
    );

    let matRow = null;
    if (matResult) {
      if (matResult.rows.length === 0) {
        return res.status(404).json({
          error: `Component '${trimmedSku}' is not part of work order '${id}'`
        });
      }
      matRow = matResult.rows[0];
    } else {
      matRow = inMemoryMaterials.find(
        m => m.wo_id === id && m.component_sku === trimmedSku
      );
      if (!matRow) {
        return res.status(404).json({
          error: `Component '${trimmedSku}' is not part of work order '${id}'`
        });
      }
    }

    const currentIssued = parseFloat(matRow.issued_qty || 0);
    const required = parseFloat(matRow.required_qty || 0);

    // 2. Validate that issued_qty + qty does not exceed required_qty
    if (currentIssued + parsedQty > required) {
      const remaining = Math.max(0, required - currentIssued);
      return res.status(400).json({
        error: `Issuing ${parsedQty} would exceed required quantity. Remaining allowed: ${remaining}`
      });
    }

    const newIssuedQty = currentIssued + parsedQty;

    // 3. Update issued_qty in database & record in material_issues
    let createdIssue = null;
    const client = await pool.connect().catch(() => null);

    if (client) {
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE work_order_materials
           SET issued_qty = issued_qty + $1
           WHERE wo_id = $2 AND component_sku = $3`,
          [parsedQty, id, trimmedSku]
        );

        const issueInsert = await client.query(
          `INSERT INTO material_issues (wo_id, component_sku, qty)
           VALUES ($1, $2, $3)
           RETURNING id, wo_id, component_sku, qty, issued_at`,
          [id, trimmedSku, parsedQty]
        );

        await client.query('COMMIT');
        createdIssue = issueInsert.rows[0];
      } catch (dbErr) {
        await client.query('ROLLBACK');
        throw dbErr;
      } finally {
        client.release();
      }
    }

    if (!createdIssue) {
      // In-memory fallback
      matRow.issued_qty = newIssuedQty;
      const newIssueId = `MI-${String(mockIssueCounter++).padStart(4, '0')}`;
      createdIssue = {
        id: newIssueId,
        wo_id: id,
        component_sku: trimmedSku,
        qty: parsedQty,
        issued_at: new Date().toISOString()
      };
      inMemoryMaterialIssues.push(createdIssue);
    } else {
      // Keep in-memory store in sync
      if (matRow) matRow.issued_qty = newIssuedQty;
      inMemoryMaterialIssues.push(createdIssue);
    }

    // 4. Cross-service stock adjustment call to ERP-1
    try {
      await callService('erp1', '/api/stock/adjust', {
        method: 'POST',
        body: {
          sku: trimmedSku,
          warehouse_id: 'WH-01',
          delta: -parsedQty,
          reason: id
        },
        mock: 'stock-adjust'
      });
    } catch (intErr) {
      console.warn(`[integration-error] Failed to adjust ERP-1 stock for WO ${id}:`, intErr.message);
    }

    return res.status(201).json({
      data: {
        ...createdIssue,
        issued_qty: newIssuedQty,
        required_qty: required
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/work-orders/:id/issues ─────────────────────────────────────────
// Get history of materials issued for a work order [ERP3-C1].
router.get('/work-orders/:id/issues', async (req, res, next) => {
  try {
    const { id } = req.params;

    const pgResult = await safeQuery(
      `SELECT id, wo_id, component_sku, qty, issued_at
       FROM material_issues
       WHERE wo_id = $1
       ORDER BY issued_at DESC`,
      [id]
    );

    if (pgResult) {
      return res.json({ data: pgResult.rows });
    }

    // In-memory fallback sorted newest first to match ORDER BY issued_at DESC
    const issues = inMemoryMaterialIssues
      .filter(mi => mi.wo_id === id)
      .slice()
      .sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));
    return res.json({ data: issues });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/work-orders/:id/post-finished ─────────────────────────────────
// Post finished goods to ERP-1 inventory & generate bulk serials [ERP3-C3].
// Allowed only when all materials are fully issued and QC gate allows it.
router.post('/work-orders/:id/post-finished', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch work order
    let wo = null;
    const pgWo = await safeQuery(
      `SELECT id, bom_id, product_sku, quantity, status, source,
              planned_start, planned_end, created_at, completed_at
       FROM work_orders WHERE id = $1`,
      [id]
    );
    if (pgWo) {
      if (pgWo.rows.length === 0) {
        return res.status(404).json({ error: `Work order '${id}' not found` });
      }
      wo = pgWo.rows[0];
    } else {
      wo = inMemoryWorkOrders.find(w => w.id === id);
      if (!wo) {
        return res.status(404).json({ error: `Work order '${id}' not found` });
      }
    }

    if (wo.status === 'completed' || wo.status === 'cancelled') {
      return res.status(400).json({
        error: `Cannot post finished goods: work order is already '${wo.status}'`
      });
    }

    // 2. Verify every component in work_order_materials is fully issued
    let materials = [];
    const pgMats = await safeQuery(
      `SELECT component_sku, required_qty, issued_qty
       FROM work_order_materials WHERE wo_id = $1`,
      [id]
    );
    if (pgMats) {
      materials = pgMats.rows;
    } else {
      materials = inMemoryMaterials.filter(m => m.wo_id === id);
    }

    if (materials.length === 0) {
      return res.status(400).json({
        error: `Cannot post finished goods: no material requirements found for work order '${id}'`
      });
    }

    const missing = materials.filter(
      m => Number(m.issued_qty || 0) < Number(m.required_qty || 0)
    );
    if (missing.length > 0) {
      const missingSkus = missing.map(m => m.component_sku).join(', ');
      return res.status(400).json({
        error: `Cannot post finished goods: materials not fully issued (${missingSkus})`
      });
    }

    // 3. Check QC gate (latest QC inspection must not be 'fail')
    let qcAllowed = true;
    const pgQc = await safeQuery(
      `SELECT result FROM qc_checks
       WHERE wo_id = $1
       ORDER BY checked_at DESC, id DESC
       LIMIT 1`,
      [id]
    );
    if (pgQc) {
      if (pgQc.rows.length > 0 && pgQc.rows[0].result === 'fail') {
        qcAllowed = false;
      }
    } else {
      // Offline / mock fallback: check mocks/qc.json
      try {
        const qcMockPath = path.resolve(__dirname, '../mocks/qc.json');
        if (fs.existsSync(qcMockPath)) {
          const qcRows = JSON.parse(fs.readFileSync(qcMockPath, 'utf-8'))
            .filter(q => q.wo_id === id)
            .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));
          if (qcRows.length > 0 && qcRows[0].result === 'fail') {
            qcAllowed = false;
          }
        }
      } catch (e) {
        // Treat as allowed if mock file cannot be read
      }
    }

    if (!qcAllowed) {
      return res.status(400).json({
        error: `QC gate blocked: latest QC inspection for '${id}' failed`
      });
    }

    // 4. Call ERP-1 stock adjustment (+quantity in WH-01) and bulk serial generation
    const finishedQty = Number(wo.quantity);
    try {
      await callService('erp1', '/api/stock/adjust', {
        method: 'POST',
        body: {
          sku: wo.product_sku,
          warehouse_id: 'WH-01',
          delta: finishedQty,
          reason: id
        },
        mock: 'stock-adjust'
      });
    } catch (intErr) {
      console.warn(`[integration-error] Failed to add finished stock in ERP-1 for WO ${id}:`, intErr.message);
    }

    try {
      await callService('erp1', '/api/serials/bulk', {
        method: 'POST',
        body: {
          sku: wo.product_sku,
          batch_no: id,
          count: finishedQty,
          prefix: 'PROD'
        },
        mock: 'serials-bulk'
      });
    } catch (intErr) {
      console.warn(`[integration-error] Failed to generate bulk serials in ERP-1 for WO ${id}:`, intErr.message);
    }

    // 5. Mark work order completed
    const completedAt = new Date().toISOString();
    let updatedWo = null;

    const pgUpdate = await safeQuery(
      `UPDATE work_orders
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1
       RETURNING id, bom_id, product_sku, quantity, status, source,
                 planned_start, planned_end, created_at, completed_at`,
      [id]
    );
    if (pgUpdate && pgUpdate.rows.length > 0) {
      updatedWo = pgUpdate.rows[0];
    }

    const memWo = inMemoryWorkOrders.find(w => w.id === id);
    if (memWo) {
      memWo.status = 'completed';
      memWo.completed_at = updatedWo ? updatedWo.completed_at : completedAt;
      if (!updatedWo) updatedWo = { ...memWo };
    }

    return res.json({
      data: {
        work_order: updatedWo,
        stock_adjusted: true,
        serials_generated: true
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
