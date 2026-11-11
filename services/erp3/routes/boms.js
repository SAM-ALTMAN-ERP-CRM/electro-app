// services/erp3/routes/boms.js
// Express Router for Bill of Materials (BOMs)
// Mounted at /api by server.js, so full paths are /api/boms

const express = require('express');
const router  = express.Router();
const { Pool } = require('pg');
const { requireAuth } = require('../../_shared/auth');

// Connect to Postgres using the DATABASE_URL from .env
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Protect every route below — caller must be logged in
router.use(requireAuth);

// ─── POST /api/boms ───────────────────────────────────────────────────────────
// Create a new BOM together with its component items in one request.
// Body: { product_sku, product_name, version?, active?, items: [{ component_sku, component_name, qty_per_unit }] }
router.post('/boms', async (req, res) => {
  const { product_sku, product_name, version = 1, active = true, items } = req.body;

  // Validate required fields
  if (!product_sku || !product_name) {
    return res.status(400).json({ error: 'product_sku and product_name are required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array must have at least one component' });
  }

  // Validate each item line
  for (const item of items) {
    if (!item.component_sku || !item.component_name || !item.qty_per_unit) {
      return res.status(400).json({ error: 'Each item needs component_sku, component_name, qty_per_unit' });
    }
    if (Number(item.qty_per_unit) <= 0) {
      return res.status(400).json({ error: 'qty_per_unit must be greater than 0' });
    }
  }

  // Use a transaction so the BOM header and all items are saved together or not at all
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert the BOM header; Postgres assigns the BOM-XXXX id via the sequence default
    const bomResult = await client.query(
      `INSERT INTO boms (product_sku, product_name, version, active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_sku, product_name, version, active]
    );
    const bom = bomResult.rows[0];

    // Insert each component line
    const insertedItems = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO bom_items (bom_id, component_sku, component_name, qty_per_unit)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [bom.id, item.component_sku, item.component_name, Number(item.qty_per_unit)]
      );
      insertedItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    // Return the full BOM with its items
    return res.status(201).json({ data: { ...bom, items: insertedItems } });

  } catch (err) {
    await client.query('ROLLBACK');
    // Postgres unique-constraint violation code = 23505 → duplicate version
    if (err.code === '23505') {
      return res.status(409).json({ error: `BOM version ${version} already exists for ${product_sku}` });
    }
    console.error('[erp3/boms] POST error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release(); // always give the connection back to the pool
  }
});

// ─── GET /api/boms ────────────────────────────────────────────────────────────
// List all BOMs.  Optional query param: ?product_sku=SKU-0001
// Returns header rows with components_count — use GET /api/boms/:id for full items detail.
router.get('/boms', async (req, res) => {
  const { product_sku } = req.query;

  try {
    let query = `
      SELECT b.*, COALESCE(COUNT(bi.id), 0)::int AS components_count
      FROM boms b
      LEFT JOIN bom_items bi ON bi.bom_id = b.id
    `;
    const params = [];

    if (product_sku) {
      // Filter by product SKU when the query param is supplied
      query += ' WHERE b.product_sku = $1';
      params.push(product_sku);
    }

    query += ' GROUP BY b.id ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);
    return res.json({ data: result.rows });

  } catch (err) {
    console.error('[erp3/boms] GET list error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/boms/:id ────────────────────────────────────────────────────────
// Return a single BOM header plus all its component items.
router.get('/boms/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the BOM header
    const bomResult = await pool.query(
      'SELECT * FROM boms WHERE id = $1',
      [id]
    );

    if (bomResult.rows.length === 0) {
      return res.status(404).json({ error: `BOM ${id} not found` });
    }

    // Fetch all component items belonging to this BOM
    const itemsResult = await pool.query(
      'SELECT * FROM bom_items WHERE bom_id = $1 ORDER BY id',
      [id]
    );

    return res.json({ data: { ...bomResult.rows[0], items: itemsResult.rows } });

  } catch (err) {
    console.error('[erp3/boms] GET by id error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
