-- Database schema for CRM-1 Sales Pipeline (Port 5101, Database crm1_db)
-- Build Issue: [CRM1-C1] Quotes tables and API

CREATE SEQUENCE IF NOT EXISTS quote_seq START 1;
CREATE SEQUENCE IF NOT EXISTS quote_items_seq START 1;

CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('QUO-' || LPAD(nextval('quote_seq')::TEXT, 4, '0')),
  opportunity_id VARCHAR(20),
  customer_id VARCHAR(20) NOT NULL,
  dealer_id VARCHAR(20),
  sales_rep_id VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  needs_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('QI-' || LPAD(nextval('quote_items_seq')::TEXT, 4, '0')),
  quote_id VARCHAR(20) NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sku VARCHAR(20) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL
);
