-- Database seed for ERP-4: Sales Orders & Dispatch

-- Clear existing data cleanly (re-runnable script)
DELETE FROM returns;
DELETE FROM dispatch_serials;
DELETE FROM dispatches;
DELETE FROM reservations;
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

-- Seed reservations for SO-0001 to SO-0005 (reserved per shared seed contract)
INSERT INTO reservations (id, so_id, sku, quantity, status, created_at)
VALUES
  ('RES-0001', 'SO-0001', 'SKU-0001', 1, 'reserved', '2026-10-01 10:05:00+05:30'),
  ('RES-0002', 'SO-0002', 'SKU-0001', 1, 'reserved', '2026-10-05 11:35:00+05:30'),
  ('RES-0003', 'SO-0003', 'SKU-0001', 1, 'reserved', '2026-10-10 14:20:00+05:30'),
  ('RES-0004', 'SO-0004', 'SKU-0001', 1, 'reserved', '2026-10-15 16:50:00+05:30'),
  ('RES-0005', 'SO-0005', 'SKU-0001', 1, 'reserved', '2026-10-20 09:25:00+05:30');

-- Seed dispatches DSP-0001 to DSP-0005 (fulfilling SO-0001 to SO-0005)
INSERT INTO dispatches (id, so_id, courier, tracking_no, status, ship_date, delivered_date, address, created_at)
VALUES
  ('DSP-0001', 'SO-0001', 'BlueDart', 'BD-98210341', 'delivered', '2026-10-02', '2026-10-04', '1201 Marina Bay, Bandra West, Mumbai 400050', '2026-10-02 11:00:00+05:30'),
  ('DSP-0002', 'SO-0002', 'Delhivery', 'DL-44820192', 'delivered', '2026-10-06', '2026-10-08', 'Plot 45, MIDC Industrial Area, Andheri East, Mumbai 400093', '2026-10-06 14:00:00+05:30'),
  ('DSP-0003', 'SO-0003', 'DTDC', 'DT-77192033', 'delivered', '2026-10-11', '2026-10-13', '8B Palm Meadows, Panampilly Nagar, Kochi 682036', '2026-10-11 16:30:00+05:30'),
  ('DSP-0004', 'SO-0004', 'BlueDart', 'BD-11209384', 'shipped', '2026-10-16', NULL, 'Shop 12-14, Phoenix Market City, Viman Nagar, Pune 411014', '2026-10-16 10:15:00+05:30'),
  ('DSP-0005', 'SO-0005', 'Delhivery', 'DL-88291044', 'shipped', '2026-10-21', NULL, '504 Sunrise Heights, Bodakdev, Ahmedabad 380054', '2026-10-21 12:45:00+05:30');

-- Allocated serials for dispatches (matching ERP-1 sold serials TV55-2611-0001 to 0005)
INSERT INTO dispatch_serials (dispatch_id, sku, serial_number)
VALUES
  ('DSP-0001', 'SKU-0001', 'TV55-2611-0001'),
  ('DSP-0002', 'SKU-0001', 'TV55-2611-0002'),
  ('DSP-0003', 'SKU-0001', 'TV55-2611-0003'),
  ('DSP-0004', 'SKU-0001', 'TV55-2611-0004'),
  ('DSP-0005', 'SKU-0001', 'TV55-2611-0005');

-- 4 seed returns referencing serials TV55-2611-0001 to 0004 per contract
INSERT INTO returns (id, so_id, serial_number, reason, rma_id, outcome, status, created_at)
VALUES
  ('RET-0001', 'SO-0001', 'TV55-2611-0001', 'Display flickering at 4K resolution', 'RMA-0001', 'credit_note', 'received', '2026-10-12 11:00:00+05:30'),
  ('RET-0002', 'SO-0002', 'TV55-2611-0002', 'Dead pixel in upper left quadrant', 'RMA-0002', 'replacement', 'received', '2026-10-14 15:30:00+05:30'),
  ('RET-0003', 'SO-0003', 'TV55-2611-0003', 'HDMI 2.1 eARC port unresponsive', 'RMA-0003', 'credit_note', 'requested', '2026-10-18 09:45:00+05:30'),
  ('RET-0004', 'SO-0004', 'TV55-2611-0004', 'Audio distortion at high volumes', 'RMA-0004', 'replacement', 'requested', '2026-10-22 13:20:00+05:30');

-- Update sequence counters so new records begin at next sequence number
SELECT setval('so_id_seq', 5, true);
SELECT setval('res_id_seq', 5, true);
SELECT setval('dsp_id_seq', 5, true);
SELECT setval('ret_id_seq', 4, true);
