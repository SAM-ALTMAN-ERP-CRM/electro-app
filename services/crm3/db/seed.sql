-- Database seed for CRM-3 (Port 5103)
-- Conforms strictly to Section 5 shared seed contract.
-- CUST-0009 duplicates CUST-0001 phone (9820011111).
-- CUST-0010 duplicates CUST-0002 email (contact@sunrise.com).

INSERT INTO customers (id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at)
VALUES
  ('CUST-0001', 'Aarav Mehta', 'retail', 'aarav.mehta@example.com', '9820011111', NULL, '12 Linking Road, Bandra West', '12 Linking Road, Bandra West', 'Mumbai', '2026-11-01 10:00:00+05:30'),
  ('CUST-0002', 'Sunrise Electronics Pvt Ltd', 'corporate', 'contact@sunrise.com', '9820022222', '27AABCS1234F1Z5', '88 Nariman Point, Express Towers', 'Plot 42 MIDC Andheri East', 'Mumbai', '2026-11-01 10:05:00+05:30'),
  ('CUST-0003', 'Priya Nair', 'retail', 'priya.nair@example.com', '9847012345', NULL, '5 Marine Drive', '5 Marine Drive', 'Kochi', '2026-11-01 10:10:00+05:30'),
  ('CUST-0004', 'BrightHome Retail LLP', 'dealer', 'sales@brighthome.com', '9822098765', '27AABCB9876E1Z2', '45 FC Road, Shivajinagar', 'Warehouse 3, Hadapsar Industrial Estate', 'Pune', '2026-11-01 10:15:00+05:30'),
  ('CUST-0005', 'Kiran Patel', 'retail', 'kiran.patel@example.com', '9825012345', NULL, '23 Ashram Road', '23 Ashram Road', 'Ahmedabad', '2026-11-01 10:20:00+05:30'),
  ('CUST-0006', 'Metro Offices Ltd', 'corporate', 'admin@metrooffices.com', '9811054321', '07AABCM5432D1Z9', '10 Barakhamba Road, Connaught Place', 'Building 5 DLF Phase 2', 'Delhi', '2026-11-01 10:25:00+05:30'),
  ('CUST-0007', 'Sneha Iyer', 'retail', 'sneha.iyer@example.com', '9840012345', NULL, '77 Anna Salai', '77 Anna Salai', 'Chennai', '2026-11-01 10:30:00+05:30'),
  ('CUST-0008', 'Gadget Hub', 'dealer', 'info@gadgethub.com', '9845012345', '29AABCG1234H1Z1', '150 Brigade Road', 'Electronics City Phase 1', 'Bengaluru', '2026-11-01 10:35:00+05:30'),
  ('CUST-0009', 'Aarav Mehta (Duplicate)', 'retail', 'aarav.duplicate@example.com', '9820011111', NULL, '12 Linking Road, Bandra West', '12 Linking Road, Bandra West', 'Mumbai', '2026-11-01 10:40:00+05:30'),
  ('CUST-0010', 'Sunrise Electronics (Branch)', 'corporate', 'contact@sunrise.com', '9820033333', '27AABCS1234F1Z5', '18 Senapati Bapat Road', 'Hinjewadi Tech Park Phase 2', 'Pune', '2026-11-01 10:45:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gstin = EXCLUDED.gstin,
  billing_address = EXCLUDED.billing_address,
  shipping_address = EXCLUDED.shipping_address,
  city = EXCLUDED.city;

-- Seed contacts for CUST-0001 through CUST-0010
INSERT INTO contacts (id, customer_id, name, phone, email, designation)
VALUES
  ('CON-0001', 'CUST-0001', 'Aarav Mehta', '9820011111', 'aarav.mehta@example.com', 'Primary Contact'),
  ('CON-0002', 'CUST-0002', 'Rajesh Sharma', '9820022221', 'rsharma@sunrise.com', 'Procurement Manager'),
  ('CON-0003', 'CUST-0002', 'Anita Desai', '9820022223', 'adesai@sunrise.com', 'Accounts Lead'),
  ('CON-0004', 'CUST-0003', 'Priya Nair', '9847012345', 'priya.nair@example.com', 'Primary Contact'),
  ('CON-0005', 'CUST-0004', 'Vikram Joshi', '9822098766', 'vjoshi@brighthome.com', 'Dealer Representative'),
  ('CON-0006', 'CUST-0005', 'Kiran Patel', '9825012345', 'kiran.patel@example.com', 'Primary Contact'),
  ('CON-0007', 'CUST-0006', 'Sunil Kapoor', '9811054321', 'skapoor@metrooffices.com', 'Operations Director'),
  ('CON-0008', 'CUST-0007', 'Sneha Iyer', '9840012345', 'sneha.iyer@example.com', 'Primary Contact'),
  ('CON-0009', 'CUST-0008', 'Girish Reddy', '9845012345', 'greddy@gadgethub.com', 'Store Manager'),
  ('CON-0010', 'CUST-0009', 'Aarav Mehta Jr', '9820011111', 'aarav.duplicate@example.com', 'Associate'),
  ('CON-0011', 'CUST-0010', 'Rajesh Sharma', '9820033333', 'contact@sunrise.com', 'Branch Lead')
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  designation = EXCLUDED.designation;

-- Seed sample interactions
INSERT INTO interactions (id, customer_id, type, summary, source_team, created_by, created_at)
VALUES
  ('INT-0001', 'CUST-0001', 'call', 'Initial discovery call for retail electronics catalog', 'CRM-3', 'EMP-0001', NOW() - INTERVAL '5 days'),
  ('INT-0002', 'CUST-0001', 'email', 'Product brochure sent for 55-inch 4K Smart TV', 'CRM-3', 'EMP-0001', NOW() - INTERVAL '3 days'),
  ('INT-0003', 'CUST-0002', 'meeting', 'Commercial terms review for Q4 corporate procurement', 'CRM-3', 'EMP-0002', NOW() - INTERVAL '4 days'),
  ('INT-0004', 'CUST-0009', 'call', 'Branch enquiry regarding bulk order discount', 'CRM-3', 'EMP-0001', NOW() - INTERVAL '2 days'),
  ('INT-0005', 'CUST-0010', 'email', 'Branch procurement requirements follow-up', 'CRM-3', 'EMP-0002', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  type = EXCLUDED.type,
  summary = EXCLUDED.summary,
  source_team = EXCLUDED.source_team,
  created_by = EXCLUDED.created_by,
  created_at = EXCLUDED.created_at;

-- Seed customer tags (CRM3-C3/CRM3-D1)
INSERT INTO customer_tags (customer_id, tag)
VALUES
  ('CUST-0001', 'VIP'),
  ('CUST-0001', 'Priority Support'),
  ('CUST-0009', 'Priority Support'),
  ('CUST-0009', 'Branch Customer'),
  ('CUST-0002', 'Corporate Account'),
  ('CUST-0002', 'High Value'),
  ('CUST-0010', 'High Value'),
  ('CUST-0010', 'Regional Branch'),
  ('CUST-0003', 'Loyal'),
  ('CUST-0004', 'Tier 1 Dealer')
ON CONFLICT (customer_id, tag) DO NOTHING;

-- Advance sequences
SELECT setval('customers_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM customers));
SELECT setval('contacts_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM contacts));
SELECT setval('interactions_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM interactions));
