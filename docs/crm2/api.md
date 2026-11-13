# API Specification — Team CRM-2 (Support & Warranty)

**Service**: `services/crm2` | **Base URL**: `http://localhost:5102`  
**Database**: PostgreSQL `crm2_db` (Port 5432)  
**Authentication**: Bearer JWT Token in `Authorization` header (`Bearer <token>`) verified via `services/_shared/auth.js`. In local development (`AUTH_REQUIRED=false`), defaults to user `{ id: 'USR-0001', name: 'System Administrator', role: 'admin', employee_id: 'EMP-0012' }`.  
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
    "team": "crm2",
    "name": "CRM-2 Support & Warranty",
    "port": 5102
  }
  ```

---

## 2. Customer Support Tickets Endpoints (CRM2-A1, CRM2-A3)

### 2.1 `GET /api/tickets`
Retrieves a filtered list of support tickets sorted newest first.
- **Access**: `admin`, `support`
- **Query Parameters**:
  - `status` (string, optional): Filter by `open` | `in_progress` | `resolved` | `closed`.
  - `priority` (string, optional): Filter by `low` | `medium` | `high`.
  - `customer_id` (string, optional): Filter by customer ID (e.g. `CUST-0001`).
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "TKT-0001",
        "customer_id": "CUST-0001",
        "customer_name": "Aarav Mehta",
        "serial_number": "TV55-2611-0001",
        "subject": "TV screen flickers",
        "description": "Screen flickers every few minutes after warm up.",
        "priority": "high",
        "status": "in_progress",
        "assigned_to": "EMP-0005",
        "created_at": "2026-11-12T10:00:00.000Z",
        "due_at": "2026-11-12T14:00:00.000Z",
        "resolved_at": null
      }
    ]
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "status must be one of: open, in_progress, resolved, closed" }`

### 2.2 `GET /api/tickets/:id`
Retrieves single ticket details by ID.
- **Access**: `admin`, `support`
- **Parameters**: `id` (e.g. `TKT-0001`)
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "TKT-0001",
      "customer_id": "CUST-0001",
      "customer_name": "Aarav Mehta",
      "serial_number": "TV55-2611-0001",
      "subject": "TV screen flickers",
      "description": "Screen flickers every few minutes after warm up.",
      "priority": "high",
      "status": "in_progress",
      "assigned_to": "EMP-0005",
      "created_at": "2026-11-12T10:00:00.000Z",
      "due_at": "2026-11-12T14:00:00.000Z",
      "resolved_at": null
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: `{ "error": "Ticket 'TKT-9999' not found" }`

### 2.3 `POST /api/tickets`
Creates a new customer support ticket. Automatically calculates SLA due date (`created_at` + 4h for high, 24h for medium, 72h for low priority). Emits side-effect event to CRM-3 timeline `POST /api/interactions/from-event`.
- **Access**: `admin`, `support`
- **Request Body**:
  ```json
  {
    "customer_id": "CUST-0001",
    "customer_name": "Aarav Mehta",
    "serial_number": "TV55-2611-0001",
    "subject": "TV screen flickers",
    "description": "Screen flickers after 10 minutes of use.",
    "priority": "high",
    "assigned_to": "EMP-0005"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "TKT-0007",
      "customer_id": "CUST-0001",
      "customer_name": "Aarav Mehta",
      "serial_number": "TV55-2611-0001",
      "subject": "TV screen flickers",
      "description": "Screen flickers after 10 minutes of use.",
      "priority": "high",
      "status": "open",
      "assigned_to": "EMP-0005",
      "created_at": "2026-11-12T14:00:00.000Z",
      "due_at": "2026-11-12T18:00:00.000Z",
      "resolved_at": null
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "subject is required" }`

### 2.4 `PUT /api/tickets/:id`
Updates ticket metadata, priority, or assignee.
- **Access**: `admin`, `support`
- **Request Body**:
  ```json
  {
    "subject": "TV screen flickers severely",
    "priority": "high",
    "assigned_to": "EMP-0006"
  }
  ```
- **Success Response (200 OK)**: Returns updated ticket object.

### 2.5 `PATCH /api/tickets/:id/status`
Updates ticket lifecycle state. When changing to `resolved`, automatically sets `resolved_at = now()`.
- **Access**: `admin`, `support`
- **Request Body**:
  ```json
  {
    "status": "resolved"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "TKT-0001",
      "status": "resolved",
      "resolved_at": "2026-11-12T15:30:00.000Z"
    }
  }
  ```

### 2.6 `GET /api/tickets/overdue`
Lists all unresolved tickets where `now() > due_at` (SLA breach).
- **Access**: `admin`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "TKT-0002",
        "subject": "No sound from HDMI input",
        "priority": "medium",
        "due_at": "2026-11-11T12:00:00.000Z",
        "overdue_hours": 18.5
      }
    ]
  }
  ```

### 2.7 `GET /api/tickets/:id/comments`
Retrieves internal notes and comments for a ticket ordered chronologically.
- **Access**: `admin`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "CMT-0001",
        "ticket_id": "TKT-0001",
        "author": "System Administrator",
        "text": "Customer confirmed the flicker starts after about 10 minutes.",
        "created_at": "2026-11-12T11:00:00.000Z"
      }
    ]
  }
  ```

