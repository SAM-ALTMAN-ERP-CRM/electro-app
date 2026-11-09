-- Database seed for ERP1: Inventory and Warehouses (Section 5 Shared Seed Contract)

-- 1. Insert Warehouses
INSERT INTO warehouses (id, name, city) VALUES
  ('WH-01', 'Mumbai Central Warehouse', 'Mumbai'),
  ('WH-02', 'Delhi Regional Warehouse', 'Delhi'),
  ('WH-03', 'Bengaluru Distribution Hub', 'Bengaluru')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city;

-- 2. Insert Products (SKU-0001 to SKU-0015 and Components SKU-0101 to SKU-0105)
INSERT INTO products (id, name, category, brand, price, tax_rate, reorder_level, active) VALUES
  ('SKU-0001', '55-inch 4K Smart TV', 'TV', 'Electro', 42990.00, 18.00, 10, TRUE),
  ('SKU-0002', '43-inch Full HD TV', 'TV', 'Electro', 24990.00, 18.00, 10, TRUE),
  ('SKU-0003', '65-inch OLED TV', 'TV', 'Electro', 94990.00, 18.00, 10, TRUE),
  ('SKU-0004', 'Soundbar 2.1', 'Audio', 'Electro', 8990.00, 18.00, 10, TRUE),
  ('SKU-0005', 'Soundbar 5.1', 'Audio', 'Electro', 17990.00, 18.00, 10, TRUE),
  ('SKU-0006', 'Wireless Headphones', 'Audio', 'Electro', 3499.00, 18.00, 10, TRUE),
  ('SKU-0007', 'Bluetooth Earbuds', 'Audio', 'Electro', 2299.00, 18.00, 10, TRUE),
  ('SKU-0008', '20W Fast Charger', 'Mobile accessory', 'Electro', 899.00, 18.00, 10, TRUE),
  ('SKU-0009', 'Power Bank 20000mAh', 'Mobile accessory', 'Electro', 1799.00, 18.00, 10, TRUE),
  ('SKU-0010', 'Bluetooth Speaker', 'Audio', 'Electro', 4999.00, 18.00, 10, TRUE),
  ('SKU-0011', 'Party Speaker', 'Audio', 'Electro', 14999.00, 18.00, 10, TRUE),
  ('SKU-0012', 'Mixer-Grinder 750W', 'Appliance', 'Electro', 3999.00, 18.00, 10, TRUE),
  ('SKU-0013', 'Air Fryer 4L', 'Appliance', 'Electro', 6499.00, 18.00, 10, TRUE),
  ('SKU-0014', 'Microwave Oven 25L', 'Appliance', 'Electro', 9999.00, 18.00, 10, TRUE),
  ('SKU-0015', 'Induction Cooktop', 'Appliance', 'Electro', 2999.00, 18.00, 10, TRUE),
  ('SKU-0101', '55-inch Panel', 'Component', 'Electro', 12500.00, 18.00, 10, TRUE),
  ('SKU-0102', 'Mainboard', 'Component', 'Electro', 4990.00, 18.00, 10, TRUE),
  ('SKU-0103', 'Power Supply', 'Component', 'Electro', 2500.00, 18.00, 10, TRUE),
  ('SKU-0104', 'Remote', 'Component', 'Electro', 650.00, 18.00, 10, TRUE),
  ('SKU-0105', 'Packaging Box', 'Component', 'Electro', 350.00, 18.00, 10, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  brand = EXCLUDED.brand,
  price = EXCLUDED.price,
  tax_rate = EXCLUDED.tax_rate,
  reorder_level = EXCLUDED.reorder_level,
  active = EXCLUDED.active;

-- 3. Insert Stock (following demo rules: SKU-0003 total 3, SKU-0102 total 4, others 25 to 120)
INSERT INTO stock (sku, warehouse_id, quantity) VALUES
  -- SKU-0001 (Total: 75)
  ('SKU-0001', 'WH-01', 35), ('SKU-0001', 'WH-02', 25), ('SKU-0001', 'WH-03', 15),
  -- SKU-0002 (Total: 50)
  ('SKU-0002', 'WH-01', 20), ('SKU-0002', 'WH-02', 20), ('SKU-0002', 'WH-03', 10),
  -- SKU-0003 (Demo Low Stock: Total 3 <= 10 reorder_level)
  ('SKU-0003', 'WH-01', 2),  ('SKU-0003', 'WH-02', 1),  ('SKU-0003', 'WH-03', 0),
  -- SKU-0004 (Total: 60)
  ('SKU-0004', 'WH-01', 30), ('SKU-0004', 'WH-02', 20), ('SKU-0004', 'WH-03', 10),
  -- SKU-0005 (Total: 40)
  ('SKU-0005', 'WH-01', 20), ('SKU-0005', 'WH-02', 10), ('SKU-0005', 'WH-03', 10),
  -- SKU-0006 (Total: 85)
  ('SKU-0006', 'WH-01', 40), ('SKU-0006', 'WH-02', 25), ('SKU-0006', 'WH-03', 20),
  -- SKU-0007 (Total: 90)
  ('SKU-0007', 'WH-01', 45), ('SKU-0007', 'WH-02', 25), ('SKU-0007', 'WH-03', 20),
  -- SKU-0008 (Total: 120)
  ('SKU-0008', 'WH-01', 50), ('SKU-0008', 'WH-02', 40), ('SKU-0008', 'WH-03', 30),
  -- SKU-0009 (Total: 100)
  ('SKU-0009', 'WH-01', 40), ('SKU-0009', 'WH-02', 35), ('SKU-0009', 'WH-03', 25),
  -- SKU-0010 (Total: 55)
  ('SKU-0010', 'WH-01', 25), ('SKU-0010', 'WH-02', 15), ('SKU-0010', 'WH-03', 15),
  -- SKU-0011 (Total: 30)
  ('SKU-0011', 'WH-01', 15), ('SKU-0011', 'WH-02', 10), ('SKU-0011', 'WH-03', 5),
  -- SKU-0012 (Total: 45)
  ('SKU-0012', 'WH-01', 20), ('SKU-0012', 'WH-02', 15), ('SKU-0012', 'WH-03', 10),
  -- SKU-0013 (Total: 35)
  ('SKU-0013', 'WH-01', 15), ('SKU-0013', 'WH-02', 10), ('SKU-0013', 'WH-03', 10),
  -- SKU-0014 (Total: 25)
  ('SKU-0014', 'WH-01', 10), ('SKU-0014', 'WH-02', 10), ('SKU-0014', 'WH-03', 5),
  -- SKU-0015 (Total: 40)
  ('SKU-0015', 'WH-01', 20), ('SKU-0015', 'WH-02', 10), ('SKU-0015', 'WH-03', 10),
  -- Components
  -- SKU-0101 (Total: 30)
  ('SKU-0101', 'WH-01', 15), ('SKU-0101', 'WH-02', 10), ('SKU-0101', 'WH-03', 5),
  -- SKU-0102 (Demo Low Stock: Total 4 <= 10 reorder_level)
  ('SKU-0102', 'WH-01', 2),  ('SKU-0102', 'WH-02', 2),  ('SKU-0102', 'WH-03', 0),
  -- SKU-0103 (Total: 50)
  ('SKU-0103', 'WH-01', 25), ('SKU-0103', 'WH-02', 15), ('SKU-0103', 'WH-03', 10),
  -- SKU-0104 (Total: 60)
  ('SKU-0104', 'WH-01', 30), ('SKU-0104', 'WH-02', 20), ('SKU-0104', 'WH-03', 10),
  -- SKU-0105 (Total: 80)
  ('SKU-0105', 'WH-01', 40), ('SKU-0105', 'WH-02', 25), ('SKU-0105', 'WH-03', 15)
ON CONFLICT (sku, warehouse_id) DO UPDATE SET
  quantity = EXCLUDED.quantity;

-- 4. Insert Batch for SKU-0001
INSERT INTO batches (batch_no, sku, quantity, manufactured_on) VALUES
  ('BATCH-2611-01', 'SKU-0001', 30, '2026-11-01')
ON CONFLICT (batch_no) DO NOTHING;

-- 5. Insert Serials for SKU-0001 (0001 to 0005 sold, 0006 to 0030 in_stock)
INSERT INTO serials (serial_number, sku, batch_no, warehouse_id, status) VALUES
  ('TV55-2611-0001', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'sold'),
  ('TV55-2611-0002', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'sold'),
  ('TV55-2611-0003', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'sold'),
  ('TV55-2611-0004', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'sold'),
  ('TV55-2611-0005', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'sold'),
  ('TV55-2611-0006', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'in_stock'),
  ('TV55-2611-0007', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'in_stock'),
  ('TV55-2611-0008', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'in_stock'),
  ('TV55-2611-0009', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'in_stock'),
  ('TV55-2611-0010', 'SKU-0001', 'BATCH-2611-01', 'WH-01', 'in_stock'),
  ('TV55-2611-0011', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0012', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0013', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0014', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0015', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0016', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0017', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0018', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0019', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0020', 'SKU-0001', 'BATCH-2611-01', 'WH-02', 'in_stock'),
  ('TV55-2611-0021', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock'),
  ('TV55-2611-0022', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock'),
  ('TV55-2611-0023', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock'),
  ('TV55-2611-0024', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock'),
  ('TV55-2611-0025', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock'),
  ('TV55-2611-0026', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock'),
  ('TV55-2611-0027', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock'),
  ('TV55-2611-0028', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock'),
  ('TV55-2611-0029', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock'),
  ('TV55-2611-0030', 'SKU-0001', 'BATCH-2611-01', 'WH-03', 'in_stock')
ON CONFLICT (serial_number) DO UPDATE SET
  status = EXCLUDED.status;
