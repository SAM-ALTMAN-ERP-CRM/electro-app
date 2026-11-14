-- ==============================================================================
-- ERP-2 Seed Data: 6 Suppliers (SUP-0001 to SUP-0006) and Supplier Ratings
-- Conforms to Section 5 Shared Seed Contract
-- Issues:
--   - [ERP2-A1] Suppliers table and API (#74)
--   - [ERP2-A3] Supplier rating (#76)
-- ==============================================================================

-- 1. Suppliers Master
INSERT INTO suppliers (id, name, contact_person, phone, email, city, gstin, payment_terms, rating, active)
VALUES
    ('SUP-0001', 'Precision Display Panels Ltd', 'Vikram Malhotra', '+91 98201 12345', 'orders@precisiondisplay.co.in', 'Pune', '27AAACP1234A1Z5', 'net30', 4.80, true),
    ('SUP-0002', 'Silicon Chipsets Pvt Ltd', 'Neha Deshmukh', '+91 98450 67890', 'supplies@siliconchips.com', 'Bengaluru', '29AABCS5678B1Z2', 'net15', 4.50, true),
    ('SUP-0003', 'Apex Power Systems', 'Rajesh Nair', '+91 94471 23456', 'sales@apexpower.in', 'Kochi', '32AAACA9012C1Z8', 'advance', 4.20, true),
    ('SUP-0004', 'Sonic Sound Components', 'Sunil Rao', '+91 98860 34567', 'info@sonicsound.co.in', 'Bengaluru', '29AAACS3456D1Z1', 'net30', 4.60, true),
    ('SUP-0005', 'Metro Polymer & Packaging', 'Amitabh Sen', '+91 98300 45678', 'dispatch@metropolymer.com', 'Kolkata', '19AAACM7890E1Z6', 'net15', 4.00, true),
    ('SUP-0006', 'Optima Cables & Harnesses', 'Kavita Joshi', '+91 98220 56789', 'orders@optimacables.in', 'Mumbai', '27AAACO4567F1Z3', 'net30', 4.40, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    city = EXCLUDED.city,
    gstin = EXCLUDED.gstin,
    payment_terms = EXCLUDED.payment_terms,
    rating = EXCLUDED.rating,
    active = EXCLUDED.active;

-- Advance suppliers sequence
SELECT setval('suppliers_seq', 6, true);

-- 2. Supplier Ratings [ERP2-A3]
INSERT INTO supplier_ratings (id, supplier_id, delivery_score, quality_score, comment, created_at)
VALUES
    ('RAT-0001', 'SUP-0001', 4.8, 4.8, 'Consistent on-time delivery and top panel quality', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('RAT-0002', 'SUP-0002', 4.5, 4.5, 'Reliable silicon components and good packaging', CURRENT_TIMESTAMP - INTERVAL '8 days'),
    ('RAT-0003', 'SUP-0003', 4.2, 4.2, 'Standard lead times, decent transformer units', CURRENT_TIMESTAMP - INTERVAL '6 days'),
    ('RAT-0004', 'SUP-0004', 4.6, 4.6, 'High fidelity audio drivers with zero defects', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('RAT-0005', 'SUP-0005', 4.0, 4.0, 'Durable polymer frames, slightly slow dispatch', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('RAT-0006', 'SUP-0006', 4.4, 4.4, 'Quality cable looms with full testing certificates', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET
    supplier_id = EXCLUDED.supplier_id,
    delivery_score = EXCLUDED.delivery_score,
    quality_score = EXCLUDED.quality_score,
    comment = EXCLUDED.comment;

-- Advance ratings sequence
SELECT setval('supplier_ratings_seq', 6, true);

-- Database seed for ERP2
INSERT INTO purchase_orders (id, supplier_id, status, expected_date, total_amount, sent_at) VALUES
  ('PO-0001', 'SUP-0001', 'sent', '2026-11-20', 30000.00, '2026-11-01'),
  ('PO-0002', 'SUP-0002', 'partially_received', '2026-11-18', 20000.00, '2026-11-02'),
  ('PO-0003', 'SUP-0003', 'received', '2026-11-10', 15000.00, '2026-10-25'),
  ('PO-0004', 'SUP-0004', 'draft', '2026-11-30', 5000.00, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO po_items (id, po_id, sku, product_name, quantity, unit_cost, received_qty) VALUES
  ('POI-0001', 'PO-0001', 'SKU-0101', 'TV panel', 10, 3000.00, 0),
  ('POI-0002', 'PO-0002', 'SKU-0102', 'Mainboard', 10, 2000.00, 4),
  ('POI-0003', 'PO-0003', 'SKU-0103', 'Power supply', 10, 1500.00, 10),
  ('POI-0004', 'PO-0004', 'SKU-0104', 'Remote', 10, 300.00, 0),
  ('POI-0005', 'PO-0004', 'SKU-0105', 'Packaging box', 10, 200.00, 0)
ON CONFLICT (id) DO NOTHING;

-- 3. Goods Receipts [ERP2-D1]
INSERT INTO goods_receipts (id, po_id, received_by, received_on, notes) VALUES
  ('GRN-0001', 'PO-0003', 'EMP-0005', '2026-11-05', 'First batch of power supplies arrived in good condition'),
  ('GRN-0002', 'PO-0003', 'EMP-0005', '2026-11-09', 'Final delivery of remaining 4 units, PO complete'),
  ('GRN-0003', 'PO-0002', 'EMP-0006', '2026-11-12', 'Partial delivery of 4 mainboards, awaiting remaining 6')
ON CONFLICT (id) DO NOTHING;

-- 4. Goods Receipt Items [ERP2-D1]
INSERT INTO grn_items (id, grn_id, sku, received_qty) VALUES
  ('GRNI-0001', 'GRN-0001', 'SKU-0103', 6),
  ('GRNI-0002', 'GRN-0002', 'SKU-0103', 4),
  ('GRNI-0003', 'GRN-0003', 'SKU-0102', 4)
ON CONFLICT (id) DO NOTHING;

-- Keep generated IDs above the seed IDs on repeated runs.
SELECT setval('purchase_order_id_seq', GREATEST((SELECT last_value FROM purchase_order_id_seq), COALESCE((SELECT max(substring(id FROM '^PO-([0-9]+)$')::bigint) FROM purchase_orders), 1)));
SELECT setval('po_item_id_seq', GREATEST((SELECT last_value FROM po_item_id_seq), COALESCE((SELECT max(substring(id FROM '^POI-([0-9]+)$')::bigint) FROM po_items), 1)));
SELECT setval('goods_receipt_id_seq', GREATEST((SELECT last_value FROM goods_receipt_id_seq), COALESCE((SELECT max(substring(id FROM '^GRN-([0-9]+)$')::bigint) FROM goods_receipts), 1)));
SELECT setval('grn_item_id_seq', GREATEST((SELECT last_value FROM grn_item_id_seq), COALESCE((SELECT max(substring(id FROM '^GRNI-([0-9]+)$')::bigint) FROM grn_items), 1)));

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
