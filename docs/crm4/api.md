# CRM-4 Marketing & Engagement API Specification

> **Service**: `services/crm4`  
> **Port**: `5104`  
> **Database**: `crm4_db`  
> **Default Route Prefix**: `/api`  
> **Authentication**: Bearer JWT (`requireAuth`)  
> **Authorized Roles**: `admin`, `sales`

---

## 1. General API & Protocol Standards

### 1.1 Response Envelope Format
All endpoints return standard REST JSON payloads adhering to Section 5:

**Success Response (`200 OK` or `201 Created`)**: `{ "data": ... }`
```json
{
  "data": ...
}
```

**Failure Response (`400`, `401`, `403`, `404`, `409`, `500`, `502`)**: `{ "error": "clear message" }`
```json
{
  "error": "Clear, descriptive explanation of the error"
}
```

### 1.2 HTTP Status Codes
| Status Code | Meaning | Usage |
| :--- | :--- | :--- |
| `200 OK` | Request Succeeded | Normal query, update, or deletion response |
| `201 Created` | Resource Created | Successful POST creation with entity ID |
| `400 Bad Request` | Input Validation Error | Missing required fields, invalid format, score > 10, etc. |
| `401 Unauthorized` | Missing / Invalid Token | Request sent without valid JWT Bearer header |
| `403 Forbidden` | Access Denied | User role does not meet required privileges |
| `404 Not Found` | Resource Missing | Non-existent entity ID queried |
| `409 Conflict` | State Conflict | Re-sending an already sent campaign or duplicate audience member |
| `500 Internal Server Error` | Unhandled Error | Unexpected server runtime exception |
| `502 Bad Gateway` | Upstream Unreachable | Required inter-service call failed when `USE_MOCKS=false` |

---

## 2. Health & Service Diagnostics

### `GET /api/health`
Returns service status and port binding. Does not require authentication.

**Response (`200 OK`)**:
```json
{
  "status": "ok",
  "team": "crm4",
  "name": "CRM-4 Marketing & Engagement",
  "port": 5104
}
```

---

## 3. Marketing Campaigns API (`[CRM4-A1]`, `[CRM4-A3]`)

### `GET /api/campaigns`
Lists all marketing campaigns with aggregated message dispatch counts.

- **Query Parameters**:
  - `status` (*optional*): Filter by status (`draft`, `scheduled`, `sent`).
  - `channel` (*optional*): Filter by channel (`email`, `whatsapp`, `sms`).
  - `segment_id` (*optional*): Filter by CRM-3 segment ID.

**Response (`200 OK`)**:
```json
{
  "data": [
    {
      "id": "CMP-0001",
      "name": "Diwali Festive Sale",
      "objective": "Drive festive season revenue with exclusive retail discounts",
      "channel": "email",
      "status": "sent",
      "segment_id": "SEG-0001",
      "template_id": "TPL-0002",
      "scheduled_at": "2026-10-25T10:00:00.000Z",
      "created_at": "2026-10-15T10:00:00.000Z",
      "message_count": 8
    }
  ]
}
```

### `GET /api/campaigns/:id`
Retrieves single campaign details.

**Response (`200 OK`)**:
```json
{
  "data": {
    "id": "CMP-0002",
    "name": "Smart LED TV Launch",
    "objective": "Introduce new 4K UHD smart televisions to corporate accounts",
    "channel": "whatsapp",
    "status": "scheduled",
    "segment_id": "SEG-0002",
    "template_id": "TPL-0001",
    "scheduled_at": "2026-11-20T11:00:00.000Z",
    "created_at": "2026-11-01T09:00:00.000Z",
    "message_count": 0
  }
}
```

### `POST /api/campaigns`
Creates a new campaign with auto-generated ID (`CMP-xxxx`).

