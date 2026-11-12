-- Database schema for ERP-6 HR & Workforce (Port 5206, Database erp6_db)
-- Build Issue: [ERP6-A1] Employees and departments API

-- 1. Departments table and sequence
CREATE SEQUENCE IF NOT EXISTS department_seq START 1;

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('DEP-' || LPAD(nextval('department_seq')::TEXT, 2, '0')),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Employees table and sequence
CREATE SEQUENCE IF NOT EXISTS employee_seq START 1;

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('EMP-' || LPAD(nextval('employee_seq')::TEXT, 4, '0')),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  department_id VARCHAR(20) REFERENCES departments(id) ON DELETE SET NULL,
  role_title VARCHAR(100) NOT NULL,
  manager_id VARCHAR(20) REFERENCES employees(id) ON DELETE SET NULL,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for frequent lookups and filters
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_role_title ON employees(role_title);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);

-- 3. Commissions table and sequence (Build Issue: [ERP6-D1])
CREATE SEQUENCE IF NOT EXISTS commission_seq START 1;

CREATE TABLE IF NOT EXISTS commissions (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('COMM-' || LPAD(nextval('commission_seq')::TEXT, 4, '0')),
  sales_rep_id VARCHAR(20) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  invoice_id VARCHAR(50) UNIQUE NOT NULL,
  invoice_amount NUMERIC(12, 2) NOT NULL,
  rate_percent NUMERIC(5, 2) NOT NULL,
  commission_amount NUMERIC(12, 2) NOT NULL,
  month VARCHAR(7) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for commissions lookups and filters
CREATE INDEX IF NOT EXISTS idx_commissions_sales_rep_id ON commissions(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_commissions_month ON commissions(month);

-- 4. Salary Slips table and sequence (Build Issues: [ERP6-C1] & [ERP6-C3])
CREATE SEQUENCE IF NOT EXISTS salary_slip_seq START 1;

CREATE TABLE IF NOT EXISTS salary_slips (
  id VARCHAR(30) PRIMARY KEY DEFAULT ('SLIP-2611-' || LPAD(nextval('salary_slip_seq')::TEXT, 4, '0')),
  employee_id VARCHAR(20) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  base_salary NUMERIC(12, 2) NOT NULL,
  hra NUMERIC(12, 2) NOT NULL,
  allowances NUMERIC(12, 2) NOT NULL DEFAULT 2000.00,
  pf_deduction NUMERIC(12, 2) NOT NULL,
  absent_days INTEGER NOT NULL DEFAULT 0,
  absent_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  commission NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_pay NUMERIC(12, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'generated',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_salary_slips_employee_month UNIQUE (employee_id, month)
);

-- Indexes for frequent lookups and filters
CREATE INDEX IF NOT EXISTS idx_salary_slips_month ON salary_slips(month);
CREATE INDEX IF NOT EXISTS idx_salary_slips_employee_id ON salary_slips(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_slips_status ON salary_slips(status);


