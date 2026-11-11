# API Specification — Team CRM-3 (Customer 360)

**Service**: `services/crm3` | **Base URL**: `http://localhost:5103`  
**Database**: PostgreSQL `crm3_db` (Port 5432)  
**Authentication**: Bearer JWT Token in `Authorization` header (`Bearer <token>`) verified via `services/_shared/auth.js`  
**Standard Response Formats**: JSON payload wrapped in `{ "data": ... }` on success, or `{ "error": "..." }` on error.

---

## 1. System & Health Endpoints

### 1.1 `GET /api/health`
Service health check and metadata probe.
- **Access**: Public
- **Success Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "team": "crm3",
    "name": "CRM-3 Customer 360",
    "port": 5103
  }
  ```

---

## 2. Customer Master Directory Endpoints (CRM3-A1, CRM3-A3)

### 2.1 `GET /api/customers`
Retrieves a paginated/filtered list of customer master records.
- **Access**: `admin`, `sales`, `support`
- **Query Parameters**:
  - `q` (string, optional): Keyword query matched against `name`, `email`, `phone`, or `city`.
  - `type` (string, optional): Filter by archetype: `retail` | `corporate` | `dealer`.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "CUST-0001",
        "name": "Aarav Mehta",
        "type": "retail",
        "email": "aarav.mehta@example.com",
        "phone": "9820011111",
        "gstin": null,
        "billing_address": "12 Linking Road, Bandra West",
        "shipping_address": "12 Linking Road, Bandra West",
        "city": "Mumbai",
        "created_at": "2026-11-01T10:00:00.000Z"
      },
      {
        "id": "CUST-0002",
        "name": "Sunrise Electronics Pvt Ltd",
        "type": "corporate",
        "email": "contact@sunrise.com",
        "phone": "9820022222",
        "gstin": "27AABCS1234F1Z5",
        "billing_address": "88 Nariman Point, Express Towers",
        "shipping_address": "Plot 42 MIDC Andheri East",
        "city": "Mumbai",
        "created_at": "2026-11-01T10:05:00.000Z"
      }
    ]
  }
  ```

### 2.2 `GET /api/customers/:id`
Retrieves single customer master record by ID (including GSTIN and associated tags). Used by downstream services: ERP-4, ERP-5, CRM-5.
- **Access**: `admin`, `sales`, `support`
- **Parameters**: `id` (e.g. `CUST-0001`)
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "CUST-0002",
      "name": "Sunrise Electronics Pvt Ltd",
      "type": "corporate",
      "email": "contact@sunrise.com",
      "phone": "9820022222",
      "gstin": "27AABCS1234F1Z5",
      "billing_address": "88 Nariman Point, Express Towers",
      "shipping_address": "Plot 42 MIDC Andheri East",
      "city": "Mumbai",
      "tags": ["Corporate", "Tier-1"],
      "created_at": "2026-11-01T10:05:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: `{ "error": "Customer with ID 'CUST-9999' not found" }`

### 2.3 `POST /api/customers`
Creates a new customer master entry adhering to CRM3-A3 domain validation rules.
- **Access**: `admin`, `sales`
- **Validation Rules**:
  - `name`: Required, non-empty string.
  - `type`: Required, must be one of `retail`, `corporate`, `dealer`.
  - `phone`: Required, exactly 10 numeric digits (`^\d{10}$`).
  - `email`: Required, valid email format (`^[^\s@]+@[^\s@]+\.[^\s@]+$`). Must be unique across all existing customer records (returns `409 Conflict` on duplicate).
  - `gstin`: Required and exactly 15 alphanumeric characters for `corporate` and `dealer` customer types; optional for `retail`.
- **Request Body**:
  ```json
  {
    "name": "TechCore Solutions Ltd",
    "type": "corporate",
    "email": "info@techcore.com",
    "phone": "9821045678",
    "gstin": "27AABCT5678K1Z3",
    "billing_address": "501 Raheja Towers, BKC",
    "shipping_address": "501 Raheja Towers, BKC",
    "city": "Mumbai"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "CUST-0011",
      "name": "TechCore Solutions Ltd",
      "type": "corporate",
      "email": "info@techcore.com",
      "phone": "9821045678",
      "gstin": "27AABCT5678K1Z3",
      "billing_address": "501 Raheja Towers, BKC",
      "shipping_address": "501 Raheja Towers, BKC",
      "city": "Mumbai",
      "created_at": "2026-11-11T12:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Phone number must be exactly 10 digits" }`
  - `400 Bad Request`: `{ "error": "GSTIN is required for corporate/dealer customer type" }`
  - `409 Conflict`: `{ "error": "Customer with email 'info@techcore.com' already exists", "conflict_id": "CUST-0005" }`