### 2.8 `POST /api/tickets/:id/comments`
Appends a support comment to the ticket. Author is automatically taken from `req.user.name`.
- **Access**: `admin`, `support`
- **Request Body**:
  ```json
  {
    "text": "Engineer visited site and requested backlight replacement panel."
  }
  ```
- **Success Response (201 Created)**: Returns created comment object.

---

## 3. Warranty Registration & Verification Endpoints (CRM2-B1, CRM2-B3)

### 3.1 `GET /api/warranties`
Lists all registered serial warranties with SKU and customer references.
- **Access**: `admin`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "serial_number": "TV55-2611-0001",
        "sku": "SKU-0001",
        "product_name": "55-inch 4K Smart TV",
        "customer_id": "CUST-0001",
        "purchase_date": "2026-08-12",
        "warranty_months": 12,
        "created_at": "2026-11-01T00:00:00.000Z"
      }
    ]
  }
  ```

### 3.2 `GET /api/warranty/:serial`
Looks up warranty by serial number. Dynamically computes `expires_on` date and `status` (`active` or `expired`) against the current system date.
- **Access**: `admin`, `support`
- **Parameters**: `serial` (e.g. `TV55-2611-0001`)
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "serial_number": "TV55-2611-0001",
      "sku": "SKU-0001",
      "product_name": "55-inch 4K Smart TV",
      "customer_id": "CUST-0001",
      "purchase_date": "2026-08-12",
      "warranty_months": 12,
      "expires_on": "2027-08-12",
      "status": "active"
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: `{ "error": "Warranty for serial 'TV55-2611-9999' not found" }`

### 3.3 `POST /api/warranties`
Registers a new product warranty manually.
- **Access**: `admin`, `support`
- **Request Body**:
  ```json
  {
    "serial_number": "TV55-2611-0006",
    "sku": "SKU-0001",
    "product_name": "55-inch 4K Smart TV",
    "customer_id": "CUST-0006",
    "purchase_date": "2026-11-12",
    "warranty_months": 12
  }
  ```
- **Success Response (201 Created)**: Returns created warranty record.

### 3.4 `POST /api/warranty/sync`
Batch synchronization of new warranties from ERP-4 dispatch records (`callService('erp4', '/api/dispatches')`). Inserts only newly discovered serials.
- **Access**: `admin`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "added": 3,
      "skipped": 5,
      "total_processed": 8
    }
  }
  ```

---

## 4. Product Return Merchandise Authorization (RMA) Endpoints (CRM2-C1, CRM2-C3)

