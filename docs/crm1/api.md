# Team CRM-1: REST API Specification

**Team**: CRM-1 Sales Pipeline  
**Service Port**: `5101` (`services/crm1`)  
**Base URL**: `http://localhost:5101/api` (or `/svc/crm1/api` via frontend proxy)  
**Database**: `crm1_db`  
**Authentication**: All endpoints require Bearer JWT token validated by `services/_shared/auth.js` (`requireAuth`), except the health check endpoint. Role-restricted routes enforce `requireRole('admin')`.

---

## 1. System & Health

### 1.1 `GET /api/health` (Service Health Check)
- **Method**: `GET`
- **Path**: `/api/health`
- **Auth**: Public (No JWT required)
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "team": "crm1",
  "name": "CRM-1 Sales Pipeline",
  "port": 5101
}
```

---

## 2. Leads API ([CRM1-A1] & [CRM1-A3])

### 2.1 `GET /api/leads` (List Leads)
- **Method**: `GET`
- **Path**: `/api/leads`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `status` *(optional)*: Filter leads by status (`new`, `contacted`, `qualified`, `lost`).
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "LEAD-0001",
      "name": "Aarav Mehta",
      "phone": "9820123456",
      "email": "aarav.mehta@example.com",
      "source": "dealer",
      "product_interest": "55-inch 4K Smart TV",
      "status": "new",
      "score": 60,
      "sales_rep_id": "EMP-0001",
      "created_at": "2026-11-01T10:00:00.000Z"
    }
  ]
}
```

---

### 2.2 `GET /api/leads/hot` (Get Hot Leads - Score >= 60)
- **Method**: `GET`
- **Path**: `/api/leads/hot`
- **Description**: Returns all leads with a lead score $\ge 60$. Mounted before `/api/leads/:id` to prevent route collision.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "LEAD-0001",
      "name": "Aarav Mehta",
      "phone": "9820123456",
      "email": "aarav.mehta@example.com",
      "source": "dealer",
      "product_interest": "55-inch 4K Smart TV",
      "status": "new",
      "score": 60,
      "sales_rep_id": "EMP-0001",
      "created_at": "2026-11-01T10:00:00.000Z"
    }
  ]
}
```

---

### 2.3 `GET /api/leads/:id` (Get Single Lead)
- **Method**: `GET`
- **Path**: `/api/leads/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "LEAD-0001",
    "name": "Aarav Mehta",
    "phone": "9820123456",
    "email": "aarav.mehta@example.com",
    "source": "dealer",
    "product_interest": "55-inch 4K Smart TV",
    "status": "new",
    "score": 60,
    "sales_rep_id": "EMP-0001",
    "created_at": "2026-11-01T10:00:00.000Z"
  }
}
```
- **Error Responses**:
  - `404 Not Found`: `{ "error": "Lead with ID 'LEAD-9999' not found" }`

---

### 2.4 `POST /api/leads` (Create Lead)
- **Method**: `POST`
- **Path**: `/api/leads`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Rahul Deshmukh",
  "phone": "9819001122",
  "email": "rahul.deshmukh@example.com",
  "source": "dealer",
  "product_interest": "65-inch OLED TV",
  "sales_rep_id": "EMP-0001"
}
```
- **Scoring Rules**:
  - Source: `dealer` (+30), `web` (+20), `walk-in` (+10)
  - `email` present: +10
  - `phone` present: +10
  - `product_interest` filled: +10
  - Maximum score: 100
- **Response**: `201 Created`
```json
{
  "data": {
    "id": "LEAD-0006",
    "name": "Rahul Deshmukh",
    "phone": "9819001122",
    "email": "rahul.deshmukh@example.com",
    "source": "dealer",
    "product_interest": "65-inch OLED TV",
    "status": "new",
    "score": 60,
    "sales_rep_id": "EMP-0001",
    "created_at": "2026-11-12T08:00:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`:
    - `{ "error": "name is required" }`
    - `{ "error": "source must be one of: dealer, web, walk-in" }`
    - `{ "error": "status must be one of: new, contacted, qualified, lost" }`

---

