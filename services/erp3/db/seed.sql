-- Database seed for ERP3
-- Re-runnable: delete existing seed rows first so running twice doesn't error.

DELETE FROM work_order_materials;
DELETE FROM qc_checks;
DELETE FROM work_orders;
DELETE FROM bom_items;
DELETE FROM boms;

-- Reset sequences so IDs are always predictable
ALTER SEQUENCE boms_seq                  RESTART WITH 1;
ALTER SEQUENCE bom_items_seq             RESTART WITH 1;
ALTER SEQUENCE work_orders_seq           RESTART WITH 1;
ALTER SEQUENCE qc_checks_seq             RESTART WITH 1;
ALTER SEQUENCE work_order_materials_seq  RESTART WITH 1;

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

-- Work Orders: 5 seed work orders [ERP3-B1]
INSERT INTO work_orders (id, bom_id, product_sku, quantity, status, source, planned_start, planned_end, created_at, completed_at) VALUES
  ('WO-0001', 'BOM-0001', 'SKU-0001', 50, 'planned',     'manual',   '2026-11-15', '2026-11-20', '2026-11-01 10:00:00+00', NULL),
  ('WO-0002', 'BOM-0001', 'SKU-0001', 25, 'in_progress', 'manual',   '2026-11-05', '2026-11-12', '2026-11-02 09:30:00+00', NULL),
  ('WO-0003', 'BOM-0002', 'SKU-0003', 30, 'completed',   'manual',   '2026-10-20', '2026-10-28', '2026-10-18 08:00:00+00', '2026-10-28 16:45:00+00'),
  ('WO-0004', 'BOM-0001', 'SKU-0001', 10, 'cancelled',   'manual',   '2026-10-25', '2026-10-30', '2026-10-22 11:15:00+00', NULL),
  ('WO-0005', 'BOM-0002', 'SKU-0003', 15, 'planned',     'shortage', '2026-11-18', '2026-11-25', '2026-11-08 14:20:00+00', NULL);

SELECT setval('work_orders_seq', 5);

-- QC Checks: 5 seed inspection records [ERP3-D1]
INSERT INTO qc_checks (id, wo_id, inspector, checked_qty, passed_qty, failed_qty, defect_reason, result, checked_at) VALUES
  ('QC-0001', 'WO-0001', 'EMP-0005', 50, 50, 0,  NULL,          'pass',   '2026-11-02 10:30:00+00'),
  ('QC-0002', 'WO-0002', 'EMP-0006', 25, 15, 10, 'dead pixel',   'fail',   '2026-11-03 14:15:00+00'),
  ('QC-0003', 'WO-0003', 'EMP-0005', 30, 27, 3,  'scratch',      'rework', '2026-10-25 11:00:00+00'),
  ('QC-0004', 'WO-0004', 'EMP-0007', 10, 10, 0,  NULL,          'pass',   '2026-10-24 09:45:00+00'),
  ('QC-0005', 'WO-0005', 'EMP-0006', 15, 13, 2,  'wrong label',  'rework', '2026-11-08 16:20:00+00');

SELECT setval('qc_checks_seq', 5);

-- Work Order Materials: 25 seed rows copying BOM requirements for WO-0001..WO-0005 [ERP3-B3]
-- WO-0001: 50 units of BOM-0001 (planned, 0 issued)
INSERT INTO work_order_materials (id, wo_id, component_sku, required_qty, issued_qty) VALUES
  ('WOM-0001', 'WO-0001', 'SKU-0101', 50, 0),
  ('WOM-0002', 'WO-0001', 'SKU-0102', 50, 0),
  ('WOM-0003', 'WO-0001', 'SKU-0103', 50, 0),
  ('WOM-0004', 'WO-0001', 'SKU-0104', 50, 0),
  ('WOM-0005', 'WO-0001', 'SKU-0105', 50, 0);

-- WO-0002: 25 units of BOM-0001 (in_progress, 25 issued)
INSERT INTO work_order_materials (id, wo_id, component_sku, required_qty, issued_qty) VALUES
  ('WOM-0006', 'WO-0002', 'SKU-0101', 25, 25),
  ('WOM-0007', 'WO-0002', 'SKU-0102', 25, 25),
  ('WOM-0008', 'WO-0002', 'SKU-0103', 25, 25),
  ('WOM-0009', 'WO-0002', 'SKU-0104', 25, 25),
  ('WOM-0010', 'WO-0002', 'SKU-0105', 25, 25);

-- WO-0003: 30 units of BOM-0002 (completed, 30 issued)
INSERT INTO work_order_materials (id, wo_id, component_sku, required_qty, issued_qty) VALUES
  ('WOM-0011', 'WO-0003', 'SKU-0101', 30, 30),
  ('WOM-0012', 'WO-0003', 'SKU-0102', 30, 30),
  ('WOM-0013', 'WO-0003', 'SKU-0103', 30, 30),
  ('WOM-0014', 'WO-0003', 'SKU-0104', 30, 30),
  ('WOM-0015', 'WO-0003', 'SKU-0105', 30, 30);

-- WO-0004: 10 units of BOM-0001 (cancelled, 0 issued)
INSERT INTO work_order_materials (id, wo_id, component_sku, required_qty, issued_qty) VALUES
  ('WOM-0016', 'WO-0004', 'SKU-0101', 10, 0),
  ('WOM-0017', 'WO-0004', 'SKU-0102', 10, 0),
  ('WOM-0018', 'WO-0004', 'SKU-0103', 10, 0),
  ('WOM-0019', 'WO-0004', 'SKU-0104', 10, 0),
  ('WOM-0020', 'WO-0004', 'SKU-0105', 10, 0);

-- WO-0005: 15 units of BOM-0002 (shortage, 0 issued)
INSERT INTO work_order_materials (id, wo_id, component_sku, required_qty, issued_qty) VALUES
  ('WOM-0021', 'WO-0005', 'SKU-0101', 15, 0),
  ('WOM-0022', 'WO-0005', 'SKU-0102', 15, 0),
  ('WOM-0023', 'WO-0005', 'SKU-0103', 15, 0),
  ('WOM-0024', 'WO-0005', 'SKU-0104', 15, 0),
  ('WOM-0025', 'WO-0005', 'SKU-0105', 15, 0);

SELECT setval('work_order_materials_seq', 25);
