const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { createPurchaseOrder } = require('../order-creation');

const router = express.Router();
const pool = makePool('erp2');
const statuses = ['draft', 'sent', 'partially_received', 'received', 'cancelled'];
router.use(requireAuth);

function validDate(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

router.get('/purchase-orders', async (req, res, next) => {
  try {
    const { status } = req.query;
    if (status !== undefined && !statuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const result = await pool.query(
      `SELECT id, supplier_id, status, to_char(expected_date, 'YYYY-MM-DD') AS expected_date,
              total_amount, sent_at, created_at FROM purchase_orders
       WHERE ($1::text IS NULL OR status = $1) ORDER BY created_at DESC, id DESC`,
      [status || null]
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

router.get('/purchase-orders/:id', async (req, res, next) => {
  try {
    const order = await pool.query(
      `SELECT id, supplier_id, status, to_char(expected_date, 'YYYY-MM-DD') AS expected_date,
              total_amount, sent_at, created_at FROM purchase_orders WHERE id = $1`, [req.params.id]
    );
    if (!order.rowCount) return res.status(404).json({ error: 'Purchase order not found' });
    const items = await pool.query('SELECT * FROM po_items WHERE po_id = $1 ORDER BY id', [req.params.id]);
    res.json({ data: { ...order.rows[0], items: items.rows } });
  } catch (err) { next(err); }
});

router.post('/purchase-orders', async (req, res, next) => {
  const { supplier_id, expected_date, items } = req.body || {};
  if (typeof supplier_id !== 'string' || !supplier_id.trim() || !validDate(expected_date) || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Supplier, valid expected date and at least one item are required' });
  }
  const validItems = items.every(item => item && typeof item.sku === 'string' && item.sku.trim() &&
    typeof item.product_name === 'string' && item.product_name.trim() && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 2147483647 &&
    typeof item.unit_cost === 'number' && Number.isFinite(item.unit_cost) && item.unit_cost > 0 && item.unit_cost < 10000000000 && Math.abs(item.unit_cost * 100 - Math.round(item.unit_cost * 100)) < 1e-7);
  if (!validItems) return res.status(400).json({ error: 'Each item needs a SKU, name, positive integer quantity and positive unit cost with at most two decimals' });
  let client;
  try {
    client = await pool.connect();
    // Save the order and its items together, or save nothing.
    await client.query('BEGIN');
    const order = await createPurchaseOrder(client, supplier_id.trim(), expected_date, items);
    await client.query('COMMIT');
    res.status(201).json({ data: order });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err.code === '22003') return res.status(400).json({ error: 'Order total is too large' });
    next(err);
  } finally { if (client) client.release(); }
});

router.patch('/purchase-orders/:id/status', async (req, res, next) => {
  const { status } = req.body || {};
  if (!statuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const result = await pool.query(`UPDATE purchase_orders SET status = $1,
      sent_at = CASE WHEN $1 = 'sent' THEN COALESCE(sent_at, now()) ELSE sent_at END
      WHERE id = $2 RETURNING id, supplier_id, status, to_char(expected_date, 'YYYY-MM-DD') AS expected_date, total_amount, sent_at, created_at`, [status, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Purchase order not found' });
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
