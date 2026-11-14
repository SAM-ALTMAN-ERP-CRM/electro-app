# Team ERP-2: REST API Specification

**Service**: ERP-2 Procurement & Suppliers  
**Base URL**: `http://localhost:5202/api` (or `/svc/erp2/api` via Vite frontend proxy)  
**Database**: PostgreSQL (`erp2_db`)  
**Authentication**: All endpoints require a Bearer JWT header (`Authorization: Bearer <token>`).

---

## 1. Supplier Master Endpoints

### 1.1 List Suppliers
- **Method**: `GET`
- **Path**: `/api/suppliers`
- **Query Parameters**:
  - `category` (optional, string): Filter by category (e.g. `Semiconductors`, `Passive Components`, `Displays`)
  - `q` (optional, string): Search term matching supplier name, contact person, or email
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "SUP-0001",
        "name": "Semicon India Tech",
        "contact_person": "Rajesh Kumar",
        "email": "rajesh@semiconindia.com",
        "phone": "+91 98765 43210",
        "address": "Electronic City Phase 1, Bangalore, Karnataka",
        "category": "Semiconductors",
        "payment_terms": "Net 30",
        "average_rating": 4.5,
        "is_active": true,
        "created_at": "2026-11-01T00:00:00.000Z"
      }
    ]
  }
  ```

### 1.2 Get Top Rated Suppliers
- **Method**: `GET`
- **Path**: `/api/suppliers/top`
- **Query Parameters**:
  - `limit` (optional, integer): Number of top suppliers to return (default: `5`)
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "SUP-0001",
        "name": "Semicon India Tech",
        "category": "Semiconductors",
        "average_rating": 4.8,
        "total_reviews": 12
      }
    ]
  }
  ```

