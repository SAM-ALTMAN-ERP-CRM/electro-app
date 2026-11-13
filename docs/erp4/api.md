# ERP-4 Orders & Dispatch — REST API Specification

**Team**: ERP-4 Orders & Dispatch  
**Port**: `5204` (`services/erp4`)  
**Base URL**: `http://localhost:5204/api`  
**Authentication**: Bearer JWT (`Authorization: Bearer <token>`) required on all endpoints.  
**Response Format**: REST + JSON. Standard success wrapper `{ "data": ... }`. Errors: `{ "error": "<message>" }`.

---

## 1. Sales Orders Endpoints

### 1.1 Create Sales Order
- **Method**: `POST`
- **Path**: `/api/sales-orders`
- **Description**: Creates a new sales order with line items. Called by CRM-1 upon quote acceptance. Performs automatic customer master lookup from CRM-3 to fetch customer name and 15-character GSTIN. Rejects duplicate `quote_id` with HTTP 409 Conflict.
- **Request Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_token>`
- **Request Body**:
  ```json
  {
    "quote_id": "QUO-0001",
    "customer_id": "CUST-0002",
    "customer_name": "Sunrise Electronics Pvt Ltd",
    "customer_gstin": "27AABCS1234F1Z5",
    "sales_rep_id": "EMP-0001",
    "items": [
      {
        "sku": "SKU-0001",
        "product_name": "55-inch 4K Smart TV",
        "quantity": 2,
        "unit_price": 42990.00
      }
    ]
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "data": {
        "id": "SO-0008",
        "quote_id": "QUO-0001",
        "customer_id": "CUST-0002",
        "customer_name": "Sunrise Electronics Pvt Ltd",
        "customer_gstin": "27AABCS1234F1Z5",
        "sales_rep_id": "EMP-0001",
        "status": "created",
        "total_amount": 85980.00,
        "created_at": "2026-11-13T10:00:00.000Z",
        "items": [
          {
            "id": 1,
            "so_id": "SO-0008",
            "sku": "SKU-0001",
            "product_name": "55-inch 4K Smart TV",
            "quantity": 2,
            "unit_price": 42990.00
          }
        ]
      }
    }
    ```
  - `400 Bad Request`: `{ "error": "customer_id is required" }`
  - `409 Conflict`: `{ "error": "Sales order with quote_id \"QUO-0001\" already exists" }`

---

### 1.2 List Sales Orders
- **Method**: `GET`
- **Path**: `/api/sales-orders`
- **Query Parameters**:
  - `customer_id` (optional): Filter by customer ID (e.g. `CUST-0001`)
  - `status` (optional): Filter by status (`created`, `confirmed`, `dispatched`, `delivered`, `cancelled`)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "data": [
        {
          "id": "SO-0001",
          "customer_id": "CUST-0001",
          "customer_name": "Aarav Mehta",
          "customer_gstin": null,
          "sales_rep_id": "EMP-0001",
          "status": "delivered",
          "total_amount": 42990.00,
          "created_at": "2026-10-01T09:00:00.000Z",
          "items": [...]
        }
      ]
    }
    ```

---

### 1.3 Get Sales Order by ID
- **Method**: `GET`
- **Path**: `/api/sales-orders/:id`
- **Responses**:
  - `200 OK`: `{ "data": { "id": "SO-0001", ... } }`
  - `404 Not Found`: `{ "error": "Sales order SO-9999 not found" }`

---

### 1.4 Confirm Sales Order
- **Method**: `PATCH`
- **Path**: `/api/sales-orders/:id/confirm`
- **Description**: Transitions order from `created` to `confirmed`. Orders in any other status return HTTP 400.
- **Responses**:
  - `200 OK`: `{ "data": { "id": "SO-0001", "status": "confirmed", ... } }`
  - `400 Bad Request`: `{ "error": "Cannot confirm order SO-0001 in status 'confirmed'. Orders can only be confirmed from 'created' status." }`
  - `404 Not Found`: `{ "error": "Sales order SO-9999 not found" }`

---

