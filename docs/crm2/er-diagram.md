# CRM-2 Support & Warranty: ER diagram and data dictionary

Database `crm2_db` (PostgreSQL), owned by team CRM-2. Data owner: Ashutosh (CRM2-R2).

This file covers every CRM-2 table: the ER diagram in 3NF, a data dictionary, and notes on normalisation and links to other teams. Seed checks and the schema review log are in [seed-check.md](seed-check.md).

All six tables are on `main` (checked 12 Nov 2026, `c18721c`). CRM2-C3 and CRM2-D3 add no tables.

| Table | Created by | Owner | Merged in |
|---|---|---|---|
| `tickets` | CRM2-A1 (SLA in A3) | Ashutosh | #289, #291 |
| `ticket_comments` | CRM2-A3 | Ashutosh | #291 |
| `warranties` | CRM2-B1 | Zoha | #294 (B3, which contains B1) |
| `service_centres` | CRM2-D1 | Anant | #300 |
| `ticket_assignments` | CRM2-D1 | Anant | #300 |
| `rmas` | CRM2-C1 | Aditya Kumbhar | #330 |

---

## 1. ER diagram

Solid lines are real foreign keys in `schema.sql`. Dotted lines are logical links: the same ID is stored and checked by the API or the seed check, but there is no database constraint (C1 and D1 were built while the tickets table was still a mock, so `ticket_id` there is plain text).

```mermaid
erDiagram
    TICKETS ||--o{ TICKET_COMMENTS : "has"
    SERVICE_CENTRES ||--o{ TICKET_ASSIGNMENTS : "receives"
    TICKETS |o..o| TICKET_ASSIGNMENTS : "sent to one centre (logical)"
    TICKETS |o..o{ RMAS : "may raise (logical)"
    WARRANTIES |o..o{ TICKETS : "serial_number (logical)"
    WARRANTIES |o..o{ RMAS : "serial_number (logical, checked by C3)"

    TICKETS {
        text id PK "TKT-0001, sequence crm2_ticket_seq"
        text customer_id "CRM-3 customer, CUST-xxxx"
        text customer_name "copy of CRM-3 name, for display"
        text serial_number "nullable, TV55-2611-xxxx"
        text subject
        text description "nullable"
        text priority "low | medium | high, default medium"
        text status "open | in_progress | resolved | closed, default open"
        text assigned_to "nullable, ERP-6 engineer EMP-xxxx"
        timestamptz created_at "default now()"
        timestamptz due_at "SLA: created_at + 4/24/72 h"
        timestamptz resolved_at "set when status = resolved"
    }

    TICKET_COMMENTS {
        text id PK "CMT-0001, sequence crm2_comment_seq"
        text ticket_id FK "tickets.id"
        text author "logged-in user's name"
        text text
        timestamptz created_at "default now()"
    }

    WARRANTIES {
        text serial_number PK "TV55-2611-xxxx"
        text sku "ERP-1 product, SKU-xxxx"
        text product_name "copy of ERP-1 name, for display"
        text customer_id "CRM-3 customer, CUST-xxxx"
        date purchase_date
        integer warranty_months "default 12"
        timestamptz created_at "default now()"
    }

    SERVICE_CENTRES {
        text id PK "SC-0001, sequence crm2_centre_seq"
        text name
        text city
        text phone "nullable"
        int capacity "default 0, >= 0"
        boolean active "default true"
    }

    TICKET_ASSIGNMENTS {
        text id PK "ASG-0001, sequence crm2_assignment_seq"
        text ticket_id UK "TKT-xxxx, one row per ticket"
        text centre_id FK "service_centres.id"
        timestamptz assigned_at "default now()"
    }

    RMAS {
        text id PK "RMA-0001, sequence crm2_rma_seq"
        text ticket_id "TKT-xxxx"
        text serial_number "TV55-2611-xxxx, must be in warranty"
        text reason
        text status "requested | approved | rejected | received | closed"
        text outcome "nullable, restock | repair | credit_note"
        timestamptz requested_at "default now()"
        timestamptz decided_at "nullable"
    }
```

### Links to other teams (not foreign keys)

Each team has its own database, so these IDs are checked by the shared seed contract (Section 5), not by constraints.

| Column | Points to | Team |
|---|---|---|
| `tickets.customer_id`, `warranties.customer_id` | Customers `CUST-0001`..`CUST-0008` | CRM-3 |
| `tickets.assigned_to` | Service engineers `EMP-0005`..`EMP-0007` | ERP-6 |
| `warranties.sku` | Products, `SKU-0001` = 55-inch 4K Smart TV | ERP-1 |
| `warranties.serial_number` (synced by `POST /api/warranty/sync`, B3) | Dispatches `DSP-0001`..`DSP-0005` | ERP-4 |
| `rmas.id` (sent on approval, C3) | Returns created by `POST /api/returns/from-rma` | ERP-4 |

---

## 2. Data dictionary

