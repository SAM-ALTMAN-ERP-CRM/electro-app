-- Database schema for CRM-3 Customer 360 (Port 5103)
-- Customer Master Directory, Contacts, Unified Event Timeline & Deduplication

CREATE SEQUENCE IF NOT EXISTS customers_seq START WITH 1;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('retail', 'corporate', 'dealer')),
  email VARCHAR(255) NOT NULL, -- Email uniqueness enforced in API code, not DB UNIQUE constraint, allowing duplicate merge seed rows CUST-0009/CUST-0010
  phone VARCHAR(50) NOT NULL,
  gstin VARCHAR(15),
  billing_address TEXT,
  shipping_address TEXT,
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS contacts_seq START WITH 1;

CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(20) PRIMARY KEY,
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  designation VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag ON customer_tags(tag);