### 1.5 Cancel Sales Order
- **Method**: `PATCH`
- **Path**: `/api/sales-orders/:id/cancel`
- **Description**: Cancels order. Allowed only before dispatch (status `created` or `confirmed`). Dispatched, delivered, or cancelled orders return HTTP 400. Automatically releases active reservations.
- **Responses**:
  - `200 OK`: `{ "data": { "id": "SO-0001", "status": "cancelled", ... } }`
  - `400 Bad Request`: `{ "error": "Cannot cancel order SO-0001 in status 'dispatched'. Orders can only be cancelled before dispatch." }`
  - `404 Not Found`: `{ "error": "Sales order SO-9999 not found" }`

---

## 2. Inventory Reservations Endpoints

### 2.1 Create Reservation
- **Method**: `POST`
- **Path**: `/api/reservations`
- **Request Body**:
  ```json
  {
    "so_id": "SO-0006",
    "sku": "SKU-0002",
    "quantity": 1
  }
  ```
- **Responses**:
  - `201 Created`: `{ "data": { "id": "RES-0008", "status": "reserved", ... } }`
  - `400 Bad Request`: `{ "error": "so_id and sku are required" }`

---

### 2.2 Get Order Reservations
- **Method**: `GET`
- **Path**: `/api/sales-orders/:id/reservations`
- **Responses**:
  - `200 OK`:
    ```json
    {
      "data": {
        "so_id": "SO-0006",
        "reservations": [
          { "id": "RES-0006", "sku": "SKU-0002", "quantity": 1, "status": "reserved" }
        ],
        "summary": { "total": 1, "reserved": 1, "shortage": 0, "released": 0 }
      }
    }
    ```

---

### 2.3 Release Order Reservations
- **Method**: `POST`
- **Path**: `/api/sales-orders/:id/reservations/release`
- **Responses**:
  - `200 OK`: `{ "data": { "released_count": 1, "so_id": "SO-0006" } }`

---

## 3. Consignment Dispatch Endpoints

### 3.1 Create Dispatch Consignment
- **Method**: `POST`
- **Path**: `/api/dispatches`
- **Description**: Dispatches a confirmed sales order. Verifies that order has fully reserved stock (refuses unreserved or shortage orders with HTTP 400). Allocates serialized units via ERP-1.
- **Request Body**:
  ```json
  {
    "so_id": "SO-0006",
    "courier": "BlueDart",
    "address": "104 Malabar Hill, Walkeshwar Road, Mumbai 400006"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "data": {
        "id": "DSP-0006",
        "so_id": "SO-0006",
        "courier": "BlueDart",
        "tracking_no": "BD-49201948",
        "status": "picked",
        "ship_date": "2026-11-13",
        "address": "104 Malabar Hill, Walkeshwar Road, Mumbai 400006",
        "serials": ["TV55-2611-0006"]
      }
    }
    ```
  - `400 Bad Request`: `{ "error": "Cannot dispatch order without reserved stock" }`

---

### 3.2 List Dispatches
- **Method**: `GET`
- **Path**: `/api/dispatches`
- **Description**: Lists dispatches. Supports format `format=flat` (used by CRM-2 with `serial_number`, `sku`, `customer_id`, `ship_date`) or default grouped format.
- **Query Parameters**:
  - `status` (optional): Filter by dispatch status (`picked`, `shipped`, `delivered`)
  - `serial_number` (optional): Filter by serialized item
  - `format` (optional): `flat` or `grouped`
- **Responses**:
  - `200 OK`: `{ "data": [...] }`

---

### 3.3 Get Dispatch Consignment by ID
- **Method**: `GET`
- **Path**: `/api/dispatches/:id`
- **Responses**:
  - `200 OK`: `{ "data": { "id": "DSP-0001", "courier": "BlueDart", ... } }`
  - `404 Not Found`: `{ "error": "Dispatch consignment DSP-9999 not found" }`

---

### 3.4 Update Dispatch Status
- **Method**: `PATCH`
- **Path**: `/api/dispatches/:id/status`
- **Description**: Advances dispatch status (`picked` $\rightarrow$ `shipped` $\rightarrow$ `delivered`). Moving to `shipped` deducts ERP-1 inventory, sets serials to `sold`, generates an ERP-5 invoice, and updates order status to `dispatched`. Moving to `delivered` records `delivered_date` and updates order status to `delivered`.
- **Request Body**:
  ```json
  {
    "status": "shipped"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "data": { "id": "DSP-0001", "status": "shipped", ... } }`
  - `400 Bad Request`: `{ "error": "Invalid status transition" }`

