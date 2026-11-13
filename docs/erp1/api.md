# Team ERP-1: REST API Specification
**Service**: ERP-1 Inventory & Warehouses  
**Base URL**: `http://localhost:5201/api` (or `/svc/erp1/api` via Vite frontend proxy)  
**Authentication**: All endpoints require Bearer JWT header unless specified as public.

---

## 1. Product Master Endpoints

### 1.1 List Products
- **Method**: `GET`
- **Path**: `/api/products`
- **Query Parameters**:
  - `category` (optional, string): Filter by category (`TV`, `Audio`, `Mobile accessory`, `Appliance`, `Component`)
  - `q` (optional, string): Search query matching product name or SKU
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "SKU-0001",
        "name": "55-inch 4K Smart TV",
        "category": "TV",
        "brand": "Electro",
        "price": "42990.00",
        "tax_rate": 18,
        "reorder_level": 10,
        "active": true,
        "created_at": "2026-11-01T00:00:00.000Z"
      }
    ]
  }
  ```

### 1.2 Create Product
- **Method**: `POST`
- **Path**: `/api/products`
- **Request Body**:
  ```json
  {
    "name": "85-inch 8K Smart TV",
    "category": "TV",
    "brand": "Electro",
    "price": 189990.00,
    "tax_rate": 18,
    "reorder_level": 5
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "SKU-0016",
      "name": "85-inch 8K Smart TV",
      "category": "TV",
      "brand": "Electro",
      "price": "189990.00",
      "tax_rate": 18,
      "reorder_level": 5,
      "active": true
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Missing name or price <= 0.
  - `409 Conflict`: Duplicate product name already exists.

### 1.3 Get Product Price with Tax
- **Method**: `GET`
- **Path**: `/api/products/:id/price`
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "SKU-0001",
      "name": "55-inch 4K Smart TV",
      "price": "42990.00",
      "tax_rate": 18,
      "tax_amount": "7738.20",
      "price_with_tax": "50728.20"
    }
  }
  ```

### 1.4 Update Reorder Level
- **Method**: `PUT`
- **Path**: `/api/products/:id/reorder-level`
- **Request Body**:
  ```json
  {
    "reorder_level": 15
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "SKU-0001",
      "reorder_level": 15
    }
  }
  ```

---

## 2. Multi-Warehouse Stock & Transfers

### 2.1 Get Stock Breakdown
- **Method**: `GET`
- **Path**: `/api/stock?sku=SKU-0001`
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "sku": "SKU-0001",
      "warehouses": [
        { "warehouse_id": "WH-01", "name": "Mumbai Central Warehouse", "quantity": 35 },
        { "warehouse_id": "WH-02", "name": "Delhi Regional Warehouse", "quantity": 25 },
        { "warehouse_id": "WH-03", "name": "Bengaluru Distribution Hub", "quantity": 15 }
      ],
      "total_stock": 75
    }
  }
  ```

### 2.2 Check Stock Availability
- **Method**: `GET`
- **Path**: `/api/stock/check?sku=SKU-0001&qty=50`
- **Response (200 OK)**:
  ```json
  {
    "available": true,
    "total": 75
  }
  ```

### 2.3 Adjust Stock
- **Method**: `POST`
- **Path**: `/api/stock/adjust`
- **Request Body**:
  ```json
  {
    "sku": "SKU-0001",
    "warehouse_id": "WH-01",
    "delta": 10,
    "reason": "Cycle count replenishment"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "sku": "SKU-0001",
      "warehouse_id": "WH-01",
      "previous_quantity": 35,
      "new_quantity": 45,
      "movement_id": "MOV-0015"
    }
  }
  ```

### 2.4 Inter-Warehouse Transfer
- **Method**: `POST`
- **Path**: `/api/transfers`
- **Request Body**:
  ```json
  {
    "sku": "SKU-0001",
    "from_wh": "WH-01",
    "to_wh": "WH-02",
    "qty": 5
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "sku": "SKU-0001",
      "from_wh": "WH-01",
      "to_wh": "WH-02",
      "qty": 5,
      "source_new_stock": 30,
      "target_new_stock": 30
    }
  }
  ```

