# API Specification — Team CRM-5 (Portal & Analytics)

**Service**: `services/crm5` | **Base URL**: `http://localhost:5105` (Frontend Vite proxy: `/svc/crm5`)  
**Database**: PostgreSQL `crm5_db` (Port `5432`, falls back gracefully to in-memory/mock data when offline)  
**Authentication**: Bearer JWT Token in `Authorization: Bearer <token>` verified via `services/_shared/auth.js` (`requireAuth`). When `AUTH_REQUIRED=false` (local dev), requests default to `admin@demo.com` (`EMP-0012`).  
**Standard Envelope**: Success responses return `{ "data": ... }` (except `/api/health`); failures return `{ "error": "clear message" }` with standard HTTP status codes (`400`, `401`, `403`, `404`, `500`).

---

## 1. System & Health Endpoints

### 1.1 `GET /api/health`
Service health check and port metadata probe (`services/crm5/server.js`).
- **Auth**: Public (no JWT required)
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "ok",
    "team": "crm5",
    "name": "CRM-5 Portal & Analytics",
    "port": 5105
  }
  ```
- **Error Codes**: `500 Internal Server Error` on unhandled middleware failures.

---

## 2. Customer Self-Service Portal Endpoints (`services/crm5/routes/portal.js`)

All endpoints under `/api/portal/*` require `requireAuth`.

### 2.1 `GET /api/portal/customers`
Returns the list of registered customers available for quick self-service portal lookup.
- **Auth**: `requireAuth` (`admin`, `sales`, `support`, `warehouse`, `finance`, `hr`)
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "CUST-0001",
        "name": "Rajesh Kumar",
        "company_name": "Apex Electronics Ltd",
        "email": "rajesh.k@apexelectronics.in",
        "phone": "+91 98201 12345",
        "gstin": "27AABCA1234A1Z5",
        "city": "Mumbai",
        "state": "Maharashtra"
      }
    ]
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: `{ "error": "Authentication required: missing or invalid Bearer token" }` (when `AUTH_REQUIRED=true`)
  - `500 Internal Server Error`: `{ "error": "<message>" }`

### 2.2 `GET /api/portal/visits`
Returns the 20 most recent customer portal access audit records from `portal_visits` (or in-memory fallback when PostgreSQL is offline).
- **Auth**: `requireAuth`
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "PV-0005",
        "customer_id": "CUST-0001",
        "visited_at": "2026-11-12T01:45:00.000Z"
      }
    ]
  }
  ```
- **Error Codes**: `401 Unauthorized`, `500 Internal Server Error`.

### 2.3 `GET /api/portal/:customerId/overview` (Alias: `GET /api/portal/:customerId`)
Retrieves a consolidated self-service view for the specified customer (`customer` profile, `orders`, `tickets`, `invoices`, and computed `stats`) and inserts a visit record into `portal_visits`.
- **Auth**: `requireAuth`
- **Path Parameters**:
  - `customerId` (string, required): Customer ID (normalized to uppercase, e.g. `CUST-0001`).
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "customer": {
        "id": "CUST-0001",
        "name": "Rajesh Kumar",
        "company_name": "Apex Electronics Ltd",
        "email": "rajesh.k@apexelectronics.in",
        "phone": "+91 98201 12345",
        "gstin": "27AABCA1234A1Z5",
        "city": "Mumbai",
        "state": "Maharashtra"
      },
      "orders": [
        {
          "id": "SO-0001",
          "customer_id": "CUST-0001",
          "quote_id": "QUO-0001",
          "total_amount": 61336.4,
          "status": "delivered",
          "sales_rep_id": "EMP-0001",
          "created_at": "2026-11-04T10:30:00.000Z",
          "items_count": 2
        }
      ],
      "tickets": [
        {
          "id": "TKT-0001",
          "customer_id": "CUST-0001",
          "subject": "Display panel flickering on OLED 65",
          "priority": "high",
          "status": "in-progress",
          "assigned_engineer": "EMP-0005",
          "created_at": "2026-11-06T11:00:00.000Z"
        }
      ],
      "invoices": [
        {
          "id": "INV-0001",
          "customer_id": "CUST-0001",
          "order_id": "SO-0001",
          "subtotal": 51980,
          "gst_amount": 9356.4,
          "total_amount": 61336.4,
          "status": "paid",
          "due_date": "2026-11-20",
          "created_at": "2026-11-04T12:00:00.000Z"
        }
      ],
      "stats": {
        "total_orders": 2,
        "total_spent": 104326.4,
        "total_tickets": 2,
        "open_tickets": 1,
        "total_invoices": 2,
        "pending_invoices": 1
      }
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: `{ "error": "Customer ID is required." }`
  - `401 Unauthorized`: Missing/invalid Bearer token
  - `404 Not Found`: `{ "error": "Customer ID 'CUST-9999' was not found in our records. Please verify the ID (e.g., CUST-0001 to CUST-0008) and try again." }`
  - `500 Internal Server Error`: `{ "error": "Internal server error processing customer portal overview." }`

---

## 3. Executive Sales Dashboard Endpoints (`services/crm5/routes/dashboard.js`)

All endpoints under `/api/dashboard/*` require `requireAuth`.

### 3.1 `GET /api/dashboard/sales-summary`
Aggregates sales pipeline KPIs (`total_leads`, `open_opportunities`, `won_value` in INR, `quotes_accepted`, stage counts/values, and `recent_opportunities`) from CRM-1 (`/api/leads`, `/api/opportunities`, `/api/quotes`) with `mocks/sales-summary.json` fallback.
- **Auth**: `requireAuth`
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "total_leads": 12,
      "open_opportunities": 3,
      "won_value": 209970,
      "quotes_accepted": 1,
      "opportunities_by_stage": [
        { "stage": "prospect", "label": "Prospect", "count": 1, "value": 51980, "color": "#3b82f6" },
        { "stage": "proposal", "label": "Proposal", "count": 1, "value": 67960, "color": "#8b5cf6" },
        { "stage": "negotiation", "label": "Negotiation", "count": 1, "value": 112980, "color": "#f59e0b" },
        { "stage": "won", "label": "Won", "count": 3, "value": 209970, "color": "#10b981" },
        { "stage": "lost", "label": "Lost", "count": 1, "value": 12000, "color": "#ef4444" }
      ],
      "recent_opportunities": [
        {
          "id": "OPP-0001",
          "title": "Smart TV Corporate Setup",
          "customer_id": "CUST-0001",
          "sales_rep_id": "EMP-0001",
          "stage": "prospect",
          "expected_value": 51980
        }
      ]
    }
  }
  ```
- **Error Codes**: `401 Unauthorized`, `500 Internal Server Error` (`{ "error": "Failed to generate sales summary" }`).

### 3.2 `POST /api/dashboard/snapshot`
Saves a point-in-time KPI metrics snapshot into `dashboard_snapshots` (`SNP-xxxx`).
- **Auth**: `requireAuth`
- **Request Body**:
  ```json
  {
    "metrics": {
      "total_leads": 12,
      "open_opportunities": 7,
      "won_value": 209970.00,
      "quotes_accepted": 4,
      "opportunities_by_stage": {
        "prospect": 3,
        "proposal": 2,
        "negotiation": 2,
        "won": 4,
        "lost": 1
      }
    }
  }
  ```
  *(If `metrics` is omitted, defaults to the current `mocks/sales-summary.json` object.)*
- **Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "id": "SNP-0006",
      "taken_at": "2026-11-12T01:55:00.000Z",
      "metrics": {
        "total_leads": 12,
        "open_opportunities": 7,
        "won_value": 209970.00,
        "quotes_accepted": 4
      }
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: `{ "error": "metrics payload is required and must be an object" }` (when `metrics` is a non-object truthy value)
  - `401 Unauthorized`
  - `500 Internal Server Error`: `{ "error": "Failed to save snapshot" }`

### 3.3 `GET /api/dashboard/snapshots`
Lists saved historical dashboard snapshots ordered newest first (`taken_at DESC`).
- **Auth**: `requireAuth`
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "SNP-0005",
        "taken_at": "2026-11-12T01:48:00.000Z",
        "metrics": {
          "total_leads": 12,
          "open_opportunities": 7,
          "won_value": 209970,
          "quotes_accepted": 4
        }
      }
    ]
  }
  ```
- **Error Codes**: `401 Unauthorized`, `500 Internal Server Error` (`{ "error": "Failed to retrieve snapshots" }`).

---

## 4. Sales Forecasts & Weighted Pipeline Endpoints (`services/crm5/routes/forecasts.js`)

All endpoints under `/api/forecast*` require `requireAuth`.

### 4.1 `GET /api/forecast/weighted` (Alias: `GET /api/forecasts/weighted`)
Calculates probability-weighted pipeline revenue from CRM-1 `/api/opportunities` (`prospect` 10%, `proposal` 30%, `negotiation` 60%) and compares against the `2026-11` target in `forecasts`.
- **Auth**: `requireAuth`
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "weighted_pipeline_value": 93374,
      "total_unweighted_pipeline": 232920,
      "current_month": "2026-11",
      "current_target_amount": 150000,
      "progress_percentage": 62.2,
      "breakdown": [
        { "stage": "prospect", "label": "Prospect", "probability": 10, "count": 1, "total_expected_value": 51980, "weighted_value": 5198 },
        { "stage": "proposal", "label": "Proposal", "probability": 30, "count": 1, "total_expected_value": 67960, "weighted_value": 20388 },
        { "stage": "negotiation", "label": "Negotiation", "probability": 60, "count": 1, "total_expected_value": 112980, "weighted_value": 67788 }
      ]
    }
  }
  ```
- **Error Codes**: `401 Unauthorized`, `500 Internal Server Error` (`{ "error": "Failed to calculate weighted pipeline" }`).

### 4.2 `GET /api/forecasts`
Lists all monthly sales targets ordered by `month DESC`.
- **Auth**: `requireAuth`
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "FCST-0005",
        "month": "2026-12",
        "target_amount": "200000.00",
        "notes": "Year-end enterprise closure and institutional renewals",
        "created_at": "2026-11-12T01:57:00.000Z"
      }
    ]
  }
  ```
  *(Note: PostgreSQL returns `NUMERIC(12, 2)` columns as decimal strings such as `"200000.00"`; in-memory fallback returns numbers.)*
- **Error Codes**: `401 Unauthorized`, `500 Internal Server Error` (`{ "error": "Failed to retrieve forecasts" }`).

### 4.3 `POST /api/forecasts`
Creates a new monthly sales target or updates an existing month's target (`ON CONFLICT (month) DO UPDATE`).
- **Auth**: `requireAuth`
- **Request Body**:
  ```json
  {
    "month": "2027-01",
    "target_amount": 220000.00,
    "notes": "New Year corporate expansion"
  }
  ```
- **Validation Rules**:
  - `month` must match `^\d{4}-\d{2}$`
  - `target_amount` must be numeric and `>= 0`
- **Success Response (`201 Created`)**:
  ```json
  {
    "data": {
      "id": "FCST-0006",
      "month": "2027-01",
      "target_amount": "220000.00",
      "notes": "New Year corporate expansion",
      "created_at": "2026-11-12T02:20:00.000Z"
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: `{ "error": "Valid month in YYYY-MM format is required" }`
  - `400 Bad Request`: `{ "error": "target_amount must be a non-negative number" }`
  - `401 Unauthorized`
  - `500 Internal Server Error`: `{ "error": "Failed to save forecast target" }`

### 4.4 `PUT /api/forecasts/:id`
Updates `target_amount` and `notes` for an existing forecast record by `id`.
- **Auth**: `requireAuth`
- **Path Parameters**: `id` (string, e.g. `FCST-0001`)
- **Request Body**:
  ```json
  {
    "target_amount": 135000.00,
    "notes": "Updated August target"
  }
  ```
- **Success Response (`200 OK`)**: Returns updated forecast object in `{ "data": ... }`.
- **Error Codes**:
  - `400 Bad Request`: `{ "error": "target_amount must be a non-negative number" }`
  - `401 Unauthorized`
  - `404 Not Found`: `{ "error": "Forecast 'FCST-9999' not found" }`
  - `500 Internal Server Error`: `{ "error": "Failed to update forecast" }`

### 4.5 `DELETE /api/forecasts/:id`
Deletes a monthly forecast target by `id`.
- **Auth**: `requireAuth`
- **Path Parameters**: `id` (string, e.g. `FCST-0005`)
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "message": "Forecast 'FCST-0005' deleted successfully"
    }
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`
  - `404 Not Found`: `{ "error": "Forecast 'FCST-9999' not found" }`
  - `500 Internal Server Error`: `{ "error": "Failed to delete forecast" }`

---

## 5. Role-Based Reports Endpoints (`services/crm5/routes/reports.js`)

All endpoints under `/api/reports*` require `requireAuth`.

### 5.1 `GET /api/reports`
Returns report summary metadata filtered by effective user role (`?role=` query param, `x-user-role` header, or `req.user.role`). `admin` sees all reports.
- **Auth**: `requireAuth`
- **Query Parameters**:
  - `role` (string, optional): Role preview override (e.g. `sales`, `support`, `finance`, `hr`, `warehouse`, `admin`).
- **Headers**:
  - `x-user-role` (string, optional): Role override used when `?role=` is not passed.
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "sales-by-rep",
        "title": "Sales by Representative",
        "description": "Total inquiries assigned, deals won, and closed contract revenue per sales representative.",
        "category": "Sales & Revenue",
        "allowed_roles": ["admin", "sales"],
        "columnsCount": 5,
        "rowsCount": 4
      }
    ]
  }
  ```
- **Error Codes**: `401 Unauthorized`, `500 Internal Server Error` (`{ "error": "Failed to retrieve reports" }`).

### 5.2 `GET /api/reports/:id/run`
Executes a report by ID and returns column definitions and row data when authorized for the effective role.
- **Auth**: `requireAuth`
- **Path Parameters**:
  - `id` (string, required): Report ID (`sales-by-rep`, `conversion-rate`, `tickets-by-priority`, `sla-breaches`, `won-revenue-by-month`, `rep-performance`, `warehouse-fulfillment`).
- **Query / Header**: Optional `?role=` or `x-user-role`.
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": {
      "id": "sales-by-rep",
      "title": "Sales by Representative",
      "description": "Total inquiries assigned, deals won, and closed contract revenue per sales representative.",
      "category": "Sales & Revenue",
      "columns": [
        { "key": "rep_id", "label": "Representative ID" },
        { "key": "rep_name", "label": "Representative Name" },
        { "key": "assigned_leads", "label": "Assigned Leads" },
        { "key": "won_deals", "label": "Deals Won" },
        { "key": "total_revenue", "label": "Total Won Revenue", "format": "currency" }
      ],
      "rows": [
        { "rep_id": "EMP-0001", "rep_name": "Aarav Sharma", "assigned_leads": 5, "won_deals": 2, "total_revenue": 96980 }
      ],
      "generated_at": "2026-11-12T02:20:00.000Z"
    }
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: Missing/invalid Bearer token
  - `403 Forbidden`: `{ "error": "Forbidden: role 'support' lacks permission to view 'Won Revenue by Month'" }`
  - `404 Not Found`: `{ "error": "Report 'unknown-id' not found" }`
  - `500 Internal Server Error`: `{ "error": "Failed to run report" }`

---

## 6. Pending Tier 3 Endpoints (Not Yet Merged on `main`)

The following build-issue endpoints are tracked in open GitHub issues (`#52`, `#55`, `#58`) and are **not** yet mounted in `services/crm5/routes/`:
- `[CRM5-A3]` (#52): Portal ticket submission proxy (`POST /api/tickets` via CRM-2) & order tracking detail view (`/portal/orders/:id`).
- `[CRM5-B3]` (#55): `?range=week|month|all` date filter on `GET /api/dashboard/sales-summary`.
- `[CRM5-C3]` (#58): `GET /api/forecast/trend` (6-month won-value trend + 3-month rolling estimate).
