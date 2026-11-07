-- Database seed for ERP-5 Finance & App Shell

-- 1. Demo Users Seed
INSERT INTO users (id, name, email, password_hash, role, employee_id, active)
VALUES
  ('USR-0001','System Administrator','admin@demo.com',
   'pbkdf2:electro5salt0001:eb3bcf3730db6983b507acb4f8f62b25580c0bc945baeae8a43867c740fe6bfd',
   'admin','EMP-0012',true),
  ('USR-0002','Rohan Kulkarni','sales@demo.com',
   'pbkdf2:electro5salt0002:1e4cf698b0995fbf3308635a58d664172c08df4c5a165afa42fe4a9739e36c80',
   'sales','EMP-0001',true),
  ('USR-0003','Support Agent','support@demo.com',
   'pbkdf2:electro5salt0003:305662f676b53048a4ca1b2b31c4a3b4edd5c63ae8688a8d51760a5a9f94dc1b',
   'support',NULL,true),
  ('USR-0004','Warehouse Manager','warehouse@demo.com',
   'pbkdf2:electro5salt0004:61c44c1d7ff0dcd08a7dfb65036951a5fc19795bc1ed76ba175f9281bb84fdac',
   'warehouse',NULL,true),
  ('USR-0005','Finance Manager','finance@demo.com',
   'pbkdf2:electro5salt0005:9a0084684ad1f51d4761aea553bc9f73c447bc66531b06745460504f2ff0cb32',
   'finance','EMP-0010',true),
  ('USR-0006','HR Manager','hr@demo.com',
   'pbkdf2:electro5salt0006:9dbbda31a8a5a1f60e296b0b2a8f960b545bb81136d89b2b54a0b929923dd870',
   'hr','EMP-0008',true)
ON CONFLICT (email) DO NOTHING;

-- 2. Invoices Seed
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

-- 3. Invoice Line Items Seed
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

-- Advance sequences past seeded IDs
SELECT setval('users_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM users), 0) + 1, false);
SELECT setval('invoices_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM invoices), 0) + 1, false);
SELECT setval('invoice_items_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM invoice_items), 0) + 1, false);
SELECT setval('payments_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM payments), 0) + 1, false);
SELECT setval('credit_notes_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM credit_notes), 0) + 1, false);
SELECT setval('ledger_entries_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)) FROM ledger_entries), 0) + 1, false);
