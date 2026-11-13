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

-- Sequence for Reservation IDs (RES-0001, RES-0002, ...)
CREATE SEQUENCE IF NOT EXISTS res_id_seq START WITH 1;

-- Table: reservations
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('RES-' || LPAD(nextval('res_id_seq')::TEXT, 4, '0')),
  so_id VARCHAR(20) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  sku VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('reserved', 'released', 'shortage')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_reservations_so_sku UNIQUE (so_id, sku)
);

-- Sequence for Dispatch IDs (DSP-0001, DSP-0002, ...)
CREATE SEQUENCE IF NOT EXISTS dsp_id_seq START WITH 1;

-- Table: dispatches
CREATE TABLE IF NOT EXISTS dispatches (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('DSP-' || LPAD(nextval('dsp_id_seq')::TEXT, 4, '0')),
  so_id VARCHAR(20) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  courier VARCHAR(50) NOT NULL CHECK (courier IN ('BlueDart', 'Delhivery', 'DTDC')),
  tracking_no VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'picked' CHECK (status IN ('picked', 'shipped', 'delivered')),
  ship_date DATE,
  delivered_date DATE,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: dispatch_serials (Serialized items in each dispatch consignment)
CREATE TABLE IF NOT EXISTS dispatch_serials (
  id SERIAL PRIMARY KEY,
  dispatch_id VARCHAR(20) NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
  sku VARCHAR(30) NOT NULL,
  serial_number VARCHAR(50) NOT NULL
);

-- Indexes for performance and query filtering
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_quote_id ON sales_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_so_items_so_id ON so_items(so_id);
CREATE INDEX IF NOT EXISTS idx_reservations_so_id ON reservations(so_id);
CREATE INDEX IF NOT EXISTS idx_reservations_sku ON reservations(sku);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_dispatches_so_id ON dispatches(so_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_serials_dispatch_id ON dispatch_serials(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_serials_serial ON dispatch_serials(serial_number);
