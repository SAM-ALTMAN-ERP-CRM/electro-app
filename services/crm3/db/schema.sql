-- Database schema for CRM-3 Customer 360 (Port 5103)
-- Customer Master Directory, Contacts & Unified Event Timeline

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(20) PRIMARY KEY,
  customer_id VARCHAR(20) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  designation VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS segments (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(50),
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