### 4.1 `GET /api/rmas`
Lists all RMA requests, ordered newest first, with optional status filter.
- **Access**: `admin`, `support`
- **Query Parameters**:
  - `status` (string, optional): `requested` | `approved` | `rejected` | `received` | `closed`.
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "RMA-0001",
        "ticket_id": "TKT-0001",
        "serial_number": "TV55-2611-0001",
        "reason": "Screen flickers after warm-up. Customer wants a full unit replacement.",
        "status": "requested",
        "outcome": null,
        "requested_at": "2026-11-12T11:00:00.000Z",
        "decided_at": null
      }
    ]
  }
  ```

### 4.2 `GET /api/rmas/:id`
Retrieves RMA details by ID.
- **Access**: `admin`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "RMA-0002",
      "ticket_id": "TKT-0002",
      "serial_number": "TV55-2611-0002",
      "reason": "No audio on HDMI input. Part repair is not feasible per engineer report.",
      "status": "approved",
      "outcome": "repair",
      "requested_at": "2026-11-11T14:00:00.000Z",
      "decided_at": "2026-11-11T19:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: `{ "error": "RMA 'RMA-9999' not found" }`

### 4.3 `POST /api/rmas`
Submits a new RMA request. Enforces warranty rule: serial number must exist in warranties and be active (CRM2-C3 rule).
- **Access**: `admin`, `support`
- **Request Body**:
  ```json
  {
    "ticket_id": "TKT-0001",
    "serial_number": "TV55-2611-0001",
    "reason": "Screen flickers after warm-up."
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "data": {
      "id": "RMA-0004",
      "ticket_id": "TKT-0001",
      "serial_number": "TV55-2611-0001",
      "reason": "Screen flickers after warm-up.",
      "status": "requested",
      "outcome": null,
      "requested_at": "2026-11-12T15:00:00.000Z",
      "decided_at": null
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "ticket_id is required" }`
  - `400 Bad Request` (CRM2-C3): `{ "error": "Product serial TV55-2611-0004 is out of warranty; cannot request RMA" }`

### 4.4 `PUT /api/rmas/:id`
Modifies an existing RMA record.
- **Access**: `admin`, `support`
- **Request Body**:
  ```json
  {
    "reason": "Updated diagnostic reason from senior engineer.",
    "status": "requested"
  }
  ```
- **Success Response (200 OK)**: Returns updated RMA object.

### 4.5 `DELETE /api/rmas/:id`
Deletes an RMA request.
- **Access**: `admin`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "message": "RMA deleted successfully",
      "id": "RMA-0004"
    }
  }
  ```

### 4.6 `PATCH /api/rmas/:id/decision`
Records the formal decision on an RMA. Approving strictly requires an outcome (`restock`, `repair`, or `credit_note`). Automatically sets `decided_at = now()`. (CRM2-C3 integration handoff: approved status invokes ERP-4 `POST /api/returns/from-rma` and CRM-3 `POST /api/interactions/from-event`).
- **Access**: `admin`, `support`
- **Request Body**:
  ```json
  {
    "status": "approved",
    "outcome": "repair"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "RMA-0001",
      "status": "approved",
      "outcome": "repair",
      "decided_at": "2026-11-12T15:45:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "status must be either 'approved' or 'rejected'" }`
  - `400 Bad Request`: `{ "error": "Outcome is required when approving an RMA and must be one of: restock, repair, credit_note" }`
  - `404 Not Found`: `{ "error": "RMA 'RMA-9999' not found" }`

---

## 5. Service Centres & Ticket Assignment Endpoints (CRM2-D1)

### 5.1 `GET /api/centres`
Lists all electronics service & repair centres across regional cities.
- **Access**: `admin`, `support`
- **Query Parameters**:
  - `active` (boolean, optional): `true` | `false`
- **Success Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "SC-0001",
        "name": "Mumbai Central Electronics Care",
        "city": "Mumbai",
        "phone": "+91 22 2490 1100",
        "capacity": 50,
        "active": true
      }
    ]
  }
  ```

### 5.2 `GET /api/centres/:id`
Retrieves service centre record by ID.
- **Access**: `admin`, `support`
- **Success Response (200 OK)**: Returns single service centre object.
- **Error Responses**:
  - `404 Not Found`: `{ "error": "Service centre 'SC-9999' not found" }`

### 5.3 `POST /api/centres`
Creates a new authorized repair centre.
- **Access**: `admin`
- **Request Body**:
  ```json
  {
    "name": "Chennai Anna Nagar Repair Plaza",
    "city": "Chennai",
    "phone": "+91 44 2621 1100",
    "capacity": 35,
    "active": true
  }
  ```
- **Success Response (201 Created)**: Returns created service centre.

### 5.4 `PUT /api/centres/:id`
Updates capacity, contact information, or active status of a service centre.
- **Access**: `admin`
- **Request Body**:
  ```json
  {
    "capacity": 60,
    "active": true
  }
  ```
- **Success Response (200 OK)**: Returns updated service centre object.

### 5.5 `POST /api/assignments`
Assigns a ticket to a service centre. Replaces earlier assignment if the ticket was already assigned.
- **Access**: `admin`, `support`
- **Request Body**:
  ```json
  {
    "ticket_id": "TKT-0001",
    "centre_id": "SC-0001"
  }
  ```
- **Success Response (201 Created / 200 OK)**:
  ```json
  {
    "data": {
      "id": "ASG-0001",
      "ticket_id": "TKT-0001",
      "centre_id": "SC-0001",
      "assigned_at": "2026-11-12T16:00:00.000Z"
    }
  }
  ```

### 5.6 `GET /api/assignments`
Retrieves ticket-to-centre assignments with optional `?ticket_id=` filter.
- **Access**: `admin`, `support`
- **Success Response (200 OK)**: Returns array of ticket assignments.

---

## 6. Support Reports & Operational Metrics (CRM2-D3)

### 6.1 `GET /api/reports/tickets-summary`
Aggregates ticket analytics including volume by status, priority breakdown, average resolution time, overdue counts, and assignment distribution per service centre.
- **Access**: `admin`, `support`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "by_status": {
        "open": 3,
        "in_progress": 1,
        "resolved": 1,
        "closed": 1
      },
      "by_priority": {
        "high": 2,
        "medium": 2,
        "low": 2
      },
      "total_tickets": 6,
      "overdue_count": 3,
      "avg_resolution_hours": 24.5,
      "by_centre": [
        { "centre_id": "SC-0001", "centre_name": "Mumbai Central Electronics Care", "ticket_count": 1 },
        { "centre_id": "SC-0002", "centre_name": "Pune Deccan Repair Hub", "ticket_count": 1 },
        { "centre_id": "SC-0004", "centre_name": "Bengaluru Koramangala Tech Care", "ticket_count": 1 }
      ]
    }
  }
  ```
