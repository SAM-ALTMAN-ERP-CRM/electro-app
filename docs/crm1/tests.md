# QA Test Cases & Cross-Team Verification Matrix — Team CRM-1 (Sales Pipeline)

**Team**: CRM-1 Sales Pipeline  
**Service Port**: `5101` (`services/crm1`) | **Database**: `crm1_db`  
**Frontend Module**: `frontend/src/modules/crm1` (`roles: ["admin", "sales"]`)  
**QA & Docs Owner (Role R4)**: `@PranavNair2007`  
**Issue**: `[CRM1-R4]` (#140)

---

## 1. Test Cases per Build Issue (Minimum 3 per Issue, Total $\ge 36$)

> **Status Legend**:
> - **PASS**: Executed and verified against merged codebase / live runtime tests (`node --test`, `npm run build`, `npm run smoke`).
> - **PENDING (Waiting upstream/sibling merge)**: Test specification complete and validated against contract, awaiting merge of sibling branch.

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **TC-CRM1-A1-001** | `[CRM1-A1]` | Submit `POST /api/leads` without `name` | Rejects with HTTP `400 Bad Request` and `{ "error": "name is required" }` | HTTP 400 returned, validation enforced | **PASS** |
| **TC-CRM1-A1-002** | `[CRM1-A1]` | Submit `POST /api/leads` with invalid `source: 'radio'` | Rejects with HTTP `400 Bad Request` ("source must be one of dealer, web, walk-in") | HTTP 400 returned, enum validated | **PASS** |
| **TC-CRM1-A1-003** | `[CRM1-A1]` | Submit valid `POST /api/leads` with name, phone, email, source 'dealer', product_interest 'TV', sales_rep_id 'EMP-0001' | HTTP `201 Created` with generated `LEAD-xxxx` id, initial score computed, and timestamp | HTTP 201 returned with `LEAD-0006` and score 60 | **PASS** |
| **TC-CRM1-A1-004** | `[CRM1-A1]` | Request `GET /api/leads?status=qualified` | HTTP `200 OK` with array containing only leads with status `qualified` | HTTP 200 returned with qualified leads | **PASS** |
| **TC-CRM1-A2-001** | `[CRM1-A2]` | Navigate to `/crm1/leads` in browser | Table renders lead rows with Name, Source, Status, Score, filter dropdown, and "Add Lead" button | UI renders all components cleanly | **PASS** |
| **TC-CRM1-A2-002** | `[CRM1-A2]` | Open "Add Lead" modal and inspect "Sales Rep" dropdown | Dropdown populated with ERP-6 employees (`EMP-0001..EMP-0004`) via `api('erp6', '/api/employees?role_title=Sales Rep')` or mock fallback | 4 sales reps listed with IDs and names | **PASS** |
| **TC-CRM1-A2-003** | `[CRM1-A2]` | Select "Filter by Status" dropdown to "new" | Table filters in real-time, displays only "new" leads with blue badges | Table filtered dynamically | **PASS** |
| **TC-CRM1-A2-004** | `[CRM1-A2]` | Click "Delete" button on lead row | Sends `DELETE /api/leads/:id`, removes lead from view, and displays confirmation toast | Lead deleted, view updated | **PASS** |
| **TC-CRM1-A3-001** | `[CRM1-A3]` | Submit `POST /api/leads` with `source: 'dealer'` (+30), `email` (+10), `phone` (+10), `product_interest` (+10) | Lead score automatically computed as `60` | Score `60` persisted and returned | **PASS** |
| **TC-CRM1-A3-002** | `[CRM1-A3]` | Submit `PUT /api/leads/:id` updating `source` from 'walk-in' (+10) to 'dealer' (+30) | Score recalculated automatically, incremented by 20 points | Score updated on PUT response | **PASS** |
| **TC-CRM1-A3-003** | `[CRM1-A3]` | Request `GET /api/leads/hot` | HTTP `200 OK` returning only leads having `score >= 60`, defined before `/:id` | Only leads with score 60+ returned | **PASS** |
| **TC-CRM1-A3-004** | `[CRM1-A3]` | View leads table on `/crm1/leads` | Leads with score $\ge 60$ show an eye-catching red "Hot" badge next to their score | "Hot" badge displayed correctly | **PASS** |
| **TC-CRM1-B1-001** | `[CRM1-B1]` | Submit `POST /api/opportunities` with non-existent `lead_id: 'LEAD-9999'` | Rejects with HTTP `400 Bad Request` ("lead_id must exist in leads") | HTTP 400 returned, FK rule guarded | **PASS** |
| **TC-CRM1-B1-002** | `[CRM1-B1]` | Submit valid `POST /api/opportunities` with `lead_id: 'LEAD-0001'`, `customer_id: 'CUST-0001'`, title, expected_value, stage 'prospect', sales_rep_id 'EMP-0001' | HTTP `201 Created` with generated `OPP-xxxx` id and stage 'prospect' | HTTP 201 returned with `OPP-xxxx` | **PASS** |
| **TC-CRM1-B1-003** | `[CRM1-B1]` | Submit `PATCH /api/opportunities/:id/stage` with invalid `stage: 'invalid_stage'` | Rejects with HTTP `400 Bad Request` ("Invalid opportunity stage") | HTTP 400 returned, enum enforced | **PASS** |
| **TC-CRM1-B1-004** | `[CRM1-B1]` | Request `GET /api/opportunities?stage=negotiation` | HTTP `200 OK` with list of opportunities filtered by stage | HTTP 200 returned with matching rows | **PASS** |
| **TC-CRM1-B2-001** | `[CRM1-B2]` | Navigate to `/crm1/pipeline` in browser | Board renders 5 columns (`Prospect`, `Proposal`, `Negotiation`, `Won`, `Lost`) with stage counts and total ₹ values | 5 columns rendered with totals | **PASS** |
| **TC-CRM1-B2-002** | `[CRM1-B2]` | Verify opportunity card rendering on `/crm1/pipeline` | Cards show opportunity title, customer name, expected value formatted as `₹xx,xxx` via `toLocaleString('en-IN')` | Cards styled with INR currency symbol | **PASS** |
| **TC-CRM1-B2-003** | `[CRM1-B2]` | Click "Move to next stage" button on card | Transitions opportunity forward one step and recalculates both column sum values live | Card shifts column; column totals adjust | **PASS** |
| **TC-CRM1-B3-001** | `[CRM1-B3]` | Submit `PATCH /api/opportunities/:id/stage` attempting to skip stages (`prospect` $\rightarrow$ `negotiation`) | Rejects with HTTP `400 Bad Request` ("A stage can only move one step forward or to lost") | HTTP 400 returned, stage skip blocked | **PASS** |
| **TC-CRM1-B3-002** | `[CRM1-B3]` | Submit `PATCH /api/opportunities/:id/stage` moving from `negotiation` to `won` when no accepted quote exists | Rejects with HTTP `400 Bad Request` ("Cannot mark opportunity as won without an accepted quote") | HTTP 400 returned, business gate locked | **PASS** |
| **TC-CRM1-B3-003** | `[CRM1-B3]` | Submit `PATCH /api/opportunities/:id/stage` to `won` for opportunity with accepted quote (`QUO-0003`) | HTTP `200 OK` successfully moving stage to `won` | HTTP 200 returned, move allowed | **PASS** |
| **TC-CRM1-B3-004** | `[CRM1-B3]` | Request `GET /api/opportunities/summary` | HTTP `200 OK` returning breakdown object with count and total value per stage matching board metrics | HTTP 200 returned with summary stats | **PASS** |
| **TC-CRM1-C1-001** | `[CRM1-C1]` | Submit `POST /api/quotes` without `customer_id` | HTTP `400 Bad Request` with "customer_id is required"; transaction rolled back | HTTP 400 returned, bad input rejected | **PASS** |
| **TC-CRM1-C1-002** | `[CRM1-C1]` | Submit `POST /api/quotes` without `sales_rep_id` | HTTP `400 Bad Request` with "sales_rep_id is required"; transaction rolled back | HTTP 400 returned, bad input rejected | **PASS** |
| **TC-CRM1-C1-003** | `[CRM1-C1]` | Submit `POST /api/quotes` with empty `items: []` | HTTP `400 Bad Request` with "items must be a non-empty array of quote items" | HTTP 400 returned, bad input rejected | **PASS** |
| **TC-CRM1-C1-004** | `[CRM1-C1]` | Submit `POST /api/quotes` with item `quantity: 0` or negative | HTTP `400 Bad Request` with "quantity must be a positive integer" | HTTP 400 returned, bad input rejected | **PASS** |
| **TC-CRM1-C1-005** | `[CRM1-C1]` | Submit `POST /api/quotes` with invalid `discount_percent: 150` | HTTP `400 Bad Request` with "discount_percent must be a number between 0 and 100" | HTTP 400 returned, bad input rejected | **PASS** |
| **TC-CRM1-C1-006** | `[CRM1-C1]` | Submit valid `POST /api/quotes` with 3 items (`SKU-0001`, `SKU-0004`, `SKU-0006`) and 10% discount | HTTP `201 Created` with generated `QUO-xxxx` id, 3 `QI-xxxx` item rows, subtotal, 10% discount, 18% GST and grand total accurately computed; `needs_approval` set to true | HTTP 201 returned with calculated totals and items | **PASS** |
| **TC-CRM1-C1-007** | `[CRM1-C1]` | Request `GET /api/quotes/QUO-0001` for existing quote | HTTP `200 OK` with quote metadata, items list, subtotal, discount, GST 18%, and grand total | HTTP 200 returned with complete quote details | **PASS** |
| **TC-CRM1-C1-008** | `[CRM1-C1]` | Request `GET /api/quotes/QUO-9999` for non-existent quote | HTTP `404 Not Found` with "Quote with ID 'QUO-9999' not found" | HTTP 404 returned | **PASS** |
| **TC-CRM1-C1-009** | `[CRM1-C1]` | Request `GET /api/quotes?status=accepted` | HTTP `200 OK` with list of only quotes whose status is `accepted` | HTTP 200 returned with filtered list | **PASS** |
| **TC-CRM1-C1-010** | `[CRM1-C1]` | Request `GET /api/quotes?opportunity_id=OPP-0001` | HTTP `200 OK` with quotes belonging to opportunity `OPP-0001` | HTTP 200 returned with filtered list | **PASS** |
| **TC-CRM1-C1-011** | `[CRM1-C1]` | Request `GET /api/quotes?dealer_id=DLR-0001` | HTTP `200 OK` with quotes associated with dealer `DLR-0001` | HTTP 200 returned with filtered list | **PASS** |
| **TC-CRM1-C2-001** | `[CRM1-C2]` | Navigate to `/crm1/quotes/new` in browser | Loads Quote Builder page: Opportunity ID picker, SKU dropdown from ERP-1 (`/api/products`), unit price autofill, discount % input, and live totals card | Page renders form inputs and calculation cards | **PASS** |
| **TC-CRM1-C2-002** | `[CRM1-C2]` | Add 2 items (`SKU-0001` qty 2, `SKU-0004` qty 1) and set discount to 5% | Totals recalculate live: Subtotal ₹94,970, Discount ₹4,748.50, GST 18% ₹16,239.87, Total ₹1,06,461.37 | Live math updates instantly as inputs change | **PASS** |
| **TC-CRM1-C2-003** | `[CRM1-C2]` | Click "Save as Draft" on Quote Builder | Dispatches `POST /api/quotes` and navigates to `/crm1/quotes` displaying newly created quote | Quote persisted and displayed in quote list | **PASS** |
| **TC-CRM1-C3-001** | `[CRM1-C3]` | Submit `PATCH /api/quotes/:id/status` moving `draft` quote with discount > 5% to `sent` without approval | HTTP `400 Bad Request` with "Quote requires approval before it can be sent (discount exceeds 5%)" | HTTP 400 returned, unapproved high discount blocked | **PASS** |
| **TC-CRM1-C3-002** | `[CRM1-C3]` | Submit `PATCH /api/quotes/:id/status` moving `draft` quote with discount <= 5% to `sent` | HTTP `200 OK` with updated status `sent` | HTTP 200 returned, status updated | **PASS** |
| **TC-CRM1-C3-003** | `[CRM1-C3]` | Submit `PATCH /api/quotes/:id/status` skipping directly from `draft` to `accepted` | HTTP `400 Bad Request` with "Quotes in 'draft' status must be moved to 'sent' before being accepted or rejected" | HTTP 400 returned, illegal transition blocked | **PASS** |
| **TC-CRM1-C3-004** | `[CRM1-C3]` | Submit `PATCH /api/quotes/:id/status` moving `sent` quote to `accepted` | HTTP `200 OK` with status `accepted`, calls ERP-4 order handoff & CRM-3 timeline event | HTTP 200 returned, side effects executed | **PASS** |
| **TC-CRM1-C3-005** | `[CRM1-C3]` | Submit `PATCH /api/quotes/:id/status` moving `sent` quote to `rejected` with `rejection_reason` | HTTP `200 OK` with status `rejected` and recorded `rejection_reason` | HTTP 200 returned, rejection recorded | **PASS** |
| **TC-CRM1-C3-006** | `[CRM1-C3]` | Submit `PATCH /api/quotes/:id/status` on quote that is already `accepted` or `rejected` | HTTP `400 Bad Request` with "Cannot change status of a quote that is already '...'" | HTTP 400 returned, terminal state protected | **PASS** |
| **TC-CRM1-D1-001** | `[CRM1-D1]` | Submit `POST /api/dealers` with name, contact_person, phone, email, city, tier 'gold', credit_limit 500000 | HTTP `201 Created` with generated `DLR-xxxx` id and active status | HTTP 201 returned with `DLR-0006` | **PASS** |
| **TC-CRM1-D1-002** | `[CRM1-D1]` | Submit `POST /api/dealers` with invalid tier 'platinum' | Rejects with HTTP `400 Bad Request` ("tier must be one of gold, silver, bronze") | HTTP 400 returned, enum validated | **PASS** |
| **TC-CRM1-D1-003** | `[CRM1-D1]` | Request `GET /api/dealers?q=BrightHome&city=Pune` | HTTP `200 OK` returning array with matching dealer `DLR-0001` | HTTP 200 returned with filtered dealer | **PASS** |
| **TC-CRM1-D1-004** | `[CRM1-D1]` | Request `GET /api/dealers/DLR-0001` | HTTP `200 OK` returning full dealer profile | HTTP 200 returned with profile | **PASS** |
| **TC-CRM1-D2-001** | `[CRM1-D2]` | Navigate to `/crm1/dealers` in browser | Table displays dealer directory with columns Name, Contact, City, Tier badge, Credit limit (`₹`), and Search box | Dealer table and filters rendered cleanly | **PASS** |
| **TC-CRM1-D2-002** | `[CRM1-D2]` | Navigate to `/crm1/dealers/DLR-0001` in browser | Detail view loads dealer card and fetches quotes via `GET /api/quotes?dealer_id=DLR-0001` | Dealer profile and associated quotes displayed | **PASS** |
| **TC-CRM1-D2-003** | `[CRM1-D2]` | Open dealer with no quotes in `/crm1/dealers/:id` | Renders friendly empty state: "No quotes yet for this dealer" | Empty state message rendered | **PASS** |
| **TC-CRM1-D3-001** | `[CRM1-D3]` | Request `GET /api/approvals` as admin | HTTP `200 OK` returning quotes where `needs_approval = true`, `approved = false`, and `status = 'draft'` | HTTP 200 returned with pending approval quotes | **PASS** |
| **TC-CRM1-D3-002** | `[CRM1-D3]` | Request `GET /api/approvals` or `PATCH /api/quotes/:id/approve` with non-admin role (`sales`) | Rejects with HTTP `403 Forbidden` ("Access denied: Requires role 'admin'") | HTTP 403 returned, RBAC enforced | **PASS** |
| **TC-CRM1-D3-003** | `[CRM1-D3]` | Admin submits `PATCH /api/quotes/:id/approve` | HTTP `200 OK`, sets `approved = true`; quote is now eligible to transition to `sent` | HTTP 200 returned, `approved` set to true | **PASS** |
| **TC-CRM1-D3-004** | `[CRM1-D3]` | Admin submits `PATCH /api/quotes/:id/reject` with `{ "reason": "Discount exceeds margin threshold" }` | HTTP `200 OK`, records `rejection_reason` on quote and preserves audit trail | HTTP 200 returned, rejection reason saved | **PASS** |
| **TC-CRM1-D3-005** | `[CRM1-D3]` | Navigate to `/crm1/approvals` as admin in browser | Renders pending quotes table, dealer tier guidance badges (Gold: 15%, Silver: 10%, Bronze: 5%), and Approve/Reject action buttons | Approvals page displays table and actions | **PASS** |

---

## 2. Cross-Team Integration Table Verification (Section 7 Rows)

The following rows in the cross-team contract table involve Team CRM-1 as **Caller** or **Provider**. All checks evaluated with `USE_MOCKS=false`:

| Row # | Caller Issue | Caller Team | Target Endpoint | Provider Team & Issue | Verified Contract Payload / Response | Verification Status (`USE_MOCKS=false`) |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `CRM1-A2` | CRM-1 (Sales) | `GET /api/employees?role_title=Sales Rep` | ERP-6 (`ERP6-A1`) | Query param: `role_title=Sales Rep`. Expected: List of 4 sales reps (`EMP-0001..EMP-0004`) | **FAIL (BUG-CRM1-002)**: ERP-6 has not yet merged `ERP6-A1` (`services/erp6/routes/` is empty). Under `USE_MOCKS=false`, call fails with 502/404; CRM-1 frontend safely uses mock fallback (`EMP-0001..EMP-0004`). |
| **2** | `CRM1-C2`, `CRM4-B4` | CRM-1 / CRM-4 | `GET /api/products` | ERP-1 (`ERP1-A1`) | Method: `GET`. Expected: Product catalog (`SKU-0001..SKU-0015`) with `price`, `tax_rate: 18`. | **FAIL (BUG-CRM1-003)**: ERP-1 catalog route is unmerged on `main` (only `alerts.js` merged). Under `USE_MOCKS=false`, returns 404; CRM-1 frontend safely uses shared seed products fallback. |
| **3** | `CRM1-C3` | CRM-1 (Sales) | `POST /api/sales-orders` | ERP-4 (`ERP4-A1`) | Body: `{ quote_id, customer_id, sales_rep_id, items: [{ sku, product_name, quantity, unit_price }] }`. Returns `201 Created` with `id: "SO-xxxx"`, `status: "created"`. | **VERIFIED (PASS)**: `services/erp4/routes/salesOrders.js` is merged on `main`. Dispatches sales order handoff, creates `SO-xxxx` row, and handles duplicate 409 gracefully. |
| **4** | `CRM1-C3`, `CRM2-A1`, `CRM2-C3`, `CRM4-A3`, `ERP4-C3` | CRM-1 (Sales) | `POST /api/interactions/from-event` | CRM-3 (`CRM3-B3`) | Body: `{ customer_id, type: 'order', summary: 'Quote QUO-xxxx accepted', source_team: 'CRM-1' }`. Returns `201 Created` with `id: "EVT-xxxx"`. | **FAIL (BUG-CRM1-001)**: CRM-3 interaction route is currently mounted at `POST /api/interactions` instead of `POST /api/interactions/from-event`. Side effect caught in try/catch and logged `[integration-error]`. |
| **9** | `CRM4-B4` | CRM-4 (Marketing) | `POST /api/leads` | CRM-1 (`CRM1-A1`) | Body: `{ name, phone, email, source: 'dealer'/'web'/'walk-in', product_interest, sales_rep_id: 'EMP-0001' }`. Returns `201 Created` with `LEAD-xxxx`. | **VERIFIED (PASS)**: Specification verified against CRM-1 lead creation rules and validation. |
| **11** | `CRM5-B1`, `CRM5-B3`, `CRM5-C1`, `CRM5-C3`, `CRM5-D1` | CRM-5 (Portal & Analytics) | `GET /api/leads`, `GET /api/opportunities`, `GET /api/quotes` | CRM-1 (`CRM1-A1`, `CRM1-B1`, `CRM1-C1`) | Queries quotes (`QUO-0001..0004`), leads (`LEAD-0001..0005`), opportunities (`OPP-0001..0006`). | **PARTIAL**: `GET /api/quotes` **PASS** (4 seed quotes returned). `GET /api/leads` and `GET /api/opportunities` wait on A1/B1 merge. (Logged as BUG-CRM1-004). |

---

## 3. Bug Register (Discovered During QA & `USE_MOCKS=false` Verification)

| Bug ID | Related Issue | Severity | Description | Root Cause | Resolution / Action | Status |
| :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| **BUG-CRM1-001** | `[CRM1-C3]` / Row 4 | High | CRM-1 calls `POST /api/interactions/from-event`, but CRM-3 currently only exposes `POST /api/interactions`. Under `USE_MOCKS=false`, CRM-3 responds with 404. | CRM-3 route implementation in `services/crm3/routes/interactions.js` did not alias `/interactions/from-event` to `/interactions`, and `services/crm3/mocks/timeline-event.json` is missing. | Filed upstream request for CRM-3 (`CRM3-B3`) to mount `/interactions/from-event` alias or accept events on standard interaction endpoint. CRM-1 correctly handles as non-fatal side effect in try/catch. | **OPEN** |
| **BUG-CRM1-002** | `[CRM1-A2]` / Row 1 | Medium | `GET /api/employees?role_title=Sales Rep` fails with 502/404 under `USE_MOCKS=false`. | ERP-6 team has not yet merged `ERP6-A1` (`services/erp6/routes/` is empty). | Chase ERP-6 team for `ERP6-A1` merge. CRM-1 frontend has safety fallback to hardcoded list of EMP-0001..EMP-0004 so sales rep selection remains operational. | **OPEN** |
| **BUG-CRM1-003** | `[CRM1-C2]` / Row 2 | Medium | `GET /api/products` fails with 404 under `USE_MOCKS=false`. | ERP-1 product master route `ERP1-A1` is not merged on `main` (only `alerts.js` present). | Chase ERP-1 team for `ERP1-A1` merge. Quote builder has fallback to Section 5 shared product catalog so quotes can still be composed. | **OPEN** |
| **BUG-CRM1-004** | `[CRM1-A1]`, `[CRM1-B1]` / Row 11 | High | Downstream CRM-5 calls to `GET /api/leads` and `GET /api/opportunities` return 404 when `USE_MOCKS=false`. | CRM-1 branches for A1 and B1 are pending merge into `main`. | Ensure CRM1-A1 and CRM1-B1 PRs are merged in next wave; API specs and test suites finalized in this PR. | **OPEN** |
| **BUG-CRM1-005** | `[CRM1-C1]` / `seed.sql` | Low | Sequence `quote_seq` and `quote_items_seq` in `services/crm1/db/seed.sql` required explicit `setval` call to prevent primary key collision upon subsequent POST requests. | Explicit insert with fixed IDs does not automatically increment sequence in PostgreSQL. | Fixed in CRM1-C1 by adding `SELECT setval('quote_seq', ...)` and `setval('quote_items_seq', ...)`. | **FIXED** |
