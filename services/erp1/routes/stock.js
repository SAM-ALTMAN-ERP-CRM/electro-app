const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-1 database pool
const pool = makePool('erp1_db');

// Protect all stock endpoints with authentication middleware
router.use(requireAuth);

// Standard warehouse list matching Section 5 seed contract
const STANDARD_WAREHOUSES = [
  { id: 'WH-01', name: 'Mumbai Central Warehouse', city: 'Mumbai' },
  { id: 'WH-02', name: 'Delhi Regional Warehouse', city: 'Delhi' },
  { id: 'WH-03', name: 'Bengaluru Distribution Hub', city: 'Bengaluru' }
];

// In-memory fallback stores for offline testing / development
let inMemoryWarehouses = [...STANDARD_WAREHOUSES];
let inMemoryProducts = [];
let inMemoryStock = [];
let inMemoryMovements = [];
let mockMovementCounter = 1;

try {
  const prodPath = path.resolve(__dirname, '../mocks/products.json');
  if (fs.existsSync(prodPath)) {
    inMemoryProducts = JSON.parse(fs.readFileSync(prodPath, 'utf-8'));
  }
  const stockPath = path.resolve(__dirname, '../mocks/stock.json');
  if (fs.existsSync(stockPath)) {
    inMemoryStock = JSON.parse(fs.readFileSync(stockPath, 'utf-8'));
  }
  const movPath = path.resolve(__dirname, '../mocks/movements.json');
  if (fs.existsSync(movPath)) {
    inMemoryMovements = JSON.parse(fs.readFileSync(movPath, 'utf-8'));
    mockMovementCounter = inMemoryMovements.length + 1;
  }
} catch (err) {
  console.warn('[erp1] Could not load mock stock data:', err.message);
}

/**
 * Checks whether a database error means PostgreSQL is unreachable or not configured.
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
 * Helper to check if SKU exists in products or stock in-memory.
 */
function inMemorySkuExists(sku) {
  const inProd = inMemoryProducts.some(p => p.id === sku);
  const inStock = inMemoryStock.some(s => s.sku === sku);
  return inProd || inStock;
}

/**
 * Helper to get product name by SKU in-memory.
 */
function inMemoryGetProductName(sku) {
  const prod = inMemoryProducts.find(p => p.id === sku);
  return prod ? prod.name : sku;
}

