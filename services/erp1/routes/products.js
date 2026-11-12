const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-1 database pool
const pool = makePool('erp1_db');

// Protect all products endpoints with authentication
router.use(requireAuth);

// Allowed product categories as per specification
const ALLOWED_CATEGORIES = [
  'TV',
  'Audio',
  'Mobile accessory',
  'Appliance',
  'Component'
];

// In-memory fallback for offline testing or when database is unavailable
let inMemoryProducts = [];

try {
  const prodPath = path.resolve(__dirname, '../mocks/products.json');
  if (fs.existsSync(prodPath)) {
    inMemoryProducts = JSON.parse(fs.readFileSync(prodPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp1] Could not load initial mock products:', err.message);
}

/**
 * Execute a parameterised SQL query safely.
 * Returns null if the database is offline or unreachable.
 */
async function safeQuery(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * Helper to generate next sequential product SKU (e.g. SKU-0016).
 */
async function getNextSkuId() {
  try {
    const seqRes = await pool.query("SELECT nextval('product_id_seq') AS n");
    if (seqRes && seqRes.rows && seqRes.rows.length > 0) {
      return `SKU-${String(seqRes.rows[0].n).padStart(4, '0')}`;
    }
  } catch (err) {
    // Database or sequence not reachable; fallback to in-memory computation
  }

  // Scan existing products in memory
  const existingNums = inMemoryProducts.map(p => {
    if (!p.id || !p.id.startsWith('SKU-')) return 0;
    const num = parseInt(p.id.replace('SKU-', ''), 10);
    return isNaN(num) ? 0 : num;
  });
  const maxNum = Math.max(15, ...existingNums, 0);
  return `SKU-${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * GET /api/products
 * List products with optional category and search query filters.
 * Query params:
 *   - category: filter by product category
 *   - q: search query matching name or brand (or ID)
 *   - active: optional boolean ('true' / 'false')
 */
router.get('/products', async (req, res, next) => {
  try {
    const { category, q, active } = req.query;

    let queryText = `
      SELECT id, name, category, brand, price, tax_rate, reorder_level, active, created_at
      FROM products
    `;
    const conditions = [];
    const values = [];

    if (category) {
      values.push(String(category).trim().toLowerCase());
      conditions.push(`LOWER(category) = $${values.length}`);
    }

    if (q) {
      values.push(`%${String(q).trim()}%`);
      const paramIndex = values.length;
      conditions.push(`(name ILIKE $${paramIndex} OR brand ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`);
    }

    if (active !== undefined) {
      const isActive = active === 'true' || active === true;
      values.push(isActive);
      conditions.push(`active = $${values.length}`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ' ORDER BY id ASC';

    const pgResult = await safeQuery(queryText, values);
    if (pgResult) {
      return res.json({ data: pgResult.rows });
    }

    // In-memory fallback
    let filtered = [...inMemoryProducts];

    if (category) {
      const catLower = String(category).trim().toLowerCase();
      filtered = filtered.filter(p => p.category && p.category.toLowerCase() === catLower);
    }

    if (q) {
      const needle = String(q).trim().toLowerCase();
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(needle)) ||
        (p.brand && p.brand.toLowerCase().includes(needle)) ||
        (p.id && p.id.toLowerCase().includes(needle))
      );
    }

    if (active !== undefined) {
      const isActive = active === 'true' || active === true;
      filtered = filtered.filter(p => p.active === isActive);
    }

    return res.json({ data: filtered });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products/:id
 * Retrieve a single product by SKU ID.
 */
router.get('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const pgResult = await safeQuery(
      `SELECT id, name, category, brand, price, tax_rate, reorder_level, active, created_at
       FROM products
       WHERE id = $1`,
      [id]
    );

    if (pgResult) {
      if (pgResult.rows.length === 0) {
        return res.status(404).json({ error: `Product '${id}' not found` });
      }
      return res.json({ data: pgResult.rows[0] });
    }

    // In-memory fallback
    const match = inMemoryProducts.find(p => p.id === id);
    if (!match) {
      return res.status(404).json({ error: `Product '${id}' not found` });
    }
    return res.json({ data: match });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/products
 * Create a new product.
 * Body: { name, category, brand, price, tax_rate, reorder_level, active }
 */
router.post('/products', async (req, res, next) => {
  try {
    const {
      name,
      category,
      brand = 'Electro',
      price,
      tax_rate = 18.00,
      reorder_level = 10,
      active = true,
      id: customId
    } = req.body || {};

    // 1. Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Product name is required' });
    }
    const trimmedName = name.trim();

    // 2. Validate category
    if (!category || typeof category !== 'string' || !ALLOWED_CATEGORIES.includes(category.trim())) {
      return res.status(400).json({
        error: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
      });
    }
    const normalizedCategory = category.trim();

    // 3. Validate price (must be strictly greater than 0)
    const numericPrice = Number(price);
    if (price === undefined || price === null || isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number greater than 0' });
    }

    // 4. Validate tax_rate (defaults to 18%)
    const numericTaxRate = Number(tax_rate);
    if (isNaN(numericTaxRate) || numericTaxRate < 0) {
      return res.status(400).json({ error: 'tax_rate must be a non-negative number' });
    }

    // 5. Validate reorder_level (non-negative integer)
    const intReorderLevel = parseInt(reorder_level, 10);
    if (isNaN(intReorderLevel) || intReorderLevel < 0) {
      return res.status(400).json({ error: 'reorder_level must be a non-negative integer' });
    }

    const isActive = active !== false;

    // 6. Check for duplicate name (returns 409)
    const nameCheckPg = await safeQuery(
      'SELECT id, name FROM products WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );

    if (nameCheckPg && nameCheckPg.rows.length > 0) {
      return res.status(409).json({ error: `Product with name '${trimmedName}' already exists` });
    }

    const inMemDuplicate = inMemoryProducts.find(
      p => p.name && p.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (inMemDuplicate) {
      return res.status(409).json({ error: `Product with name '${trimmedName}' already exists` });
    }

    // 7. Determine SKU ID
    const productId = customId || (await getNextSkuId());

    // 8. Attempt database insert
    try {
      const insertResult = await pool.query(
        `INSERT INTO products (
          id, name, category, brand, price, tax_rate, reorder_level, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, category, brand, price, tax_rate, reorder_level, active, created_at`,
        [productId, trimmedName, normalizedCategory, String(brand).trim(), numericPrice, numericTaxRate, intReorderLevel, isActive]
      );

      const saved = insertResult.rows[0];
      inMemoryProducts.push(saved);
      return res.status(201).json({ data: saved });
    } catch (dbErr) {
      // Catch unique constraint violation from PostgreSQL (error code 23505)
      if (dbErr.code === '23505') {
        return res.status(409).json({
          error: `Product with name '${trimmedName}' or ID '${productId}' already exists`
        });
      }

      // If database is completely offline, fall back to in-memory store
      const saved = {
        id: productId,
        name: trimmedName,
        category: normalizedCategory,
        brand: String(brand).trim(),
        price: numericPrice.toFixed(2),
        tax_rate: numericTaxRate,
        reorder_level: intReorderLevel,
        active: isActive,
        created_at: new Date().toISOString()
      };
      inMemoryProducts.push(saved);
      return res.status(201).json({ data: saved });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/products/:id
 * Update an existing product.
 * Body: { name, category, brand, price, tax_rate, reorder_level, active }
 */
router.put('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    // 1. Check if product exists in DB or in-memory
    let current = null;
    const currentPg = await safeQuery('SELECT * FROM products WHERE id = $1', [id]);
    if (currentPg && currentPg.rows.length > 0) {
      current = currentPg.rows[0];
    } else {
      current = inMemoryProducts.find(p => p.id === id);
    }

    if (!current) {
      return res.status(404).json({ error: `Product '${id}' not found` });
    }

    // 2. Validate fields if provided
    let newName = current.name;
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return res.status(400).json({ error: 'Product name cannot be empty' });
      }
      newName = body.name.trim();

      // Check duplicate name against other products (returns 409)
      const nameCheckPg = await safeQuery(
        'SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND id <> $2',
        [newName, id]
      );
      if (nameCheckPg && nameCheckPg.rows.length > 0) {
        return res.status(409).json({ error: `Product with name '${newName}' already exists` });
      }

      const inMemDuplicate = inMemoryProducts.find(
        p => p.id !== id && p.name && p.name.trim().toLowerCase() === newName.toLowerCase()
      );
      if (inMemDuplicate) {
        return res.status(409).json({ error: `Product with name '${newName}' already exists` });
      }
    }

    let newCategory = current.category;
    if (body.category !== undefined) {
      if (typeof body.category !== 'string' || !ALLOWED_CATEGORIES.includes(body.category.trim())) {
        return res.status(400).json({
          error: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
        });
      }
      newCategory = body.category.trim();
    }

    let newPrice = current.price;
    if (body.price !== undefined) {
      const parsedPrice = Number(body.price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: 'Price must be a positive number greater than 0' });
      }
      newPrice = parsedPrice;
    }

    let newBrand = body.brand !== undefined ? String(body.brand).trim() : current.brand;

    let newTaxRate = current.tax_rate;
    if (body.tax_rate !== undefined) {
      const parsedTax = Number(body.tax_rate);
      if (isNaN(parsedTax) || parsedTax < 0) {
        return res.status(400).json({ error: 'tax_rate must be a non-negative number' });
      }
      newTaxRate = parsedTax;
    }

    let newReorderLevel = current.reorder_level;
    if (body.reorder_level !== undefined) {
      const parsedLevel = parseInt(body.reorder_level, 10);
      if (isNaN(parsedLevel) || parsedLevel < 0) {
        return res.status(400).json({ error: 'reorder_level must be a non-negative integer' });
      }
      newReorderLevel = parsedLevel;
    }

    let newActive = current.active;
    if (body.active !== undefined) {
      newActive = Boolean(body.active);
    }

    // 3. Update database
    try {
      const updateResult = await pool.query(
        `UPDATE products
         SET name = $1, category = $2, brand = $3, price = $4, tax_rate = $5, reorder_level = $6, active = $7
         WHERE id = $8
         RETURNING id, name, category, brand, price, tax_rate, reorder_level, active, created_at`,
        [newName, newCategory, newBrand, newPrice, newTaxRate, newReorderLevel, newActive, id]
      );

      if (updateResult && updateResult.rows.length > 0) {
        const updated = updateResult.rows[0];
        const memIdx = inMemoryProducts.findIndex(p => p.id === id);
        if (memIdx !== -1) {
          inMemoryProducts[memIdx] = { ...inMemoryProducts[memIdx], ...updated };
        }
        return res.json({ data: updated });
      }
    } catch (dbErr) {
      if (dbErr.code === '23505') {
        return res.status(409).json({ error: `Product with name '${newName}' already exists` });
      }
    }

    // In-memory fallback
    const memIdx = inMemoryProducts.findIndex(p => p.id === id);
    if (memIdx !== -1) {
      inMemoryProducts[memIdx] = {
        ...inMemoryProducts[memIdx],
        name: newName,
        category: newCategory,
        brand: newBrand,
        price: Number(newPrice).toFixed(2),
        tax_rate: newTaxRate,
        reorder_level: newReorderLevel,
        active: newActive
      };
      return res.json({ data: inMemoryProducts[memIdx] });
    }

    return res.status(404).json({ error: `Product '${id}' not found` });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product by SKU ID.
 */
router.delete('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Check existence
    let exists = false;
    const checkPg = await safeQuery('SELECT id, name FROM products WHERE id = $1', [id]);
    if (checkPg && checkPg.rows.length > 0) {
      exists = true;
    } else {
      exists = inMemoryProducts.some(p => p.id === id);
    }

    if (!exists) {
      return res.status(404).json({ error: `Product '${id}' not found` });
    }

    // 2. Attempt deletion in database
    try {
      const deletePg = await pool.query(
        'DELETE FROM products WHERE id = $1 RETURNING id, name',
        [id]
      );

      if (deletePg && deletePg.rows.length > 0) {
        inMemoryProducts = inMemoryProducts.filter(p => p.id !== id);
        return res.json({
          data: {
            message: 'Product deleted successfully',
            id: deletePg.rows[0].id,
            name: deletePg.rows[0].name
          }
        });
      }
    } catch (dbErr) {
      // Foreign key constraint violation (PostgreSQL code 23503)
      if (dbErr.code === '23503') {
        return res.status(400).json({
          error: `Cannot delete product '${id}' because it has related stock, serials or orders`
        });
      }
    }

    // In-memory fallback
    const match = inMemoryProducts.find(p => p.id === id);
    inMemoryProducts = inMemoryProducts.filter(p => p.id !== id);

    return res.json({
      data: {
        message: 'Product deleted successfully',
        id,
        name: match?.name || id
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

