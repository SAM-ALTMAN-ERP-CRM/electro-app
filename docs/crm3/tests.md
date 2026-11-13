# QA Test Cases & Cross-Team Verification Matrix — Team CRM-3 (Customer 360)

**Team**: CRM-3 Customer 360  
**Service Port**: `5103` (`services/crm3`) | **Database**: `crm3_db`  
**Frontend Module**: `frontend/src/modules/crm3` (`roles: ["admin", "sales", "support"]`)  
**Order-to-Cash Workflow**: Step 3 of 9 (Customer Master Directory, Contacts & Unified Event Timeline)  
**QA & Docs Owner (Role R4)**: `@2025dakshg-svg`

---

## 1. Test Cases per Build Issue (Minimum 3 per issue)

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **TC-CRM3-A1-01** | `[CRM3-A1]` | Send `GET /api/customers` with authenticated JWT | Returns JSON array with all 10 seed customers (`CUST-0001` through `CUST-0010`) matching Section 5 shared seed contract | Returned array of 10 customers with IDs `CUST-0001`..`CUST-0010` | **PASS** |
| **TC-CRM3-A1-02** | `[CRM3-A1]` | Send `GET /api/customers?q=Aarav&type=retail` | Filters customer master and returns only retail customers matching "Aarav" (e.g. `CUST-0001` and duplicate `CUST-0009`) | Filtered array contains matching customers | **PASS** |
| **TC-CRM3-A1-03** | `[CRM3-A1]` | Send `GET /api/customers/CUST-0002` | Returns customer object containing corporate details, GSTIN (`27AABCS1234F1Z5`), billing and shipping addresses | Returned customer `CUST-0002` with valid GSTIN | **PASS** |
| **TC-CRM3-A1-04** | `[CRM3-A1]` | Send `POST /api/customers/CUST-0001/contacts` with `{ name: 'Vikram Mehta', phone: '9820011199', email: 'vikram@example.com', designation: 'Partner' }` | Inserts new contact linked to `CUST-0001` and returns `201 Created` with generated sequence ID | Created contact record returned with 201 | **PASS** |
| **TC-CRM3-A2-01** | `[CRM3-A2]` | Navigate to `/crm3/customers` in browser | Table displays customer list with columns: ID, Name, Type, City, Phone, and colored type badges (`retail`, `corporate`, `dealer`) | Table renders customers and badges accurately | **PASS** |
| **TC-CRM3-A2-02** | `[CRM3-A2]` | Enter "Sunrise" into the search box on `/crm3/customers` and change Type filter to "corporate" | List dynamically filters to show only corporate customer "Sunrise Electronics" | Grid filtered live to single matching row | **PASS** |
| **TC-CRM3-A2-03** | `[CRM3-A2]` | Click "Add Customer" button on `/crm3/customers` | Opens customer modal form with fields: Name, Type dropdown, Phone, Email, GSTIN, Billing Address, Shipping Address, City | Form fields render with proper labels and placeholders | **PASS** |
| **TC-CRM3-A2-04** | `[CRM3-A2]` | Navigate to `/crm3/customers/CUST-0002` | Renders customer detail profile, billing/shipping address cards, GSTIN chip, and contacts sub-table with "Add Contact" button | Detail screen and contacts sub-table render properly | **PASS** |
| **TC-CRM3-A3-001** | `[CRM3-A3]` | Submit customer creation with a 9-digit or 11-digit phone number | API returns 400 with "Phone number must be exactly 10 digits"; form displays inline error; nothing saved | 400 returned, bad input rejected | **PASS** |
| **TC-CRM3-A3-002** | `[CRM3-A3]` | Submit customer creation with an invalid email address (e.g. `invalid-email`) | API returns 400 with "Invalid email format"; form displays inline message; nothing saved | 400 returned, bad input rejected | **PASS** |
| **TC-CRM3-A3-003** | `[CRM3-A3]` | Submit customer creation with an email already belonging to another customer | API returns 409 Conflict with "Customer with email already exists"; form displays inline conflict error; nothing saved | 409 returned, duplicate rejected | **PASS** |
| **TC-CRM3-A3-004** | `[CRM3-A3]` | Submit corporate or dealer customer with missing or invalid length GSTIN (not 15 characters) | API returns 400 with "GSTIN is required for corporate/dealer customer type"; nothing saved | 400 returned, bad input rejected | **PASS** |
| **TC-CRM3-A3-005** | `[CRM3-A3]` | Check "Same as billing address" checkbox in customer form | Shipping address textarea updates dynamically to match billing address and becomes disabled/synced | Form updates shipping address | **PASS** |
| **TC-CRM3-A3-006** | `[CRM3-A3]` | Submit valid retail customer with 10-digit phone, valid unique email, and no GSTIN | API returns 201 with created CUST-xxxx record; saved to directory | 201 returned with created customer | **PASS** |
| **TC-CRM3-B1-01** | `[CRM3-B1]` | Send `GET /api/customers/CUST-0001/interactions` | Returns chronological list of interactions for `CUST-0001` sorted newest first | Returned interactions ordered descending by `created_at` | **PASS** |
| **TC-CRM3-B1-02** | `[CRM3-B1]` | Send `GET /api/customers/CUST-0001/interactions?type=call` | Filters interactions to return only events where `type = 'call'` | Returned only call records | **PASS** |
| **TC-CRM3-B1-03** | `[CRM3-B1]` | Send `POST /api/interactions` with `{ customer_id: 'CUST-0001', type: 'meeting', summary: 'Quarterly review', source_team: 'crm3' }` | Creates interaction with author attribution (`created_by`) and returns `201 Created` with generated `INT-xxxx` ID | Returned 201 with interaction record | **PASS** |
| **TC-CRM3-B1-04** | `[CRM3-B1]` | Send `GET /api/customers/CUST-0001/interactions?from=2026-11-01&to=2026-11-05` | Returns interactions falling strictly within the specified ISO date window | Returned records filtered by date range | **PASS** |
| **TC-CRM3-B2-01** | `[CRM3-B2]` | Navigate to `/crm3/customers/CUST-0001/timeline` | Displays vertical timeline feed with distinct icons per type (call, email, meeting, ticket, order) and team badges | Timeline feed renders with type icons and source badges | **PASS** |
| **TC-CRM3-B2-02** | `[CRM3-B2]` | Fill out "Add note" form at top of timeline and click "Post Note" | Submits `POST /api/interactions`, immediately prepends note to top of timeline without full page reload | Note instantly appears at top of timeline | **PASS** |
| **TC-CRM3-B2-03** | `[CRM3-B2]` | Click "View Timeline" link from Customer Detail page (`/crm3/customers/CUST-0001`) | Smoothly navigates to customer timeline view passing active customer context | Navigated to timeline page with breadcrumbs intact | **PASS** |
| **TC-CRM3-B2-04** | `[CRM3-B2]` | Use timeline type filter dropdown to select "ticket" | Timeline dynamically updates to show only support ticket interaction events | Feed filtered to ticket events only | **PASS** |
| **TC-CRM3-B3-01** | `[CRM3-B3]` | Send `POST /api/interactions/from-event` with `{ customer_id: 'CUST-0001', type: 'order', summary: 'Order SO-0001 dispatched via BlueDart', source_team: 'erp4' }` | Creates interaction record with `source_team: 'erp4'` and returns `201 Created` | Event ingested and returns 201 | **PASS** |
| **TC-CRM3-B3-02** | `[CRM3-B3]` | Send the exact same event payload again within 60 seconds (Sliding-window duplicate suppression) | Identifies duplicate event sent in same minute; idempotently suppresses duplicate and returns 201 without creating second record | Duplicate suppressed, returns 201 with duplicate note | **PASS** |
| **TC-CRM3-B3-03** | `[CRM3-B3]` | Send `POST /api/interactions/from-event` missing `source_team` or `type` | Rejects payload with `400 Bad Request` and descriptive error message | Returns 400 with missing field message | **PASS** |
| **TC-CRM3-B3-04** | `[CRM3-B3]` | Post event from external team and verify `/crm3/customers/CUST-0001/timeline` in UI | New external event appears with distinct source team badge (e.g. `[ERP-4]`) and order icon | External event displayed on timeline with badge | **PASS** |
| **TC-CRM3-C1-01** | `[CRM3-C1]` | Send `GET /api/segments` | Returns list of 4 seed segments (`SEG-0001` through `SEG-0004`), including "Corporate in Mumbai" | Returned array with 4 seed segments | **PASS** |
| **TC-CRM3-C1-02** | `[CRM3-C1]` | Send `GET /api/segments/SEG-0001/customers` ("Corporate in Mumbai") | Evaluates segment criteria against customer master; returns only `CUST-0002` ("Sunrise Electronics Pvt Ltd") | Returns only matching corporate Mumbai customer `CUST-0002` | **PASS** |
| **TC-CRM3-C1-03** | `[CRM3-C1]` | Send `POST /api/segments` with `{ name: 'Retail Customers in Kochi', customer_type: 'retail', city: 'Kochi' }` | Inserts new segment definition, generates `SEG-xxxx` ID, and returns `201 Created` | Segment created with 201 | **PASS** |
| **TC-CRM3-C1-04** | `[CRM3-C1]` | Send `POST /api/segments` with missing `name` | Returns `400 Bad Request` ("name is required"); nothing saved to database | Returns 400 error cleanly | **PASS** |
| **TC-CRM3-C2-01** | `[CRM3-C2]` | Navigate to `/crm3/segments` in browser | Displays segments table with Segment Name, Target Type, Target City, and Action links | Segments table renders with target filters | **PASS** |
| **TC-CRM3-C2-02** | `[CRM3-C2]` | Submit create segment form on `/crm3/segments` | Submits `POST /api/segments`; table refreshes and displays new segment row | New segment added to list | **PASS** |
| **TC-CRM3-C2-03** | `[CRM3-C2]` | Click on segment `SEG-0001` ("Corporate in Mumbai") | Opens `/crm3/segments/SEG-0001` showing criteria badge, total matched customer count (1), and matching customers table | Displays customer count 1 and lists `CUST-0002` | **PASS** |
| **TC-CRM3-C2-04** | `[CRM3-C2]` | Open segment with blank city criteria | Evaluates criteria with wildcard city; table displays all customers matching type regardless of city | Wildcard matches all cities for that customer type | **PASS** |
| **TC-CRM3-C3-01** | `[CRM3-C3]` | Send `POST /api/customers/CUST-0001/tags` with `{ tag: 'VIP' }` | Inserts tag into `customer_tags` table and returns updated tag list `['VIP']` | Tag added, returns 201 with tags array | **PASS** |
| **TC-CRM3-C3-02** | `[CRM3-C3]` | Send `DELETE /api/customers/CUST-0001/tags/VIP` | Removes tag association from `customer_tags` table and returns updated tag array | Tag removed successfully | **PASS** |
| **TC-CRM3-C3-03** | `[CRM3-C3]` | Send `GET /api/segments/SEG-0001/export.csv` | Responds with `Content-Type: text/csv` and downloadable CSV header: `name,email,phone,city` with matching rows | CSV generated with correct headers and data rows | **PASS** |
| **TC-CRM3-C3-04** | `[CRM3-C3]` | Click "Download CSV" button on `/crm3/segments/SEG-0001` | Triggers browser download of `segment_SEG-0001_customers.csv` containing valid Excel-readable CSV | File downloads and opens cleanly in spreadsheet viewer | **PASS** |
| **TC-CRM3-D1-01** | `[CRM3-D1]` | Send `GET /api/customers/duplicates` | Returns duplicate clusters sharing phone or email; detects `CUST-0001`/`CUST-0009` (phone `9820011111`) and `CUST-0002`/`CUST-0010` (email `contact@sunrise.com`) | Returned 2 duplicate groups matching seed duplicates | **PASS** |
| **TC-CRM3-D1-02** | `[CRM3-D1]` | Send `POST /api/customers/merge` with `{ keep_id: 'CUST-0001', remove_id: 'CUST-0009' }` | Re-parents contacts, interactions, and tags from `CUST-0009` to `CUST-0001`; deletes `CUST-0009` in atomic transaction | Returns merge confirmation; `CUST-0009` removed | **PASS** |
| **TC-CRM3-D1-03** | `[CRM3-D1]` | Send `POST /api/customers/merge` with identical `keep_id` and `remove_id` | Rejects invalid merge request with `400 Bad Request` ("keep_id and remove_id must be different") | Returns 400 error cleanly | **PASS** |
| **TC-CRM3-D1-04** | `[CRM3-D1]` | Verify `CUST-0001` contacts after merge | Contacts originally under `CUST-0009` now appear under `CUST-0001`; no orphan contacts remain | All contacts consolidated under keep customer | **PASS** |
| **TC-CRM3-D2-01** | `[CRM3-D2]` | Navigate to `/crm3/duplicates` in browser | Renders duplicate groups side-by-side with comparison cards showing Name, Phone, Email, Address, and matched field badge | Duplicate pairs rendered side-by-side | **PASS** |
| **TC-CRM3-D2-02** | `[CRM3-D2]` | Click "Keep this one" button on `CUST-0001` card | Triggers confirmation modal explaining that contacts and timeline will be merged and other record deleted | Modal displays merge confirmation warning | **PASS** |
| **TC-CRM3-D2-03** | `[CRM3-D2]` | Confirm merge modal in UI | Executes merge API call; screen refreshes and merged group disappears from duplicates list | Duplicate group removed from screen after merge | **PASS** |
| **TC-CRM3-D2-04** | `[CRM3-D2]` | Navigate to `/crm3/duplicates` when no duplicates exist | Displays clean empty state card: "No duplicate customer clusters detected" | Empty state card rendered | **PASS** |
| **TC-CRM3-D3-01** | `[CRM3-D3]` | Send `POST /api/customers/import` with a 10-row customer array containing 2 invalid rows (bad phone, bad email) | Inserts 8 valid customer records, skips 2 invalid rows, and returns `{ inserted: 8, skipped: 2, errors: [...] }` | Returns `{ inserted: 8, skipped: 2, errors: [...] }` | **PASS** |
| **TC-CRM3-D3-02** | `[CRM3-D3]` | Navigate to `/crm3/import` and select CSV file with valid and invalid customer rows | Browser parses CSV (splitting by lines and commas), renders preview table with validation status column | Preview table highlights valid rows and error rows | **PASS** |
| **TC-CRM3-D3-03** | `[CRM3-D3]` | Click "Proceed with Import" button on `/crm3/import` | Posts valid payload to API; displays completion summary card with inserted count, skipped count, and error breakdown | Summary card reports import results accurately | **PASS** |
| **TC-CRM3-D3-04** | `[CRM3-D3]` | Verify imported customer records in `/crm3/customers` table | Newly imported customers appear in the master directory table with generated `CUST-xxxx` IDs | New customers visible and searchable | **PASS** |

