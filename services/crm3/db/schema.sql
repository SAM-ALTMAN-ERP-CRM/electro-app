-- Database schema for CRM-3 Customer 360 (Port 5103)
-- Customer Master Directory, Contacts & Unified Event Timeline

CREATE SEQUENCE IF NOT EXISTS customers_seq START WITH 1;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('retail', 'corporate', 'dealer')),
  email VARCHAR(255) NOT NULL, -- Uniqueness enforced in API code, not as DB UNIQUE constraint (CRM3-A3 requirement to support duplicate merge seed rows CUST-0009/CUST-0010)
  phone VARCHAR(50) NOT NULL,
  gstin VARCHAR(15),
  billing_address TEXT,
  shipping_address TEXT,
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS contacts_seq START WITH 1;

CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(20) PRIMARY KEY,
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  designation VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member 3 (CRM3-C1): Segments sequence and table
CREATE SEQUENCE IF NOT EXISTS segment_id_seq START WITH 1;

CREATE TABLE IF NOT EXISTS segments (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('SEG-' || LPAD(nextval('segment_id_seq')::TEXT, 4, '0')),
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(50) CHECK (customer_type IS NULL OR customer_type IN ('retail', 'corporate', 'dealer')),
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CRM3-B1: Interactions sequence and table (Unified Event Timeline)
CREATE SEQUENCE IF NOT EXISTS interactions_seq START WITH 1;

CREATE TABLE IF NOT EXISTS interactions (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('INT-' || LPAD(nextval('interactions_seq')::TEXT, 4, '0')),
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'ticket', 'order', 'note')),
  summary TEXT NOT NULL,
  source_team VARCHAR(20) NOT NULL DEFAULT 'CRM-3',
  created_by VARCHAR(100) DEFAULT 'EMP-0001',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_segments_customer_type ON segments(customer_type);
CREATE INDEX IF NOT EXISTS idx_segments_city ON segments(city);
CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
