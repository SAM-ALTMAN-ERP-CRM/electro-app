-- =============================================================================
-- Team CRM-3: Customer 360 (Port 5103)
-- Database Schema for crm3_db
-- Customer Master Directory, Contacts, Unified Event Timeline, Segments & Customer Tags
-- 3NF Normalized Relational Architecture
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEQUENCES FOR MONOTONIC IDENTIFIER GENERATION
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS customers_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS contacts_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS interactions_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS segment_id_seq START WITH 1;

-- -----------------------------------------------------------------------------
-- 2. TABLE: customers (Order-to-Cash Workflow Step 3 of 9)
-- Authoritative Customer Master Directory consumed across all 11 monorepo services.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('retail', 'corporate', 'dealer')),
  email VARCHAR(255) NOT NULL, -- Email uniqueness enforced in application code (CRM3-A3), allowing intentional duplicate seed rows CUST-0009 & CUST-0010 for duplicate detection/merge testing
  phone VARCHAR(50) NOT NULL,
  gstin VARCHAR(15), -- Required for 'corporate' and 'dealer' types; optional for 'retail'
  billing_address TEXT,
  shipping_address TEXT,
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. TABLE: contacts
-- Individual contact persons associated with each customer master record.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(20) PRIMARY KEY,
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  designation VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. TABLE: interactions (Unified Event Timeline)
-- Historical timeline events and cross-team webhook ingestion (CRM-1, CRM-2, CRM-4, ERP-4).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interactions (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('INT-' || LPAD(nextval('interactions_seq')::TEXT, 4, '0')),
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'ticket', 'order', 'note')),
  summary TEXT NOT NULL,
  source_team VARCHAR(20) NOT NULL DEFAULT 'CRM-3',
  created_by VARCHAR(100) DEFAULT 'EMP-0001',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. TABLE: segments
-- Dynamic audience segment definitions evaluated against the customer master.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS segments (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('SEG-' || LPAD(nextval('segment_id_seq')::TEXT, 4, '0')),
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(50),
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. TABLE: customer_tags
-- Multi-valued classification tags (chips) attached to customer records.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, tag)
);

-- -----------------------------------------------------------------------------
-- 7. PERFORMANCE & LOOKUP INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
CREATE INDEX IF NOT EXISTS idx_segments_customer_type ON segments(customer_type);
CREATE INDEX IF NOT EXISTS idx_segments_city ON segments(city);
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag ON customer_tags(tag);
