# ERP-6 HR & Workforce — REST API Specification

**Service Name**: ERP-6 HR & Workforce  
**Base URL**: `http://localhost:5206`  
**Database**: `erp6_db`  
**Roles Allowed**: `["admin", "hr"]`  
**Authentication**: All `/api/*` endpoints (except `/api/health`) require authentication via standard JWT Bearer token: `Authorization: Bearer <token>`.

---

## 1. Global Standards & Status Codes

### 1.1 Response Envelope Format
All API responses adhere strictly to the shared JSON envelope contract:
- **Success Response**:
  ```json
  {
    "data": { ... }
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Descriptive human-readable error message"
  }
  ```

### 1.2 HTTP Status Codes
| Status Code | Description | Typical Scenario |
| :--- | :--- | :--- |
| **`200 OK`** | Standard successful retrieval or update | GET, PUT, PATCH requests |
| **`201 Created`** | Resource successfully created | POST requests |
| **`400 Bad Request`** | Validation failure or illegal state transition | Missing fields, invalid foreign keys |
| **`401 Unauthorized`** | Missing or invalid authentication token | Expired token, unauthenticated caller |
| **`403 Forbidden`** | Insufficient user role | Non-admin caller attempting restricted action |
| **`404 Not Found`** | Requested entity does not exist | Nonexistent employee, department, commission |
| **`409 Conflict`** | Unique constraint violation | Duplicate email, duplicate payroll generation |
| **`500 Internal Server Error`** | Unhandled internal exception | Database query failure |
| **`502 Bad Gateway`** | Downstream service unreachable | Inter-service network failure with mocks disabled |

---

## 2. Health Check

### `GET /api/health`
Returns runtime status and metadata for ERP-6.

- **Auth**: None
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "team": "erp6",
    "name": "ERP-6 HR & Workforce",
    "port": 5206
  }
  ```

---

## 3. Departments API

### `GET /api/departments`
Lists all departments registered in the system.

- **Query Parameters**:
  - `q` *(optional, string)*: Filter departments by substring in name.
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": "DEP-01",
        "name": "Sales",
        "created_at": "2026-11-13T00:00:00.000Z"
      },
      {
        "id": "DEP-02",
        "name": "Support",
        "created_at": "2026-11-13T00:00:00.000Z"
      }
    ]
  }
  ```

### `GET /api/departments/:id`
Retrieves a single department by its sequence ID.

- **URL Parameters**:
  - `id` *(required, string)*: Department ID (e.g., `DEP-01`).
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": "DEP-01",
      "name": "Sales",
      "created_at": "2026-11-13T00:00:00.000Z"
    }
  }
  ```
- **Errors**:
  - `404 Not Found`: `{ "error": "Department 'DEP-99' not found" }`

### `POST /api/departments`
Creates a new department record.

- **Request Body**:
  ```json
  {
    "name": "Legal & Compliance"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "data": {
      "id": "DEP-06",
      "name": "Legal & Compliance",
      "created_at": "2026-11-13T01:00:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{ "error": "Department name is required" }`

### `PUT /api/departments/:id`
Renames an existing department.

- **Request Body**:
  ```json
  {
    "name": "Sales & Business Development"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": "DEP-01",
      "name": "Sales & Business Development",
      "created_at": "2026-11-13T00:00:00.000Z"
    }
  }
  ```

### `DELETE /api/departments/:id`
Deletes an empty department. Rejects if employees are currently assigned.

- **Response `200 OK`**:
  ```json
  {
    "data": {
      "message": "Department deleted successfully"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{ "error": "Cannot delete department with existing assigned employees" }`

---

## 4. Employees Directory API

### `GET /api/employees`
Lists employees with multi-parameter filtering. External teams query this endpoint (CRM-1 queries `role_title=Sales Rep`; CRM-2 queries `role_title=Service Engineer`).

- **Query Parameters**:
  - `department` *(optional, string)*: Department ID (`DEP-01`) or Department Name (`Sales`).
  - `role_title` *(optional, string)*: Exact role title (e.g., `Sales Rep`, `Service Engineer`).
  - `q` *(optional, string)*: Substring search matching employee name or email.
  - `active` *(optional, boolean, default `true`)*: Pass `false` or `all` to include deactivated staff.
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": "EMP-0001",
        "name": "Rohan Kulkarni",
        "email": "rohan.kulkarni@electro.com",
        "phone": "9820011101",
        "department_id": "DEP-01",
        "department_name": "Sales",
        "role_title": "Sales Rep",
        "manager_id": "EMP-0012",
        "manager_name": "Rahul Verma",
        "join_date": "2025-01-15",
        "base_salary": "45000.00",
        "active": true,
        "created_at": "2026-11-13T00:00:00.000Z"
      }
    ]
  }
  ```

### `GET /api/employees/:id`
Retrieves a full employee profile including manager info and direct reports list.

- **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": "EMP-0012",
      "name": "Rahul Verma",
      "email": "rahul.verma@electro.com",
      "phone": "9820011112",
      "department_id": "DEP-03",
      "department_name": "HR",
      "role_title": "Admin",
      "manager_id": null,
      "manager_name": null,
      "join_date": "2024-01-01",
      "base_salary": "90000.00",
      "active": true,
      "direct_reports": [
        { "id": "EMP-0001", "name": "Rohan Kulkarni", "role_title": "Sales Rep" },
        { "id": "EMP-0002", "name": "Neha Sharma", "role_title": "Sales Rep" }
      ],
      "created_at": "2026-11-13T00:00:00.000Z"
    }
  }
  ```
