-- Database seed for ERP3
-- Re-runnable: delete existing seed rows first so running twice doesn't error.

DELETE FROM bom_items;
DELETE FROM boms;

-- Reset sequences so IDs are always predictable
ALTER SEQUENCE boms_seq      RESTART WITH 1;
ALTER SEQUENCE bom_items_seq RESTART WITH 1;

-- BOM-0001: 55-inch TV (SKU-0001)
INSERT INTO boms (product_sku, product_name, version, active)
VALUES ('SKU-0001', '55-Inch LED Smart TV', 1, TRUE);

-- BOM-0002: 65-inch OLED TV (SKU-0003)
INSERT INTO boms (product_sku, product_name, version, active)
VALUES ('SKU-0003', '65-Inch OLED Smart TV', 1, TRUE);

-- Components for BOM-0001 (55-inch TV) — 5 shared component SKUs
INSERT INTO bom_items (bom_id, component_sku, component_name, qty_per_unit) VALUES
  ('BOM-0001', 'SKU-0101', 'Display Panel',    1),
  ('BOM-0001', 'SKU-0102', 'Main Board',        1),
  ('BOM-0001', 'SKU-0103', 'Power Supply Unit', 1),
  ('BOM-0001', 'SKU-0104', 'Remote Control',    1),
  ('BOM-0001', 'SKU-0105', 'Packaging Box',     1);

-- Components for BOM-0002 (65-inch OLED TV) — same 5 shared component SKUs
INSERT INTO bom_items (bom_id, component_sku, component_name, qty_per_unit) VALUES
  ('BOM-0002', 'SKU-0101', 'OLED Display Panel', 1),
  ('BOM-0002', 'SKU-0102', 'Main Board',          1),
  ('BOM-0002', 'SKU-0103', 'Power Supply Unit',   1),
  ('BOM-0002', 'SKU-0104', 'Remote Control',      1),
  ('BOM-0002', 'SKU-0105', 'Packaging Box',       1);
