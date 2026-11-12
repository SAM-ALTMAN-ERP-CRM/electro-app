-- Database schema for ERP1: Inventory and Warehouses

CREATE SEQUENCE IF NOT EXISTS product_id_seq START WITH 16;
CREATE SEQUENCE IF NOT EXISTS alert_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS stock_movement_id_seq START WITH 1;

-- Products table (SKU Master)
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('SKU-' || LPAD(nextval('product_id_seq')::TEXT, 4, '0')),
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('TV', 'Audio', 'Mobile accessory', 'Appliance', 'Component')),
  brand VARCHAR(100) NOT NULL DEFAULT 'Electro',
  price NUMERIC(12,2) NOT NULL CHECK (price > 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  reorder_level INT NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL
);

-- Stock table (quantity per SKU per warehouse)
CREATE TABLE IF NOT EXISTS stock (
  sku VARCHAR(20) NOT NULL,
  warehouse_id VARCHAR(20) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (sku, warehouse_id)
);

-- Stock movements log
CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(30) PRIMARY KEY DEFAULT ('MOV-' || LPAD(nextval('stock_movement_id_seq')::TEXT, 4, '0')),
  sku VARCHAR(20) NOT NULL,
  warehouse_id VARCHAR(20) NOT NULL,
  delta INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
  batch_no VARCHAR(50) PRIMARY KEY,
  sku VARCHAR(20) NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  manufactured_on DATE NOT NULL
);

-- Serials table
CREATE TABLE IF NOT EXISTS serials (
  serial_number VARCHAR(50) PRIMARY KEY,
  sku VARCHAR(20) NOT NULL REFERENCES products(id),
  batch_no VARCHAR(50),
  warehouse_id VARCHAR(20) REFERENCES warehouses(id),
  status VARCHAR(20) NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'reserved', 'sold', 'returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Low-stock alerts log
CREATE TABLE IF NOT EXISTS alerts_log (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('ALT-' || LPAD(nextval('alert_id_seq')::TEXT, 4, '0')),
  sku VARCHAR(20) NOT NULL REFERENCES products(id),
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock(sku);
CREATE INDEX IF NOT EXISTS idx_serials_sku_status ON serials(sku, status);
CREATE INDEX IF NOT EXISTS idx_serials_batch ON serials(batch_no);
CREATE INDEX IF NOT EXISTS idx_alerts_log_sku_ack ON alerts_log(sku, acknowledged);