- **Errors**:
  - `404 Not Found`: `{ "error": "Employee 'EMP-9999' not found" }`

### `POST /api/employees`
Registers a new employee.

- **Request Body**:
  ```json
  {
    "name": "Sunil Varma",
    "email": "sunil.varma@electro.com",
    "phone": "9820011199",
    "department_id": "DEP-01",
    "role_title": "Sales Rep",
    "manager_id": "EMP-0012",
    "join_date": "2026-11-01",
    "base_salary": 45000.00
  }
  ```
- **Response `201 Created`**: Returns created employee record with generated `EMP-xxxx` ID.
- **Errors**:
  - `400 Bad Request`: `{ "error": "Name, email, and role_title are required" }`
  - `409 Conflict`: `{ "error": "An employee with this email already exists" }`

### `PUT /api/employees/:id`
Updates employee record. Prevents self-manager assignments.

- **Request Body**:
  ```json
  {
    "name": "Rohan Kulkarni",
    "role_title": "Senior Sales Rep",
    "base_salary": 52000.00,
    "manager_id": "EMP-0012"
  }
  ```
- **Response `200 OK`**: Returns updated employee object.
- **Errors**:
  - `400 Bad Request`: `{ "error": "An employee cannot be their own manager" }`

### `PATCH /api/employees/:id/deactivate`
Soft-deletes employee by setting `active = false`.

- **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": "EMP-0004",
      "active": false,
      "message": "Employee deactivated successfully"
    }
  }
  ```

### `PATCH /api/employees/:id/activate`
Reactivates employee by setting `active = true`.

- **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": "EMP-0004",
      "active": true,
      "message": "Employee reactivated successfully"
    }
  }
  ```

---

## 5. Attendance & Leaves API

### `POST /api/attendance/mark`
Records or updates daily attendance for an employee.

- **Request Body**:
  ```json
  {
    "employee_id": "EMP-0001",
    "date": "2026-11-13",
    "status": "present",
    "check_in": "09:00:00",
    "check_out": "18:00:00"
  }
  ```
- **Status Enum**: `present`, `absent`, `half_day`, `leave`
- **Response `200 OK`**: Returns saved attendance record.

### `GET /api/attendance`
Lists attendance logs filtered by month or employee.

- **Query Parameters**:
  - `month` *(string, YYYY-MM)*: Attendance month.
  - `employee_id` *(string)*: Employee ID filter.

### `GET /api/attendance/summary`
Calculates aggregated attendance days used for payroll calculation.

