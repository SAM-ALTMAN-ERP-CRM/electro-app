-- ==============================================================================
-- ERP-2: Procurement & Suppliers Database Schema (erp2_db)
-- Module: ERP-2 (Port 5202)
-- Issues:
--   - [ERP2-A1] Suppliers table and API (#74)
--   - [ERP2-A3] Supplier rating (#76)
-- ==============================================================================

-- Drop existing objects for idempotent initialization
DROP TABLE IF EXISTS supplier_ratings CASCADE;
DROP TABLE IF EXISTS grn_items CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS po_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP SEQUENCE IF EXISTS suppliers_seq;
DROP SEQUENCE IF EXISTS supplier_ratings_seq;
DROP SEQUENCE IF EXISTS goods_receipt_id_seq;
DROP SEQUENCE IF EXISTS grn_item_id_seq;

-- Sequence for Supplier IDs (SUP-0001, SUP-0002, ...)
CREATE SEQUENCE suppliers_seq START WITH 1;

-- 1. Suppliers Table [ERP2-A1]
CREATE TABLE suppliers (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    city VARCHAR(100),
    gstin VARCHAR(15),
    payment_terms VARCHAR(20) NOT NULL DEFAULT 'net30' CHECK (payment_terms IN ('advance', 'net15', 'net30')),
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search and query performance
CREATE INDEX idx_suppliers_city ON suppliers(city);
CREATE INDEX idx_suppliers_active ON suppliers(active);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_rating ON suppliers(rating DESC);

-- Sequence for Rating IDs (RAT-0001, RAT-0002, ...)
CREATE SEQUENCE supplier_ratings_seq START WITH 1;

-- 2. Supplier Ratings Table [ERP2-A3]
CREATE TABLE supplier_ratings (
    id VARCHAR(32) PRIMARY KEY,
    supplier_id VARCHAR(32) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    delivery_score NUMERIC(2, 1) NOT NULL CHECK (delivery_score >= 1.0 AND delivery_score <= 5.0),
    quality_score NUMERIC(2, 1) NOT NULL CHECK (quality_score >= 1.0 AND quality_score <= 5.0),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_ratings_supplier ON supplier_ratings(supplier_id);
CREATE INDEX idx_supplier_ratings_created ON supplier_ratings(created_at DESC);

-- Database schema for ERP2
CREATE SEQUENCE IF NOT EXISTS purchase_order_id_seq;
CREATE SEQUENCE IF NOT EXISTS po_item_id_seq;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id text PRIMARY KEY DEFAULT ('PO-' || lpad(nextval('purchase_order_id_seq')::text, 4, '0')),
  supplier_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
  expected_date date,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS po_items (
  id text PRIMARY KEY DEFAULT ('POI-' || lpad(nextval('po_item_id_seq')::text, 4, '0')),
  po_id text NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sku text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(12,2) NOT NULL CHECK (unit_cost > 0),
  received_qty integer NOT NULL DEFAULT 0 CHECK (received_qty >= 0 AND received_qty <= quantity)
);

-- Sequence for Goods Receipt IDs (GRN-0001, GRN-0002, ...) [ERP2-D1]
CREATE SEQUENCE IF NOT EXISTS goods_receipt_id_seq START WITH 1;

-- Sequence for GRN Item IDs (GRNI-0001, GRNI-0002, ...) [ERP2-D1]
CREATE SEQUENCE IF NOT EXISTS grn_item_id_seq START WITH 1;

-- 5. Goods Receipts Table [ERP2-D1]
CREATE TABLE IF NOT EXISTS goods_receipts (
  id text PRIMARY KEY DEFAULT ('GRN-' || lpad(nextval('goods_receipt_id_seq')::text, 4, '0')),
  po_id text NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  received_by text NOT NULL,
  received_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. GRN Items Table [ERP2-D1]
CREATE TABLE IF NOT EXISTS grn_items (
  id text PRIMARY KEY DEFAULT ('GRNI-' || lpad(nextval('grn_item_id_seq')::text, 4, '0')),
  grn_id text NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  sku text NOT NULL,
  received_qty integer NOT NULL CHECK (received_qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_received_on ON goods_receipts(received_on);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_sku ON grn_items(sku);

-- Database schema for ERP-2 Procurement & Suppliers (Port 5202, Database erp2_db)
-- Build Issue: [ERP2-B1] Purchase requests API

-- Sequence for auto-generating purchase request IDs (PR-0001, PR-0002, ...)
CREATE SEQUENCE IF NOT EXISTS purchase_request_seq START 1;

-- Table for tracking purchase requests created internally or ingested from ERP-1 / ERP-3
CREATE TABLE IF NOT EXISTS purchase_requests (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('PR-' || LPAD(nextval('purchase_request_seq')::TEXT, 4, '0')),
  sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  requested_by VARCHAR(100) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for status filtering and SKU lookups
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_sku ON purchase_requests(sku);
