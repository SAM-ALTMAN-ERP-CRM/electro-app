# CRM-4 Marketing & Engagement Test Cases & Quality Assurance

> **Module**: CRM-4 Marketing & Engagement (`services/crm4` on Port 5104, `frontend/src/modules/crm4`)  
> **Database**: `crm4_db`  
> **Quality Owner**: [CRM4-R4]  

---

## 1. Test Cases Matrix (At Least 3 Per Build Issue)

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-CRM4-A1-001** | `[CRM4-A1]` | Send `GET /api/campaigns` with Bearer auth | Returns HTTP 200 with array of at least 5 seed campaigns (`CMP-0001` to `CMP-0005`) | HTTP 200, 5 seed campaigns returned | **PASS** |
| **TC-CRM4-A1-002** | `[CRM4-A1]` | Send `POST /api/campaigns` with valid name, channel, segment_id, template_id | Returns HTTP 201 with generated `CMP-xxxx` sequence ID | HTTP 201, `CMP-0006` created | **PASS** |
| **TC-CRM4-A1-003** | `[CRM4-A1]` | Send `PATCH /api/campaigns/:id/status` with `{ "status": "scheduled" }` | Returns HTTP 200, updates status to `scheduled` | HTTP 200, status updated | **PASS** |
| **TC-CRM4-A2-001** | `[CRM4-A2]` | Navigate to `/crm4/campaigns` in browser | Renders campaigns table, channel badges, and status pills | Table renders with all filter controls | **PASS** |
| **TC-CRM4-A2-002** | `[CRM4-A2]` | Open "Create Campaign" modal, verify Segment and Template dropdowns | Dropdowns populated from CRM-3 segments and CRM-4 templates | Segments and templates listed | **PASS** |
| **TC-CRM4-A2-003** | `[CRM4-A2]` | Submit new campaign via form, verify table update | Form submits, modal closes, and new campaign row appears | New campaign visible in list | **PASS** |
| **TC-CRM4-A3-001** | `[CRM4-A3]` | Send `POST /api/campaigns/CMP-0002/send` | Dispatches simulated broadcast to segment customers, creates messages, marks sent | HTTP 200, 3 messages created, status set to `sent` | **PASS** |
| **TC-CRM4-A3-002** | `[CRM4-A3]` | Send `POST /api/campaigns/CMP-0002/send` a second time | Returns HTTP 409 Conflict blocking duplicate dispatch | HTTP 409 returned with conflict error | **PASS** |
| **TC-CRM4-A3-003** | `[CRM4-A3]` | Click "Send Now" button in UI on draft campaign | Button updates state to show "✓ Sent to N customers" | Button changes to sent badge with customer count | **PASS** |
| **TC-CRM4-B1-001** | `[CRM4-B1]` | Send `GET /api/audiences` with Bearer auth | Returns HTTP 200 with 3 seed audiences (`AUD-0001` to `AUD-0003`) and member counts | HTTP 200, seed audiences returned with counts | **PASS** |
| **TC-CRM4-B1-002** | `[CRM4-B1]` | Send `POST /api/audiences` with `{ "name": "Corporate Leads" }` | Returns HTTP 201 with generated `AUD-xxxx` ID | HTTP 201, `AUD-0004` created | **PASS** |
| **TC-CRM4-B1-003** | `[CRM4-B1]` | Send `DELETE /api/audiences/:id` | Cascades deletion to audience and member records | HTTP 200, audience deleted | **PASS** |
| **TC-CRM4-B2-001** | `[CRM4-B2]` | Navigate to `/crm4/audiences` in browser | Renders list of audiences, reach rates, and total members | Audiences cards and stats display cleanly | **PASS** |
| **TC-CRM4-B2-002** | `[CRM4-B2]` | Click "Manage Members" on an audience card | Navigates to `/crm4/audiences/:id` with member table | Member roster displayed with contact details | **PASS** |
| **TC-CRM4-B2-003** | `[CRM4-B2]` | Fill out "Add Individual Member" form and submit | Member added to roster, count updates dynamically | New member row visible in table | **PASS** |
| **TC-CRM4-B3-001** | `[CRM4-B3]` | Send `POST /api/audiences/:id/import-segment` with `{ "segment_id": "SEG-0001" }` | Imports segment customers skipping existing duplicates | Returns HTTP 200 with imported and skipped counts | **PASS** |
| **TC-CRM4-B3-002** | `[CRM4-B3]` | Send import request a second time with same segment | Reports 0 imported and all skipped as duplicates | HTTP 200, 0 imported, duplicates prevented | **PASS** |
| **TC-CRM4-B3-003** | `[CRM4-B3]` | Click "Opt Out" toggle on a member in UI | Member preference toggles, reachable count decrements | Preference updated, reachable count changes | **PASS** |
| **TC-CRM4-B4-001** | `[CRM4-B4]` | Submit public enquiry form at `/crm4/enquiry` with valid fields | Stores enquiry in database and creates Lead in CRM-1 | HTTP 201, `ENQ-xxxx` and `LEAD-xxxx` created | **PASS** |
| **TC-CRM4-B4-002** | `[CRM4-B4]` | Submit enquiry with missing required phone or email | Form validation halts request and displays friendly error | Validation error displayed, request blocked | **PASS** |
| **TC-CRM4-B4-003** | `[CRM4-B4]` | Submit enquiry with `USE_MOCKS=false` when CRM-1 is offline | Returns HTTP 502 Bad Gateway to surface upstream failure honestly | HTTP 502 returned with descriptive error | **PASS** |
| **TC-CRM4-C1-001** | `[CRM4-C1]` | Send `GET /api/templates` with Bearer auth | Returns HTTP 200 with 4 seed templates (`TPL-0001` to `TPL-0004`) | HTTP 200, 4 templates returned | **PASS** |
| **TC-CRM4-C1-002** | `[CRM4-C1]` | Send `POST /api/templates` with `{ name, channel, body }` | Returns HTTP 201 with generated `TPL-xxxx` ID | HTTP 201, `TPL-0005` created | **PASS** |
| **TC-CRM4-C1-003** | `[CRM4-C1]` | Send `PUT /api/templates/:id` to update body text | Returns HTTP 200 with updated template body | HTTP 200, template body updated | **PASS** |
| **TC-CRM4-C2-001** | `[CRM4-C2]` | Navigate to `/crm4/templates` in browser | Renders template list and interactive template editor | List and editor render with channel controls | **PASS** |
| **TC-CRM4-C2-002** | `[CRM4-C2]` | Click `{{name}}`, `{{product}}`, or `{{offer}}` pill buttons | Injects placeholder tag at cursor location in textarea | Placeholder injected into template text | **PASS** |
| **TC-CRM4-C2-003** | `[CRM4-C2]` | Type in template textarea and observe live preview pane | Live preview replaces placeholders with sample values instantly | Preview updates reactively | **PASS** |
| **TC-CRM4-C3-001** | `[CRM4-C3]` | Send `POST /api/templates/TPL-0001/render` with sample values | Replaces `{{name}}`, `{{product}}`, `{{offer}}` with provided values | HTTP 200, text fully rendered | **PASS** |
| **TC-CRM4-C3-002** | `[CRM4-C3]` | Render template containing unknown placeholder `{{abc}}` | Returns warning in response payload | HTTP 200 with `warnings` array | **PASS** |
| **TC-CRM4-C3-003** | `[CRM4-C3]` | Render SMS channel template whose body exceeds 160 characters | Rejects with HTTP 400 Bad Request ("exceeds 160 character limit") | HTTP 400 returned, length limit enforced | **PASS** |
| **TC-CRM4-D1-001** | `[CRM4-D1]` | Send `GET /api/surveys` with Bearer auth | Returns HTTP 200 with 2 seed surveys (`SRV-0001` NPS and `SRV-0002` CSAT) | HTTP 200, 2 seed surveys returned | **PASS** |
| **TC-CRM4-D1-002** | `[CRM4-D1]` | Send `POST /api/surveys/:id/responses` with score 10 | Returns HTTP 201 with generated `RES-xxxx` ID | HTTP 201, response recorded | **PASS** |
| **TC-CRM4-D1-003** | `[CRM4-D1]` | Send `POST /api/surveys/:id/responses` with invalid score (15) | Rejects with HTTP 400 Bad Request (score must be 0 to 10) | HTTP 400 returned, score validated | **PASS** |
| **TC-CRM4-D2-001** | `[CRM4-D2]` | Navigate to `/crm4/surveys` in browser | Renders surveys list with total response count badges | Surveys table displays with response stats | **PASS** |
| **TC-CRM4-D2-002** | `[CRM4-D2]` | Navigate to `/crm4/surveys/SRV-0001/respond` | Renders 0-10 score selection buttons and comment box | Interactive rating buttons displayed | **PASS** |
| **TC-CRM4-D2-003** | `[CRM4-D2]` | Select score, type comment and submit survey response | Response submitted and thank-you confirmation card displayed | Response saved, thank-you screen shown | **PASS** |
| **TC-CRM4-D3-001** | `[CRM4-D3]` | Send `GET /api/surveys/SRV-0001/results` | Returns total responses, average, promoters, passives, detractors, and NPS | HTTP 200 with complete metrics | **PASS** |
| **TC-CRM4-D3-002** | `[CRM4-D3]` | Verify NPS formula on seed data (`SRV-0001`): 6 Promoters, 2 Passives, 2 Detractors | NPS = 60% - 20% = +40 (Hand calculation verified) | NPS = +40 exactly | **PASS** |
| **TC-CRM4-D3-003** | `[CRM4-D3]` | Navigate to `/crm4/surveys/SRV-0001/results` in browser | Displays Net Promoter Score badge (+40), 3 coloured breakdown bars, and 5 latest comments | Visual breakdown and comments rendered | **PASS** |