**Request Body**:
```json
{
  "name": "Year-End Corporate Fleet Upgrade",
  "objective": "Promote commercial displays and AMC packages",
  "channel": "email",
  "status": "draft",
  "segment_id": "SEG-0002",
  "template_id": "TPL-0001",
  "scheduled_at": "2026-12-15T10:00:00.000Z"
}
```

**Response (`201 Created`)**:
```json
{
  "data": {
    "id": "CMP-0006",
    "name": "Year-End Corporate Fleet Upgrade",
    "objective": "Promote commercial displays and AMC packages",
    "channel": "email",
    "status": "draft",
    "segment_id": "SEG-0002",
    "template_id": "TPL-0001",
    "scheduled_at": "2026-12-15T10:00:00.000Z",
    "created_at": "2026-11-13T19:00:00.000Z",
    "message_count": 0
  }
}
```

### `PUT /api/campaigns/:id`
Updates campaign details.

**Request Body**:
```json
{
  "name": "Updated Campaign Title",
  "objective": "Updated objective details",
  "channel": "whatsapp",
  "status": "scheduled"
}
```

**Response (`200 OK`)**:
```json
{
  "data": {
    "id": "CMP-0003",
    "name": "Updated Campaign Title",
    "status": "scheduled"
  }
}
```

### `PATCH /api/campaigns/:id/status`
Transitions campaign status between `draft`, `scheduled`, and `sent`.

**Request Body**:
```json
{
  "status": "scheduled"
}
```

### `POST /api/campaigns/:id/send`
Executes simulated broadcast dispatch to segment customers.
1. Queries CRM-3 `GET /api/segments/:id/customers`.
2. Inserts message audit rows into `campaign_messages` (`MSG-xxxx`).
3. Updates campaign `status = 'sent'`.
4. Returns `409 Conflict` if campaign has already been sent.
5. Posts timeline event to CRM-3 `/api/interactions/from-event` in `try/catch`.

**Response (`200 OK`)**:
```json
{
  "data": {
    "campaign_id": "CMP-0002",
    "status": "sent",
    "count": 3,
    "messages": [
      {
        "id": "MSG-0009",
        "campaign_id": "CMP-0002",
        "customer_id": "CUST-0001",
        "status": "sent",
        "sent_at": "2026-11-13T19:00:00.000Z"
      }
    ]
  },
  "count": 3,
  "message": "Campaign CMP-0002 successfully sent to 3 customers"
}
```

**Error Response (`409 Conflict`)**:
```json
{
  "error": "Campaign 'CMP-0002' has already been sent"
}
```

### `GET /api/campaigns/:id/messages`
Retrieves all simulated messages dispatched for a campaign.

**Response (`200 OK`)**:
```json
{
  "data": [
    {
      "id": "MSG-0001",
      "campaign_id": "CMP-0001",
      "customer_id": "CUST-0001",
      "status": "sent",
      "sent_at": "2026-10-25T10:00:01.000Z"
    }
  ]
}
```

### `DELETE /api/campaigns/:id`
Deletes a campaign and cascades deletion to messages.

**Response (`200 OK`)**:
```json
{
  "data": {
    "id": "CMP-0006",
    "message": "Campaign 'CMP-0006' deleted successfully"
  }
}
```

---

## 4. Target Audiences & Members API (`[CRM4-B1]`, `[CRM4-B3]`)

### `GET /api/audiences`
Lists all audiences with aggregated `member_count` and `reachable_count`.

**Response (`200 OK`)**:
```json
{
  "data": [
    {
      "id": "AUD-0001",
      "name": "Festive Shoppers 2026",
      "description": "High-intent retail buyers for seasonal festive electronics promotions",
      "member_count": 8,
      "reachable_count": 7,
      "created_at": "2026-10-15T10:00:00.000Z"
    }
  ]
}
```

### `GET /api/audiences/:id`
Retrieves single audience details and member stats.

### `POST /api/audiences`
Creates a target audience with auto-generated ID (`AUD-xxxx`).

