-- Database schema for ERP2
CREATE SEQUENCE IF NOT EXISTS purchase_order_id_seq;
CREATE SEQUENCE IF NOT EXISTS po_item_id_seq;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id text PRIMARY KEY DEFAULT ('PO-' || lpad(nextval('purchase_order_id_seq')::text, 4, '0')),
  supplier_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
  expected_date date,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS po_items (
  id text PRIMARY KEY DEFAULT ('POI-' || lpad(nextval('po_item_id_seq')::text, 4, '0')),
  po_id text NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sku text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(12,2) NOT NULL CHECK (unit_cost > 0),
  received_qty integer NOT NULL DEFAULT 0 CHECK (received_qty >= 0 AND received_qty <= quantity)
);