### 2.4 `PUT /api/customers/:id`
Updates existing customer master record with full validation.
- **Access**: `admin`, `sales`
- **Parameters**: `id` (e.g. `CUST-0001`)
- **Request Body**: Fields to update (e.g. `billing_address`, `phone`, `city`).
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "CUST-0001",
      "name": "Aarav Mehta",
      "type": "retail",
      "email": "aarav.mehta@example.com",
      "phone": "9820011111",
      "gstin": null,
      "billing_address": "15 Linking Road, Bandra West",
      "shipping_address": "15 Linking Road, Bandra West",
      "city": "Mumbai",
      "created_at": "2026-11-01T10:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Validation failure.
  - `404 Not Found`: Customer does not exist.
  - `409 Conflict`: Updated email already belongs to a different customer.

### 2.5 `DELETE /api/customers/:id`
Deletes customer record from database.
- **Access**: `admin`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "message": "Customer CUST-0011 deleted successfully",
      "id": "CUST-0011"
    }
  }
  ```

### 2.6 `POST /api/customers/validate`
Dry-run client validation endpoint without database modification.
- **Access**: `admin`, `sales`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "valid": true
  }
  ```

---

## 3. Customer Contacts Endpoints (CRM3-A1)

### 3.1 `GET /api/customers/:id/contacts`
Retrieves all contact persons linked to customer `:id`.
- **Access**: `admin`, `sales`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "CON-0001",
        "customer_id": "CUST-0001",
        "name": "Aarav Mehta",
        "phone": "9820011111",
        "email": "aarav.mehta@example.com",
        "designation": "Primary Contact",
        "created_at": "2026-11-01T10:00:00.000Z"
      }
    ]
  }
  ```

### 3.2 `POST /api/customers/:id/contacts`
Adds a new contact person to customer `:id`.
- **Access**: `admin`, `sales`
- **Request Body**:
  ```json
  {
    "name": "Rohan Deshmukh",
    "phone": "9820022299",
    "email": "rohan@sunrise.com",
    "designation": "Procurement Lead"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "CON-0015",
      "customer_id": "CUST-0002",
      "name": "Rohan Deshmukh",
      "phone": "9820022299",
      "email": "rohan@sunrise.com",
      "designation": "Procurement Lead",
      "created_at": "2026-11-11T12:00:00.000Z"
    }
  }
  ```

---

## 4. Interactions & Unified Event Timeline Endpoints (CRM3-B1, CRM3-B3)

### 4.1 `GET /api/customers/:id/interactions`
Retrieves chronological timeline feed for customer `:id`, sorted newest first.
- **Access**: `admin`, `sales`, `support`
- **Query Parameters**:
  - `type` (string, optional): Filter by `call`, `email`, `meeting`, `ticket`, `order`, `note`.
  - `from` (string, optional): ISO date or `YYYY-MM-DD`.
  - `to` (string, optional): ISO date or `YYYY-MM-DD`.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "INT-0005",
        "customer_id": "CUST-0001",
        "type": "order",
        "summary": "Order SO-0001 dispatched via BlueDart (AWB #BD-9021)",
        "source_team": "erp4",
        "created_by": "EMP-0005",
        "created_at": "2026-11-04T14:30:00.000Z"
      },
      {
        "id": "INT-0001",
        "customer_id": "CUST-0001",
        "type": "call",
        "summary": "Initial introduction call with retail lead",
        "source_team": "crm1",
        "created_by": "EMP-0001",
        "created_at": "2026-11-01T10:30:00.000Z"
      }
    ]
  }
  ```

### 4.2 `POST /api/interactions`
Creates a manual interaction or note on customer timeline.
- **Access**: `admin`, `sales`, `support`
- **Request Body**:
  ```json
  {
    "customer_id": "CUST-0001",
    "type": "meeting",
    "summary": "Demonstrated induction cooktop line; customer requested quote.",
    "source_team": "crm3"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "INT-0012",
      "customer_id": "CUST-0001",
      "type": "meeting",
      "summary": "Demonstrated induction cooktop line; customer requested quote.",
      "source_team": "crm3",
      "created_by": "EMP-0001",
      "created_at": "2026-11-11T12:00:00.000Z"
    }
  }
  ```

