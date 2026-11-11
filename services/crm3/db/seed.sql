-- Database seed for CRM-3 (10 shared seed customers CUST-0001 to CUST-0010)
-- Conforms strictly to Section 5 shared seed contract.
-- CUST-0009 duplicates CUST-0001 phone.
-- CUST-0010 duplicates CUST-0002 email.

INSERT INTO customers (id, name, type, email, phone, gstin, billing_address, shipping_address, city)
VALUES
  ('CUST-0001', 'Aarav Mehta', 'retail', 'aarav.mehta@example.com', '9820112345', NULL, '101, Sea View Apartments, Worli', '101, Sea View Apartments, Worli', 'Mumbai'),
  ('CUST-0002', 'Sunrise Electronics Pvt Ltd', 'corporate', 'purchase@sunrise.com', '9820223456', '27AABCS1234F1Z5', 'Plot 45, MIDC Industrial Area, Andheri East', 'Plot 45, MIDC Industrial Area, Andheri East', 'Mumbai'),
  ('CUST-0003', 'Priya Nair', 'retail', 'priya.nair@example.com', '9847134567', NULL, 'Flat 3B, Palm Grove, Marine Drive', 'Flat 3B, Palm Grove, Marine Drive', 'Kochi'),
  ('CUST-0004', 'BrightHome Retail LLP', 'dealer', 'contact@brighthome.com', '9850145678', '27AAACB5678G1Z2', 'Shop 12, Phoenix Marketcity, Viman Nagar', 'Shop 12, Phoenix Marketcity, Viman Nagar', 'Pune'),
  ('CUST-0005', 'Kiran Patel', 'retail', 'kiran.patel@example.com', '9879156789', NULL, '24, Shanti Nagar, SG Highway', '24, Shanti Nagar, SG Highway', 'Ahmedabad'),
  ('CUST-0006', 'Metro Offices Ltd', 'corporate', 'admin@metrooffices.com', '9811167890', '07AABCM9012K1Z8', 'Level 5, Connaught Place, Barakhamba Road', 'Level 5, Connaught Place, Barakhamba Road', 'Delhi'),
  ('CUST-0007', 'Sneha Iyer', 'retail', 'sneha.iyer@example.com', '9840178901', NULL, '15, Besant Avenue, Adyar', '15, Besant Avenue, Adyar', 'Chennai'),
  ('CUST-0008', 'Gadget Hub', 'dealer', 'sales@gadgethub.com', '9845189012', '29AABCG3456L1Z4', '88, Brigade Road, Ashok Nagar', '88, Brigade Road, Ashok Nagar', 'Bengaluru'),
  ('CUST-0009', 'Aarav Mehta (Branch)', 'retail', 'aarav.alt@example.com', '9820112345', NULL, '101, Sea View Apartments, Worli', '101, Sea View Apartments, Worli', 'Mumbai'),
  ('CUST-0010', 'Sunrise Electronics Pune Branch', 'corporate', 'purchase@sunrise.com', '9820998877', '27AABCS1234F1Z5', 'Shop 5, Deccan Gymkhana', 'Shop 5, Deccan Gymkhana', 'Pune')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gstin = EXCLUDED.gstin,
  billing_address = EXCLUDED.billing_address,
  shipping_address = EXCLUDED.shipping_address,
  city = EXCLUDED.city;

-- Seed contacts for CUST-0001 through CUST-0010 (1 to 2 contacts each)
INSERT INTO contacts (id, customer_id, name, phone, email, designation)
VALUES
  ('CON-0001', 'CUST-0001', 'Aarav Mehta', '9820112345', 'aarav.mehta@example.com', 'Primary Contact'),
  ('CON-0002', 'CUST-0002', 'Rajesh Sharma', '9820223457', 'rsharma@sunrise.com', 'Procurement Manager'),
  ('CON-0003', 'CUST-0002', 'Anita Desai', '9820223458', 'adesai@sunrise.com', 'Accounts Lead'),
  ('CON-0004', 'CUST-0003', 'Priya Nair', '9847134567', 'priya.nair@example.com', 'Primary Contact'),
  ('CON-0005', 'CUST-0004', 'Vikram Joshi', '9850145679', 'vjoshi@brighthome.com', 'Dealer Representative'),
  ('CON-0006', 'CUST-0005', 'Kiran Patel', '9879156789', 'kiran.patel@example.com', 'Primary Contact'),
  ('CON-0007', 'CUST-0006', 'Sunil Kapoor', '9811167891', 'skapoor@metrooffices.com', 'Operations Director'),
  ('CON-0008', 'CUST-0007', 'Sneha Iyer', '9840178901', 'sneha.iyer@example.com', 'Primary Contact'),
  ('CON-0009', 'CUST-0008', 'Girish Reddy', '9845189013', 'greddy@gadgethub.com', 'Store Manager'),
  ('CON-0010', 'CUST-0009', 'Aarav Mehta Jr', '9820112345', 'aarav.alt@example.com', 'Associate'),
  ('CON-0011', 'CUST-0010', 'Rajesh Sharma', '9820998877', 'purchase@sunrise.com', 'Branch Lead')
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  designation = EXCLUDED.designation;