### 1.3 Get Supplier by ID
- **Method**: `GET`
- **Path**: `/api/suppliers/:id`
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "SUP-0001",
      "name": "Semicon India Tech",
      "contact_person": "Rajesh Kumar",
      "email": "rajesh@semiconindia.com",
      "phone": "+91 98765 43210",
      "address": "Electronic City Phase 1, Bangalore",
      "category": "Semiconductors",
      "payment_terms": "Net 30",
      "average_rating": 4.5,
      "is_active": true
    }
  }
  ```
- **Errors**:
  - `404 Not Found`: `{"error": "Supplier 'SUP-9999' not found"}`

### 1.4 Create Supplier
- **Method**: `POST`
- **Path**: `/api/suppliers`
- **Request Body**:
  ```json
  {
    "name": "Apex Micro Devices",
    "contact_person": "Pooja Hegde",
    "email": "pooja@apexmicro.in",
    "phone": "+91 98765 43213",
    "address": "MIDC Andheri East, Mumbai, Maharashtra",
    "category": "Passive Components",
    "payment_terms": "Net 45"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "SUP-0006",
      "name": "Apex Micro Devices",
      "contact_person": "Pooja Hegde",
      "email": "pooja@apexmicro.in",
      "category": "Passive Components",
      "payment_terms": "Net 45",
      "is_active": true
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error": "Supplier name is required"}`
  - `409 Conflict`: `{"error": "A supplier with this name already exists"}`

### 1.5 Rate Supplier
- **Method**: `POST`
- **Path**: `/api/suppliers/:id/ratings`
- **Request Body**:
  ```json
  {
    "score": 5,
    "review": "Fast delivery and zero defective components in batch.",
    "rated_by": "EMP-0005"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "RAT-0001",
      "supplier_id": "SUP-0001",
      "score": 5,
      "review": "Fast delivery and zero defective components in batch.",
      "rated_by": "EMP-0005",
      "new_average_rating": 4.75
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error": "Rating score must be an integer between 1 and 5"}`
  - `404 Not Found`: `{"error": "Supplier 'SUP-9999' not found"}`

---

## 2. Purchase Requests Endpoints

### 2.1 List Purchase Requests
- **Method**: `GET`
- **Path**: `/api/purchase-requests`
- **Query Parameters**:
  - `status` (optional, string): Filter by status (`pending`, `approved`, `rejected`, `converted`)
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "PR-0001",
        "sku": "SKU-0101",
        "product_name": "Microcontroller MCU-32",
        "quantity": 25,
        "requested_by": "EMP-0005",
        "department": "Engineering",
        "reason": "Replenish safety stock for assembly line",
        "status": "pending",
        "created_at": "2026-11-04T10:00:00.000Z"
      }
    ]
  }
  ```

### 2.2 Create Purchase Request (Internal & Cross-Team Endpoint)
- **Method**: `POST`
- **Path**: `/api/purchase-requests`
- **Request Body**:
  ```json
  {
    "sku": "SKU-0103",
    "product_name": "Power supply unit 500W",
    "quantity": 10,
    "requested_by": "EMP-0006",
    "department": "Production",
    "reason": "Assembly line shortage"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "PR-0002",
      "sku": "SKU-0103",
      "product_name": "Power supply unit 500W",
      "quantity": 10,
      "status": "pending",
      "requested_by": "EMP-0006",
      "created_at": "2026-11-14T10:00:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error": "sku and quantity (> 0) are required"}`

### 2.3 Approve or Reject Purchase Request
- **Method**: `PATCH`
- **Path**: `/api/purchase-requests/:id/decision`
- **Request Body**:
  ```json
  {
    "decision": "approved",
    "decided_by": "EMP-0001",
    "remarks": "Approved for Q4 procurement"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "PR-0001",
      "status": "approved",
      "decided_by": "EMP-0001",
      "remarks": "Approved for Q4 procurement"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error": "Decision must be 'approved' or 'rejected'"}`
  - `404 Not Found`: `{"error": "Purchase request 'PR-9999' not found"}`

### 2.4 Convert Approved Request to Purchase Order
- **Method**: `POST`
- **Path**: `/api/purchase-requests/:id/convert`
- **Request Body**:
  ```json
  {
    "supplier_id": "SUP-0001",
    "unit_cost": 1500.00,
    "expected_date": "2026-11-28",
    "warehouse_id": "WH-01"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "po_id": "PO-0006",
      "request_id": "PR-0001",
      "supplier_id": "SUP-0001",
      "total_amount": 17700.00,
      "status": "draft"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error": "Only approved purchase requests can be converted"}`

---

## 3. Purchase Orders Endpoints

### 3.1 List Purchase Orders
- **Method**: `GET`
- **Path**: `/api/purchase-orders`
- **Query Parameters**:
  - `status` (optional, string): Filter by status (`draft`, `sent`, `partially_received`, `received`, `cancelled`)
  - `supplier_id` (optional, string): Filter by supplier code
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "PO-0002",
        "supplier_id": "SUP-0002",
        "supplier_name": "Bharat Electronics Ltd",
        "status": "partially_received",
        "expected_date": "2026-11-20",
        "total_amount": "20000.00",
        "warehouse_id": "WH-01",
        "created_at": "2026-11-01T09:00:00.000Z"
      }
    ]
  }
  ```

### 3.2 Get Purchase Order by ID
- **Method**: `GET`
- **Path**: `/api/purchase-orders/:id`
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "PO-0002",
      "supplier_id": "SUP-0002",
      "supplier_name": "Bharat Electronics Ltd",
      "status": "partially_received",
      "expected_date": "2026-11-20",
      "total_amount": "20000.00",
      "warehouse_id": "WH-01",
      "items": [
        {
          "id": "POI-0002",
          "sku": "SKU-0102",
          "product_name": "Mainboard",
          "quantity": 10,
          "received_qty": 4,
          "unit_cost": "2000.00"
        }
      ]
    }
  }
  ```