### 4.3 `POST /api/interactions/from-event` (Cross-Team Event Ingestion)
Ingests timeline events generated by other modules (`CRM1-C3`, `CRM2-A1`, `CRM2-C3`, `CRM4-A3`, `ERP4-C3`).
- **Access**: Internal Microservice Call (authenticated)
- **Duplicate Policy**: Exact duplicate events (matching `customer_id`, `type`, `summary`, and `source_team`) sent within a 60-second sliding window are suppressed and return `201 Created` with a note indicating duplicate suppression.
- **Request Body**:
  ```json
  {
    "customer_id": "CUST-0001",
    "type": "order",
    "summary": "Order SO-0001 dispatched",
    "source_team": "erp4"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "INT-0013",
      "customer_id": "CUST-0001",
      "type": "order",
      "summary": "Order SO-0001 dispatched",
      "source_team": "erp4",
      "created_by": "erp4",
      "created_at": "2026-11-11T12:05:00.000Z"
    }
  }
  ```
- **Duplicate Suppression Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "INT-0013",
      "customer_id": "CUST-0001",
      "type": "order",
      "summary": "Order SO-0001 dispatched",
      "source_team": "erp4",
      "note": "Duplicate event within sliding window ignored"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "customer_id is required" }`
  - `400 Bad Request`: `{ "error": "Invalid type 'invoice'. Allowed types: call, email, meeting, ticket, order, note" }`

---

## 5. Audience Segments & CSV Export Endpoints (CRM3-C1, CRM3-C3)

### 5.1 `GET /api/segments`
Lists all segment definition rules.
- **Access**: `admin`, `sales`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "SEG-0001",
        "name": "Corporate in Mumbai",
        "customer_type": "corporate",
        "city": "Mumbai",
        "created_at": "2026-11-01T10:00:00.000Z"
      },
      {
        "id": "SEG-0002",
        "name": "Dealers in Pune",
        "customer_type": "dealer",
        "city": "Pune",
        "created_at": "2026-11-01T10:00:00.000Z"
      }
    ]
  }
  ```

### 5.2 `GET /api/segments/:id/customers`
Evaluates segment criteria against customer master and returns matching customer list. Used by CRM-4 Marketing for audience targeting.
- **Access**: `admin`, `sales`
- **Success Response (200 OK for `SEG-0001`)**:
  ```json
  {
    "data": [
      {
        "id": "CUST-0002",
        "name": "Sunrise Electronics Pvt Ltd",
        "type": "corporate",
        "email": "contact@sunrise.com",
        "phone": "9820022222",
        "city": "Mumbai"
      }
    ]
  }
  ```

### 5.3 `POST /api/segments`
Creates a new customer segment definition.
- **Access**: `admin`, `sales`
- **Request Body**:
  ```json
  {
    "name": "Retail Customers in Kochi",
    "customer_type": "retail",
    "city": "Kochi"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "SEG-0005",
      "name": "Retail Customers in Kochi",
      "customer_type": "retail",
      "city": "Kochi",
      "created_at": "2026-11-11T12:00:00.000Z"
    }
  }
  ```

### 5.4 `GET /api/segments/:id/export.csv`
Streams segment audience directly as a downloadable CSV file.
- **Access**: `admin`, `sales`
- **Headers Returned**: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="segment_SEG-0001_customers.csv"`
- **Response Format**:
  ```csv
  name,email,phone,city
  "Sunrise Electronics Pvt Ltd","contact@sunrise.com","9820022222","Mumbai"
  ```

---

## 6. Customer Tags Endpoints (CRM3-C3)

### 6.1 `POST /api/customers/:id/tags`
Adds a tag chip to customer `:id`.
- **Access**: `admin`, `sales`
- **Request Body**: `{ "tag": "VIP" }`
- **Success Response (201 Created)**:
  ```json
  {
    "data": ["VIP", "Corporate"]
  }
  ```

### 6.2 `DELETE /api/customers/:id/tags/:tag`
Removes tag chip from customer `:id`.
- **Access**: `admin`, `sales`
- **Success Response (200 OK)**:
  ```json
  {
    "data": ["Corporate"]
  }
  ```

---

## 7. Duplicate Detection & Atomic Merge Endpoints (CRM3-D1)

### 7.1 `GET /api/customers/duplicates`
Detects duplicate customer clusters sharing identical email or phone numbers.
- **Access**: `admin`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "match_type": "phone",
        "matched_value": "9820011111",
        "customers": [
          {
            "id": "CUST-0001",
            "name": "Aarav Mehta",
            "phone": "9820011111",
            "email": "aarav.mehta@example.com"
          },
          {
            "id": "CUST-0009",
            "name": "Aarav Mehta (Duplicate)",
            "phone": "9820011111",
            "email": "aarav.duplicate@example.com"
          }
        ]
      },
      {
        "match_type": "email",
        "matched_value": "contact@sunrise.com",
        "customers": [
          {
            "id": "CUST-0002",
            "name": "Sunrise Electronics Pvt Ltd",
            "email": "contact@sunrise.com",
            "phone": "9820022222"
          },
          {
            "id": "CUST-0010",
            "name": "Sunrise Electronics (Branch)",
            "email": "contact@sunrise.com",
            "phone": "9820033333"
          }
        ]
      }
    ]
  }
  ```