---

## 2. Cross-Team Integration Table Verification (Section 7 Rows)

The following rows in the cross-team contract table involve Team CRM-3 as the **Provider**. All checks have been executed with `USE_MOCKS=false`:

| Row # | Caller Issue(s) | Caller Team(s) | Target Endpoint | CRM-3 Issue | Verified Contract Payload & Response | Verification Status |
| :---: | :---: | :---: | :--- | :---: | :--- | :---: |
| **4** | `CRM1-C3`<br/>`CRM2-A1`<br/>`CRM2-C3`<br/>`CRM4-A3`<br/>`ERP4-C3` | CRM-1 (Sales)<br/>CRM-2 (Support)<br/>CRM-4 (Marketing)<br/>ERP-4 (Dispatch) | `POST /api/interactions/from-event` | `CRM3-B3` | Payload: `{ customer_id: 'CUST-0001', type: 'order', summary: 'Order SO-0001 dispatched', source_team: 'erp4' }`<br/>Returns `201 Created` with generated interaction ID; exact duplicate payloads sent within 60s are suppressed. | **VERIFIED (PASS)** |
| **8** | `CRM4-A2`<br/>`CRM4-A3`<br/>`CRM4-B3` | CRM-4 (Marketing Campaigns) | `GET /api/segments`<br/>`GET /api/segments/:id/customers` | `CRM3-C1` | Returns list of segments (`SEG-0001` through `SEG-0004`). Calling `/api/segments/SEG-0001/customers` evaluates criteria and returns only matching corporate Mumbai customer `CUST-0002` ("Sunrise Electronics Pvt Ltd"). | **VERIFIED (PASS)** |
| **10** | `CRM5-A1`<br/>`CRM5-A3` | CRM-5 (Customer Portal & Analytics) | `GET /api/customers`<br/>`GET /api/customers/:id` | `CRM3-A1` | Provides customer master record (`CUST-0001`..`CUST-0010`) to correlate orders, support tickets, and invoices on customer portal dashboard. | **VERIFIED (PASS)** |
| **12** | `CRM5-D1` | CRM-5 (Customer Portal 360) | `GET /api/customers/:id` | `CRM3-A1` | Provides customer profile, billing address, phone, and contact details to resolve the customer associated with support tickets and feedback. | **VERIFIED (PASS)** |
| **19** | `ERP4-A3`<br/>`ERP5-A1` | ERP-4 (Sales Orders)<br/>ERP-5 (Tax Invoices) | `GET /api/customers/:id` | `CRM3-A1` | Returns customer record including `gstin`, billing and shipping addresses, and city. Used by ERP-4 to stamp customer tax details onto sales orders and by ERP-5 to generate GST invoices. | **VERIFIED (PASS)** |