### 2.5 `PUT /api/leads/:id` (Update Lead)
- **Method**: `PUT`
- **Path**: `/api/leads/:id`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Rahul Deshmukh",
  "phone": "9819001122",
  "email": "rahul.deshmukh@example.com",
  "source": "dealer",
  "product_interest": "65-inch OLED TV",
  "status": "contacted",
  "sales_rep_id": "EMP-0001"
}
```
- **Response**: `200 OK` with recalculated score.
- **Error Responses**:
  - `400 Bad Request`: Validation failure.
  - `404 Not Found`: Lead ID does not exist.

---

### 2.6 `DELETE /api/leads/:id` (Delete Lead)
- **Method**: `DELETE`
- **Path**: `/api/leads/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": { "message": "Lead LEAD-0006 deleted successfully" }
}
```
- **Error Responses**:
  - `404 Not Found`: Lead ID does not exist.

---

## 3. Opportunities API ([CRM1-B1] & [CRM1-B3])

### 3.1 `GET /api/opportunities` (List Opportunities)
- **Method**: `GET`
- **Path**: `/api/opportunities`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `stage` *(optional)*: Filter by stage (`prospect`, `proposal`, `negotiation`, `won`, `lost`).
  - `lead_id` *(optional)*: Filter by associated lead ID.
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "OPP-0001",
      "lead_id": "LEAD-0001",
      "customer_id": "CUST-0001",
      "title": "Smart TV Corporate Setup",
      "expected_value": 51980.00,
      "stage": "prospect",
      "expected_close_date": "2026-11-20",
      "sales_rep_id": "EMP-0001",
      "created_at": "2026-11-02T10:00:00.000Z"
    }
  ]
}
```

---

### 3.2 `GET /api/opportunities/summary` (Opportunities Stage Summary)
- **Method**: `GET`
- **Path**: `/api/opportunities/summary`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": {
    "stages": {
      "prospect": { "count": 2, "total_value": 115000.00 },
      "proposal": { "count": 1, "total_value": 67960.00 },
      "negotiation": { "count": 1, "total_value": 112980.00 },
      "won": { "count": 1, "total_value": 240000.00 },
      "lost": { "count": 1, "total_value": 45000.00 }
    },
    "total_opportunities": 6,
    "total_pipeline_value": 580940.00
  }
}
```

---

### 3.3 `GET /api/opportunities/:id` (Get Single Opportunity)
- **Method**: `GET`
- **Path**: `/api/opportunities/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
- **Error Responses**:
  - `404 Not Found`: `{ "error": "Opportunity with ID 'OPP-9999' not found" }`

---