**Request Body**:
```json
{
  "name": "Commercial Kitchen Appliance Dealers",
  "description": "B2B dealers interested in microwave ovens and refrigerators"
}
```

**Response (`201 Created`)**:
```json
{
  "data": {
    "id": "AUD-0004",
    "name": "Commercial Kitchen Appliance Dealers",
    "description": "B2B dealers interested in microwave ovens and refrigerators",
    "member_count": 0,
    "reachable_count": 0,
    "created_at": "2026-11-13T19:00:00.000Z"
  }
}
```

### `PUT /api/audiences/:id`
Updates audience name or description.

### `DELETE /api/audiences/:id`
Deletes an audience and cascades deletion to all member records.

### `GET /api/audiences/:id/members`
Lists all members in an audience.

- **Query Parameters**:
  - `opted_out` (*optional*): Filter by `true` or `false`.

**Response (`200 OK`)**:
```json
{
  "data": [
    {
      "id": "MEM-0001",
      "audience_id": "AUD-0001",
      "customer_id": "CUST-0001",
      "name": "Aarav Mehta",
      "email": "aarav.mehta@example.com",
      "phone": "9820112345",
      "opted_out": false,
      "created_at": "2026-10-15T10:05:00.000Z"
    }
  ]
}
```

### `POST /api/audiences/:id/members`
Adds a member to an audience. Rejects duplicate customer in the same audience with `409 Conflict`.

**Request Body**:
```json
{
  "customer_id": "CUST-0005",
  "name": "Kiran Patel",
  "email": "kiran.patel@example.com",
  "phone": "9879156789"
}
```

**Response (`201 Created`)**:
```json
{
  "data": {
    "id": "MEM-0009",
    "audience_id": "AUD-0002",
    "customer_id": "CUST-0005",
    "name": "Kiran Patel",
    "email": "kiran.patel@example.com",
    "phone": "9879156789",
    "opted_out": false,
    "created_at": "2026-11-13T19:00:00.000Z"
  }
}
```

### `PATCH /api/audiences/:id/members/:member_id`
Updates member preferences (e.g. customer opt-out toggle). Accepts either member ID (`MEM-xxxx`) or customer ID (`CUST-xxxx`).

**Request Body**:
```json
{
  "opted_out": true
}
```

### `DELETE /api/audiences/:id/members/:member_id`
Removes a member from the target audience.

### `POST /api/audiences/:id/import-segment`
Bulk imports customer contacts from a CRM-3 segment, skipping duplicates.

**Request Body**:
```json
{
  "segment_id": "SEG-0001"
}
```

**Response (`200 OK`)**:
```json
{
  "data": {
    "message": "Import completed from SEG-0001",
    "imported": 2,
    "skipped": 6,
    "total": 8
  }
}
```

---

## 5. Message Templates & Renderer API (`[CRM4-C1]`, `[CRM4-C3]`)

### `GET /api/templates`
Lists message templates with optional channel filtering.

### `GET /api/templates/:id`
Retrieves a template by ID.

### `POST /api/templates`
Creates a message template with auto-generated ID (`TPL-xxxx`).

**Request Body**:
```json
{
  "name": "Warranty Renewal Reminder",
  "channel": "sms",
  "subject": null,
  "body": "Dear {{name}}, protect your {{product}} with our extended care plan: {{offer}}. Reply YES."
}
```

### `PUT /api/templates/:id`
Updates a template.

### `POST /api/templates/:id/render`
Renders template body and subject with provided placeholder variables `{name, product, offer}`.
- Replaces known placeholders (`{{name}}`, `{{product}}`, `{{offer}}`).
- Detects and returns warnings for unknown placeholders (e.g. `{{abc}}`).
- Rejects SMS exceeding 160 characters with `400 Bad Request`.

**Request Body**:
```json
{
  "name": "Aarav Mehta",
  "product": "55-inch OLED Smart TV",
  "offer": "15% Festive Cashback"
}
```

