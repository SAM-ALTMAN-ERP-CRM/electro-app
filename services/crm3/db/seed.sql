-- Database seed for CRM-3 (Port 5103)
-- Conforms strictly to Section 5 shared seed contract.
-- CUST-0009 duplicates CUST-0001 phone (9820112345).
-- CUST-0010 duplicates CUST-0002 email (purchase@sunrise.com).

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
  ('CUST-0010', 'Sunrise Electronics Mumbai Branch', 'corporate', 'purchase@sunrise.com', '9820998877', '27AABCS1234F1Z5', 'Plot 45, MIDC Industrial Area, Andheri East', 'Plot 45, MIDC Industrial Area, Andheri East', 'Mumbai')
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

-- Advance sequences
SELECT setval('customers_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM customers));
SELECT setval('contacts_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM contacts));