### 3.4 `POST /api/opportunities` (Create Opportunity)
- **Method**: `POST`
- **Path**: `/api/opportunities`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "lead_id": "LEAD-0001",
  "customer_id": "CUST-0001",
  "title": "Smart TV Corporate Setup",
  "expected_value": 51980.00,
  "stage": "prospect",
  "expected_close_date": "2026-11-30",
  "sales_rep_id": "EMP-0001"
}
```
- **Validation**:
  - `lead_id` must exist in `leads` (returns `400` if not found).
  - `expected_value` must be a positive number.
- **Response**: `201 Created`
```json
{
  "data": {
    "id": "OPP-0007",
    "lead_id": "LEAD-0001",
    "customer_id": "CUST-0001",
    "title": "Smart TV Corporate Setup",
    "expected_value": 51980.00,
    "stage": "prospect",
    "expected_close_date": "2026-11-30",
    "sales_rep_id": "EMP-0001",
    "created_at": "2026-11-12T08:30:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`:
    - `{ "error": "lead_id is required" }`
    - `{ "error": "lead_id 'LEAD-9999' does not exist" }`
    - `{ "error": "title is required" }`
    - `{ "error": "expected_value must be a positive number" }`

---

### 3.5 `PATCH /api/opportunities/:id/stage` (Update Opportunity Stage)
- **Method**: `PATCH`
- **Path**: `/api/opportunities/:id/stage`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "stage": "proposal"
}
```
- **Stage Progression Rules**:
  - Sequential progression: `prospect` $\rightarrow$ `proposal` $\rightarrow$ `negotiation` $\rightarrow$ `won`.
  - Any stage can transition to `lost`.
  - Transition to `won` requires an accepted quote (`GET /api/quotes?opportunity_id=:id&status=accepted`). Returns `400 Bad Request` if no accepted quote exists.
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "OPP-0001",
    "stage": "proposal",
    "updated_at": "2026-11-12T08:35:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`:
    - `{ "error": "A stage can only move one step forward or to lost" }`
    - `{ "error": "Cannot mark opportunity as won without an accepted quote" }`
  - `404 Not Found`: Opportunity does not exist.

---

### 3.6 `DELETE /api/opportunities/:id` (Delete Opportunity)
- **Method**: `DELETE`
- **Path**: `/api/opportunities/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": { "message": "Opportunity OPP-0007 deleted successfully" }
}
```

---

## 4. Quotes API ([CRM1-C1] & [CRM1-C3])

### 4.1 `GET /api/quotes` (List Quotes)
- **Method**: `GET`
- **Path**: `/api/quotes`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `opportunity_id` *(optional)*: Filter by opportunity ID (e.g. `OPP-0001`).
  - `status` *(optional)*: Filter by quote status (`draft`, `sent`, `accepted`, `rejected`).
  - `dealer_id` *(optional)*: Filter by dealer ID (e.g. `DLR-0001`).
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "QUO-0001",
      "opportunity_id": "OPP-0001",
      "customer_id": "CUST-0001",
      "dealer_id": null,
      "sales_rep_id": "EMP-0001",
      "status": "draft",
      "discount_percent": 0.0,
      "needs_approval": false,
      "approved": false,
      "rejection_reason": null,
      "created_at": "2026-11-05T09:00:00.000Z",
      "subtotal": 51980.0,
      "discount_amount": 0.0,
      "taxable_value": 51980.0,
      "gst": 9356.4,
      "total": 61336.4,
      "items": [
        {
          "id": "QI-0001",
          "quote_id": "QUO-0001",
          "sku": "SKU-0001",
          "product_name": "55-inch 4K Smart TV",
          "quantity": 1,
          "unit_price": 42990.0
        },
        {
          "id": "QI-0002",
          "quote_id": "QUO-0001",
          "sku": "SKU-0004",
          "product_name": "Soundbar 2.1",
          "quantity": 1,
          "unit_price": 8990.0
        }
      ]
    }
  ]
}
```

---

### 4.2 `GET /api/quotes/:id` (Get Single Quote Details)
- **Method**: `GET`
- **Path**: `/api/quotes/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "QUO-0001",
    "opportunity_id": "OPP-0001",
    "customer_id": "CUST-0001",
    "dealer_id": null,
    "sales_rep_id": "EMP-0001",
    "status": "draft",
    "discount_percent": 0.0,
    "needs_approval": false,
    "approved": false,
    "rejection_reason": null,
    "created_at": "2026-11-05T09:00:00.000Z",
    "subtotal": 51980.0,
    "discount_amount": 0.0,
    "taxable_value": 51980.0,
    "gst": 9356.4,
    "total": 61336.4,
    "items": [
      {
        "id": "QI-0001",
        "quote_id": "QUO-0001",
        "sku": "SKU-0001",
        "product_name": "55-inch 4K Smart TV",
        "quantity": 1,
        "unit_price": 42990.0
      }
    ]
  }
}
```
- **Error Responses**:
  - `404 Not Found`: `{ "error": "Quote with ID 'QUO-9999' not found" }`

---

### 4.3 `POST /api/quotes` (Create Quote with Items)
- **Method**: `POST`
- **Path**: `/api/quotes`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "opportunity_id": "OPP-0001",
  "customer_id": "CUST-0001",
  "dealer_id": null,
  "sales_rep_id": "EMP-0001",
  "discount_percent": 10.0,
  "status": "draft",
  "items": [
    {
      "sku": "SKU-0001",
      "product_name": "55-inch 4K Smart TV",
      "quantity": 1,
      "unit_price": 42990.0
    },
    {
      "sku": "SKU-0004",
      "product_name": "Soundbar 2.1",
      "quantity": 2,
      "unit_price": 8990.0
    },
    {
      "sku": "SKU-0006",
      "product_name": "Wireless Headphones",
      "quantity": 1,
      "unit_price": 3499.0
    }
  ]
}
```
- **Business Rules**:
  - If `discount_percent > 5`, automatically sets `needs_approval = true` and `approved = false`.
  - GST is calculated at exactly 18% on `taxable_value = subtotal - discount_amount`.