---

## 2. Cross-Team Integration Table Verification (Section 7 Rows)

The following rows in the cross-team contract table involve Team CRM-4 as **Caller** or **Provider**. All checks evaluated with `USE_MOCKS=false`:

| Row # | Caller Issue | Caller Team | Target Endpoint | Provider Team & Issue | Verified Contract Payload / Response | Verification Status (`USE_MOCKS=false`) |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **2** | `CRM4-B4`, `CRM1-C2` | CRM-4 / CRM-1 | `GET /api/products` | ERP-1 (`ERP1-A1`) | Method: `GET`. Expected: Product catalog (`SKU-0001..SKU-0015`) with price and 18% GST. | **VERIFIED (PASS)**: `services/erp1/routes/products.js` is merged on `main`. Returns 15 seed products. Enquiry form product interest dropdown populates successfully. |
| **4** | `CRM4-A3`, `CRM1-C3` | CRM-4 (Marketing) | `POST /api/interactions/from-event` | CRM-3 (`CRM3-B3`) | Body: `{ customer_id, type: 'email', summary: 'Campaign CMP-xxxx sent', source_team: 'CRM-4' }`. | **VERIFIED (PASS)**: `services/crm3/routes/interactions.js` is merged on `main` and exposes `POST /interactions/from-event`. Timeline entries appear on recipient customers. |
| **8** | `CRM4-A3`, `CRM4-B3` | CRM-4 (Marketing) | `GET /api/segments/:id/customers` | CRM-3 (`CRM3-C1`) | Returns customers filtered by segment criteria. CRM-4 broadcast simulation dispatches messages to all matching customers. | **VERIFIED (PASS)**: `services/crm3/routes/segments.js` is merged on `main`. Evaluates segment filters and returns customer list. |
| **9** | `CRM4-B4` | CRM-4 (Marketing) | `POST /api/leads` | CRM-1 (`CRM1-A1`) | Body: `{ name, phone, email, source: 'dealer'/'web'/'walk-in', product_interest, sales_rep_id: 'EMP-0001' }`. Returns `201 Created` with `LEAD-xxxx`. | **VERIFIED (PASS)**: `services/crm1/routes/leads.js` is merged on `main`. Web and dealer enquiry submissions automatically create leads in CRM-1. |

