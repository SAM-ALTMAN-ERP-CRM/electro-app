-- Database schema for ERP3
-- Re-runnable: DROP tables in reverse dependency order, then CREATE them.

-- bom_items references boms, so drop bom_items first
DROP TABLE IF EXISTS bom_items;
DROP TABLE IF EXISTS boms;

-- Sequence for BOM IDs: BOM-0001, BOM-0002, ...
DROP SEQUENCE IF EXISTS boms_seq;
CREATE SEQUENCE boms_seq START 1;

-- Sequence for BOM item IDs: BOMI-0001, BOMI-0002, ...
DROP SEQUENCE IF EXISTS bom_items_seq;
CREATE SEQUENCE bom_items_seq START 1;

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