### tickets (CRM2-A1, A3)

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | text | PK, default `'TKT-' + 4-digit crm2_ticket_seq` | Ticket number, e.g. `TKT-0001` |
| `customer_id` | text | not null; `CUST-0000` format checked by the API | Customer who raised the ticket (CRM-3) |
| `customer_name` | text | not null | Customer's name at the time of the ticket, for display |
| `serial_number` | text | nullable | Serial of the product the ticket is about |
| `subject` | text | not null | One-line summary of the problem |
| `description` | text | nullable | Full description |
| `priority` | text | not null, default `medium`, CHECK `low`/`medium`/`high` | Urgency; sets the SLA |
| `status` | text | not null, default `open`, CHECK `open`/`in_progress`/`resolved`/`closed` | Where the ticket is in its life cycle |
| `assigned_to` | text | nullable; `EMP-0000` format checked by the API | Service engineer working on it (ERP-6) |
| `created_at` | timestamptz | not null, default `now()` | When the ticket was opened |
| `due_at` | timestamptz | nullable | SLA deadline: `created_at` + 4 h (high), 24 h (medium) or 72 h (low); recalculated if priority changes |
| `resolved_at` | timestamptz | nullable | Set when status becomes `resolved`, cleared if reopened, kept when closed |

### ticket_comments (CRM2-A3)

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | text | PK, default `'CMT-' + 4-digit crm2_comment_seq` | Comment number, e.g. `CMT-0001` |
| `ticket_id` | text | not null, FK → `tickets.id` | Ticket the comment belongs to |
| `author` | text | not null | Name of the logged-in user (set by the server, never from the request) |
| `text` | text | not null; API allows 1–2000 characters | The comment |
| `created_at` | timestamptz | not null, default `now()` | When it was written |

### warranties (CRM2-B1, B3)

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `serial_number` | text | PK | Product serial, e.g. `TV55-2611-0001` |
| `sku` | text | not null | Product SKU (ERP-1) |
| `product_name` | text | not null | Product name, for display |
| `customer_id` | text | not null | Customer who bought it (CRM-3) |
| `purchase_date` | date | not null | Date of sale; warranty starts here |
| `warranty_months` | integer | not null, default 12 | Length of the warranty |
| `created_at` | timestamptz | not null, default `now()` | When the record was added |

`expires_on` (= `purchase_date + warranty_months`) and `status` (`active` / `expired`, compared with today) are **calculated by the API**, not stored, so they never go out of date. The RMA warranty rule (C3) uses the same calculation.

### service_centres (CRM2-D1)

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | text | PK, default `'SC-' + 4-digit crm2_centre_seq` | Centre number, e.g. `SC-0001` |
| `name` | text | not null | Centre name |
| `city` | text | not null | City |
| `phone` | text | nullable | Contact number |
| `capacity` | int | not null, default 0, CHECK `>= 0` | How many tickets it can take |
| `active` | boolean | not null, default true | Whether it accepts new tickets |

### ticket_assignments (CRM2-D1)

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | text | PK, default `'ASG-' + 4-digit crm2_assignment_seq` | Assignment number, e.g. `ASG-0001` |
| `ticket_id` | text | not null, **UNIQUE** (re-assigning replaces the row) | Ticket sent to a centre (`TKT-xxxx`) |
| `centre_id` | text | not null, FK → `service_centres.id` | Centre handling the ticket |
| `assigned_at` | timestamptz | not null, default `now()` | When it was assigned |

### rmas (CRM2-C1, C3)

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | text | PK, default `'RMA-' + 4-digit crm2_rma_seq` | Return number, e.g. `RMA-0001` |
| `ticket_id` | text | not null | Ticket the return was raised from (`TKT-xxxx`) |
| `serial_number` | text | not null; must be registered and in warranty to create (C3) | Unit being returned |
| `reason` | text | not null | Why it is being returned |
| `status` | text | not null, default `requested`, CHECK `requested`/`approved`/`rejected`/`received`/`closed` | Return life cycle |
| `outcome` | text | nullable, CHECK `restock`/`repair`/`credit_note`; required to approve | What happens to the unit |
| `requested_at` | timestamptz | not null, default `now()` | When the return was requested |
| `decided_at` | timestamptz | nullable | When it was approved or rejected |

---

## 3. Normalisation (3NF)

- **1NF:** every column holds one value; no lists or repeating groups (comments, assignments and returns are their own tables).
- **2NF:** every primary key is a single column, so no column can depend on only part of a key.
- **3NF:** every non-key column depends only on its own table's key. Two deliberate exceptions, both copies of another team's data kept for display:
  - `tickets.customer_name` is a copy of the CRM-3 customer name (the issue asks for it, so the ticket list works when CRM-3 is down).
  - `warranties.product_name` is a copy of the ERP-1 product name for the same reason.
- `warranties` stores only `purchase_date` and `warranty_months`; expiry and status are calculated, not stored, so there is no column that depends on other non-key columns.
- `ticket_assignments.ticket_id` is UNIQUE, so a ticket has at most one current centre.
- Possible follow-up (not required by the issues): now that `tickets` is merged, `rmas.ticket_id` and `ticket_assignments.ticket_id` could become real foreign keys to `tickets(id)`. The seed check below confirms every existing row already points at a real ticket.
