-- Database schema for CRM-3 Customer 360 (Port 5103)
-- Customer Master Directory, Contacts, Segments & Customer Tags

-- Sequences for automatic IDs
CREATE SEQUENCE IF NOT EXISTS customers_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS contacts_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS segment_id_seq START WITH 1;

-- Customers table (CRM3-A1 dependency)
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('retail', 'corporate', 'dealer')),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  gstin VARCHAR(15),
  billing_address TEXT,
  shipping_address TEXT,
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table (CRM3-A1 dependency)
CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(20) PRIMARY KEY,
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  designation VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Segments table (CRM3-C1)
CREATE TABLE IF NOT EXISTS segments (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('SEG-' || LPAD(nextval('segment_id_seq')::TEXT, 4, '0')),
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(50),
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Tags table (CRM3-C3)
CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, tag)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_segments_customer_type ON segments(customer_type);
CREATE INDEX IF NOT EXISTS idx_segments_city ON segments(city);
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag ON customer_tags(tag);