- **Response**: `201 Created`
```json
{
  "data": {
    "id": "QUO-0005",
    "opportunity_id": "OPP-0001",
    "customer_id": "CUST-0001",
    "dealer_id": null,
    "sales_rep_id": "EMP-0001",
    "status": "draft",
    "discount_percent": 10.0,
    "needs_approval": true,
    "approved": false,
    "rejection_reason": null,
    "created_at": "2026-11-12T09:00:00.000Z",
    "subtotal": 64469.0,
    "discount_amount": 6446.9,
    "taxable_value": 58022.1,
    "gst": 10443.98,
    "total": 68466.08,
    "items": [
      {
        "id": "QI-0008",
        "quote_id": "QUO-0005",
        "sku": "SKU-0001",
        "product_name": "55-inch 4K Smart TV",
        "quantity": 1,
        "unit_price": 42990.0
      }
    ]
  }
}
```
- **Error Responses**:
  - `400 Bad Request`:
    - `{ "error": "customer_id is required" }`
    - `{ "error": "sales_rep_id is required" }`
    - `{ "error": "items must be a non-empty array of quote items" }`
    - `{ "error": "quantity must be a positive integer" }`
    - `{ "error": "discount_percent must be a number between 0 and 100" }`

---

### 4.4 `PATCH /api/quotes/:id/status` (Update Quote Status)
- **Method**: `PATCH`
- **Path**: `/api/quotes/:id/status`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "status": "sent",
  "rejection_reason": "Optional rejection comment"
}
```
- **Status Progression & Handoff**:
  - `draft` $\rightarrow$ `sent`: Blocked if `discount_percent > 5` and `approved = false`.
  - `sent` $\rightarrow$ `accepted`: Dispatches:
    1. ERP-4 Sales Order handoff: `POST /api/sales-orders`
    2. CRM-3 Customer Timeline event: `POST /api/interactions/from-event`
  - `sent` $\rightarrow$ `rejected`: Records `rejection_reason`.
  - Once `accepted` or `rejected`, quote status is final (returns `400` on modification).
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "QUO-0002",
    "status": "accepted",
    "total": 76183.16,
    "updated_at": "2026-11-12T09:15:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`:
    - `{ "error": "Quote requires approval before it can be sent (discount exceeds 5%)" }`
    - `{ "error": "Quotes in 'draft' status must be moved to 'sent' before being accepted or rejected" }`
    - `{ "error": "Cannot change status of a quote that is already 'accepted'" }`
  - `404 Not Found`: Quote not found.

---

## 5. Approvals API ([CRM1-D3])

### 5.1 `GET /api/approvals` (List Pending Approvals)
- **Method**: `GET`
- **Path**: `/api/approvals`
- **Auth**: Requires role `admin` (`requireRole('admin')`)
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Returns all quotes where `needs_approval = true`, `approved = false`, and `status = 'draft'`.
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "QUO-0005",
      "opportunity_id": "OPP-0001",
      "customer_id": "CUST-0001",
      "dealer_id": "DLR-0001",
      "sales_rep_id": "EMP-0001",
      "discount_percent": 10.0,
      "subtotal": 64469.0,
      "total": 68466.08,
      "created_at": "2026-11-12T09:00:00.000Z"
    }
  ]
}
```
- **Error Responses**:
  - `401 Unauthorized`: Token missing or invalid.
  - `403 Forbidden`: User role is not `admin`.

---

### 5.2 `PATCH /api/quotes/:id/approve` (Approve Quote)
- **Method**: `PATCH`
- **Path**: `/api/quotes/:id/approve`
- **Auth**: Requires role `admin`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "QUO-0005",
    "approved": true,
    "needs_approval": true,
    "message": "Quote QUO-0005 approved successfully"
  }
}
```
- **Error Responses**:
  - `403 Forbidden`: Non-admin user.
  - `404 Not Found`: Quote ID does not exist.

---

### 5.3 `PATCH /api/quotes/:id/reject` (Reject Quote)
- **Method**: `PATCH`
- **Path**: `/api/quotes/:id/reject`
- **Auth**: Requires role `admin`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "reason": "Discount rate is above maximum authorized limit of 8% for bronze dealer"
}
```
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "QUO-0005",
    "approved": false,
    "rejection_reason": "Discount rate is above maximum authorized limit of 8% for bronze dealer",
    "message": "Quote QUO-0005 rejected"
  }
}
```

