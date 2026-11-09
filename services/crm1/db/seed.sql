-- Database seed for CRM-1 Sales Pipeline (Port 5101, Database crm1_db)
-- Build Issue: [CRM1-C1] Quotes tables and API

INSERT INTO quotes (
  id, opportunity_id, customer_id, dealer_id, sales_rep_id,
  status, discount_percent, needs_approval, approved, rejection_reason, created_at
) VALUES
  ('QUO-0001', 'OPP-0001', 'CUST-0001', NULL, 'EMP-0001', 'draft', 0.00, FALSE, FALSE, NULL, NOW() - INTERVAL '4 days'),
  ('QUO-0002', 'OPP-0002', 'CUST-0004', 'DLR-0001', 'EMP-0002', 'sent', 5.00, FALSE, FALSE, NULL, NOW() - INTERVAL '3 days'),
  ('QUO-0003', 'OPP-0003', 'CUST-0003', NULL, 'EMP-0003', 'accepted', 10.00, TRUE, TRUE, NULL, NOW() - INTERVAL '2 days'),
  ('QUO-0004', 'OPP-0004', 'CUST-0002', NULL, 'EMP-0001', 'rejected', 15.00, TRUE, FALSE, 'Requested discount exceeds maximum allowable limit', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quote_items (
  id, quote_id, sku, product_name, quantity, unit_price
) VALUES
  ('QI-0001', 'QUO-0001', 'SKU-0001', '55-inch 4K Smart TV', 1, 42990.00),
  ('QI-0002', 'QUO-0001', 'SKU-0004', 'Soundbar 2.1', 1, 8990.00),
  ('QI-0003', 'QUO-0002', 'SKU-0002', '43-inch Full HD TV', 2, 24990.00),
  ('QI-0004', 'QUO-0002', 'SKU-0004', 'Soundbar 2.1', 2, 8990.00),
  ('QI-0005', 'QUO-0003', 'SKU-0003', '65-inch OLED TV', 1, 94990.00),
  ('QI-0006', 'QUO-0003', 'SKU-0005', 'Soundbar 5.1', 1, 17990.00),
  ('QI-0007', 'QUO-0004', 'SKU-0001', '55-inch 4K Smart TV', 2, 42990.00)
ON CONFLICT (id) DO NOTHING;

SELECT setval('quote_seq', GREATEST(4, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM quotes WHERE id LIKE 'QUO-%')));
SELECT setval('quote_items_seq', GREATEST(7, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) FROM quote_items WHERE id LIKE 'QI-%')));
