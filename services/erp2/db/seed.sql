-- Database seed for ERP-2 Procurement & Suppliers (Port 5202, Database erp2_db)
-- Build Issue: [ERP2-B1] Purchase requests API

INSERT INTO purchase_requests (
  id, sku, product_name, quantity, requested_by, reason, status, created_at
) VALUES
  ('PR-0001', 'SKU-0001', '55-inch 4K Smart TV', 50, 'ERP-1', 'Low stock alert threshold reached (5 units left)', 'pending', NOW() - INTERVAL '3 days'),
  ('PR-0002', 'SKU-0002', '43-inch Full HD TV', 30, 'ERP-1', 'Reorder level breached in WH-01', 'approved', NOW() - INTERVAL '2 days'),
  ('PR-0003', 'SKU-0101', 'Display Panel 55 inch', 100, 'ERP-3', 'Short components for manufacturing line 2', 'pending', NOW() - INTERVAL '1 day'),
  ('PR-0004', 'SKU-0004', 'Soundbar 2.1', 25, 'EMP-0001', 'Customer pre-orders surge for festive promotion', 'rejected', NOW() - INTERVAL '12 hours'),
  ('PR-0005', 'SKU-0102', 'Power Supply Unit 12V', 200, 'ERP-3', 'Short components for TV assembly batch #44', 'converted', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- Synchronize sequence with highest ID in table
SELECT setval(
  'purchase_request_seq',
  GREATEST(5, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) FROM purchase_requests WHERE id LIKE 'PR-%'))
);
