const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Database pool for ERP-1 Inventory & Warehouses
const pool = makePool('erp1_db');

// Protect all ERP-1 inventory & alerts routes with authentication middleware
router.use(requireAuth);

// In-memory fallback stores for offline testing / development
let inMemoryProducts = [];
let inMemoryStock = [];
let inMemoryAlerts = [];
let mockAlertCounter = 1;

try {
  const prodPath = path.resolve(__dirname, '../mocks/products.json');
  if (fs.existsSync(prodPath)) {
    inMemoryProducts = JSON.parse(fs.readFileSync(prodPath, 'utf-8'));
  }
  const stockPath = path.resolve(__dirname, '../mocks/stock.json');
  if (fs.existsSync(stockPath)) {
    inMemoryStock = JSON.parse(fs.readFileSync(stockPath, 'utf-8'));
  }
  const alertPath = path.resolve(__dirname, '../mocks/alerts.json');
  if (fs.existsSync(alertPath)) {
    inMemoryAlerts = JSON.parse(fs.readFileSync(alertPath, 'utf-8'));
    mockAlertCounter = inMemoryAlerts.length + 1;
  }
} catch (err) {
  console.warn('[erp1] Could not load initial mock data:', err.message);
}

/**
 * Execute a parameterised SQL query safely.
 * Returns null if the database is unreachable or offline.
 */
