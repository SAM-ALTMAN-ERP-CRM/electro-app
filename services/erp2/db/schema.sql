-- ==============================================================================
-- ERP-2: Procurement & Suppliers Database Schema (erp2_db)
-- Module: ERP-2 (Port 5202)
-- Features:
--   - [ERP2-A1] Suppliers Master & [ERP2-A3] Ratings
--   - [ERP2-B1] Purchase Requests Subsystem
--   - [ERP2-C1] Purchase Orders & PO Items
--   - [ERP2-D1] Goods Receipts & GRN Items
-- ==============================================================================

-- 1. Suppliers Sequence & Master Table [ERP2-A1]
CREATE SEQUENCE IF NOT EXISTS suppliers_seq START WITH 1;

CREATE TABLE IF NOT EXISTS suppliers (
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

CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON suppliers(rating DESC);

-- 2. Supplier Ratings Sequence & Table [ERP2-A3]
CREATE SEQUENCE IF NOT EXISTS supplier_ratings_seq START WITH 1;

CREATE TABLE IF NOT EXISTS supplier_ratings (
    id VARCHAR(32) PRIMARY KEY,
    supplier_id VARCHAR(32) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    delivery_score NUMERIC(2, 1) NOT NULL CHECK (delivery_score >= 1.0 AND delivery_score <= 5.0),
    quality_score NUMERIC(2, 1) NOT NULL CHECK (quality_score >= 1.0 AND quality_score <= 5.0),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier ON supplier_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_created ON supplier_ratings(created_at DESC);

-- 3. Purchase Orders & PO Items [ERP2-C1]
CREATE SEQUENCE IF NOT EXISTS purchase_order_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS po_item_id_seq START WITH 1;

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

-- 4. Purchase Requests Subsystem [ERP2-B1]
CREATE SEQUENCE IF NOT EXISTS purchase_request_seq START WITH 1;

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

CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_sku ON purchase_requests(sku);

-- 5. Goods Receipts Subsystem [ERP2-D1]
CREATE SEQUENCE IF NOT EXISTS goods_receipt_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS grn_item_id_seq START WITH 1;

CREATE TABLE IF NOT EXISTS goods_receipts (
  id text PRIMARY KEY DEFAULT ('GRN-' || lpad(nextval('goods_receipt_id_seq')::text, 4, '0')),
  po_id text NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  received_by text NOT NULL,
  received_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