### 7.2 `POST /api/customers/merge`
Executes an atomic database transaction merging `remove_id` into `keep_id`. Moves contacts, interactions, and unique tags, then deletes `remove_id`.
- **Access**: `admin`
- **Request Body**:
  ```json
  {
    "keep_id": "CUST-0001",
    "remove_id": "CUST-0009"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "message": "Customer CUST-0009 successfully merged into CUST-0001",
      "keep_id": "CUST-0001",
      "remove_id": "CUST-0009",
      "contacts_moved": 1,
      "interactions_moved": 2,
      "tags_moved": 0
    }
  }
  ```

---

## 8. High-Volume CSV Onboarding Endpoints (CRM3-D3)

### 8.1 `POST /api/customers/import`
Bulk ingestion endpoint receiving validated customer array parsed by browser.
- **Access**: `admin`, `sales`
- **Request Body**:
  ```json
  {
    "customers": [
      {
        "name": "Apex Appliances",
        "type": "dealer",
        "email": "contact@apex.com",
        "phone": "9820088888",
        "gstin": "27AABCA8888F1Z4",
        "billing_address": "Shop 12 Lamington Road",
        "city": "Mumbai"
      },
      {
        "name": "Invalid Row",
        "type": "retail",
        "email": "bad-email",
        "phone": "123"
      }
    ]
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "inserted": 1,
      "skipped": 1,
      "errors": [
        {
          "index": 1,
          "name": "Invalid Row",
          "error": "Phone number must be exactly 10 digits; Invalid email format"
        }
      ]
    }
  }
  ```

---

## 9. Cross-Team Integration Contract Matrix (Section 7 Rows)

| Row | Caller Issue | Caller Team | Target Endpoint | CRM-3 Provider Issue | Request Payload Example | Response Example |
| :---: | :---: | :---: | :--- | :---: | :--- | :--- |
| **4** | `CRM1-C3`<br/>`CRM2-A1`<br/>`CRM2-C3`<br/>`CRM4-A3`<br/>`ERP4-C3` | CRM-1<br/>CRM-2<br/>CRM-4<br/>ERP-4 | `POST /api/interactions/from-event` | `CRM3-B3` | `{"customer_id":"CUST-0001","type":"order","summary":"SO-0001 dispatched","source_team":"erp4"}` | `201 Created`<br/>`{"data":{"id":"INT-0013",...}}` |
| **8** | `CRM4-A2`<br/>`CRM4-A3`<br/>`CRM4-B3` | CRM-4 (Marketing) | `GET /api/segments`<br/>`GET /api/segments/:id/customers` | `CRM3-C1` | None | `200 OK`<br/>`{"data":[{"id":"CUST-0002",...}]}` |
| **10** | `CRM5-A1`<br/>`CRM5-A3` | CRM-5 (Portal) | `GET /api/customers` | `CRM3-A1` | None | `200 OK`<br/>`{"data":[{"id":"CUST-0001",...}]}` |
| **12** | `CRM5-D1` | CRM-5 (Portal) | `GET /api/customers/:id` | `CRM3-A1` | Path param `:id` | `200 OK`<br/>`{"data":{"id":"CUST-0001",...}}` |
| **19** | `ERP4-A3`<br/>`ERP5-A1` | ERP-4 (Orders)<br/>ERP-5 (Invoices) | `GET /api/customers/:id` | `CRM3-A1` | Path param `:id` | `200 OK`<br/>`{"data":{"id":"CUST-0001","gstin":null,...}}` |
