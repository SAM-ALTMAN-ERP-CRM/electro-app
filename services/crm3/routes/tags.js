const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

router.use(requireAuth);

// Load initial mock tags and mock customers for offline resilience
let inMemoryTags = [];
let inMemoryCustomers = [];
try {
  const tagsMockPath = path.resolve(__dirname, '../mocks/customer_tags.json');
  if (fs.existsSync(tagsMockPath)) {
    inMemoryTags = JSON.parse(fs.readFileSync(tagsMockPath, 'utf-8'));
  }
  const custMockPath = path.resolve(__dirname, '../mocks/customers.json');
  if (fs.existsSync(custMockPath)) {
    inMemoryCustomers = JSON.parse(fs.readFileSync(custMockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[crm3] Could not pre-load mock tags/customers:', err.message);
}

/**
 * Helper to check if a customer exists (DB first, fallback to in-memory seed).
 */
async function customerExists(customerId) {
  try {
    const res = await pool.query('SELECT id FROM customers WHERE id = $1', [customerId]);
    return res.rows.length > 0;
  } catch (err) {
    return inMemoryCustomers.some(c => c.id === customerId);
  }
}

/**
 * GET /api/customers/:id/tags
 * Fetches all tags assigned to a customer.
 */
router.get('/customers/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;

    const exists = await customerExists(id);
    if (!exists) {
      return res.status(404).json({ error: `Customer '${id}' not found` });
    }

    try {
      const pgRes = await pool.query(
        'SELECT tag FROM customer_tags WHERE customer_id = $1 ORDER BY tag ASC',
        [id]
      );
      return res.json({ data: pgRes.rows.map(r => r.tag) });
    } catch (dbErr) {
      const matched = inMemoryTags
        .filter(t => t.customer_id === id)
        .map(t => t.tag)
        .sort();
      return res.json({ data: matched });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers/:id/tags
 * Adds a tag to a customer.
 * Body: { tag }
 */
router.post('/customers/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tag } = req.body || {};

    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const exists = await customerExists(id);
    if (!exists) {
      return res.status(404).json({ error: `Customer '${id}' not found` });
    }

    const cleanTag = tag.trim();

    try {
      await pool.query(
        `INSERT INTO customer_tags (customer_id, tag)
         VALUES ($1, $2)
         ON CONFLICT (customer_id, tag) DO NOTHING`,
        [id, cleanTag]
      );

      const allRes = await pool.query(
        'SELECT tag FROM customer_tags WHERE customer_id = $1 ORDER BY tag ASC',
        [id]
      );
      const tags = allRes.rows.map(r => r.tag);

      return res.status(201).json({
        data: { customer_id: id, tag: cleanTag },
        tags
      });
    } catch (dbErr) {
      // Return 404 if PostgreSQL explicitly reports missing parent customer (FK violation)
      if (dbErr.code === '23503') {
        return res.status(404).json({ error: `Customer '${id}' not found` });
      }

      const duplicate = inMemoryTags.some(
        t => t.customer_id === id && t.tag.toLowerCase() === cleanTag.toLowerCase()
      );
      if (!duplicate) {
        inMemoryTags.push({ customer_id: id, tag: cleanTag });
      }
      const tags = inMemoryTags
        .filter(t => t.customer_id === id)
        .map(t => t.tag)
        .sort();

      return res.status(201).json({
        data: { customer_id: id, tag: cleanTag },
        tags
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * Shared delete handler for both path param and body/query forms.
 */
async function handleDeleteTag(req, res, next) {
  try {
    const { id } = req.params;
    const rawTag = req.params.tag || req.body?.tag || req.query?.tag;

    if (!rawTag || !String(rawTag).trim()) {
      return res.status(400).json({ error: 'Tag parameter is required' });
    }

    const exists = await customerExists(id);
    if (!exists) {
      return res.status(404).json({ error: `Customer '${id}' not found` });
    }

    const cleanTag = decodeURIComponent(String(rawTag)).trim();

    try {
      await pool.query(
        'DELETE FROM customer_tags WHERE customer_id = $1 AND LOWER(tag) = LOWER($2)',
        [id, cleanTag]
      );
    } catch (dbErr) {
      // Fallback to in-memory removal when DB is offline
    }

    inMemoryTags = inMemoryTags.filter(
      t => !(t.customer_id === id && t.tag.toLowerCase() === cleanTag.toLowerCase())
    );

    return res.json({
      data: {
        message: `Tag '${cleanTag}' removed successfully`,
        customer_id: id,
        tag: cleanTag
      }
    });
  } catch (err) {
    next(err);
  }
}

router.delete('/customers/:id/tags/:tag', handleDeleteTag);
router.delete('/customers/:id/tags', handleDeleteTag);

module.exports = router;