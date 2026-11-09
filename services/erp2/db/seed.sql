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

-- Keep generated IDs above the seed IDs on repeated runs.
SELECT setval('purchase_order_id_seq', GREATEST((SELECT last_value FROM purchase_order_id_seq), COALESCE((SELECT max(substring(id FROM '^PO-([0-9]+)$')::bigint) FROM purchase_orders), 1)));
SELECT setval('po_item_id_seq', GREATEST((SELECT last_value FROM po_item_id_seq), COALESCE((SELECT max(substring(id FROM '^POI-([0-9]+)$')::bigint) FROM po_items), 1)));
