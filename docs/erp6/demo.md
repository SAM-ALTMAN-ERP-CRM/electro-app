# ERP-6 Demo Script

**Module**: HR & Workforce (ERP-6)  
**Port**: 5206  
**Audience**: Anyone outside the team (TA, instructor, another team)

## Prerequisites

1. PostgreSQL is running and `erp6_db` is seeded:
   ```bash
   psql -U postgres -c "CREATE DATABASE erp6_db;"
   psql -U postgres -d erp6_db -f services/erp6/db/schema.sql
   psql -U postgres -d erp6_db -f services/erp6/db/seed.sql
   ```
2. ERP-6 service is running:
   ```bash
   cd services/erp6
   AUTH_REQUIRED=false PORT=5206 DATABASE_URL_ERP6=postgresql://postgres:postgres@localhost:5432/erp6_db node server.js
   ```
3. Frontend dev server is running:
   ```bash
   cd frontend && npm run dev   # http://localhost:3000
   ```

---

## Step 1 — Employee Directory (Browse All Staff)

**What you are showing**: The full list of 12 employees across all departments.

### In the browser

1. Open `http://localhost:3000` and log in (any credentials when `AUTH_REQUIRED=false`).
2. Click **ERP-6 HR & Workforce** in the left menu.
3. Click **Employees** — you see a table with 12 rows.

### Via API

```bash
curl -s http://localhost:5206/api/employees | python3 -m json.tool
```

**Expected**: `data` array with 12 employees (EMP-0001 to EMP-0012), all `active: true`.

```json
{
  "data": [
    { "id": "EMP-0001", "name": "Rohan Kulkarni",  "role_title": "Sales Rep",          "department_id": "DEP-01" },
    { "id": "EMP-0002", "name": "Neha Sharma",     "role_title": "Sales Rep",          "department_id": "DEP-01" },
    { "id": "EMP-0005", "name": "Imran Qureshi",   "role_title": "Service Engineer",   "department_id": "DEP-02" },
    ...
  ]
}
```

---

## Step 2 — Filter by Role (CRM-1 / CRM-2 Integration)

**What you are showing**: Other teams call this endpoint to populate their dropdowns. Only active employees are returned.

### Filter: Sales Reps (what CRM-1 calls)

```bash
curl -s "http://localhost:5206/api/employees?role_title=Sales%20Rep" | python3 -m json.tool
```

**Expected**: 4 rows — EMP-0001 Rohan Kulkarni, EMP-0002 Neha Sharma, EMP-0003 Vikram Singh, EMP-0004 Anjali Rao.

### Filter: Service Engineers (what CRM-2 calls)

```bash
curl -s "http://localhost:5206/api/employees?role_title=Service%20Engineer" | python3 -m json.tool
```

**Expected**: 3 rows — EMP-0005 Imran Qureshi, EMP-0006 Deepa Menon, EMP-0007 Suresh Kumar.

### Filter: Sales Department in the browser

1. On the **Employees** page, open the **Department** dropdown.
2. Select **Sales (DEP-01)** — the table narrows to 4 Sales Reps.
3. Type `Vik` in the search box — only EMP-0003 Vikram Singh remains.

---

## Step 3 — Employee Detail (Manager Hierarchy)

**What you are showing**: Each employee card shows their manager and all their direct reports.

### In the browser

1. Click on **Rahul Verma (EMP-0012)** in the table.
2. The detail page shows:
   - **Role**: Support Manager, DEP-02 Support
   - **Manager**: *(none — Rahul reports to no one)*
   - **Direct Reports**: Imran Qureshi (EMP-0005), Deepa Menon (EMP-0006), Suresh Kumar (EMP-0007)

### Via API

```bash
curl -s http://localhost:5206/api/employees/EMP-0012 | python3 -m json.tool
```

**Expected response includes**:

```json
{
  "data": {
    "id": "EMP-0012",
    "name": "Rahul Verma",
    "role_title": "Support Manager",
    "department_id": "DEP-02",
    "manager_id": null,
    "manager": null,
    "direct_reports": [
      { "id": "EMP-0005", "name": "Imran Qureshi" },
      { "id": "EMP-0006", "name": "Deepa Menon" },
      { "id": "EMP-0007", "name": "Suresh Kumar" }
    ]
  }
}
```

Also check EMP-0001 (Rohan Kulkarni), who reports to EMP-0009 (Arjun Nair):

```bash
curl -s http://localhost:5206/api/employees/EMP-0001 | python3 -m json.tool
```

**Expected**: `manager.name = "Arjun Nair"` and `manager.id = "EMP-0009"`.

