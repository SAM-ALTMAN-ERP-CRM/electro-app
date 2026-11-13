const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { callService } = require('../../_shared/callService');

const router = express.Router();
const pool = makePool('erp2');
router.use(requireAuth);

router.post('/purchase-requests/:id/convert', async (req, res, next) => {
  const { supplier_id, unit_cost } = req.body || {};
  if (typeof supplier_id !== 'string' || !supplier_id.trim()) {
    return res.status(400).json({ error: 'Select a supplier' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    // Lock the request so two people cannot convert it at the same time.
    const result = await client.query('SELECT * FROM purchase_requests WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase request not found' });
    }
    const request = result.rows[0];
    if (request.status !== 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only approved requests can be converted' });
    }
    const supplier = await client.query('SELECT id FROM suppliers WHERE id = $1 AND active = true', [supplier_id.trim()]);
    if (!supplier.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Select an active supplier' });
    }
    // B1 has no price field, so use the entered cost when none is available.
    const cost = Number(request.product_price ?? unit_cost);
    if (!Number.isFinite(cost) || cost <= 0 || cost >= 10000000000 || Math.abs(cost * 100 - Math.round(cost * 100)) >= 1e-7) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Enter a positive unit cost with at most two decimal places' });
    }
    const order = await callService('erp2', '/api/purchase-orders', {
      method: 'POST',
      body: { supplier_id: supplier_id.trim(), items: [{ sku: request.sku, product_name: request.product_name, quantity: request.quantity, unit_cost: cost }] }
    });
    await client.query("UPDATE purchase_requests SET status = 'converted' WHERE id = $1", [request.id]);
    await client.query('COMMIT');
    return res.status(201).json({ data: order });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return next(err);
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
