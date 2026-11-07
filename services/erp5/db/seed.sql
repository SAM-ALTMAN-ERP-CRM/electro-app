-- Database seed for ERP-5 Finance & App Shell
-- Invoices INV-0001 to INV-0005 for Orders SO-0001 to SO-0005
-- Credit Notes CN-0001 to CN-0002
-- Adheres strictly to Section 5 Shared Seed Contract

-- Invoices Seed
INSERT INTO invoices (id, so_id, customer_id, customer_name, customer_gstin, sales_rep_id, invoice_date, due_date, subtotal, cgst, sgst, total, status)
VALUES
  ('INV-0001', 'SO-0001', 'CUST-0001', 'Aarav Mehta', NULL, 'EMP-0001', '2026-11-01', '2026-11-16', 9998.00, 899.82, 899.82, 11797.64, 'unpaid'),
  ('INV-0002', 'SO-0002', 'CUST-0002', 'Sunrise Electronics Pvt Ltd', '27AABCS1234F1Z5', 'EMP-0002', '2026-11-02', '2026-11-17', 18993.00, 1709.37, 1709.37, 22411.74, 'unpaid'),
  ('INV-0003', 'SO-0003', 'CUST-0003', 'Priya Nair', NULL, 'EMP-0001', '2026-11-03', '2026-11-18', 5996.00, 539.64, 539.64, 7075.28, 'unpaid'),
  ('INV-0004', 'SO-0004', 'CUST-0004', 'BrightHome Retail LLP', '27AAACB5678G1Z2', 'EMP-0002', '2026-11-04', '2026-11-19', 47980.00, 4318.20, 4318.20, 56616.40, 'unpaid'),
  ('INV-0005', 'SO-0005', 'CUST-0005', 'Kiran Patel', NULL, 'EMP-0001', '2026-11-05', '2026-11-20', 10998.00, 989.82, 989.82, 12977.64, 'unpaid')
ON CONFLICT (id) DO UPDATE SET
  so_id = EXCLUDED.so_id,
  customer_id = EXCLUDED.customer_id,
  customer_name = EXCLUDED.customer_name,
  customer_gstin = EXCLUDED.customer_gstin,
  sales_rep_id = EXCLUDED.sales_rep_id,
  invoice_date = EXCLUDED.invoice_date,
  due_date = EXCLUDED.due_date,
  subtotal = EXCLUDED.subtotal,
  cgst = EXCLUDED.cgst,
  sgst = EXCLUDED.sgst,
  total = EXCLUDED.total,
  status = EXCLUDED.status;

-- Invoice Line Items Seed
INSERT INTO invoice_items (id, invoice_id, sku, description, quantity, unit_price, tax_rate)
VALUES
  ('ITM-0001', 'INV-0001', 'SKU-0001', 'Wireless Noise-Canceling Headphones', 2, 4999.00, 18.00),
  ('ITM-0002', 'INV-0002', 'SKU-0002', 'Smart Fitness Watch', 5, 2999.00, 18.00),
  ('ITM-0003', 'INV-0002', 'SKU-0003', 'Bluetooth Portable Speaker', 2, 1999.00, 18.00),
  ('ITM-0004', 'INV-0003', 'SKU-0004', 'USB-C Fast Charger 65W', 4, 1499.00, 18.00),
  ('ITM-0005', 'INV-0004', 'SKU-0005', 'Mechanical Gaming Keyboard', 10, 3499.00, 18.00),
  ('ITM-0006', 'INV-0004', 'SKU-0006', 'Ergonomic Wireless Mouse', 10, 1299.00, 18.00),
  ('ITM-0007', 'INV-0005', 'SKU-0007', 'Ultra HD 4K Webcam', 2, 5499.00, 18.00)
ON CONFLICT (id) DO UPDATE SET
  invoice_id = EXCLUDED.invoice_id,
  sku = EXCLUDED.sku,
  description = EXCLUDED.description,
  quantity = EXCLUDED.quantity,
  unit_price = EXCLUDED.unit_price,
  tax_rate = EXCLUDED.tax_rate;

-- Seed Credit Notes (2 seed credit notes per ERP5-A4)
INSERT INTO credit_notes (id, so_id, invoice_id, serial_number, amount)
VALUES
  ('CN-0001', 'SO-0001', 'INV-0001', 'SN-0001', 1000.00),
  ('CN-0002', 'SO-0002', 'INV-0002', 'SN-0002', 2999.00)
ON CONFLICT (id) DO UPDATE SET
  so_id = EXCLUDED.so_id,
  invoice_id = EXCLUDED.invoice_id,
  serial_number = EXCLUDED.serial_number,
  amount = EXCLUDED.amount;

-- Advance sequences past seeded IDs
SELECT setval('invoices_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM invoices), 0));
SELECT setval('invoice_items_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM invoice_items), 0));
SELECT setval('credit_notes_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)) FROM credit_notes), 0));