---

## 6. Dealers API ([CRM1-D1])

### 6.1 `GET /api/dealers` (List Dealers)
- **Method**: `GET`
- **Path**: `/api/dealers`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `q` *(optional)*: Search query matching dealer name or contact person.
  - `city` *(optional)*: Filter by city (e.g. `Pune`, `Mumbai`, `Bengaluru`).
- **Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "DLR-0001",
      "name": "BrightHome Retail",
      "contact_person": "Sunil Joshi",
      "phone": "9820011223",
      "email": "sunil@brighthome.in",
      "city": "Pune",
      "tier": "gold",
      "credit_limit": 500000.00,
      "status": "active",
      "created_at": "2026-11-01T09:00:00.000Z"
    }
  ]
}
```

---

### 6.2 `GET /api/dealers/:id` (Get Single Dealer)
- **Method**: `GET`
- **Path**: `/api/dealers/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
- **Error Responses**:
  - `404 Not Found`: `{ "error": "Dealer with ID 'DLR-9999' not found" }`

---

### 6.3 `POST /api/dealers` (Create Dealer)
- **Method**: `POST`
- **Path**: `/api/dealers`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Apex Electronics",
  "contact_person": "Vikram Seth",
  "phone": "9811223344",
  "email": "vikram@apexelectronics.in",
  "city": "Delhi",
  "tier": "silver",
  "credit_limit": 300000.00
}
```
- **Response**: `201 Created`
```json
{
  "data": {
    "id": "DLR-0006",
    "name": "Apex Electronics",
    "contact_person": "Vikram Seth",
    "phone": "9811223344",
    "email": "vikram@apexelectronics.in",
    "city": "Delhi",
    "tier": "silver",
    "credit_limit": 300000.00,
    "status": "active",
    "created_at": "2026-11-12T09:30:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`:
    - `{ "error": "name is required" }`
    - `{ "error": "tier must be one of: gold, silver, bronze" }`
    - `{ "error": "credit_limit must be a positive number" }`

---

### 6.4 `PUT /api/dealers/:id` (Update Dealer)
- **Method**: `PUT`
- **Path**: `/api/dealers/:id`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Response**: `200 OK`
- **Error Responses**:
  - `400 Bad Request`: Validation failure.
  - `404 Not Found`: Dealer not found.

---

### 6.5 `DELETE /api/dealers/:id` (Delete Dealer)
- **Method**: `DELETE`
- **Path**: `/api/dealers/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "data": { "message": "Dealer DLR-0006 deleted successfully" }
}
```

---

## 7. Standard HTTP Status Codes & Error Envelope

All responses adhere strictly to the shared API rules:

| Status Code | Meaning | Example Scenario | Envelope |
| :---: | :--- | :--- | :--- |
| `200 OK` | Successful read, update, or deletion | Listing leads, fetching quote details | `{ "data": ... }` |
| `201 Created` | Successful creation of a resource | New quote, new opportunity, new lead | `{ "data": ... }` |
| `400 Bad Request` | Missing required input or business rule violation | Missing `customer_id`, illegal stage transition, discount > 5% without approval | `{ "error": "clear explanation" }` |
| `401 Unauthorized` | JWT missing, expired, or signature verification failed | Request missing `Authorization: Bearer <token>` | `{ "error": "Missing or invalid token" }` |
| `403 Forbidden` | Authenticated user lacks required permission | Sales role accessing `GET /api/approvals` | `{ "error": "Access denied: Requires role 'admin'" }` |
| `404 Not Found` | Requested entity ID does not exist | `GET /api/quotes/QUO-9999` | `{ "error": "Quote with ID 'QUO-9999' not found" }` |
| `409 Conflict` | Unique constraint violation or duplicate entry | Creating entity with existing unique key | `{ "error": "Entity already exists" }` |
| `500 Internal Server Error` | Unhandled database or runtime exception | Database connection drop | `{ "error": "Internal Server Error" }` |
| `502 Bad Gateway` | Upstream service unreachable when `USE_MOCKS=false` | Target team service is down and fallback is disabled | `{ "error": "target_service is not reachable" }` |
