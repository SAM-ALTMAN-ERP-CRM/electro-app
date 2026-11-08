-- Database schema for ERP-4: Sales Orders & Dispatch

-- Sequence for Sales Order IDs (SO-0001, SO-0002, ...)
CREATE SEQUENCE IF NOT EXISTS so_id_seq START WITH 1;

-- Table: sales_orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('SO-' || LPAD(nextval('so_id_seq')::TEXT, 4, '0')),
  quote_id VARCHAR(50) UNIQUE,
  customer_id VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_gstin VARCHAR(15),
  sales_rep_id VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'confirmed', 'dispatched', 'delivered', 'cancelled')),
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: so_items (Line items for each sales order)
CREATE TABLE IF NOT EXISTS so_items (
  id SERIAL PRIMARY KEY,
  so_id VARCHAR(20) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  sku VARCHAR(30) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

-- Indexes for performance and query filtering
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_quote_id ON sales_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_so_items_so_id ON so_items(so_id);
