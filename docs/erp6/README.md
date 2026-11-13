# ERP-6 — HR & Workforce Module

## What This Module Does

ERP-6 manages the **employee directory** for the electronics company. It provides:

- **Departments** — create and rename department records (DEP-01 to DEP-05).
- **Employees** — full CRUD with filtering by department, role title, and name search.
- **Manager hierarchy** — each employee can have a manager; the detail endpoint returns the manager info and the employee's direct reports.
- **Deactivation** — employees can be deactivated (soft-delete). Inactive employees are hidden from default lists and from other teams' dropdowns.

Three other teams depend on this service:
- **CRM-1** queries `GET /api/employees?role_title=Sales Rep` to populate the sales rep dropdown.
- **CRM-2** queries `GET /api/employees?role_title=Service Engineer` to assign engineers to service orders.
- **ERP-5** references `employee_id` for payroll and commission records.

---

## How to Run

### 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally
- `.env` file inside `services/erp6/` (or repo root)

### 2. Environment Variables

Create `services/erp6/.env` (or add to repo root `.env`):

```env
PORT=5206
DATABASE_URL_ERP6=postgresql://postgres:postgres@localhost:5432/erp6_db
AUTH_REQUIRED=false
USE_MOCKS=false
```

### 3. Create and Seed the Database

```bash
# Create the database (run once)
psql -U postgres -c "CREATE DATABASE erp6_db;"

# Apply schema (safe to re-run — uses CREATE TABLE IF NOT EXISTS)
psql -U postgres -d erp6_db -f services/erp6/db/schema.sql

# Load seed data (safe to re-run — uses INSERT ... ON CONFLICT DO NOTHING)
psql -U postgres -d erp6_db -f services/erp6/db/seed.sql
```

### 4. Install Dependencies and Start

```bash
cd services/erp6
npm install
node server.js
# Server starts on http://localhost:5206
```

### 5. Run Tests

```bash
cd services/erp6
npm test
# Runs 25 tests across departments and employees
```

---

## Endpoint List

All routes are protected by `requireAuth`. Set `AUTH_REQUIRED=false` in `.env` to bypass during development.

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Returns `{ status: "ok", service: "erp6" }` |

### Departments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/departments` | List all departments |
| GET | `/api/departments/:id` | Get one department by ID (e.g. `DEP-01`) |
| POST | `/api/departments` | Create a department — body: `{ name }` |
| PUT | `/api/departments/:id` | Rename a department — body: `{ name }` |
| DELETE | `/api/departments/:id` | Delete a department (fails if employees exist in it) |

