-- Database seed for ERP-6 HR & Workforce (Port 5206, Database erp6_db)
-- Build Issue: [ERP6-A1] Employees and departments API
-- Shared Seed Contract (Section 5): DEP-01 to DEP-05 and EMP-0001 to EMP-0012

-- 1. Departments Seed
INSERT INTO departments (id, name)
VALUES
  ('DEP-01', 'Sales'),
  ('DEP-02', 'Support'),
  ('DEP-03', 'HR'),
  ('DEP-04', 'Warehouse and Production'),
  ('DEP-05', 'Finance')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name;

SELECT setval(
  'department_seq',
  GREATEST(
    5,
    (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM departments WHERE id LIKE 'DEP-%')
  )
);

-- 2. Employees Seed (Managers first to satisfy self-referencing foreign keys)
INSERT INTO employees (
  id, name, email, phone, department_id, role_title, manager_id, join_date, base_salary, active
) VALUES
  ('EMP-0012', 'Rahul Verma', 'rahul.verma@electro.com', '9820011112', 'DEP-03', 'Admin', NULL, '2024-01-01', 90000.00, TRUE),
  ('EMP-0008', 'Meera Joshi', 'meera.joshi@electro.com', '9820011108', 'DEP-03', 'HR Manager', 'EMP-0012', '2024-01-15', 75000.00, TRUE),
  ('EMP-0009', 'Arjun Das', 'arjun.das@electro.com', '9820011109', 'DEP-04', 'Warehouse Manager', 'EMP-0012', '2024-02-01', 65000.00, TRUE),
  ('EMP-0010', 'Kavita Shah', 'kavita.shah@electro.com', '9820011110', 'DEP-05', 'Finance Manager', 'EMP-0012', '2024-02-15', 80000.00, TRUE),
  ('EMP-0011', 'Manoj Pillai', 'manoj.pillai@electro.com', '9820011111', 'DEP-04', 'Production Supervisor', 'EMP-0009', '2024-03-01', 55000.00, TRUE),
  ('EMP-0001', 'Rohan Kulkarni', 'rohan.kulkarni@electro.com', '9820011101', 'DEP-01', 'Sales Rep', 'EMP-0012', '2025-01-15', 45000.00, TRUE),
  ('EMP-0002', 'Neha Sharma', 'neha.sharma@electro.com', '9820011102', 'DEP-01', 'Sales Rep', 'EMP-0012', '2025-02-01', 45000.00, TRUE),
  ('EMP-0003', 'Vikram Singh', 'vikram.singh@electro.com', '9820011103', 'DEP-01', 'Sales Rep', 'EMP-0012', '2025-02-15', 45000.00, TRUE),
  ('EMP-0004', 'Anjali Rao', 'anjali.rao@electro.com', '9820011104', 'DEP-01', 'Sales Rep', 'EMP-0012', '2025-03-01', 45000.00, TRUE),
  ('EMP-0005', 'Imran Qureshi', 'imran.qureshi@electro.com', '9820011105', 'DEP-02', 'Service Engineer', 'EMP-0012', '2025-01-20', 40000.00, TRUE),
  ('EMP-0006', 'Deepa Menon', 'deepa.menon@electro.com', '9820011106', 'DEP-02', 'Service Engineer', 'EMP-0012', '2025-02-10', 40000.00, TRUE),
  ('EMP-0007', 'Suresh Kumar', 'suresh.kumar@electro.com', '9820011107', 'DEP-02', 'Service Engineer', 'EMP-0012', '2025-03-05', 40000.00, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  department_id = EXCLUDED.department_id,
  role_title = EXCLUDED.role_title,
  manager_id = EXCLUDED.manager_id,
  join_date = EXCLUDED.join_date,
  base_salary = EXCLUDED.base_salary,
  active = EXCLUDED.active;

SELECT setval(
  'employee_seq',
  GREATEST(
    12,
    (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM employees WHERE id LIKE 'EMP-%')
  )
);

-- 3. Commissions Seed (Build Issue: [ERP6-D1])
-- 5 realistic seed rows adhering to shared IDs (EMP-0001 to EMP-0004)
INSERT INTO commissions (
  id, sales_rep_id, invoice_id, invoice_amount, rate_percent, commission_amount, month, created_at
) VALUES
  ('COMM-0001', 'EMP-0001', 'INV-0091', 45000.00, 2.00, 900.00, '2026-10', '2026-10-15T10:00:00Z'),
  ('COMM-0002', 'EMP-0002', 'INV-0092', 150000.00, 3.00, 4500.00, '2026-10', '2026-10-16T11:00:00Z'),
  ('COMM-0003', 'EMP-0003', 'INV-0093', 75000.00, 2.00, 1500.00, '2026-10', '2026-10-20T09:30:00Z'),
  ('COMM-0004', 'EMP-0004', 'INV-0094', 200000.00, 3.00, 6000.00, '2026-11', '2026-11-01T14:00:00Z'),
  ('COMM-0005', 'EMP-0001', 'INV-0095', 80000.00, 2.00, 1600.00, '2026-11', '2026-11-02T16:00:00Z')
ON CONFLICT (invoice_id) DO UPDATE SET
  sales_rep_id = EXCLUDED.sales_rep_id,
  invoice_amount = EXCLUDED.invoice_amount,
  rate_percent = EXCLUDED.rate_percent,
  commission_amount = EXCLUDED.commission_amount,
  month = EXCLUDED.month;

SELECT setval(
  'commission_seq',
  GREATEST(
    5,
    (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM commissions WHERE id LIKE 'COMM-%')
  )
);

-- 4. Salary Slips Seed (Build Issues: [ERP6-C1] & [ERP6-C3])
-- 5 realistic seed rows adhering to shared IDs (EMP-0001 to EMP-0005) for Month 2026-11
INSERT INTO salary_slips (
  id, employee_id, month, base_salary, hra, allowances, pf_deduction, absent_days, absent_deduction, commission, net_pay, status, generated_at
) VALUES
  ('SLIP-2611-0001', 'EMP-0001', '2026-11', 45000.00, 18000.00, 2000.00, 5400.00, 0, 0.00, 1600.00, 61200.00, 'generated', '2026-11-01T10:00:00Z'),
  ('SLIP-2611-0002', 'EMP-0002', '2026-11', 45000.00, 18000.00, 2000.00, 5400.00, 1, 1500.00, 0.00, 58100.00, 'paid', '2026-11-01T10:00:00Z'),
  ('SLIP-2611-0003', 'EMP-0003', '2026-11', 45000.00, 18000.00, 2000.00, 5400.00, 0, 0.00, 0.00, 59600.00, 'generated', '2026-11-01T10:00:00Z'),
  ('SLIP-2611-0004', 'EMP-0004', '2026-11', 45000.00, 18000.00, 2000.00, 5400.00, 0, 0.00, 6000.00, 65600.00, 'generated', '2026-11-01T10:00:00Z'),
  ('SLIP-2611-0005', 'EMP-0005', '2026-11', 40000.00, 16000.00, 2000.00, 4800.00, 0, 0.00, 0.00, 53200.00, 'paid', '2026-11-01T10:00:00Z')
ON CONFLICT (employee_id, month) DO UPDATE SET
  base_salary = EXCLUDED.base_salary,
  hra = EXCLUDED.hra,
  allowances = EXCLUDED.allowances,
  pf_deduction = EXCLUDED.pf_deduction,
  absent_days = EXCLUDED.absent_days,
  absent_deduction = EXCLUDED.absent_deduction,
  commission = EXCLUDED.commission,
  net_pay = EXCLUDED.net_pay,
  status = EXCLUDED.status;

SELECT setval(
  'salary_slip_seq',
  GREATEST(
    5,
    (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 11) AS INTEGER)), 0) FROM salary_slips WHERE id LIKE 'SLIP-2611-%')
  )
);


