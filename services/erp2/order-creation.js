// Both PO creation paths use the same database operations.
async function createPurchaseOrder(client, supplierId, expectedDate, items) {
  const order = await client.query('INSERT INTO purchase_orders (supplier_id, expected_date) VALUES ($1, $2) RETURNING id', [supplierId, expectedDate || null]);
  const id = order.rows[0].id;
  for (const item of items) {
    await client.query('INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES ($1, $2, $3, $4, $5)', [id, item.sku.trim(), item.product_name.trim(), item.quantity, item.unit_cost]);
  }
  const result = await client.query(`UPDATE purchase_orders SET total_amount = (SELECT sum(quantity * unit_cost) FROM po_items WHERE po_id = $1)
    WHERE id = $1 RETURNING id, supplier_id, status, to_char(expected_date, 'YYYY-MM-DD') AS expected_date, total_amount, sent_at, created_at`, [id]);
  const savedItems = await client.query('SELECT * FROM po_items WHERE po_id = $1 ORDER BY id', [id]);
  return { ...result.rows[0], items: savedItems.rows };
}

module.exports = { createPurchaseOrder };
