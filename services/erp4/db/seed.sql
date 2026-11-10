-- Database seed for ERP-4: Sales Orders & Dispatch

-- Clear existing data cleanly (re-runnable script)
DELETE FROM so_items;
DELETE FROM sales_orders;

-- 5 seed sales orders conforming to the Section 5 shared seed contract (CUST-0001 to CUST-0005)
INSERT INTO sales_orders (id, quote_id, customer_id, customer_name, customer_gstin, sales_rep_id, status, total_amount, created_at)
VALUES
  ('SO-0001', 'QUO-0001', 'CUST-0001', 'Aarav Mehta', NULL, 'EMP-0001', 'dispatched', 42990.00, '2026-10-01 10:00:00+05:30'),
  ('SO-0002', 'QUO-0002', 'CUST-0002', 'Sunrise Electronics Pvt Ltd', '27AABCS1234F1Z5', 'EMP-0002', 'dispatched', 42990.00, '2026-10-05 11:30:00+05:30'),
  ('SO-0003', 'QUO-0003', 'CUST-0003', 'Priya Nair', NULL, 'EMP-0001', 'dispatched', 42990.00, '2026-10-10 14:15:00+05:30'),
  ('SO-0004', 'QUO-0004', 'CUST-0004', 'BrightHome Retail LLP', '27AABCB5678G1Z1', 'EMP-0003', 'dispatched', 42990.00, '2026-10-15 16:45:00+05:30'),
  ('SO-0005', 'QUO-0005', 'CUST-0005', 'Kiran Patel', NULL, 'EMP-0004', 'dispatched', 42990.00, '2026-10-20 09:20:00+05:30');

-- Line items for each sales order (each contains 1 unit of SKU-0001 55-inch 4K Smart TV at ₹42,990.00)
INSERT INTO so_items (so_id, sku, product_name, quantity, unit_price)
VALUES
  ('SO-0001', 'SKU-0001', '55-inch 4K Smart TV', 1, 42990.00),
  ('SO-0002', 'SKU-0001', '55-inch 4K Smart TV', 1, 42990.00),
  ('SO-0003', 'SKU-0001', '55-inch 4K Smart TV', 1, 42990.00),
  ('SO-0004', 'SKU-0001', '55-inch 4K Smart TV', 1, 42990.00),
  ('SO-0005', 'SKU-0001', '55-inch 4K Smart TV', 1, 42990.00);

-- Update sequence counter so newly created orders begin at SO-0006
SELECT setval('so_id_seq', 5, true);
