-- ==============================================================================
-- ERP-2 Seed Data: 6 Suppliers (SUP-0001 to SUP-0006) and Supplier Ratings
-- Conforms to Section 5 Shared Seed Contract
-- Issues:
--   - [ERP2-A1] Suppliers table and API (#74)
--   - [ERP2-A3] Supplier rating (#76)
-- ==============================================================================

-- 1. Suppliers Master
INSERT INTO suppliers (id, name, contact_person, phone, email, city, gstin, payment_terms, rating, active)
VALUES
    ('SUP-0001', 'Precision Display Panels Ltd', 'Vikram Malhotra', '+91 98201 12345', 'orders@precisiondisplay.co.in', 'Pune', '27AAACP1234A1Z5', 'net30', 4.80, true),
    ('SUP-0002', 'Silicon Chipsets Pvt Ltd', 'Neha Deshmukh', '+91 98450 67890', 'supplies@siliconchips.com', 'Bengaluru', '29AABCS5678B1Z2', 'net15', 4.50, true),
    ('SUP-0003', 'Apex Power Systems', 'Rajesh Nair', '+91 94471 23456', 'sales@apexpower.in', 'Kochi', '32AAACA9012C1Z8', 'advance', 4.20, true),
    ('SUP-0004', 'Sonic Sound Components', 'Sunil Rao', '+91 98860 34567', 'info@sonicsound.co.in', 'Bengaluru', '29AAACS3456D1Z1', 'net30', 4.60, true),
    ('SUP-0005', 'Metro Polymer & Packaging', 'Amitabh Sen', '+91 98300 45678', 'dispatch@metropolymer.com', 'Kolkata', '19AAACM7890E1Z6', 'net15', 4.00, true),
    ('SUP-0006', 'Optima Cables & Harnesses', 'Kavita Joshi', '+91 98220 56789', 'orders@optimacables.in', 'Mumbai', '27AAACO4567F1Z3', 'net30', 4.40, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    city = EXCLUDED.city,
    gstin = EXCLUDED.gstin,
    payment_terms = EXCLUDED.payment_terms,
    rating = EXCLUDED.rating,
    active = EXCLUDED.active;

-- Advance suppliers sequence
SELECT setval('suppliers_seq', 6, true);

-- 2. Supplier Ratings [ERP2-A3]
INSERT INTO supplier_ratings (id, supplier_id, delivery_score, quality_score, comment, created_at)
VALUES
    ('RAT-0001', 'SUP-0001', 4.8, 4.8, 'Consistent on-time delivery and top panel quality', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('RAT-0002', 'SUP-0002', 4.5, 4.5, 'Reliable silicon components and good packaging', CURRENT_TIMESTAMP - INTERVAL '8 days'),
    ('RAT-0003', 'SUP-0003', 4.2, 4.2, 'Standard lead times, decent transformer units', CURRENT_TIMESTAMP - INTERVAL '6 days'),
    ('RAT-0004', 'SUP-0004', 4.6, 4.6, 'High fidelity audio drivers with zero defects', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('RAT-0005', 'SUP-0005', 4.0, 4.0, 'Durable polymer frames, slightly slow dispatch', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('RAT-0006', 'SUP-0006', 4.4, 4.4, 'Quality cable looms with full testing certificates', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET
    supplier_id = EXCLUDED.supplier_id,
    delivery_score = EXCLUDED.delivery_score,
    quality_score = EXCLUDED.quality_score,
    comment = EXCLUDED.comment;

-- Advance ratings sequence
SELECT setval('supplier_ratings_seq', 6, true);
