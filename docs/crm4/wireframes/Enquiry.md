# Wireframe Specification: Web & Dealer Enquiry Capture Screen

**Route**: `/crm4/enquiry`  
**Issue**: `[CRM4-B4]` (NEW)  
**Roles Allowed**: `admin`, `sales`  
**Wireframe Graphic**: [`docs/crm4/wireframes/enquiry.svg`](./enquiry.svg)

---

## 1. Purpose & Overview

The **Web & Dealer Enquiry Capture** screen is Step 1 of 9 in the cross-monorepo Order-to-Cash workflow (`ERP5-C5`). It serves as an inbound prospect capture portal used by dealers, website visitors, and sales reps to:
1. Capture new prospect inquiries with contact details (`name`, `phone`, `email`).
2. Tag inquiry source (`dealer`, `web`, `walk-in`).
3. Select interested products directly from the ERP-1 catalog (`api('erp1', '/api/products')`).
4. Atomically persist the enquiry record (`ENQ-0001`..`ENQ-xxxx`) in `services/crm4` and post a new sales lead to CRM-1 via `callService('crm1', '/api/leads')`, routing to default sales rep `EMP-0001`.
5. Display linked lead confirmation (`LEAD-0001` or `LEAD-MOCK`) with clear 502 Bad Gateway safeguards when CRM-1 is unreachable in production mode (`USE_MOCKS=false`).

---

## 2. ASCII Wireframe Layout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Web & Dealer Enquiry Capture                               [CRM-4]                     │
│ Capture prospect interest & auto-generate sales leads in CRM-1                         │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ [ ✓ Success: Enquiry ENQ-0001 created! Sales Lead LEAD-0001 generated for EMP-0001.  ] │
│                                                                                        │
│ ┌── New Prospect Enquiry Form ───────────────┐ ┌── Recent Enquiries & Leads ─────────┐ │
│ │ All enquiries push real-time leads to CRM-1│ │ ENQ-0001  Rajiv Verma          [web]│ │
│ │                                            │ │ Product: Smart LED TV (SKU-0001)    │ │
│ │ Full Name: *                               │ │ → Linked Lead: LEAD-0001 (EMP-0001) │ │
│ │ [ Rajiv Verma                            ] │ │ ─────────────────────────────────── │ │
│ │ Phone: (10 digits) *     Source: *         │ │ ENQ-0002  Apex Electronics  [dealer]│ │
│ │ [ 9820066666           ] [ Web Portal   ▼] │ │ Product: Refrigerator (SKU-0002)    │ │
│ │ Email Address: *                           │ │ → Linked Lead: LEAD-0002 (EMP-0001) │ │
│ │ [ rajiv.verma@example.com                ] │ │ ─────────────────────────────────── │ │
│ │ Product Interest (ERP-1 Catalog): *        │ │ ENQ-0003  Priya Nair       [walk-in]│ │
│ │ [ SKU-0001 - Smart LED TV 55" 4K UHD     ▼]│ │ Product: Microwave (SKU-0004)       │ │
│ │ Customer Requirements / Notes:             │ │ → Linked Lead: LEAD-0003 (EMP-0001) │ │
│ │ [ Interested in festive bundle offer...  ] │ │ ─────────────────────────────────── │ │
│ │                                            │ │ Workflow Note:                      │ │
│ │ [ Submit Enquiry & Create Lead ]           │ │ • Step 1 of Order-to-Cash (ERP5-C5) │ │
│ │ (Auto-routed to Sales Rep EMP-0001)        │ │ • 502 Bad Gateway if CRM-1 fails    │ │
│ └────────────────────────────────────────────┘ └─────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Elements & Specifications

### 3.1 Header & Confirmation Banner
- Title: `Web & Dealer Enquiry Capture` with `<span className="badge badge-blue">CRM-4</span>`.
- Success Banner: Highlights generated Enquiry ID (`ENQ-xxxx`) and linked CRM-1 Lead ID (`LEAD-xxxx`).

### 3.2 Intake Form Fields
- **Full Name**: Text input, required.
- **Phone Number**: 10-digit Indian phone number (`98200xxxxx`), validated on change.
- **Source**: Select dropdown with options:
  - `web` &rarr; `<span className="badge badge-blue">web</span>`
  - `dealer` &rarr; `<span className="badge badge-amber">dealer</span>`
  - `walk-in` &rarr; `<span className="badge badge-green">walk-in</span>`
- **Email Address**: Email format, required.
- **Product Interest**: Dynamic select loaded from ERP-1 (`api('erp1', '/api/products')`), fallback to 3 mock products (`SKU-0001`, `SKU-0002`, `SKU-0003`) if ERP-1 is unmerged.
- **Remarks / Notes**: Optional textarea for customer specifications.
- **Submit Button**: `#2563eb`, displays loading spinner while calling backend.

### 3.3 Recent Enquiries Audit Feed
- Real-time audit list showing latest submitted inquiries.
- Includes source badges, customer names, interested SKU, and linked `LEAD-xxxx` identifier.

---

## 4. UI States

| State | Visual Treatment |
|---|---|
| **Submitting** | Button displays `"Creating Enquiry & Lead..."` with disabled state. |
| **Success** | Green banner (`#dcfce7`) with lead confirmation; form resets cleanly. |
| **CRM-1 Failure (502)** | Red alert banner (`#fee2e2` bg, `#b91c1c` text): `"Failed to create lead in CRM-1 (502 Bad Gateway). Please verify CRM-1 service status."` |
| **Validation Error** | Red inline feedback on missing fields or invalid phone format. |
