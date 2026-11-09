const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

router.use(requireAuth);

let inMemoryTags = [];
try {
  const tagsMockPath = path.resolve(__dirname, '../mocks/customer_tags.json');
  if (fs.existsSync(tagsMockPath)) {
    inMemoryTags = JSON.parse(fs.readFileSync(tagsMockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[crm3] Could not pre-load mock customer tags:', err.message);
}

async function safeQuery(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/customers/:id/tags
 * Fetches all tags assigned to a customer.
 */
router.get('/customers/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;

    const pgRes = await safeQuery(
      'SELECT tag FROM customer_tags WHERE customer_id = $1 ORDER BY tag ASC',
      [id]
    );

    if (pgRes) {
      const tags = pgRes.rows.map(r => r.tag);
      return res.json({ data: tags });
    }

    const matched = inMemoryTags
      .filter(t => t.customer_id === id)
      .map(t => t.tag);
    return res.json({ data: matched });
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
      const exists = inMemoryTags.some(t => t.customer_id === id && t.tag.toLowerCase() === cleanTag.toLowerCase());
      if (!exists) {
        inMemoryTags.push({ customer_id: id, tag: cleanTag });
      }
      const tags = inMemoryTags
        .filter(t => t.customer_id === id)
        .map(t => t.tag);

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
 * DELETE /api/customers/:id/tags/:tag
 * Removes a tag from a customer.
 */
router.delete('/customers/:id/tags/:tag', async (req, res, next) => {
  try {
    const { id, tag } = req.params;
    if (!tag) {
      return res.status(400).json({ error: 'Tag parameter is required' });
    }

    const cleanTag = decodeURIComponent(tag).trim();

    await safeQuery(
      'DELETE FROM customer_tags WHERE customer_id = $1 AND LOWER(tag) = LOWER($2)',
      [id, cleanTag]
    );

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
});

/**
 * DELETE /api/customers/:id/tags (supports body { tag } or ?tag=)
 */
router.delete('/customers/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tag = req.body?.tag || req.query?.tag;

    if (!tag) {
      return res.status(400).json({ error: 'Tag parameter is required' });
    }

    const cleanTag = String(tag).trim();

    await safeQuery(
      'DELETE FROM customer_tags WHERE customer_id = $1 AND LOWER(tag) = LOWER($2)',
      [id, cleanTag]
    );

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
});

module.exports = router;
