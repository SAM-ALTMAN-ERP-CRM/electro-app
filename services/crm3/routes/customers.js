const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

router.use(requireAuth);

let inMemoryCustomers = [];
try {
  const custMockPath = path.resolve(__dirname, '../mocks/customers.json');
  if (fs.existsSync(custMockPath)) {
    inMemoryCustomers = JSON.parse(fs.readFileSync(custMockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[crm3] Could not load mock customers:', err.message);
}

async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/customers
 * Supports ?q= and ?type=
 */
router.get('/customers', async (req, res, next) => {
  try {
    const { q, type } = req.query;

    const dbResult = await safeQuery('SELECT * FROM customers ORDER BY id ASC');
    let list = (dbResult && dbResult.rows) ? dbResult.rows : inMemoryCustomers;

    if (type) {
      list = list.filter(c => c.type && c.type.toLowerCase() === type.toLowerCase());
    }
    if (q) {
      const qLower = q.toLowerCase();
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(qLower)) ||
        (c.email && c.email.toLowerCase().includes(qLower)) ||
        (c.city && c.city.toLowerCase().includes(qLower)) ||
        (c.id && c.id.toLowerCase().includes(qLower))
      );
    }

    return res.json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id
 */
router.get('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbResult = await safeQuery('SELECT * FROM customers WHERE id = $1', [id]);
    if (dbResult && dbResult.rows && dbResult.rows.length > 0) {
      return res.json(dbResult.rows[0]);
    }

    const found = inMemoryCustomers.find(c => c.id === id);
    if (found) {
      return res.json(found);
    }

    return res.status(404).json({ error: `Customer not found: ${id}` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
