# API Specification — Team ERP-3 (Production & Quality)

**Service**: `services/erp3` | **Base URL**: `http://localhost:5203`  
**Database**: PostgreSQL `erp3_db` (Port 5432)  
**Authentication**: Bearer JWT Token in `Authorization` header (`Bearer <token>`) verified via `services/_shared/auth.js`  
**Standard Response Formats**: JSON payload wrapped in `{ "data": ... }` on success, or `{ "error": "..." }` on error.

---

## 1. System & Health Endpoints

### 1.1 `GET /api/health`
Service health probe returning metadata.
- **Access**: Public
- **Success Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "team": "erp3",
    "name": "ERP-3 Production & Quality",
    "port": 5203
  }
  ```

---

## 2. Bill of Materials (BOM) Endpoints [ERP3-A1, ERP3-A3]

### 2.1 `POST /api/boms`
Creates a new Bill of Materials header with component items.
- **Access**: `admin`, `warehouse`
- **Request Body**:
  ```json
  {
    "product_sku": "SKU-0001",
    "version": 1,
    "items": [
      { "component_sku": "SKU-0101", "qty_per_unit": 1, "uom": "pcs" },
      { "component_sku": "SKU-0102", "qty_per_unit": 1, "uom": "pcs" },
      { "component_sku": "SKU-0103", "qty_per_unit": 1, "uom": "pcs" },
      { "component_sku": "SKU-0104", "qty_per_unit": 1, "uom": "pcs" },
      { "component_sku": "SKU-0105", "qty_per_unit": 1, "uom": "pcs" }
    ]
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "BOM-0001",
      "product_sku": "SKU-0001",
      "version": 1,
      "is_active": true,
      "items": [
        { "id": 1, "bom_id": "BOM-0001", "component_sku": "SKU-0101", "qty_per_unit": 1, "uom": "pcs" }
      ]
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Missing `product_sku`, empty `items`, missing `component_sku`, non-positive `qty_per_unit`.
  - `409 Conflict`: BOM for `product_sku` with same `version` already exists.

### 2.2 `GET /api/boms`
Lists all Bills of Materials, with optional filtering.
- **Access**: `admin`, `warehouse`
- **Query Parameters**:
  - `product_sku` (string, optional): Filter by manufactured product SKU.
  - `is_active` (boolean, optional): Filter by active status (`true` / `false`).
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "BOM-0001",
        "product_sku": "SKU-0001",
        "version": 1,
        "is_active": true,
        "created_at": "2026-10-01T08:00:00.000Z"
      }
    ]
  }
  ```

### 2.3 `GET /api/boms/:id`
Retrieves a single BOM with all nested component items.
- **Access**: `admin`, `warehouse`
- **Path Parameters**:
  - `id`: BOM ID (e.g. `BOM-0001`)
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "BOM-0001",
      "product_sku": "SKU-0001",
      "version": 1,
      "is_active": true,
      "items": [
        { "id": 1, "bom_id": "BOM-0001", "component_sku": "SKU-0101", "qty_per_unit": 1, "uom": "pcs" }
      ]
    }
  }
  ```
- **Error Codes**:
  - `404 Not Found`: BOM ID not found.

### 2.4 `GET /api/boms/:id/requirements`
Calculates scaled component requirements for a batch size and checks stock availability against ERP-1 Inventory.
- **Access**: `admin`, `warehouse`
- **Query Parameters**:
  - `qty` (integer, required): Batch production quantity (e.g. `20`).
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "bom_id": "BOM-0001",
      "product_sku": "SKU-0001",
      "target_qty": 20,
      "all_available": false,
      "requirements": [
        {
          "component_sku": "SKU-0101",
          "uom": "pcs",
          "qty_per_unit": 1,
          "required_qty": 20,
          "available_qty": 15,
          "shortage": 5
        }
      ]
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: `qty` parameter missing, non-numeric, or `<= 0`.
  - `404 Not Found`: BOM ID not found.