-- Member 3 (CRM3-C1): 4 Seed Segments
INSERT INTO segments (id, name, customer_type, city, created_at)
VALUES
  ('SEG-0001', 'Corporate in Mumbai', 'corporate', 'Mumbai', '2026-11-02 09:00:00+05:30'),
  ('SEG-0002', 'All Retail Customers', 'retail', NULL, '2026-11-02 09:30:00+05:30'),
  ('SEG-0003', 'Dealers in Pune', 'dealer', 'Pune', '2026-11-02 10:00:00+05:30'),
  ('SEG-0004', 'Delhi NCR Clients', NULL, 'Delhi', '2026-11-02 10:30:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  customer_type = EXCLUDED.customer_type,
  city = EXCLUDED.city;

-- CRM3-B1: 10 Seed Interactions over CUST-0001 to CUST-0003
INSERT INTO interactions (id, customer_id, type, summary, source_team, created_by, created_at)
VALUES
  ('INT-0001', 'CUST-0001', 'order', 'Order SO-0001 placed for 55-inch 4K Smart TV (SKU-0001)', 'ERP-4', 'EMP-0001', '2026-11-06 14:30:00+05:30'),
  ('INT-0002', 'CUST-0001', 'call', 'Outbound sales call confirming delivery address and installation schedule', 'CRM-1', 'EMP-0001', '2026-11-05 11:15:00+05:30'),
  ('INT-0003', 'CUST-0001', 'ticket', 'Customer enquired about extended warranty options for Smart TV', 'CRM-2', 'EMP-0005', '2026-11-04 16:45:00+05:30'),
  ('INT-0004', 'CUST-0001', 'email', 'Product catalog and festival discount brochure sent via email', 'CRM-4', 'EMP-0002', '2026-11-02 09:00:00+05:30'),
  ('INT-0005', 'CUST-0002', 'meeting', 'Quarterly corporate procurement review and bulk discount agreement', 'CRM-1', 'EMP-0003', '2026-11-06 16:00:00+05:30'),
  ('INT-0006', 'CUST-0002', 'order', 'Purchase order SO-0002 received for 20x 43-inch Full HD TV (SKU-0002)', 'ERP-4', 'EMP-0003', '2026-11-05 10:20:00+05:30'),
  ('INT-0007', 'CUST-0002', 'call', 'Credit terms and GST invoice 27AABCS1234F1Z5 reconciliation call with finance', 'ERP-5', 'EMP-0004', '2026-11-03 15:10:00+05:30'),
  ('INT-0008', 'CUST-0003', 'ticket', 'Installation ticket raised for 65-inch OLED TV (SKU-0003) at Kochi residence', 'CRM-2', 'EMP-0006', '2026-11-06 12:00:00+05:30'),
  ('INT-0009', 'CUST-0003', 'call', 'Feedback call post service engineer visit: customer satisfied with setup', 'CRM-2', 'EMP-0006', '2026-11-05 14:30:00+05:30'),
  ('INT-0010', 'CUST-0003', 'email', 'Welcome onboarding email and digital invoice copy delivered', 'CRM-3', 'EMP-0012', '2026-11-01 10:00:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  type = EXCLUDED.type,
  summary = EXCLUDED.summary,
  source_team = EXCLUDED.source_team,
  created_by = EXCLUDED.created_by,
  created_at = EXCLUDED.created_at;

-- Member 3 (CRM3-C3) & Member 4 (CRM3-D1): Seed Customer Tags
INSERT INTO customer_tags (customer_id, tag)
VALUES
  ('CUST-0001', 'VIP'),
  ('CUST-0001', 'Priority Support'),
  ('CUST-0002', 'Corporate Tier 1'),
  ('CUST-0002', 'High Value'),
  ('CUST-0003', 'Loyal'),
  ('CUST-0004', 'Tier 1 Dealer'),
  ('CUST-0006', 'Enterprise'),
  ('CUST-0009', 'Priority Support'),
  ('CUST-0009', 'Branch Customer'),
  ('CUST-0010', 'High Value'),
  ('CUST-0010', 'Regional Branch')
ON CONFLICT (customer_id, tag) DO NOTHING;

-- Advance sequences
SELECT setval('customers_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM customers));
SELECT setval('contacts_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM contacts));
SELECT setval('segment_id_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM segments));
SELECT setval('interactions_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM interactions));