async function safeQuery(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * Helper to compute in-memory low-stock items.
 */
function getInMemoryLowStock() {
  const lowItems = [];
  for (const p of inMemoryProducts) {
    if (p.active === false) continue;
    const skuStock = inMemoryStock
      .filter(s => s.sku === p.id)
      .reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const reorderLevel = Number(p.reorder_level || 10);
    if (skuStock <= reorderLevel) {
      lowItems.push({
        sku: p.id,
        name: p.name,
        category: p.category,
        brand: p.brand || 'Electro',
        price: p.price,
        reorder_level: reorderLevel,
        current_stock: skuStock,
        shortfall: reorderLevel - skuStock
      });
    }
  }
  return lowItems.sort((a, b) => b.shortfall - a.shortfall);
}

/**
 * GET /api/alerts/low-stock
 * Returns products whose total stock across all warehouses is at or below reorder_level, with shortfall.
 */
router.get('/alerts/low-stock', async (req, res, next) => {
  try {
    const pgResult = await safeQuery(`
      SELECT p.id AS sku, p.name, p.category, p.brand, p.price, p.reorder_level,
             COALESCE(SUM(s.quantity), 0)::INT AS current_stock,
             (p.reorder_level - COALESCE(SUM(s.quantity), 0))::INT AS shortfall
      FROM products p
      LEFT JOIN stock s ON p.id = s.sku
      WHERE p.active = TRUE
      GROUP BY p.id, p.name, p.category, p.brand, p.price, p.reorder_level
      HAVING COALESCE(SUM(s.quantity), 0) <= p.reorder_level
      ORDER BY (p.reorder_level - COALESCE(SUM(s.quantity), 0)) DESC, p.id ASC
    `);

    if (pgResult) {
      return res.json({ data: pgResult.rows });
    }

    return res.json({ data: getInMemoryLowStock() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/alerts/scan
 * Scans products and total stock. Inserts alerts for low items that have no unacknowledged alert.
 * Scanning twice creates no duplicates.
 */
router.post('/alerts/scan', async (req, res, next) => {
  try {
    // 1. Fetch current low-stock products
    let lowItems = [];
    const pgLow = await safeQuery(`
      SELECT p.id AS sku, p.name, p.reorder_level,
             COALESCE(SUM(s.quantity), 0)::INT AS current_stock,
             (p.reorder_level - COALESCE(SUM(s.quantity), 0))::INT AS shortfall
      FROM products p
      LEFT JOIN stock s ON p.id = s.sku
      WHERE p.active = TRUE
      GROUP BY p.id, p.name, p.reorder_level
      HAVING COALESCE(SUM(s.quantity), 0) <= p.reorder_level
    `);

    if (pgLow) {
      lowItems = pgLow.rows;
    } else {
      lowItems = getInMemoryLowStock();
    }

    const createdAlerts = [];

    for (const item of lowItems) {
      const message = `Low stock alert for ${item.name} (${item.sku}): current stock ${item.current_stock} is at or below reorder level ${item.reorder_level} (shortfall: ${item.shortfall})`;

      // Check if an unacknowledged alert already exists in PostgreSQL
      const pgExisting = await safeQuery(
        'SELECT id FROM alerts_log WHERE sku = $1 AND acknowledged = FALSE LIMIT 1',
        [item.sku]
      );

      if (pgExisting) {
        if (pgExisting.rows.length === 0) {
          const insertResult = await safeQuery(
            `INSERT INTO alerts_log (sku, message, acknowledged)
             VALUES ($1, $2, FALSE)
             RETURNING id, sku, message, acknowledged, created_at`,
            [item.sku, message]
          );
          if (insertResult && insertResult.rows.length > 0) {
            createdAlerts.push(insertResult.rows[0]);
          }
        }
      } else {
        // In-memory fallback
        const existingInMemory = inMemoryAlerts.find(
          a => a.sku === item.sku && a.acknowledged === false
        );
        if (!existingInMemory) {
          const id = `ALT-${String(mockAlertCounter++).padStart(4, '0')}`;
          const newAlert = {
            id,
            sku: item.sku,
            message,
            acknowledged: false,
            created_at: new Date().toISOString()
          };
          inMemoryAlerts.push(newAlert);
          createdAlerts.push(newAlert);
        }
      }
    }

    return res.status(201).json({
      data: {
        scanned: lowItems.length,
        created: createdAlerts,
        count: createdAlerts.length,
        message: `Scan complete: ${createdAlerts.length} new alert(s) generated`
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alerts
 * Lists alerts. Optional filter ?acknowledged=false|true|all (defaults to false).
 */
router.get('/alerts', async (req, res, next) => {
  try {
    const { acknowledged } = req.query;

    let filterClause = 'WHERE acknowledged = FALSE';
    let filterBool = false;

    if (acknowledged === 'true') {
      filterClause = 'WHERE acknowledged = TRUE';
      filterBool = true;
    } else if (acknowledged === 'all') {
      filterClause = '';
      filterBool = null;
    }

    const pgResult = await safeQuery(`
      SELECT id, sku, message, acknowledged, created_at
      FROM alerts_log
      ${filterClause}
      ORDER BY created_at DESC, id DESC
    `);

    if (pgResult) {
      return res.json({ data: pgResult.rows, count: pgResult.rows.length });
    }

    // In-memory fallback
    let filtered = inMemoryAlerts;
    if (filterBool !== null) {
      filtered = inMemoryAlerts.filter(a => a.acknowledged === filterBool);
    }
    return res.json({ data: filtered, count: filtered.length });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/alerts/:id/ack
 * Acknowledges an alert by setting acknowledged = TRUE.
 */
router.patch('/alerts/:id/ack', async (req, res, next) => {
  try {
    const { id } = req.params;

    const pgResult = await safeQuery(
      `UPDATE alerts_log
       SET acknowledged = TRUE
       WHERE id = $1
       RETURNING id, sku, message, acknowledged, created_at`,
      [id]
    );

    if (pgResult) {
      if (pgResult.rows.length === 0) {
        return res.status(404).json({ error: `Alert '${id}' not found` });
      }
      return res.json({ data: pgResult.rows[0] });
    }

    // In-memory fallback
    const alert = inMemoryAlerts.find(a => a.id === id);
    if (!alert) {
      return res.status(404).json({ error: `Alert '${id}' not found` });
    }
    alert.acknowledged = true;
    return res.json({ data: alert });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/products/:id/reorder-level
 * Updates the reorder_level for a product.
 * Body: { reorder_level }
 */
router.put('/products/:id/reorder-level', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reorder_level } = req.body || {};

    if (reorder_level === undefined || reorder_level === null) {
      return res.status(400).json({ error: 'reorder_level is required' });
    }

    const parsedLevel = parseInt(reorder_level, 10);
    if (isNaN(parsedLevel) || parsedLevel < 0) {
      return res.status(400).json({ error: 'reorder_level must be a non-negative integer' });
    }

    const pgResult = await safeQuery(
      `UPDATE products
       SET reorder_level = $1
       WHERE id = $2
       RETURNING id, name, category, brand, price, tax_rate, reorder_level, active, created_at`,
      [parsedLevel, id]
    );

    if (pgResult) {
      if (pgResult.rows.length === 0) {
        return res.status(404).json({ error: `Product '${id}' not found` });
      }
      return res.json({ data: pgResult.rows[0] });
    }

    // In-memory fallback
    const product = inMemoryProducts.find(p => p.id === id);
    if (!product) {
      return res.status(404).json({ error: `Product '${id}' not found` });
    }
    product.reorder_level = parsedLevel;
    return res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
