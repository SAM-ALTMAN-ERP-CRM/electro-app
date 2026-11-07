-- Database seed for CRM-3 Customer 360 (Port 5103)

-- 1. Customers Seed (Section 5 shared contract CUST-0001 to CUST-0010)
INSERT INTO customers (id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at) VALUES
('CUST-0001', 'Aarav Mehta', 'retail', 'aarav.mehta@example.com', '9820011111', NULL, '12 Linking Road, Bandra West', '12 Linking Road, Bandra West', 'Mumbai', '2026-11-01 10:00:00'),
('CUST-0002', 'Sunrise Electronics Pvt Ltd', 'corporate', 'contact@sunrise.com', '9820022222', '27AABCS1234F1Z5', '88 Nariman Point, Express Towers', 'Plot 42 MIDC Andheri East', 'Mumbai', '2026-11-01 10:05:00'),
('CUST-0003', 'Priya Nair', 'retail', 'priya.nair@example.com', '9847012345', NULL, '5 Marine Drive', '5 Marine Drive', 'Kochi', '2026-11-01 10:10:00'),
('CUST-0004', 'BrightHome Retail LLP', 'dealer', 'sales@brighthome.com', '9822098765', '27AABCB9876E1Z2', '45 FC Road, Shivajinagar', 'Warehouse 3, Hadapsar Industrial Estate', 'Pune', '2026-11-01 10:15:00'),
('CUST-0005', 'Kiran Patel', 'retail', 'kiran.patel@example.com', '9825012345', NULL, '23 Ashram Road', '23 Ashram Road', 'Ahmedabad', '2026-11-01 10:20:00'),
('CUST-0006', 'Metro Offices Ltd', 'corporate', 'admin@metrooffices.com', '9811054321', '07AABCM5432D1Z9', '10 Barakhamba Road, Connaught Place', 'Building 5 DLF Phase 2', 'Delhi', '2026-11-01 10:25:00'),
('CUST-0007', 'Sneha Iyer', 'retail', 'sneha.iyer@example.com', '9840012345', NULL, '77 Anna Salai', '77 Anna Salai', 'Chennai', '2026-11-01 10:30:00'),
('CUST-0008', 'Gadget Hub', 'dealer', 'info@gadgethub.com', '9845012345', '29AABCG1234H1Z1', '150 Brigade Road', 'Electronics City Phase 1', 'Bengaluru', '2026-11-01 10:35:00'),
('CUST-0009', 'Aarav Mehta (Duplicate)', 'retail', 'aarav.duplicate@example.com', '9820011111', NULL, '12 Linking Road, Bandra West', '12 Linking Road, Bandra West', 'Mumbai', '2026-11-01 10:40:00'),
('CUST-0010', 'Sunrise Electronics (Branch)', 'corporate', 'contact@sunrise.com', '9820033333', '27AABCS1234F1Z5', '18 Senapati Bapat Road', 'Hinjewadi Tech Park Phase 2', 'Pune', '2026-11-01 10:45:00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gstin = EXCLUDED.gstin,
  billing_address = EXCLUDED.billing_address,
  shipping_address = EXCLUDED.shipping_address,
  city = EXCLUDED.city;

-- 2. Contacts Seed
INSERT INTO contacts (id, customer_id, name, phone, email, designation) VALUES
('CONT-0001', 'CUST-0001', 'Aarav Mehta', '9820011111', 'aarav.mehta@example.com', 'Owner'),
('CONT-0002', 'CUST-0002', 'Rajesh Sharma', '9820022221', 'r.sharma@sunrise.com', 'Procurement Head'),
('CONT-0003', 'CUST-0002', 'Pooja Verma', '9820022223', 'p.verma@sunrise.com', 'Finance Director'),
('CONT-0004', 'CUST-0003', 'Priya Nair', '9847012345', 'priya.nair@example.com', 'Proprietor'),
('CONT-0005', 'CUST-0004', 'Vikram Joshi', '9822098766', 'vikram@brighthome.com', 'Store Manager'),
('CONT-0006', 'CUST-0005', 'Kiran Patel', '9825012345', 'kiran.patel@example.com', 'Partner')
ON CONFLICT (id) DO NOTHING;

-- 3. Segments Seed (CRM3-C1: 4 seed segments including Corporate in Mumbai)
INSERT INTO segments (id, name, customer_type, city, created_at) VALUES
('SEG-0001', 'Corporate in Mumbai', 'corporate', 'Mumbai', '2026-11-02 09:00:00'),
('SEG-0002', 'All Retail Customers', 'retail', NULL, '2026-11-02 09:30:00'),
('SEG-0003', 'Dealers in Pune', 'dealer', 'Pune', '2026-11-02 10:00:00'),
('SEG-0004', 'Delhi NCR Clients', NULL, 'Delhi', '2026-11-02 10:30:00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  customer_type = EXCLUDED.customer_type,
  city = EXCLUDED.city;

-- 4. Customer Tags Seed (CRM3-C3)
INSERT INTO customer_tags (customer_id, tag) VALUES
('CUST-0001', 'VIP'),
('CUST-0001', 'Priority Support'),
('CUST-0002', 'Key Account'),
('CUST-0002', 'Enterprise'),
('CUST-0003', 'Loyal'),
('CUST-0004', 'Tier 1 Dealer'),
('CUST-0005', 'High Value'),
('CUST-0006', 'Corporate Tier 1'),
('CUST-0007', 'Repeat Buyer'),
('CUST-0008', 'Regional Distributor')
ON CONFLICT (customer_id, tag) DO NOTHING;

-- Advance sequences
SELECT setval('customers_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM customers));
SELECT setval('contacts_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM contacts));
SELECT setval('segment_id_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM segments));