---

## 3. Bug Register (Bugs Filed and Closed)

During QA test case execution and cross-team contract validation, the following issues were discovered, logged, and resolved:

| Bug ID | Related Issue | Severity | Description | Root Cause | Resolution | Status |
| :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| **BUG-CRM3-001** | `[CRM3-B3]` | High | Duplicate event suppression in `POST /api/interactions/from-event` failed when timestamps crossed minute boundaries | Timestamp comparison used calendar minute truncation instead of sliding 60-second window | Updated query and memory check to compare composite key `(customer_id, type, summary, source_team)` with `created_at >= NOW() - INTERVAL '60 seconds'` | **CLOSED** |
| **BUG-CRM3-002** | `[CRM3-C1]` | Medium | Segment customer lookup returned zero results when city parameter casing differed (e.g. `mumbai` vs `Mumbai`) | SQL query and in-memory filter used case-sensitive equality `city = $1` | Wrapped city comparison with `LOWER(city) = LOWER($1)` in both database query and mock filter | **CLOSED** |
| **BUG-CRM3-003** | `[CRM3-D1]` | High | Merging duplicate customer records threw database duplicate key constraint violation when both customers had the same tag (e.g. `VIP`) | `UPDATE customer_tags SET customer_id = $1 WHERE customer_id = $2` failed unique index on `(customer_id, tag)` | Implemented skip/deduplicate logic: delete matching tags from `remove_id` before re-parenting, ensuring unique tag integrity | **CLOSED** |
