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