---

## Step 4 — Deactivate an Employee (Soft-Delete)

**What you are showing**: Deactivated employees disappear from default lists and from other teams' dropdowns.

### In the browser

1. Go to the **Employees** page.
2. Click on **Anjali Rao (EMP-0004)**.
3. Click the **Deactivate** button — a confirmation prompt appears.
4. Confirm — Anjali Rao disappears from the employee table.
5. Go back to the **Employees** page — only 11 employees visible.
6. Tick **Show inactive** checkbox — EMP-0004 reappears with a grey "Inactive" badge.

### Via API

```bash
# Deactivate EMP-0004
curl -s -X PATCH http://localhost:5206/api/employees/EMP-0004/deactivate | python3 -m json.tool
```

**Expected**: `{ "data": { "id": "EMP-0004", "active": false, ... } }`

```bash
# CRM-1 now only sees 3 Sales Reps
curl -s "http://localhost:5206/api/employees?role_title=Sales%20Rep" | python3 -m json.tool
```

**Expected**: 3 rows — EMP-0001, EMP-0002, EMP-0003 (Anjali Rao is gone).

```bash
# Reactivate her
curl -s -X PATCH http://localhost:5206/api/employees/EMP-0004/activate | python3 -m json.tool
```

**Expected**: `{ "data": { "id": "EMP-0004", "active": true, ... } }`

---

## Step 5 — Manage Departments

**What you are showing**: Departments can be added and renamed; deletion is blocked if employees exist.

### In the browser

1. Click **Departments** in the ERP-6 menu.
2. You see 5 departments: Sales, Support, HR, Warehouse and Production, Finance.
3. Click **Add Department** → type `Legal` → click **Save**.
4. The new department appears in the list with the next sequence ID (e.g. `DEP-06`).
5. Click **Edit** next to `Legal` → rename it to `Legal & Compliance` → **Save**.
6. Try to delete `Sales (DEP-01)` — an error message appears: *"Cannot delete department with existing employees."*

### Via API

```bash
# List all departments
curl -s http://localhost:5206/api/departments | python3 -m json.tool

# Create a new department
curl -s -X POST http://localhost:5206/api/departments \
  -H "Content-Type: application/json" \
  -d '{"name": "Legal"}' | python3 -m json.tool

# Rename it (replace DEP-06 with the ID returned above)
curl -s -X PUT http://localhost:5206/api/departments/DEP-06 \
  -H "Content-Type: application/json" \
  -d '{"name": "Legal & Compliance"}' | python3 -m json.tool

# Delete it (empty department — succeeds)
curl -s -X DELETE http://localhost:5206/api/departments/DEP-06 | python3 -m json.tool

# Try to delete Sales — blocked
curl -s -X DELETE http://localhost:5206/api/departments/DEP-01 | python3 -m json.tool
# Expected: { "error": "Cannot delete department with existing employees." } (409)
```

---

## Validation Checks (Bonus)

These show server-side rules are enforced:

```bash
# Duplicate email → 409
curl -s -X POST http://localhost:5206/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"rohan.kulkarni@electro.in","department_id":"DEP-01","role_title":"Sales Rep","join_date":"2024-01-01","base_salary":40000}' | python3 -m json.tool
# Expected: { "error": "An employee with this email already exists." }

# Self-manager → 400
curl -s -X PUT http://localhost:5206/api/employees/EMP-0001 \
  -H "Content-Type: application/json" \
  -d '{"manager_id":"EMP-0001"}' | python3 -m json.tool
# Expected: { "error": "An employee cannot be their own manager." }
```

---

## Reference IDs Used in This Demo

| Type | IDs |
|------|-----|
| Sales Reps | EMP-0001 Rohan Kulkarni, EMP-0002 Neha Sharma, EMP-0003 Vikram Singh, EMP-0004 Anjali Rao |
| Service Engineers | EMP-0005 Imran Qureshi, EMP-0006 Deepa Menon, EMP-0007 Suresh Kumar |
| Managers | EMP-0009 Arjun Nair (Sales Manager), EMP-0012 Rahul Verma (Support Manager) |
| Departments | DEP-01 Sales, DEP-02 Support, DEP-03 HR, DEP-04 Warehouse and Production, DEP-05 Finance |
| Customers (from shared contract) | CUST-0001 Aarav Mehta, CUST-0002 Sunrise Electronics Pvt Ltd, CUST-0003 Priya Nair |
| Products (from shared contract) | SKU-0001 55-inch 4K Smart TV ₹42,990.00, SKU-0002 43-inch Full HD TV ₹24,990.00 |