// ---------------------------------------------------------------------------
// GET /stock/check — Check total stock availability across all warehouses
// ---------------------------------------------------------------------------
router.get('/stock/check', async (req, res, next) => {
  try {
    const { sku, qty } = req.query;

    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      return res.status(400).json({ error: 'SKU is required as a query parameter' });
    }
    const cleanSku = sku.trim();

    if (qty === undefined || qty === null || qty === '') {
      return res.status(400).json({ error: 'Quantity (qty) is required as a query parameter' });
    }
    const qtyNum = parseInt(qty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ error: 'Quantity (qty) must be a positive integer greater than zero' });
    }

    try {
      const dbRes = await pool.query(
        'SELECT COALESCE(SUM(quantity), 0)::INT AS total FROM stock WHERE sku = $1',
        [cleanSku]
      );
      const totalStock = dbRes.rows.length > 0 ? Number(dbRes.rows[0].total) : 0;
      const isAvailable = totalStock >= qtyNum;

      return res.json({
        available: isAvailable,
        total: totalStock,
        data: {
          available: isAvailable,
          total: totalStock
        }
      });
    } catch (dbErr) {
      if (!isDbUnavailable(dbErr)) throw dbErr;
    }

    // In-memory fallback
    const totalStock = inMemoryStock
      .filter(s => s.sku === cleanSku)
      .reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const isAvailable = totalStock >= qtyNum;

    return res.json({
      available: isAvailable,
      total: totalStock,
      data: {
        available: isAvailable,
        total: totalStock
      }
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /stock/movements — Stock movement audit history (newest first)
// ---------------------------------------------------------------------------
router.get('/stock/movements', async (req, res, next) => {
  try {
    const { sku, warehouse_id, limit = 100 } = req.query;

    try {
      let query = `
        SELECT id, sku, warehouse_id, delta, reason, created_at
        FROM stock_movements
      `;
      const params = [];
      const conditions = [];

      if (sku) {
        params.push(sku);
        conditions.push(`sku = $${params.length}`);
      }
      if (warehouse_id) {
        params.push(warehouse_id);
        conditions.push(`warehouse_id = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      params.push(parseInt(limit, 10) || 100);
      query += ` ORDER BY created_at DESC, id DESC LIMIT $${params.length}`;

      const dbRes = await pool.query(query, params);
      return res.json({ data: dbRes.rows });
    } catch (dbErr) {
      if (!isDbUnavailable(dbErr)) throw dbErr;
    }

    // In-memory fallback
    let list = [...inMemoryMovements];
    if (sku) {
      list = list.filter(m => m.sku === sku);
    }
    if (warehouse_id) {
      list = list.filter(m => m.warehouse_id === warehouse_id);
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const max = parseInt(limit, 10) || 100;
    return res.json({ data: list.slice(0, max) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /stock — Multi-warehouse stock breakdown with optional ?sku= filter
// ---------------------------------------------------------------------------
router.get('/stock', async (req, res, next) => {
  try {
    const { sku } = req.query;

    try {
      if (sku && sku.trim()) {
        const targetSku = sku.trim();

        // Check if SKU exists in products or stock
        const skuCheck = await pool.query(
          `SELECT id, name FROM products WHERE id = $1
           UNION
           SELECT DISTINCT sku AS id, sku AS name FROM stock WHERE sku = $1`,
          [targetSku]
        );

        if (skuCheck.rows.length === 0) {
          return res.status(404).json({ error: `Product SKU '${targetSku}' not found` });
        }

        const productName = skuCheck.rows[0].name;

        // Query warehouses and their stock for this SKU
        const stockRes = await pool.query(
          `SELECT w.id AS warehouse_id, w.name, w.city, COALESCE(s.quantity, 0)::INT AS quantity
           FROM warehouses w
           LEFT JOIN stock s ON s.warehouse_id = w.id AND s.sku = $1
           ORDER BY w.id ASC`,
          [targetSku]
        );

        const totalStock = stockRes.rows.reduce((sum, r) => sum + Number(r.quantity), 0);

        return res.json({
          data: {
            sku: targetSku,
            product_name: productName,
            warehouses: stockRes.rows,
            total_stock: totalStock
          }
        });
      }

      // No SKU filter provided — return all stock grouped by SKU
      const allStockRes = await pool.query(
        `SELECT
           COALESCE(p.id, s.sku) AS sku,
           COALESCE(p.name, s.sku) AS product_name,
           w.id AS warehouse_id,
           w.name AS warehouse_name,
           w.city AS warehouse_city,
           COALESCE(s.quantity, 0)::INT AS quantity
         FROM warehouses w
         CROSS JOIN (
           SELECT id, name FROM products
           UNION
           SELECT DISTINCT sku AS id, sku AS name FROM stock
         ) p
         LEFT JOIN stock s ON s.sku = p.id AND s.warehouse_id = w.id
         ORDER BY sku ASC, w.id ASC`
      );

      const groupedMap = new Map();

      for (const row of allStockRes.rows) {
        if (!groupedMap.has(row.sku)) {
          groupedMap.set(row.sku, {
            sku: row.sku,
            product_name: row.product_name,
            warehouses: [],
            total_stock: 0
          });
        }
        const item = groupedMap.get(row.sku);
        item.warehouses.push({
          warehouse_id: row.warehouse_id,
          name: row.warehouse_name,
          city: row.warehouse_city,
          quantity: row.quantity
        });
        item.total_stock += row.quantity;
      }

      return res.json({ data: Array.from(groupedMap.values()) });
    } catch (dbErr) {
      if (!isDbUnavailable(dbErr)) throw dbErr;
    }

    // In-memory fallback
    if (sku && sku.trim()) {
      const targetSku = sku.trim();
      if (!inMemorySkuExists(targetSku)) {
        return res.status(404).json({ error: `Product SKU '${targetSku}' not found` });
      }

      const productName = inMemoryGetProductName(targetSku);
      const warehouses = inMemoryWarehouses.map(w => {
        const entry = inMemoryStock.find(s => s.sku === targetSku && s.warehouse_id === w.id);
        return {
          warehouse_id: w.id,
          name: w.name,
          city: w.city,
          quantity: entry ? Number(entry.quantity) : 0
        };
      });

      const totalStock = warehouses.reduce((sum, w) => sum + w.quantity, 0);

      return res.json({
        data: {
          sku: targetSku,
          product_name: productName,
          warehouses,
          total_stock: totalStock
        }
      });
    }

    // Return all items in-memory
    const skuSet = new Set();
    inMemoryProducts.forEach(p => skuSet.add(p.id));
    inMemoryStock.forEach(s => skuSet.add(s.sku));

    const sortedSkus = Array.from(skuSet).sort();
    const result = sortedSkus.map(itemSku => {
      const productName = inMemoryGetProductName(itemSku);
      let total = 0;
      const warehouses = inMemoryWarehouses.map(w => {
        const entry = inMemoryStock.find(s => s.sku === itemSku && s.warehouse_id === w.id);
        const qty = entry ? Number(entry.quantity) : 0;
        total += qty;
        return {
          warehouse_id: w.id,
          name: w.name,
          city: w.city,
          quantity: qty
        };
      });

      return {
        sku: itemSku,
        product_name: productName,
        warehouses,
        total_stock: total
      };
    });

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /stock/adjust — Adjust stock (+/-) with transaction & movement logging
// ---------------------------------------------------------------------------
router.post('/stock/adjust', async (req, res, next) => {
  const { sku, warehouse_id, delta, reason } = req.body || {};

  // 1. Validate required fields
  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    return res.status(400).json({ error: 'SKU is required and must be a non-empty string' });
  }
  if (!warehouse_id || typeof warehouse_id !== 'string' || !warehouse_id.trim()) {
    return res.status(400).json({ error: 'Warehouse ID is required and must be a non-empty string' });
  }

  const cleanSku = sku.trim();
  const cleanWh = warehouse_id.trim();

  // 2. Validate delta: must be a non-zero integer
  const deltaNum = Number(delta);
  if (!Number.isInteger(deltaNum) || deltaNum === 0) {
    return res.status(400).json({ error: 'Delta must be a non-zero integer (positive or negative)' });
  }

  const cleanReason = (typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Manual stock adjustment';

  // 3. Database execution with transaction
  let client = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Check warehouse exists
    const whCheck = await client.query('SELECT id, name FROM warehouses WHERE id = $1', [cleanWh]);
    if (whCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(404).json({ error: `Warehouse '${cleanWh}' not found` });
    }

    // Check SKU exists
    const skuCheck = await client.query(
      `SELECT id FROM products WHERE id = $1
       UNION
       SELECT DISTINCT sku AS id FROM stock WHERE sku = $1`,
      [cleanSku]
    );
    if (skuCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(404).json({ error: `Product SKU '${cleanSku}' not found` });
    }

    // Lock and get current stock
    const stockRow = await client.query(
      'SELECT quantity FROM stock WHERE sku = $1 AND warehouse_id = $2 FOR UPDATE',
      [cleanSku, cleanWh]
    );

    const prevQty = stockRow.rows.length > 0 ? Number(stockRow.rows[0].quantity) : 0;
    const newQty = prevQty + deltaNum;

    if (newQty < 0) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(400).json({
        error: `Insufficient stock: stock cannot be negative (current: ${prevQty}, requested delta: ${deltaNum})`
      });
    }

    // Upsert stock record
    await client.query(
      `INSERT INTO stock (sku, warehouse_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (sku, warehouse_id)
       DO UPDATE SET quantity = $3`,
      [cleanSku, cleanWh, newQty]
    );

    // Insert movement record
    const movRes = await client.query(
      `INSERT INTO stock_movements (sku, warehouse_id, delta, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sku, warehouse_id, delta, reason, created_at`,
      [cleanSku, cleanWh, deltaNum, cleanReason]
    );

    await client.query('COMMIT');
    client.release();
    client = null;

    const movement = movRes.rows[0];
    return res.json({
      data: {
        sku: cleanSku,
        warehouse_id: cleanWh,
        previous_quantity: prevQty,
        new_quantity: newQty,
        delta: deltaNum,
        reason: cleanReason,
        movement_id: movement.id
      }
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        // Ignore rollback error
      }
      client.release();
      client = null;
    }

    if (!isDbUnavailable(err)) {
      return next(err);
    }
  }

  // 4. In-memory fallback
  const wh = inMemoryWarehouses.find(w => w.id === cleanWh);
  if (!wh) {
    return res.status(404).json({ error: `Warehouse '${cleanWh}' not found` });
  }

  if (!inMemorySkuExists(cleanSku)) {
    return res.status(404).json({ error: `Product SKU '${cleanSku}' not found` });
  }

  let stockEntry = inMemoryStock.find(s => s.sku === cleanSku && s.warehouse_id === cleanWh);
  const prevQty = stockEntry ? Number(stockEntry.quantity) : 0;
  const newQty = prevQty + deltaNum;

  if (newQty < 0) {
    return res.status(400).json({
      error: `Insufficient stock: stock cannot be negative (current: ${prevQty}, requested delta: ${deltaNum})`
    });
  }

  if (stockEntry) {
    stockEntry.quantity = newQty;
  } else {
    inMemoryStock.push({ sku: cleanSku, warehouse_id: cleanWh, quantity: newQty });
  }

  const movementId = `MOV-${String(mockMovementCounter++).padStart(4, '0')}`;
  const movement = {
    id: movementId,
    sku: cleanSku,
    warehouse_id: cleanWh,
    delta: deltaNum,
    reason: cleanReason,
    created_at: new Date().toISOString()
  };
  inMemoryMovements.unshift(movement);

  return res.json({
    data: {
      sku: cleanSku,
      warehouse_id: cleanWh,
      previous_quantity: prevQty,
      new_quantity: newQty,
      delta: deltaNum,
      reason: cleanReason,
      movement_id: movementId
    }
  });
});

// ---------------------------------------------------------------------------
// POST /transfers — Inter-warehouse stock transfer (dual update + 2 movements)
// ---------------------------------------------------------------------------
router.post('/transfers', async (req, res, next) => {
  const { sku, from_wh, to_wh, qty } = req.body || {};

  // 1. Validate inputs
  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    return res.status(400).json({ error: 'SKU is required and must be a non-empty string' });
  }
  if (!from_wh || typeof from_wh !== 'string' || !from_wh.trim()) {
    return res.status(400).json({ error: 'Source warehouse (from_wh) is required' });
  }
  if (!to_wh || typeof to_wh !== 'string' || !to_wh.trim()) {
    return res.status(400).json({ error: 'Destination warehouse (to_wh) is required' });
  }

  const cleanSku = sku.trim();
  const cleanFromWh = from_wh.trim();
  const cleanToWh = to_wh.trim();

  // Reject transfers to the same warehouse
  if (cleanFromWh === cleanToWh) {
    return res.status(400).json({ error: 'Source and destination warehouses cannot be the same' });
  }

  // Reject zero or negative quantities
  const qtyNum = Number(qty);
  if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
    return res.status(400).json({ error: 'Transfer quantity must be a positive integer greater than zero' });
  }

  // 2. Database transaction execution
  let client = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Check source warehouse exists
    const fromCheck = await client.query('SELECT id FROM warehouses WHERE id = $1', [cleanFromWh]);
    if (fromCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(404).json({ error: `Source warehouse '${cleanFromWh}' not found` });
    }

    // Check destination warehouse exists
    const toCheck = await client.query('SELECT id FROM warehouses WHERE id = $1', [cleanToWh]);
    if (toCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(404).json({ error: `Destination warehouse '${cleanToWh}' not found` });
    }

    // Check SKU exists
    const skuCheck = await client.query(
      `SELECT id FROM products WHERE id = $1
       UNION
       SELECT DISTINCT sku AS id FROM stock WHERE sku = $1`,
      [cleanSku]
    );
    if (skuCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(404).json({ error: `Product SKU '${cleanSku}' not found` });
    }

    // Lock and check source warehouse stock
    const sourceStockRes = await client.query(
      'SELECT quantity FROM stock WHERE sku = $1 AND warehouse_id = $2 FOR UPDATE',
      [cleanSku, cleanFromWh]
    );

    const sourceCurrent = sourceStockRes.rows.length > 0 ? Number(sourceStockRes.rows[0].quantity) : 0;
    if (sourceCurrent < qtyNum) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(400).json({
        error: `Insufficient stock at source warehouse ${cleanFromWh} (available: ${sourceCurrent}, requested: ${qtyNum})`
      });
    }

    // Lock destination warehouse stock
    const destStockRes = await client.query(
      'SELECT quantity FROM stock WHERE sku = $1 AND warehouse_id = $2 FOR UPDATE',
      [cleanSku, cleanToWh]
    );
    const destCurrent = destStockRes.rows.length > 0 ? Number(destStockRes.rows[0].quantity) : 0;

    const sourceNew = sourceCurrent - qtyNum;
    const destNew = destCurrent + qtyNum;

    // Deduct source stock
    await client.query(
      'UPDATE stock SET quantity = $1 WHERE sku = $2 AND warehouse_id = $3',
      [sourceNew, cleanSku, cleanFromWh]
    );

    // Increment destination stock (insert if not present)
    await client.query(
      `INSERT INTO stock (sku, warehouse_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (sku, warehouse_id)
       DO UPDATE SET quantity = $3`,
      [cleanSku, cleanToWh, destNew]
    );

    // Log two movements: source negative, destination positive
    await client.query(
      `INSERT INTO stock_movements (sku, warehouse_id, delta, reason)
       VALUES ($1, $2, $3, $4)`,
      [cleanSku, cleanFromWh, -qtyNum, `Transfer to ${cleanToWh}`]
    );

    await client.query(
      `INSERT INTO stock_movements (sku, warehouse_id, delta, reason)
       VALUES ($1, $2, $3, $4)`,
      [cleanSku, cleanToWh, qtyNum, `Transfer from ${cleanFromWh}`]
    );

    await client.query('COMMIT');
    client.release();
    client = null;

    return res.json({
      data: {
        sku: cleanSku,
        from_wh: cleanFromWh,
        to_wh: cleanToWh,
        qty: qtyNum,
        source_new_stock: sourceNew,
        target_new_stock: destNew
      }
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        // Ignore rollback error
      }
      client.release();
      client = null;
    }

    if (!isDbUnavailable(err)) {
      return next(err);
    }
  }

  // 3. In-memory fallback
  const sourceWh = inMemoryWarehouses.find(w => w.id === cleanFromWh);
  if (!sourceWh) {
    return res.status(404).json({ error: `Source warehouse '${cleanFromWh}' not found` });
  }

  const destWh = inMemoryWarehouses.find(w => w.id === cleanToWh);
  if (!destWh) {
    return res.status(404).json({ error: `Destination warehouse '${cleanToWh}' not found` });
  }

  if (!inMemorySkuExists(cleanSku)) {
    return res.status(404).json({ error: `Product SKU '${cleanSku}' not found` });
  }

  let sourceEntry = inMemoryStock.find(s => s.sku === cleanSku && s.warehouse_id === cleanFromWh);
  const sourceCurrent = sourceEntry ? Number(sourceEntry.quantity) : 0;

  if (sourceCurrent < qtyNum) {
    return res.status(400).json({
      error: `Insufficient stock at source warehouse ${cleanFromWh} (available: ${sourceCurrent}, requested: ${qtyNum})`
    });
  }

  let destEntry = inMemoryStock.find(s => s.sku === cleanSku && s.warehouse_id === cleanToWh);
  const destCurrent = destEntry ? Number(destEntry.quantity) : 0;

  const sourceNew = sourceCurrent - qtyNum;
  const destNew = destCurrent + qtyNum;

  sourceEntry.quantity = sourceNew;

  if (destEntry) {
    destEntry.quantity = destNew;
  } else {
    inMemoryStock.push({ sku: cleanSku, warehouse_id: cleanToWh, quantity: destNew });
  }

  // Log 2 movements in reverse chronological order
  const now = new Date().toISOString();
  inMemoryMovements.unshift({
    id: `MOV-${String(mockMovementCounter++).padStart(4, '0')}`,
    sku: cleanSku,
    warehouse_id: cleanToWh,
    delta: qtyNum,
    reason: `Transfer from ${cleanFromWh}`,
    created_at: now
  });

  inMemoryMovements.unshift({
    id: `MOV-${String(mockMovementCounter++).padStart(4, '0')}`,
    sku: cleanSku,
    warehouse_id: cleanFromWh,
    delta: -qtyNum,
    reason: `Transfer to ${cleanToWh}`,
    created_at: now
  });

  return res.json({
    data: {
      sku: cleanSku,
      from_wh: cleanFromWh,
      to_wh: cleanToWh,
      qty: qtyNum,
      source_new_stock: sourceNew,
      target_new_stock: destNew
    }
  });
});

module.exports = router;
