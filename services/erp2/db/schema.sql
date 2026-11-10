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