### Employees

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/employees` | List employees. Query params: `department`, `role_title`, `q` (name/email search), `active` (`true`/`false`, default `true`) |
| GET | `/api/employees/:id` | Get one employee — includes `manager` object and `direct_reports` array |
| POST | `/api/employees` | Create an employee |
| PUT | `/api/employees/:id` | Update an employee |
| DELETE | `/api/employees/:id` | Hard delete (use deactivate instead for soft-delete) |
| PATCH | `/api/employees/:id/deactivate` | Set `active = false` |
| PATCH | `/api/employees/:id/activate` | Set `active = true` |

#### GET /api/employees — Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `department` | string | Filter by department ID (e.g. `DEP-01`) |
| `role_title` | string | Filter by exact role title (e.g. `Sales Rep`, `Service Engineer`) |
| `q` | string | Search name or email (case-insensitive substring) |
| `active` | boolean | `true` (default) = only active staff, `false` = only inactive |

#### POST/PUT /api/employees — Request Body

```json
{
  "name": "Rohan Kulkarni",
  "email": "rohan.kulkarni@electro.in",
  "phone": "9876543201",
  "department_id": "DEP-01",
  "role_title": "Sales Rep",
  "manager_id": "EMP-0009",
  "join_date": "2023-04-01",
  "base_salary": 55000.00
}
```

All fields except `email` are optional on PUT. `manager_id` cannot equal the employee's own ID (validated server-side, returns 400).

#### Response Format

Success:
```json
{ "data": { ... } }
```

Error:
```json
{ "error": "clear message" }
```

Status codes: `400` bad input, `404` not found, `409` duplicate email.

---

## Seed Data

### Departments (DEP-01 to DEP-05)

| ID | Name |
|----|------|
| DEP-01 | Sales |
| DEP-02 | Support |
| DEP-03 | HR |
| DEP-04 | Warehouse and Production |
| DEP-05 | Finance |

### Employees (EMP-0001 to EMP-0012)

| ID | Name | Role | Department |
|----|------|------|------------|
| EMP-0001 | Rohan Kulkarni | Sales Rep | DEP-01 |
| EMP-0002 | Neha Sharma | Sales Rep | DEP-01 |
| EMP-0003 | Vikram Singh | Sales Rep | DEP-01 |
| EMP-0004 | Anjali Rao | Sales Rep | DEP-01 |
| EMP-0005 | Imran Qureshi | Service Engineer | DEP-02 |
| EMP-0006 | Deepa Menon | Service Engineer | DEP-02 |
| EMP-0007 | Suresh Kumar | Service Engineer | DEP-02 |
| EMP-0008 | Meena Joshi | HR Manager | DEP-03 |
| EMP-0009 | Arjun Nair | Sales Manager | DEP-01 |
| EMP-0010 | Priya Das | Finance Executive | DEP-05 |
| EMP-0011 | Ravi Shankar | Warehouse Manager | DEP-04 |
| EMP-0012 | Rahul Verma | Support Manager | DEP-02 |

---

## Cross-Team Contracts

### Who Calls ERP-6

| Team | Endpoint Called | Purpose |
|------|----------------|---------|
| CRM-1 | `GET /api/employees?role_title=Sales Rep` | Populate sales rep dropdown when creating/editing a lead or order |
| CRM-2 | `GET /api/employees?role_title=Service Engineer` | Populate engineer dropdown when creating a service order |
| ERP-5 | References `employee_id` (EMP-0001..EMP-0007) | Links payroll and commission records to employees |

> **Important**: The `active` filter defaults to `true`. Deactivated employees are automatically hidden from all callers' dropdowns.

### Who ERP-6 Calls

| Team | Endpoint | Purpose | Mock File |
|------|----------|---------|-----------|
| ERP-5 | `GET /api/invoices/paid` | Fetch settled invoices to calculate sales commissions | `services/erp6/mocks/invoices-paid.json` |
| ERP-5 | `POST /api/ledger/auto` | Post salary and commission entries to the ledger | `services/erp6/mocks/ledger.json` |

> If ERP-5 is not running, set `USE_MOCKS=true` in `.env`. The service logs `[mock] used for <name>` and continues.

---

## Folder Structure

```
services/erp6/
├── db/
│   ├── schema.sql          # CREATE TABLE statements (re-runnable)
│   └── seed.sql            # INSERT seed rows (re-runnable, ON CONFLICT DO NOTHING)
├── mocks/
│   ├── departments.json    # 5 mock department rows
│   ├── employees.json      # 12 mock employee rows
│   ├── invoices-paid.json  # Mock ERP-5 paid invoices
│   └── ledger.json         # Mock ERP-5 ledger response
├── routes/
│   ├── departments.js      # Express router for /api/departments
│   └── employees.js        # Express router for /api/employees
├── tests/
│   ├── departments.test.js # 9 tests
│   └── employees.test.js   # 16 tests
├── package.json
└── server.js               # Shared — do not edit
```

```
frontend/src/modules/erp6/
├── pages/
│   ├── EmployeesPage.jsx       # Table + search + filter + add/edit form
│   ├── EmployeeDetailPage.jsx  # Detail view with manager card, direct reports
│   └── DepartmentsPage.jsx     # Department list with add/rename/delete
└── index.jsx                   # Module definition (id, title, roles, routes)
```