---

## 3. Serial & Batch Tracking

### 3.1 Bulk Generate Serials
- **Method**: `POST`
- **Path**: `/api/serials/bulk`
- **Request Body**:
  ```json
  {
    "sku": "SKU-0001",
    "batch_no": "BATCH-2611-02",
    "count": 10,
    "prefix": "TV55-2611-"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "created_serials": [
        "TV55-2611-0031",
        "TV55-2611-0032"
      ],
      "count": 10
    }
  }
  ```

### 3.2 Allocate Serials for Order
- **Method**: `POST`
- **Path**: `/api/serials/allocate`
- **Request Body**:
  ```json
  {
    "sku": "SKU-0001",
    "qty": 2
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "allocated_serials": [
        "TV55-2611-0006",
        "TV55-2611-0007"
      ],
      "status": "reserved"
    }
  }
  ```

### 3.3 Update Serial Status
- **Method**: `PATCH`
- **Path**: `/api/serials/:serial/status`
- **Request Body**:
  ```json
  {
    "status": "sold"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "serial_number": "TV55-2611-0006",
      "status": "sold"
    }
  }
  ```

---

## 4. Low-Stock Alerts & Reorder Automation

### 4.1 Get Low-Stock Products
- **Method**: `GET`
- **Path**: `/api/alerts/low-stock`
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "sku": "SKU-0003",
        "name": "65-inch OLED TV",
        "category": "TV",
        "brand": "Electro",
        "price": "94990.00",
        "reorder_level": 10,
        "current_stock": 3,
        "shortfall": 7,
        "suggested_order_qty": 17
      },
      {
        "sku": "SKU-0102",
        "name": "Mainboard",
        "category": "Component",
        "brand": "Electro",
        "price": "4990.00",
        "reorder_level": 10,
        "current_stock": 4,
        "shortfall": 6,
        "suggested_order_qty": 16
      }
    ]
  }
  ```

### 4.2 Run Inventory Scan
- **Method**: `POST`
- **Path**: `/api/alerts/scan`
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "scanned": 2,
      "created": [
        {
          "id": "ALT-0001",
          "sku": "SKU-0003",
          "message": "Low stock alert for 65-inch OLED TV (SKU-0003): current stock 3 is at or below reorder level 10 (shortfall: 7)",
          "acknowledged": false
        }
      ],
      "count": 1,
      "message": "Scan complete: 1 new alert(s) generated"
    }
  }
  ```

### 4.3 List Alerts
- **Method**: `GET`
- **Path**: `/api/alerts?acknowledged=false`
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "ALT-0001",
        "sku": "SKU-0003",
        "message": "Low stock alert for 65-inch OLED TV (SKU-0003)",
        "acknowledged": false,
        "created_at": "2026-11-09T10:00:00.000Z"
      }
    ],
    "count": 1
  }
  ```

### 4.4 Acknowledge Alert
- **Method**: `PATCH`
- **Path**: `/api/alerts/:id/ack`
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "ALT-0001",
      "acknowledged": true
    }
  }
  ```

### 4.5 Inventory Summary KPI
- **Method**: `GET`
- **Path**: `/api/inventory/summary`
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "total_skus": 20,
      "low_stock_count": 2,
      "out_of_stock_count": 0
    }
  }
  ```

### 4.6 Trigger ERP-2 Purchase Request
- **Method**: `POST`
- **Path**: `/api/alerts/purchase-request`
- **Request Body**:
  ```json
  {
    "sku": "SKU-0003",
    "product_name": "65-inch OLED TV",
    "quantity": 17,
    "reason": "Automated replenishment for shortfall of 7"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "PR-0001",
      "sku": "SKU-0003",
      "quantity": 17,
      "requested_by": "ERP-1 low stock",
      "status": "pending"
    },
    "message": "Purchase request created successfully for SKU-0003"
  }
  ```
