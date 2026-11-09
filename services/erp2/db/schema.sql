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