---

## 4. Customer Returns Endpoints

### 4.1 Raise Customer Return
- **Method**: `POST`
- **Path**: `/api/returns`
- **Description**: Registers a customer return request. Validates that the returned serial number was dispatched for the specified order (refuses invalid serials with HTTP 400).
- **Request Body**:
  ```json
  {
    "so_id": "SO-0001",
    "serial_number": "TV55-2611-0001",
    "reason": "Display panel flickering on HDMI 2",
    "rma_id": "RMA-0001",
    "outcome": "credit_note"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "data": {
        "id": "RET-0005",
        "so_id": "SO-0001",
        "serial_number": "TV55-2611-0001",
        "reason": "Display panel flickering on HDMI 2",
        "rma_id": "RMA-0001",
        "outcome": "credit_note",
        "status": "requested",
        "created_at": "2026-11-13T12:00:00.000Z"
      }
    }
    ```
  - `400 Bad Request`: `{ "error": "Serial number TV55-2611-9999 was not dispatched for order SO-0001" }`

---

### 4.2 Inbound Return from CRM-2 RMA
- **Method**: `POST`
- **Path**: `/api/returns/from-rma`
- **Description**: Inbound webhook called by CRM-2 upon ticket RMA approval. Looks up sales order by serial number. Rejects serials that were never dispatched with HTTP 400. Idempotent: repeated `rma_id` returns existing return record with HTTP 200.
- **Request Body**:
  ```json
  {
    "rma_id": "RMA-0002",
    "serial_number": "TV55-2611-0002",
    "reason": "Damaged during courier transit",
    "outcome": "replacement"
  }
  ```
- **Responses**:
  - `201 Created`: `{ "data": { "id": "RET-0006", "status": "requested", ... } }`
  - `200 OK`: `{ "data": { "id": "RET-0002", "rma_id": "RMA-0002", ... } }` (idempotent duplicate)
  - `400 Bad Request`: `{ "error": "Serial number TV55-UNKNOWN was never dispatched" }`

---

### 4.3 List Returns
- **Method**: `GET`
- **Path**: `/api/returns`
- **Query Parameters**:
  - `status` (optional): `requested`, `received`, `restocked`, `scrapped`
  - `so_id` (optional): Filter by sales order ID
- **Responses**:
  - `200 OK`: `{ "data": [...] }`

---

### 4.4 Get Return by ID
- **Method**: `GET`
- **Path**: `/api/returns/:id`
- **Responses**:
  - `200 OK`: `{ "data": { "id": "RET-0001", ... } }`
  - `404 Not Found`: `{ "error": "Return RET-9999 not found" }`

---

### 4.5 Update Return Status & Restock
- **Method**: `PATCH`
- **Path**: `/api/returns/:id/status`
- **Description**: Advances return status (`requested` $\rightarrow$ `received` $\rightarrow$ `restocked` / `scrapped`). When transitioning to `restocked`, triggers ERP-1 serial status reset (`returned` $\rightarrow$ `in_stock`), inventory stock adjustment (+1), and ERP-5 credit note creation (if outcome is `credit_note` or `issue_credit_note: true`).
- **Request Body**:
  ```json
  {
    "status": "restocked",
    "issue_credit_note": true
  }
  ```
- **Responses**:
  - `200 OK`: `{ "data": { "id": "RET-0001", "status": "restocked", ... } }`
  - `400 Bad Request`: `{ "error": "Invalid status 'pending'. Must be one of: requested, received, restocked, scrapped" }`
  - `404 Not Found`: `{ "error": "Return RET-9999 not found" }`

---

### 4.6 Returns Summary & Analytics
- **Method**: `GET`
- **Path**: `/api/returns/summary`
- **Description**: Returns live counts aggregated by status and by defect reason.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "data": {
        "total": 4,
        "requested": 1,
        "received": 1,
        "restocked": 1,
        "scrapped": 1,
        "by_reason": {
          "Display panel flickering on HDMI 2": 1,
          "Damaged during courier transit": 1,
          "Customer cancelled before installation": 1,
          "Internal power board short circuit": 1
        }
      }
    }
    ```