### 2.5 `POST /api/boms/:id/purchase-request`
Dispatches a shortage purchase request to ERP-2 Procurement for missing raw materials.
- **Access**: `admin`, `warehouse`
- **Request Body**:
  ```json
  {
    "sku": "SKU-0101",
    "quantity": 10,
    "required_by": "2026-11-20"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "status": "requested",
      "sku": "SKU-0101",
      "quantity": 10,
      "bom_id": "BOM-0001",
      "target_team": "erp2"
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Missing `sku`, non-positive `quantity`.
  - `404 Not Found`: BOM ID not found.

---

## 3. Manufacturing Work Orders Endpoints [ERP3-B1, ERP3-B3, ERP3-C1, ERP3-C3]

### 3.1 `POST /api/work-orders`
Creates a manufacturing work order and auto-populates required component lines from the active BOM.
- **Access**: `admin`, `warehouse`
- **Request Body**:
  ```json
  {
    "product_sku": "SKU-0001",
    "quantity": 25,
    "bom_id": "BOM-0001",
    "source": "manual",
    "target_start": "2026-11-15",
    "target_end": "2026-11-18"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "WO-0006",
      "product_sku": "SKU-0001",
      "bom_id": "BOM-0001",
      "quantity": 25,
      "status": "planned",
      "source": "manual",
      "materials": [
        {
          "id": 1,
          "wo_id": "WO-0006",
          "component_sku": "SKU-0101",
          "required_qty": 25,
          "issued_qty": 0,
          "uom": "pcs"
        }
      ]
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Missing `product_sku`, `quantity <= 0`, invalid `source` (must be `manual` or `shortage`), or no active BOM exists for the SKU.

### 3.2 `GET /api/work-orders`
Lists all manufacturing work orders with optional filtering.
- **Access**: `admin`, `warehouse`
- **Query Parameters**:
  - `status` (string, optional): Filter by `planned` | `in_progress` | `completed` | `cancelled`.
  - `source` (string, optional): Filter by `manual` | `shortage`.
  - `product_sku` (string, optional): Filter by manufactured product SKU.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "WO-0001",
        "product_sku": "SKU-0001",
        "bom_id": "BOM-0001",
        "quantity": 50,
        "status": "in_progress",
        "source": "manual",
        "created_at": "2026-10-15T09:00:00.000Z"
      }
    ]
  }
  ```

### 3.3 `GET /api/work-orders/:id`
Retrieves a work order by ID, including its associated BOM lines and material issuance progress.
- **Access**: `admin`, `warehouse`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "WO-0001",
      "product_sku": "SKU-0001",
      "bom_id": "BOM-0001",
      "quantity": 50,
      "status": "in_progress",
      "source": "manual",
      "materials": [
        {
          "id": 1,
          "wo_id": "WO-0001",
          "component_sku": "SKU-0101",
          "required_qty": 50,
          "issued_qty": 50,
          "uom": "pcs"
        }
      ]
    }
  }
  ```
- **Error Codes**:
  - `404 Not Found`: Work order ID not found.

### 3.4 `PATCH /api/work-orders/:id/status`
Transitions a work order through its valid lifecycle stages.
- **Access**: `admin`, `warehouse`
- **Request Body**:
  ```json
  {
    "status": "in_progress"
  }
  ```
- **Allowed Transitions**:
  - `planned` -> `in_progress`
  - `in_progress` -> `completed` (sets `completed_at` timestamp)
  - `planned` -> `cancelled`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "WO-0001",
      "status": "in_progress"
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Disallowed lifecycle transition (e.g. `planned` -> `completed`, or mutating `completed`).
  - `404 Not Found`: Work order ID not found.

### 3.5 `DELETE /api/work-orders/:id`
Deletes a planned work order.
- **Access**: `admin`, `warehouse`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "WO-0005",
      "deleted": true
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Cannot delete work orders with status `in_progress` or `completed`.
  - `404 Not Found`: Work order not found.

### 3.6 `POST /api/work-orders/:id/issue` [ERP3-C1]
Issues raw materials against a work order component requirement, recording audit history and decrementing ERP-1 Inventory stock.
- **Access**: `admin`, `warehouse`
- **Request Body**:
  ```json
  {
    "component_sku": "SKU-0101",
    "quantity": 25,
    "issued_by": "EMP-0001"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "ISS-0004",
      "wo_id": "WO-0001",
      "component_sku": "SKU-0101",
      "quantity": 25,
      "issued_by": "EMP-0001",
      "issued_at": "2026-11-12T10:00:00.000Z",
      "remaining_required": 25,
      "total_issued": 25
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Missing `component_sku`, non-positive `quantity`, or issuing exceeds total `required_qty`.
  - `404 Not Found`: Work order ID not found or component not part of the work order.

### 3.7 `GET /api/work-orders/:id/issues` [ERP3-C1]
Returns the audit history of raw material issuance records for a work order.
- **Access**: `admin`, `warehouse`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "ISS-0001",
        "wo_id": "WO-0001",
        "component_sku": "SKU-0101",
        "quantity": 50,
        "issued_by": "EMP-0001",
        "issued_at": "2026-10-18T10:00:00.000Z"
      }
    ]
  }
  ```

