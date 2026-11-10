# CRM-1 API Specification

Team: CRM-1 Sales Pipeline  
Port: 5101  
Database: `crm1_db`  
Base URL: `http://localhost:5101/api`

---

## Quotes API ([CRM1-C1])

### 1. List Quotes
- **Method**: `GET`
- **Path**: `/api/quotes`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `opportunity_id` *(optional)*: Filter quotes by opportunity ID (e.g. `OPP-0001`).
  - `status` *(optional)*: Filter quotes by status (`draft`, `sent`, `accepted`, `rejected`).
  - `dealer_id` *(optional)*: Filter quotes by dealer ID (e.g. `DLR-0001`).
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
        }
      ]
    }
  ]
}
```

---

### 2. Get Single Quote Details
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
}
```
- **Error Response**: `404 Not Found`
```json
{
  "error": "Quote with ID 'QUO-9999' not found"
}
```

---

### 3. Create Quote with Items
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
    "created_at": "2026-11-09T04:45:00.000Z",
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
      },
      {
        "id": "QI-0009",
        "quote_id": "QUO-0005",
        "sku": "SKU-0004",
        "product_name": "Soundbar 2.1",
        "quantity": 2,
        "unit_price": 8990.0
      },
      {
        "id": "QI-0010",
        "quote_id": "QUO-0005",
        "sku": "SKU-0006",
        "product_name": "Wireless Headphones",
        "quantity": 1,
        "unit_price": 3499.0
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
    - `{ "error": "Item 1: quantity must be a positive integer" }`
    - `{ "error": "discount_percent must be a number between 0 and 100" }`

---

### 4. Update Quote Status ([CRM1-C3])
- **Method**: `PATCH`
- **Path**: `/api/quotes/:id/status`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "status": "sent",
  "rejection_reason": "Optional text if rejecting"
}
```
- **Allowed Transitions**:
  - `draft` $\rightarrow$ `sent`: Blocked with `400` if `discount_percent > 5` (or `needs_approval = true`) unless `approved = true`.
  - `sent` $\rightarrow$ `accepted`: Triggers asynchronous side effects to create sales order in ERP-4 (`POST /api/sales-orders`) and customer timeline event in CRM-3 (`POST /api/interactions/from-event`).
  - `sent` $\rightarrow$ `rejected`: Stores `rejection_reason`.
- **Response**: `200 OK`
```json
{
  "data": {
    "id": "QUO-0002",
    "opportunity_id": "OPP-0002",
    "customer_id": "CUST-0004",
    "dealer_id": "DLR-0001",
    "sales_rep_id": "EMP-0002",
    "status": "accepted",
    "discount_percent": 5.0,
    "needs_approval": false,
    "approved": false,
    "rejection_reason": null,
    "created_at": "2026-11-06T11:30:00.000Z",
    "subtotal": 67960.0,
    "discount_amount": 3398.0,
    "taxable_value": 64562.0,
    "gst": 11621.16,
    "total": 76183.16,
    "items": [ ... ]
  }
}
```
- **Error Responses**:
  - `400 Bad Request`:
    - `{ "error": "Quote requires approval before it can be sent (discount exceeds 5%)" }`
    - `{ "error": "Quotes in 'draft' status must be moved to 'sent' before being accepted or rejected" }`
    - `{ "error": "Quotes in 'sent' status can only be moved to 'accepted' or 'rejected'" }`
    - `{ "error": "Cannot change status of a quote that is already 'accepted'" }`
  - `404 Not Found`:
    - `{ "error": "Quote with ID 'QUO-9999' not found" }`
