-- Database schema for ERP3
-- Re-runnable: DROP tables in reverse dependency order, then CREATE them.

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS qc_checks;
DROP TABLE IF EXISTS work_orders;
DROP TABLE IF EXISTS bom_items;
DROP TABLE IF EXISTS boms;

-- Sequence for BOM IDs: BOM-0001, BOM-0002, ...
DROP SEQUENCE IF EXISTS boms_seq;
CREATE SEQUENCE boms_seq START 1;

-- Sequence for BOM item IDs: BOMI-0001, BOMI-0002, ...
DROP SEQUENCE IF EXISTS bom_items_seq;
CREATE SEQUENCE bom_items_seq START 1;

-- Sequence for Work Order IDs: WO-0001, WO-0002, ...
DROP SEQUENCE IF EXISTS work_orders_seq;
CREATE SEQUENCE work_orders_seq START 1;

-- Sequence for QC Check IDs: QC-0001, QC-0002, ... [ERP3-D1]
DROP SEQUENCE IF EXISTS qc_checks_seq;
CREATE SEQUENCE qc_checks_seq START 1;

-- boms: one row per product version (the "header")
CREATE TABLE boms (
  id            TEXT PRIMARY KEY
                  DEFAULT 'BOM-' || LPAD(nextval('boms_seq')::TEXT, 4, '0'),
  product_sku   TEXT        NOT NULL,          -- e.g. SKU-0001
  product_name  TEXT        NOT NULL,
  version       INT         NOT NULL DEFAULT 1,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one active version per product at a time
  UNIQUE (product_sku, version)
);

-- bom_items: individual component lines inside a BOM
CREATE TABLE bom_items (
  id              TEXT PRIMARY KEY
                    DEFAULT 'BOMI-' || LPAD(nextval('bom_items_seq')::TEXT, 4, '0'),
  bom_id          TEXT        NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  component_sku   TEXT        NOT NULL,        -- e.g. SKU-0101
  component_name  TEXT        NOT NULL,
  qty_per_unit    NUMERIC(10, 3) NOT NULL CHECK (qty_per_unit > 0)
);

-- work_orders: manufacturing work orders linked to a BOM [ERP3-B1]
CREATE TABLE work_orders (
  id            TEXT PRIMARY KEY
                  DEFAULT 'WO-' || LPAD(nextval('work_orders_seq')::TEXT, 4, '0'),
  bom_id        TEXT        NOT NULL REFERENCES boms(id) ON DELETE RESTRICT,
  product_sku   TEXT        NOT NULL,
  quantity      NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  status        TEXT        NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  source        TEXT        NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual', 'shortage')),
  planned_start DATE,
  planned_end   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_source ON work_orders(source);
CREATE INDEX IF NOT EXISTS idx_work_orders_product_sku ON work_orders(product_sku);

-- qc_checks: quality inspection checks against work orders [ERP3-D1]
CREATE TABLE qc_checks (
  id            TEXT PRIMARY KEY
                  DEFAULT 'QC-' || LPAD(nextval('qc_checks_seq')::TEXT, 4, '0'),
  wo_id         TEXT        NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  inspector     TEXT        NOT NULL,
  checked_qty   NUMERIC(10, 2) NOT NULL CHECK (checked_qty > 0),
  passed_qty    NUMERIC(10, 2) NOT NULL CHECK (passed_qty >= 0),
  failed_qty    NUMERIC(10, 2) NOT NULL CHECK (failed_qty >= 0),
  defect_reason TEXT,
  result        TEXT        NOT NULL CHECK (result IN ('pass', 'fail', 'rework')),
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_qc_qty_sum CHECK (passed_qty + failed_qty = checked_qty)
);

CREATE INDEX IF NOT EXISTS idx_qc_checks_wo_id ON qc_checks(wo_id);
CREATE INDEX IF NOT EXISTS idx_qc_checks_result ON qc_checks(result);