**Response (`200 OK`)**:
```json
{
  "data": {
    "template_id": "TPL-0001",
    "channel": "whatsapp",
    "rendered_subject": null,
    "rendered_body": "Hi Aarav Mehta! We are thrilled to introduce our newest 55-inch OLED Smart TV with an exclusive launch offer: 15% Festive Cashback. Order today at Electro App!",
    "character_count": 160,
    "warnings": []
  }
}
```

### `DELETE /api/templates/:id`
Deletes a template.

---

## 6. Enquiries & Lead Creation API (`[CRM4-B4]`)

### `GET /api/enquiries`
Lists recorded web and dealer enquiries.

### `GET /api/enquiries/:id`
Retrieves single enquiry details.

### `POST /api/enquiries`
Captures web/dealer enquiry and initiates cross-team lead creation in CRM-1 (`POST /api/leads`).

**Request Body**:
```json
{
  "name": "Rajiv Verma",
  "phone": "9820066666",
  "email": "rajiv.verma@example.com",
  "source": "web",
  "product_interest": "SKU-0001",
  "notes": "Interested in Diwali festive bundle discount"
}
```

**Response (`201 Created`)**:
```json
{
  "data": {
    "id": "ENQ-0006",
    "name": "Rajiv Verma",
    "phone": "9820066666",
    "email": "rajiv.verma@example.com",
    "source": "web",
    "product_interest": "SKU-0001",
    "lead_id": "LEAD-0006",
    "sales_rep_id": "EMP-0001",
    "notes": "Interested in Diwali festive bundle discount",
    "created_at": "2026-11-13T19:00:00.000Z"
  },
  "lead_id": "LEAD-0006"
}
```

---

## 7. Feedback Surveys & NPS Calculation API (`[CRM4-D1]`, `[CRM4-D3]`)

### `GET /api/surveys`
Lists surveys with response counts.

### `GET /api/surveys/:id`
Retrieves single survey details.

### `POST /api/surveys`
Creates a survey with auto-generated ID (`SRV-xxxx`). Type must be `nps` or `csat`.

### `PUT /api/surveys/:id`
Updates survey title or type.

### `DELETE /api/surveys/:id`
Deletes survey and cascades responses.

### `GET /api/surveys/:id/responses`
Lists all responses for a survey.

### `POST /api/surveys/:id/responses`
Records a customer survey score (0 to 10) and comment.

**Request Body**:
```json
{
  "customer_id": "CUST-0001",
  "score": 10,
  "comment": "Outstanding smart TV wall installation and technician demo!"
}
```

**Response (`201 Created`)**:
```json
{
  "data": {
    "id": "RES-0021",
    "survey_id": "SRV-0001",
    "customer_id": "CUST-0001",
    "score": 10,
    "comment": "Outstanding smart TV wall installation and technician demo!",
    "created_at": "2026-11-13T19:00:00.000Z"
  }
}
```

### `GET /api/surveys/:id/results`
Computes survey statistics and Net Promoter Score (NPS):
- **Promoters**: Score 9 to 10
- **Passives**: Score 7 to 8
- **Detractors**: Score 0 to 6
- **NPS Formula**: `% Promoters - % Detractors` (Range: -100 to +100)

**Response (`200 OK`)**:
```json
{
  "data": {
    "survey_id": "SRV-0001",
    "title": "Annual Product Experience NPS",
    "type": "nps",
    "total_responses": 10,
    "average_score": 8.3,
    "promoters": 6,
    "passives": 2,
    "detractors": 2,
    "nps": 40,
    "latest_comments": [
      {
        "customer_id": "CUST-0002",
        "score": 9,
        "comment": "Outstanding procurement support and prompt GST invoice generation.",
        "created_at": "2026-10-29T17:05:00.000Z"
      }
    ]
  }
}
```
