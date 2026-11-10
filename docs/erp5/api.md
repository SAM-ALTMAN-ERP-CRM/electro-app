# API Specification — Team ERP-5 (Finance, Access & App Shell)

**Service**: `services/erp5` | **Base URL**: `http://localhost:5205`  
**Database**: `erp5_db` (Port 5432)  
**Authentication**: Bearer JWT Token in `Authorization` header (`Bearer <token>`)

---

## 1. Authentication & Session Endpoints

### 1.1 `POST /api/auth/login`
Authenticates a user and returns a signed JWT token.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "finance@demo.com",
    "password": "password123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "USR-0005",
      "name": "Finance Manager",
      "email": "finance@demo.com",
      "role": "finance",
      "employee_id": "EMP-0010"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Email and password are required" }`
  - `401 Unauthorized`: `{ "error": "Invalid email or password" }`

### 1.2 `GET /api/auth/me`
Retrieves current authenticated user's profile from the active JWT token.
- **Access**: Requires Authentication
- **Success Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "USR-0005",
      "name": "Finance Manager",
      "email": "finance@demo.com",
      "role": "finance"
    }
  }
  ```

---

## 2. Invoices & Billing Endpoints

### 2.1 `GET /api/invoices`
Lists all GST tax invoices with optional customer and status filters.
- **Access**: `admin`, `finance`
- **Query Parameters**:
  - `customer_id` (string, optional): e.g. `CUST-0001`
  - `status` (string, optional): `unpaid` | `partially_paid` | `paid`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "INV-0001",
        "so_id": "SO-0001",
        "customer_id": "CUST-0001",
        "customer_name": "Aarav Mehta",
        "invoice_date": "2026-11-01",
        "due_date": "2026-11-16",
        "subtotal": "9998.00",
        "cgst": "899.82",
        "sgst": "899.82",
        "total": "11797.64",
        "status": "unpaid"
      }
    ]
  }
  ```

### 2.2 `GET /api/invoices/:id`
Retrieves single invoice details including all line items.
- **Access**: `admin`, `finance`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "INV-0001",
      "customer_id": "CUST-0001",
      "customer_name": "Aarav Mehta",
      "total": "11797.64",
      "items": [
        {
          "id": "ITM-0001",
          "sku": "SKU-0001",
          "description": "Wireless Noise-Canceling Headphones",
          "quantity": 2,
          "unit_price": "4999.00",
          "tax_rate": "18.00"
        }
      ]
    }
  }
  ```

### 2.3 `POST /api/invoices`
Creates a new tax invoice and triggers the automated General Ledger double-entry posting.
- **Access**: `admin`, `finance`
- **Request Body**:
  ```json
  {
    "customer_id": "CUST-0003",
    "customer_name": "Priya Nair",
    "sales_rep_id": "EMP-0001",
    "items": [
      {
        "sku": "SKU-0004",
        "description": "USB-C Fast Charger 65W",
        "quantity": 4,
        "unit_price": 1499.00
      }
    ]
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "INV-0006",
      "subtotal": "5996.00",
      "cgst": "539.64",
      "sgst": "539.64",
      "total": "7075.28",
      "status": "unpaid"
    }
  }
  ```

---

## 3. Credit Notes Endpoints

### 3.1 `GET /api/creditnotes`
Lists all issued credit notes.
- **Access**: `admin`, `finance`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "CN-0001",
        "so_id": "SO-0001",
        "invoice_id": "INV-0001",
        "serial_number": "SN-0001",
        "amount": "1000.00",
        "created_at": "2026-11-02T10:00:00Z"
      }
    ]
  }
  ```

### 3.2 `POST /api/creditnotes`
Issues a credit note for a returned serial number.
- **Access**: `admin`, `finance`
- **Request Body**:
  ```json
  {
    "so_id": "SO-0001",
    "invoice_id": "INV-0001",
    "serial_number": "SN-0002",
    "amount": 2999.00
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "CN-0003",
      "so_id": "SO-0001",
      "serial_number": "SN-0002",
      "amount": "2999.00"
    }
  }
  ```

---

## 4. Payments Endpoints

### 4.1 `POST /api/payments`
Records customer payment against an invoice and updates its payment status.
- **Access**: `admin`, `finance`
- **Request Body**:
  ```json
  {
    "invoice_id": "INV-0001",
    "amount": 11797.64,
    "method": "upi",
    "reference": "UPI-TXN-987654"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "PAY-0002",
      "invoice_id": "INV-0001",
      "amount": "11797.64",
      "method": "upi",
      "reference": "UPI-TXN-987654"
    }
  }
  ```

---

## 5. General Ledger Endpoints

### 5.1 `GET /api/ledger`
Retrieves double-entry records with optional account and date filtering.
- **Access**: `admin`, `finance`
- **Query Parameters**:
  - `account`: `sales` | `receivables` | `cash` | `purchases` | `salary_expense`
  - `from` (YYYY-MM-DD)
  - `to` (YYYY-MM-DD)
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "LE-0001",
        "entry_date": "2026-11-01",
        "account": "receivables",
        "debit": "59000.00",
        "credit": "0.00",
        "reference": "INV-0001",
        "description": "Invoice INV-0001 for CUST-0001"
      }
    ]
  }
  ```

### 5.2 `POST /api/ledger`
Records a single manual ledger entry.
- **Access**: `admin`, `finance`
- **Request Body**:
  ```json
  {
    "entry_date": "2026-11-09",
    "account": "cash",
    "debit": 1500.00,
    "credit": 0.00,
    "reference": "MAN-001",
    "description": "Petty cash adjustment"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "LE-0007",
      "account": "cash",
      "debit": "1500.00",
      "credit": "0.00"
    }
  }
  ```

### 5.3 `POST /api/ledger/auto`
Automated double-entry balanced pair creator. Idempotent on retry with same type and reference.
- **Access**: `admin`, `finance`
- **Request Body**:
  ```json
  {
    "type": "invoice",
    "reference": "INV-0003",
    "amount": 7075.28,
    "description": "Invoice for CUST-0003"
  }
  ```
- **Success Response (201 Created or 200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "LE-0008",
        "account": "receivables",
        "debit": "7075.28",
        "credit": "0.00",
        "reference": "INV-0003"
      },
      {
        "id": "LE-0009",
        "account": "sales",
        "debit": "0.00",
        "credit": "7075.28",
        "reference": "INV-0003"
      }
    ]
  }
  ```

---

## 6. Financial Reports Endpoints

### 6.1 `GET /api/reports/summary`
Calculates KPI summary metrics directly from ledger entries.
- **Access**: `admin`, `finance`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "total_sales": "88500.00",
      "total_received": "59000.00",
      "outstanding": "29500.00",
      "cash_balance": "59000.00"
    }
  }
  ```

### 6.2 `GET /api/reports/monthly-sales`
Returns monthly aggregated sales figures.
- **Access**: `admin`, `finance`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "month": "2026-11",
        "amount": "88500.00"
      }
    ]
  }
  ```