### 3.3 Create Purchase Order
- **Method**: `POST`
- **Path**: `/api/purchase-orders`
- **Request Body**:
  ```json
  {
    "supplier_id": "SUP-0001",
    "warehouse_id": "WH-01",
    "expected_date": "2026-11-30",
    "created_by": "EMP-0001",
    "items": [
      {
        "sku": "SKU-0101",
        "product_name": "Microcontroller MCU-32",
        "quantity": 20,
        "unit_cost": 1500.00
      }
    ]
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "PO-0006",
      "supplier_id": "SUP-0001",
      "status": "draft",
      "total_amount": "30000.00",
      "warehouse_id": "WH-01",
      "expected_date": "2026-11-30"
    }
  }
  ```

### 3.4 Update PO Status
- **Method**: `PATCH`
- **Path**: `/api/purchase-orders/:id/status`
- **Request Body**:
  ```json
  {
    "status": "sent"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "PO-0006",
      "status": "sent",
      "sent_at": "2026-11-14T10:00:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error": "Invalid status transition"}`

---

## 4. Goods Receipts & Warehouse Inward Endpoints

### 4.1 List Historical Goods Receipts
- **Method**: `GET`
- **Path**: `/api/goods-receipts` (or `/api/receipts`)
- **Query Parameters**:
  - `po_id` (optional, string): Filter receipts by Purchase Order
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "GRN-0001",
        "po_id": "PO-0003",
        "supplier_name": "Paramount Power Systems",
        "received_by": "EMP-0005",
        "received_on": "2026-11-05",
        "po_status": "received",
        "notes": "First batch of power supplies arrived in good condition",
        "items": [
          {
            "sku": "SKU-0103",
            "received_qty": 6,
            "product_name": "Power supply",
            "unit_cost": "1500.00"
          }
        ]
      }
    ]
  }
  ```

### 4.2 List Pending Orders Awaiting Delivery
- **Method**: `GET`
- **Path**: `/api/receipts/pending` (or `/api/goods-receipts/pending`)
- **Description**: Returns all POs in `sent` or `partially_received` status with calculated overdue status (`is_late` and `days_late`) based on `expected_date < CURRENT_DATE`.
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "PO-0005",
        "supplier_id": "SUP-0005",
        "supplier_name": "Zenith Connectors",
        "status": "sent",
        "expected_date": "2026-11-05",
        "total_amount": "3000.00",
        "is_late": true,
        "days_late": 9,
        "items": [
          {
            "sku": "SKU-0105",
            "product_name": "Display panel",
            "ordered_qty": 5,
            "received_qty": 0,
            "remaining_qty": 5,
            "unit_cost": "600.00"
          }
        ]
      }
    ]
  }
  ```

### 4.3 Create Goods Receipt Note (GRN)
- **Method**: `POST`
- **Path**: `/api/goods-receipts` (or `/api/receipts`)
- **Description**: Validates that received quantities do not exceed remaining unreceived balance, records the inward GRN, updates PO status, and non-blockingly triggers ERP-1 stock adjustment and ERP-5 purchase ledger.
- **Request Body**:
  ```json
  {
    "po_id": "PO-0002",
    "received_by": "EMP-0005",
    "received_on": "2026-11-14",
    "notes": "Batch delivered with packing slips intact",
    "items": [
      {
        "sku": "SKU-0102",
        "received_qty": 3
      }
    ]
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "GRN-0004",
      "po_id": "PO-0002",
      "po_status": "partially_received",
      "received_by": "EMP-0005",
      "received_on": "2026-11-14",
      "notes": "Batch delivered with packing slips intact",
      "items": [
        {
          "id": "GRNI-0004",
          "grn_id": "GRN-0004",
          "sku": "SKU-0102",
          "received_qty": 3,
          "product_name": "Mainboard",
          "unit_cost": "2000.00"
        }
      ]
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error": "Received quantity (12) exceeds remaining ordered quantity (6) for SKU SKU-0102"}`
  - `400 Bad Request`: `{"error": "Cannot receive goods for Purchase Order in 'draft' status"}`
  - `404 Not Found`: `{"error": "Purchase Order 'PO-9999' not found"}`