### 3.8 `POST /api/work-orders/:id/post-finished` [ERP3-C3]
Completes production of finished goods, gated by 100% material issuance and passing QC status. Adjusts ERP-1 stock (+qty in WH-01) and generates serial numbers.
- **Access**: `admin`, `warehouse`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "wo_id": "WO-0001",
      "status": "completed",
      "product_sku": "SKU-0001",
      "quantity": 50,
      "warehouse_id": "WH-01",
      "stock_adjusted": true,
      "serials_generated": true
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Components missing/not fully issued, or QC status gate returned `allowed: false`.
  - `404 Not Found`: Work order ID not found.

---

## 4. Quality Control (QC) Endpoints [ERP3-D1, ERP3-D3]

### 4.1 `POST /api/qc`
Records a quality inspection against a work order. Automatically computes result based on defect thresholds.
- **Access**: `admin`, `warehouse`
- **Result Calculation Rule**:
  - `pass`: When `failed_qty == 0`
  - `fail`: When `failed_qty > 0.20 * checked_qty` (> 20% defective)
  - `rework`: When `failed_qty > 0` and `<= 0.20 * checked_qty`
- **Request Body**:
  ```json
  {
    "wo_id": "WO-0001",
    "inspector": "EMP-0005",
    "checked_qty": 50,
    "passed_qty": 48,
    "failed_qty": 2,
    "defect_reason": "scratch"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "QC-0004",
      "wo_id": "WO-0001",
      "inspector": "EMP-0005",
      "checked_qty": 50,
      "passed_qty": 48,
      "failed_qty": 2,
      "defect_reason": "scratch",
      "result": "rework",
      "checked_at": "2026-11-12T10:15:00.000Z"
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Missing `wo_id`, missing `inspector`, non-positive `checked_qty`, or `passed_qty + failed_qty !== checked_qty`.

### 4.2 `GET /api/qc`
Lists quality inspections with optional filtering.
- **Access**: `admin`, `warehouse`
- **Query Parameters**:
  - `wo_id` (string, optional): Filter by work order ID (e.g. `WO-0001`).
  - `result` (string, optional): Filter by `pass` | `rework` | `fail`.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "QC-0001",
        "wo_id": "WO-0001",
        "inspector": "EMP-0005",
        "checked_qty": 50,
        "passed_qty": 50,
        "failed_qty": 0,
        "defect_reason": null,
        "result": "pass",
        "checked_at": "2026-11-12T14:00:00.000Z"
      }
    ]
  }
  ```

### 4.3 `GET /api/qc/:id`
Retrieves a single quality inspection record by ID.
- **Access**: `admin`, `warehouse`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "QC-0001",
      "wo_id": "WO-0001",
      "inspector": "EMP-0005",
      "checked_qty": 50,
      "passed_qty": 50,
      "failed_qty": 0,
      "defect_reason": null,
      "result": "pass"
    }
  }
  ```
- **Error Codes**:
  - `404 Not Found`: QC ID not found.

### 4.4 `GET /api/qc/summary` [ERP3-D3]
Aggregates overall pass rate percentage, per-product quality breakdown, and defects count sorted descending.
- **Access**: `admin`, `warehouse`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "total_inspections": 3,
      "total_checked": 95,
      "total_passed": 87,
      "total_failed": 8,
      "overall_pass_rate": 91.58,
      "by_product": [
        {
          "product_sku": "SKU-0001",
          "checked": 75,
          "passed": 73,
          "failed": 2,
          "pass_rate": 97.33
        }
      ],
      "by_defect_reason": [
        { "defect_reason": "no power", "failed_count": 6 },
        { "defect_reason": "scratch", "failed_count": 2 }
      ]
    }
  }
  ```

### 4.5 `GET /api/work-orders/:id/qc-status` [ERP3-D3 Quality Gate]
Inspects the latest QC check for a work order to determine if finishing/posting is allowed.
- **Access**: `admin`, `warehouse`
- **Quality Gate Logic**:
  - If latest inspection `result === 'fail'`: returns `{ allowed: false, reason: "Latest QC check failed (QC-xxxx)" }`
  - If latest inspection `result === 'pass'` or `'rework'`: returns `{ allowed: true, latest_qc: ... }`
  - If no inspection has occurred yet: returns `{ allowed: true, note: "No QC checks conducted yet" }`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "wo_id": "WO-0001",
      "allowed": true,
      "latest_result": "pass",
      "latest_qc_id": "QC-0001"
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Missing work order ID.
  - `404 Not Found`: Work order not found.
