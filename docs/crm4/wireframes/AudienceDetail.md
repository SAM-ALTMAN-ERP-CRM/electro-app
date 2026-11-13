# Wireframe Specification: Audience Detail & Member Management

**Route**: `/crm4/audiences/:id`  
**Issues**: `[CRM4-B2]`, `[CRM4-B3]`  
**Roles Allowed**: `admin`, `sales`  
**Wireframe Graphic**: [`docs/crm4/wireframes/audience-detail.svg`](./audience-detail.svg)

---

## 1. Purpose & Overview

The **Audience Detail & Member Management** screen allows granular subscriber management for a specific audience list (`AUD-0001`..`AUD-0003`). Key capabilities:
1. View all members associated with the audience list.
2. Toggle customer opt-out status (`opted_out = true/false`), dynamically updating the reachable subscriber count (`[CRM4-B3]`).
3. Import customers en masse from CRM-3 segments (`POST /api/audiences/:id/import-segment`), automatically discarding duplicates already present in the list.
4. Manually add or remove members (`POST` / `DELETE /api/audiences/:id/members`).

---

## 2. ASCII Wireframe Layout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ < Back to Audiences                                                                    │
│ Audience: Festive Shoppers 2026                            [AUD-0001] [CRM-4]          │
│ Curated audience list for festive electronics promotions                               │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ ┌───────────┐ ┌───────────────┐ ┌───────────┐ ┌──────────────────────────────────────┐ │
│ │ TOTAL: 8  │ │ REACHABLE: 7  │ │ OPTEDOUT:1│ │ REACH RATE: 87.5%                   │ │
│ └───────────┘ └───────────────┘ └───────────┘ └──────────────────────────────────────┘ │
│                                                                                        │
│ ┌── ⚡ Import from CRM-3 Segment ────────────────────────────────────────────────────┐ │
│ │ Segment: [SEG-0001 High Value Retail ▼]  [Import Customers] (Auto-skips duplicates)│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌── Members Directory ───────────────────────────────────────────────────────────────┐ │
│ │ CUST ID   NAME             EMAIL               PHONE       STATUS      ACTION      │ │
│ │────────────────────────────────────────────────────────────────────────────────────│ │
│ │ CUST-0001 Aarav Mehta      aarav@example.com   9820011111  [Reachable] [Opt Out] ✕ │ │
│ │ CUST-0002 Sunrise Elect.   info@sunrise.com    9820022222  [Reachable] [Opt Out] ✕ │ │
│ │ CUST-0003 Meera Patel      meera@example.com   9820033333  [Opted Out] [Opt In]  ✕ │ │
│ │ CUST-0004 BrightHome       orders@bright.com   9820044444  [Reachable] [Opt Out] ✕ │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌── Add Individual Member ───────────────────────────────────────────────────────────┐ │
│ │ Customer ID: [CUST-0005]  Name: [Ananya]  Email: [a@ex.com]  Phone: [9820055555]   │ │
│ │ [+ Add Member]                                                                     │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Elements & Specifications

### 3.1 Header & Back Navigation
- Breadcrumb / back link: `< Back to Audiences` navigating cleanly to `/crm4/audiences`.
- Entity Title: `Audience: <name>` with ID pill `<span className="badge badge-blue">AUD-xxxx</span>`.

### 3.2 Segment Import Bar (`[CRM4-B3]`)
- Dropdown populated with CRM-3 segments via `api('crm3', '/api/segments')`.
- Action button: `Import Customers`.
- When triggered, posts `{ segment_id }` to `api('crm4', '/api/audiences/:id/import-segment')`.
- Success notification: `"Imported X new members from SEG-xxxx (Y duplicates skipped)."`.

### 3.3 Members Table
- Columns:
  1. `CUST ID`: Monospace customer identifier (`CUST-0001`..`CUST-0008`).
  2. `MEMBER NAME`: Full name.
  3. `EMAIL`: Customer email.
  4. `PHONE`: Phone number.
  5. `STATUS`:
     - Reachable: `<span className="badge badge-green">Reachable</span>`
     - Opted Out: `<span className="badge badge-red">Opted Out</span>`
  6. `ACTIONS`:
     - Opt-out toggle button: changes between `[Opt Out]` (`.badge-amber`) and `[Opt In]` (`.badge-green`).
     - Remove button (`✕`): calls `DELETE /api/audiences/:id/members/:memberId`.

---

## 4. UI States

| State | Visual Treatment |
|---|---|
| **Loading** | Loading placeholder: `"Loading audience members..."` |
| **Empty Members** | Centered state: `"No members currently in this audience. Import from a segment or add below."` |
| **Error** | Red notification banner displaying backend error. |
| **Success** | Green banner displaying import or member modification feedback. |
