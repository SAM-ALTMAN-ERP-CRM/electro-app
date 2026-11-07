-- Database schema for ERP-5 Finance, Access & App Shell
-- Port: 5205 | Database: erp5_db

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_so_id ON invoices(so_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
