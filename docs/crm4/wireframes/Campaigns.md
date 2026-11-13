# Wireframe Specification: Marketing Campaigns Screen

**Route**: `/crm4/campaigns` (and default `/crm4`)  
**Issues**: `[CRM4-A2]`, `[CRM4-A3]`  
**Roles Allowed**: `admin`, `sales`  
**Wireframe Graphic**: [`docs/crm4/wireframes/campaigns.svg`](./campaigns.svg)

---

## 1. Purpose & Overview

The **Marketing Campaigns** screen serves as the primary command center for the CRM-4 module. It allows marketing coordinators and sales managers to:
1. View all marketing campaigns across communication channels (`email`, `whatsapp`, `sms`).
2. Filter and search campaigns by name, objective, channel, and status (`draft`, `scheduled`, `sent`).
3. Create new campaigns and edit existing ones with links to customer segments (`SEG-0001`..`SEG-0004` from CRM-3) and message templates (`TPL-0001`..`TPL-0004` from CRM-4).
4. Trigger broadcast send simulations (`[CRM4-A3]`) that generate customer message rows and push timeline interaction events to CRM-3 (`POST /api/interactions/from-event`).

---

## 2. ASCII Wireframe Layout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT CONTAINER                             │
│  ⚡ Electro App                  │                                                     │
│    MARKETING (CRM-4)             │  Marketing Campaigns                    [CRM-4]     │
│    > Campaigns         ←active   │  Plan multi-channel marketing campaigns & simulate  │
│    > Audiences                   │  ────────────────────────────────────────────────── │
│    > Web Enquiry                 │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────┐ │
│    > Templates                   │  │ TOTAL: 5  │ │ DRAFT: 2  │ │ SCHED: 1  │ │SENT:2│ │
│    > Surveys                     │  └───────────┘ └───────────┘ └───────────┘ └──────┘ │
│                                  │                                                     │
│                                  │  [ 🔍 Search... ] [Channel ▼] [Status ▼] [+ Create] │
│                                  │                                                     │
│                                  │  ┌────────────────────────────────────────────────┐ │
│                                  │  │ ID       NAME        CHAN  STATUS   SEG  TPL   │ │
│                                  │  │────────────────────────────────────────────────│ │
│                                  │  │ CMP-0001 Diwali Sale email [sent]   SEG1 TPL2  │ │
│                                  │  │ CMP-0002 LED Launch  wapp  [sched]  SEG2 TPL1  │ │
│                                  │  │ CMP-0003 Warranty    sms   [draft]  SEG3 TPL3  │ │
│                                  │  └────────────────────────────────────────────────┘ │
│                                  │                                                     │
│                                  │  ┌── Create / Edit Campaign ──────────────────────┐ │
│                                  │  │ Name: [_________________] Channel: [Email  ▼]  │ │
│                                  │  │ Target Segment: [SEG-0001 High Value Retail ▼] │ │
│                                  │  │ Template: [TPL-0002 Festive Offer 15%      ▼] │ │
│                                  │  │ Objective: [_________________________________] │ │
│                                  │  │ Scheduled: [2026-12-15 10:00] [Save Campaign]  │ │
│                                  │  └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Elements & Behavioral Specifications

### 3.1 Header & KPI Metrics
- **Title**: `Marketing Campaigns` with `<span className="badge badge-blue">CRM-4</span>`.
- **KPI Summary Row**:
  - `TOTAL CAMPAIGNS`: Total records in system (e.g. `5`).
  - `DRAFT`: Count of editable draft campaigns (`.badge-amber`).
  - `SCHEDULED`: Count of queued broadcasts (`.badge-blue`).
  - `SENT / COMPLETED`: Count of executed campaigns (`.badge-green`).

### 3.2 Filtering & Search Toolbar
- **Search input**: Real-time filtering matching campaign `name` or `objective`.
- **Channel filter**: Dropdown with options: `All Channels`, `email`, `whatsapp`, `sms`.
- **Status filter**: Dropdown with options: `All Statuses`, `draft`, `scheduled`, `sent`.
- **Create Campaign Button**: Smoothly scrolls to/reveals the creation form.

### 3.3 Campaigns Data Table
- Columns:
  1. `ID`: Entity ID in monospace font (`CMP-0001`..`CMP-0005`).
  2. `NAME`: Primary campaign title.
  3. `CHANNEL`: Formatted badge:
     - `email`: `.badge-blue`
     - `whatsapp`: `.badge-green`
     - `sms`: `.badge-amber`
  4. `STATUS`:
     - `draft`: `.badge-amber`
     - `scheduled`: `.badge-blue`
     - `sent`: `.badge-green`
  5. `SEGMENT`: Linked CRM-3 segment ID (`SEG-0001` monospace).
  6. `TEMPLATE`: Linked CRM-4 template ID (`TPL-0001` monospace).
  7. `SCHEDULED`: Target dispatch date/time (`YYYY-MM-DD`).
  8. `ACTIONS`:
     - If `draft` or `scheduled`: "Send Now" button (`#2563eb`) to simulate dispatch.
     - If `sent`: Disabled badge / indicator showing `Sent (N)`.
     - "Edit" link to populate the form.

### 3.4 Send Simulation Flow (`[CRM4-A3]`)
- Clicking **Send Now**:
  1. Calls `POST /api/campaigns/:id/send`.
  2. Backend fetches segment customers from CRM-3 (`GET /api/segments/:id/customers`).
  3. Creates `campaign_messages` rows and posts timeline events to CRM-3.
  4. Displays a success toast: `"Sent to N customers in segment SEG-xxxx!"`.
  5. Second send attempt displays a 409 conflict safeguard.

---

## 4. UI States

| State | Visual Treatment |
|---|---|
| **Loading** | Centered spinner with text: `"Loading marketing campaigns..."` |
| **Empty** | Bordered card: `"No campaigns found matching your criteria. Click + Create Campaign to start."` |
| **Error** | Red alert banner (`#fee2e2` bg, `#b91c1c` text) with error message and retry button. |
| **Success** | Green banner (`#dcfce7` bg, `#15803d` text) confirming creation or dispatch. |