- **Query Parameters**:
  - `month` *(required, string, YYYY-MM)*: Target payroll month.
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "employee_id": "EMP-0001",
        "name": "Rohan Kulkarni",
        "present_days": 20,
        "half_days": 0,
        "absent_days": 1,
        "leave_days": 1
      }
    ]
  }
  ```

### `POST /api/leave-requests`
Submits an employee leave request.

- **Request Body**:
  ```json
  {
    "employee_id": "EMP-0001",
    "from_date": "2026-11-20",
    "to_date": "2026-11-21",
    "type": "casual",
    "reason": "Family event"
  }
  ```
- **Type Enum**: `casual`, `sick`, `earned`
- **Response `201 Created`**: Returns created leave request with `LV-xxxx` sequence ID.

### `PATCH /api/leave-requests/:id/decision`
Approves or rejects a leave request.

- **Request Body**:
  ```json
  {
    "status": "approved"
  }
  ```
- **Response `200 OK`**: Returns updated request. When approved, marks dates as `leave` in attendance table.

---

## 6. Payroll API

### `POST /api/payroll/generate`
Generates salary slips for all active employees for the specified month.

- **Request Body**:
  ```json
  {
    "month": "2026-11"
  }
  ```
- **Query Parameters**:
  - `force` *(optional, boolean)*: Overwrite existing generated salary slips.
- **Formulas Applied**:
  - `hra`: 40% of `base_salary`
  - `allowances`: Fixed ₹2,000.00
  - `pf_deduction`: 12% of `base_salary`
  - `absent_deduction`: `(base_salary / 30) * absent_days`
  - `commission`: Sum from `commissions` table for matching employee and month
  - `net_pay`: `(base_salary + hra + allowances + commission) - (pf_deduction + absent_deduction)`
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "month": "2026-11",
      "count": 12,
      "total_payroll_cost": 645000.00,
      "slips": [ ... ]
    }
  }
  ```
- **Errors**:
  - `409 Conflict`: `{ "error": "Payroll already generated for this month. Use ?force=true to regenerate." }`

### `GET /api/salary-slips`
Lists generated salary slips.

- **Query Parameters**:
  - `month` *(optional, string, YYYY-MM)*
  - `employee_id` *(optional, string)*

### `PATCH /api/salary-slips/:id/paid`
Marks an individual salary slip as paid.

---

## 7. Commissions API

### `POST /api/commissions/sync`
Fetches paid invoices from ERP-5 (`GET /api/invoices/paid`), calculates sales commission, and stores records idempotently.

- **Commission Rules**:
  - Standard Rate: **2.0%** for invoice total `<= ₹1,00,000.00`
  - High-Value Rate: **3.0%** for invoice total `> ₹1,00,000.00`
  - Month: Derived from invoice `paid_on` (`YYYY-MM`)
  - Deduplication: `ON CONFLICT (invoice_id) DO NOTHING`
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "added": 3,
      "count": 3,
      "total_invoices_checked": 3,
      "items": [
        {
          "id": "COMM-0006",
          "sales_rep_id": "EMP-0001",
          "invoice_id": "INV-0001",
          "invoice_amount": 50000.00,
          "rate_percent": 2.00,
          "commission_amount": 1000.00,
          "month": "2026-11"
        }
      ]
    }
  }
  ```

### `GET /api/commissions`
Lists sales commission records with joined sales representative names.

- **Query Parameters**:
  - `month` *(optional, string, YYYY-MM)*: Filter by commission month.
  - `sales_rep_id` *(optional, string)*: Filter by sales representative (e.g., `EMP-0001`).
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": "COMM-0001",
        "sales_rep_id": "EMP-0001",
        "sales_rep_name": "Rohan Kulkarni",
        "invoice_id": "INV-0091",
        "invoice_amount": 45000.00,
        "rate_percent": 2.00,
        "commission_amount": 900.00,
        "month": "2026-10",
        "created_at": "2026-10-15T10:00:00.000Z"
      }
    ]
  }
  ```

---

## 8. Sales Performance Leaderboard API

### `GET /api/performance/sales`
Returns all active sales representatives ranked strictly by total sales volume descending.

- **Query Parameters**:
  - `month` *(optional, string, YYYY-MM)*: Filters rankings to a specific month.
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "rank": 1,
        "sales_rep_id": "EMP-0004",
        "name": "Anjali Rao",
        "sales_rep_name": "Anjali Rao",
        "email": "anjali.rao@electro.com",
        "deals": 1,
        "number_of_deals": 1,
        "total_sales": 200000.00,
        "commission": 6000.00,
        "commission_amount": 6000.00,
        "month": null
      },
      {
        "rank": 2,
        "sales_rep_id": "EMP-0002",
        "name": "Neha Sharma",
        "sales_rep_name": "Neha Sharma",
        "email": "neha.sharma@electro.com",
        "deals": 1,
        "number_of_deals": 1,
        "total_sales": 150000.00,
        "commission": 4500.00,
        "commission_amount": 4500.00,
        "month": null
      }
    ]
  }
  ```
