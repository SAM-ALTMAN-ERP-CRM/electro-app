-- Database schema for ERP-5 Finance, Access & App Shell
-- Port: 5205 | Database: erp5_db

-- Table: users (Auth & Demo Users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','sales','support','warehouse','finance','hr')),
  employee_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS users_seq START 1;

-- Sequence for Invoices (INV-0001..)
CREATE SEQUENCE IF NOT EXISTS invoices_seq START WITH 1;

-- Table: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(20) PRIMARY KEY,
  so_id VARCHAR(50),
  customer_id VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_gstin VARCHAR(20),
  sales_rep_id VARCHAR(20),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence for Invoice Line Items (ITM-0001..)
CREATE SEQUENCE IF NOT EXISTS invoice_items_seq START WITH 1;

-- Table: invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(20) PRIMARY KEY,
  invoice_id VARCHAR(20) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence for Credit Notes (CN-0001..)
CREATE SEQUENCE IF NOT EXISTS credit_notes_seq START WITH 1;

-- Table: credit_notes
CREATE TABLE IF NOT EXISTS credit_notes (
  id VARCHAR(20) PRIMARY KEY,
  so_id VARCHAR(50) NOT NULL,
  invoice_id VARCHAR(20) REFERENCES invoices(id) ON DELETE SET NULL,
  serial_number VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & integrity
CREATE INDEX IF NOT EXISTS idx_invoices_so_id ON invoices(so_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_so_id ON credit_notes(so_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_notes_so_serial ON credit_notes(so_id, serial_number);
