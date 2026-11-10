const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

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

function validOrder(supplier, date, items) {
  return typeof supplier === 'string' && !!supplier.trim() && validDate(date) && Array.isArray(items) && items.length > 0 && items.every(item => item && typeof item.sku === 'string' && item.sku.trim() && typeof item.product_name === 'string' && item.product_name.trim() && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 2147483647 && typeof item.unit_cost === 'number' && Number.isFinite(item.unit_cost) && item.unit_cost > 0 && item.unit_cost < 10000000000 && Math.abs(item.unit_cost * 100 - Math.round(item.unit_cost * 100)) < 1e-7);
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
    const order = await client.query('INSERT INTO purchase_orders (supplier_id, expected_date) VALUES ($1, $2) RETURNING id', [supplier_id.trim(), expected_date || null]);
    const id = order.rows[0].id;
    for (const item of items) {
      await client.query('INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES ($1, $2, $3, $4, $5)', [id, item.sku.trim(), item.product_name.trim(), item.quantity, item.unit_cost]);
    }
    const result = await client.query(`UPDATE purchase_orders SET total_amount = (SELECT sum(quantity * unit_cost) FROM po_items WHERE po_id = $1)
      WHERE id = $1 RETURNING id, supplier_id, status, to_char(expected_date, 'YYYY-MM-DD') AS expected_date, total_amount, sent_at, created_at`, [id]);
    const savedItems = await client.query('SELECT * FROM po_items WHERE po_id = $1 ORDER BY id', [id]);
    await client.query('COMMIT');
    res.status(201).json({ data: { ...result.rows[0], items: savedItems.rows } });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err.code === '22003') return res.status(400).json({ error: 'Order total is too large' });
    next(err);
  } finally { if (client) client.release(); }
});

// Lock the order while changing its items so sending and editing cannot overlap.
router.put('/purchase-orders/:id', async (req, res, next) => {
  const { supplier_id, expected_date, items } = req.body || {};
  if (!validOrder(supplier_id, expected_date, items)) return res.status(400).json({ error: 'Provide a supplier, valid date, and valid items with positive quantities and costs' });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const found = await client.query('SELECT status FROM purchase_orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!found.rowCount || found.rows[0].status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(found.rowCount ? 400 : 404).json({ error: found.rowCount ? 'Only draft orders can be edited' : 'Purchase order not found' });
    }
    await client.query('DELETE FROM po_items WHERE po_id = $1', [req.params.id]);
    for (const item of items) await client.query('INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES ($1, $2, $3, $4, $5)', [req.params.id, item.sku.trim(), item.product_name.trim(), item.quantity, item.unit_cost]);
    const result = await client.query(`UPDATE purchase_orders SET supplier_id = $1, expected_date = $2, total_amount = (SELECT sum(quantity * unit_cost) FROM po_items WHERE po_id = $3) WHERE id = $3 RETURNING id, supplier_id, status, to_char(expected_date, 'YYYY-MM-DD') AS expected_date, total_amount, sent_at, created_at`, [supplier_id.trim(), expected_date || null, req.params.id]);
    const saved = await client.query('SELECT * FROM po_items WHERE po_id = $1 ORDER BY id', [req.params.id]);
    await client.query('COMMIT');
    res.json({ data: { ...result.rows[0], items: saved.rows } });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err.code === '22003') return res.status(400).json({ error: 'Order total is too large' });
    next(err);
  } finally { if (client) client.release(); }
});

router.delete('/purchase-orders/:id', async (req, res, next) => {
  try {
    const deleted = await pool.query("DELETE FROM purchase_orders WHERE id = $1 AND status = 'draft' RETURNING id", [req.params.id]);
    if (deleted.rowCount) return res.json({ data: deleted.rows[0] });
    const found = await pool.query('SELECT id FROM purchase_orders WHERE id = $1', [req.params.id]);
    return res.status(found.rowCount ? 400 : 404).json({ error: found.rowCount ? 'Only draft orders can be deleted' : 'Purchase order not found' });
  } catch (err) { next(err); }
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