---

## 3. Bug Register (Discovered During QA & `USE_MOCKS=false` Verification)

| Bug ID | Related Issue | Severity | Description | Root Cause | Resolution / Action | Status |
| :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| **BUG-CRM4-001** | `[CRM4-A3]` / Row 4 | High | Timeline events failed when target customer had special characters in ID or undefined channel. | Channel fallback was missing when campaign channel was null. | Added safe fallback: `campaign.channel \|\| 'email'` and wrapped in resilient try/catch with `[integration-error]` log. | **FIXED** |
| **BUG-CRM4-002** | `[CRM4-B1]` / `seed.sql` | Medium | Duplicate audience member insertion failed silently in PostgreSQL if sequence was not updated. | `audience_member_seq` was not synchronized past seed records in early migrations. | Added `SELECT setval('audience_member_seq', 8, true)` in `seed.sql`. | **FIXED** |
| **BUG-CRM4-003** | `[CRM4-C3]` / Renderer | Medium | SMS templates longer than 160 characters were not rejected by the API backend. | Length validation was only enforced in frontend state rather than API route. | Added backend validation in `POST /templates/:id/render` returning HTTP 400 when length > 160 characters. | **FIXED** |
| **BUG-CRM4-004** | `[CRM4-D1]` / Responses | Low | Negative scores (e.g. -1) or non-numeric scores were accepted by SQLite/mock store. | Score type casting lacked lower bound check (`score >= 0`). | Added strict validation check: `numScore < 0 \|\| numScore > 10` returning HTTP 400. | **FIXED** |
| **BUG-CRM4-005** | `[CRM4-A3]` / Re-send | High | Sending a campaign twice did not reliably return HTTP 409 in offline mock mode. | In-memory store did not check `campaign.status === 'sent'` prior to executing send logic. | Added explicit status check at the beginning of `POST /campaigns/:id/send` returning HTTP 409 Conflict. | **FIXED** |
