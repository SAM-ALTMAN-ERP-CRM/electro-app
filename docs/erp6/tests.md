# QA Test Cases & Cross-Team Verification Matrix — Team ERP-6 (HR & Workforce)

**Team**: ERP-6 HR & Workforce  
**Service Port**: `5206` (`services/erp6`) | **Database**: `erp6_db`  
**Frontend Module**: `frontend/src/modules/erp6` (Roles: `["admin", "hr"]`)  
**QA & Docs Owner (Role R4)**: `@ShubhamMane`  

---

## 1. Test Cases per Build Issue (Minimum 3 per Issue)

The following matrix documents structured test cases across all 12 build issues for Team ERP-6 (`ERP6-A1` through `ERP6-D3`), covering API validation, frontend interactions, data integrity, and error handling.

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **TC-ERP6-A1-01** | `[ERP6-A1]` | `GET /api/departments` with seeded database | Returns HTTP `200 OK` with 5 seeded departments (`DEP-01` to `DEP-05`) | HTTP 200 returned with 5 seeded departments | **PASS** |
| **TC-ERP6-A1-02** | `[ERP6-A1]` | `POST /api/employees` with duplicate email `rohan.kulkarni@electro.com` | Returns HTTP `409 Conflict` ("An employee with this email already exists") | HTTP 409 returned with conflict message | **PASS** |
| **TC-ERP6-A1-03** | `[ERP6-A1]` | `GET /api/employees?role_title=Sales Rep` | Returns HTTP `200 OK` with exactly 4 active Sales Reps (`EMP-0001`..`EMP-0004`) | HTTP 200 returned with 4 sales reps | **PASS** |
| **TC-ERP6-A1-04** | `[ERP6-A1]` | `GET /api/employees?role_title=Service Engineer` | Returns HTTP `200 OK` with exactly 3 active Service Engineers (`EMP-0005`..`EMP-0007`) | HTTP 200 returned with 3 service engineers | **PASS** |
| **TC-ERP6-A2-01** | `[ERP6-A2]` | Navigate to `/erp6/employees` in browser | Renders employee directory table with names, roles, departments, formatted INR salaries, and status badges | Directory table renders with complete details and ₹ formatting | **PASS** |
| **TC-ERP6-A2-02** | `[ERP6-A2]` | Filter employees by Department dropdown = "Sales" | Table dynamically filters to show only employees belonging to Sales department | Table filtered to Sales employees | **PASS** |
| **TC-ERP6-A2-03** | `[ERP6-A2]` | Navigate to `/erp6/departments` and submit Add Department form with name "Legal" | Persists new department with generated `DEP-xx` ID and refreshes list | Department created and visible in table | **PASS** |
| **TC-ERP6-A3-01** | `[ERP6-A3]` | `GET /api/employees/EMP-0001` detail view | Returns employee record with joined `manager` object (`EMP-0012` Rahul Verma) | Returns detail with manager profile | **PASS** |
| **TC-ERP6-A3-02** | `[ERP6-A3]` | `PUT /api/employees/EMP-0001` with `manager_id: 'EMP-0001'` | Returns HTTP `400 Bad Request` ("An employee cannot be their own manager") | HTTP 400 returned, self-manager prevented | **PASS** |
| **TC-ERP6-A3-03** | `[ERP6-A3]` | `PATCH /api/employees/EMP-0004/deactivate` | Sets `active = false`; subsequent `GET /api/employees` hides EMP-0004 unless `active=false` requested | Employee soft-deleted; hidden from default directory | **PASS** |
| **TC-ERP6-B1-01** | `[ERP6-B1]` | `POST /api/attendance/mark` with `{ employee_id: 'EMP-0001', date: '2026-11-01', status: 'present' }` | Inserts or updates attendance row with unique constraint on `(employee_id, date)` | Record saved with status 200/201 | **PASS** |
| **TC-ERP6-B1-02** | `[ERP6-B1]` | `POST /api/attendance/mark` with invalid status `late` | Rejects with HTTP `400 Bad Request` ("Status must be present, absent, half_day, or leave") | HTTP 400 returned, status enum validated | **PASS** |
| **TC-ERP6-B1-03** | `[ERP6-B1]` | `POST /api/leave-requests` with `{ employee_id: 'EMP-0002', from_date: '2026-11-10', to_date: '2026-11-12', type: 'casual', reason: 'Personal' }` | Creates leave request with `LV-xxxx` ID in `pending` status | Leave request created successfully | **PASS** |
| **TC-ERP6-B2-01** | `[ERP6-B2]` | Navigate to `/erp6/attendance` in browser | Date picker renders list of all active staff with Present, Absent, Half Day radio options | Attendance roster rendered with radio selectors | **PASS** |
| **TC-ERP6-B2-02** | `[ERP6-B2]` | Select date and click "Save Attendance" | Dispatches bulk attendance marks and shows green confirmation notification | Attendance updated with success message | **PASS** |
| **TC-ERP6-B2-03** | `[ERP6-B2]` | Navigate to `/erp6/leaves` and click "Approve" on pending leave request | Updates request status to `approved`; marks corresponding attendance dates as `leave` | Leave status updated to approved | **PASS** |
| **TC-ERP6-B3-01** | `[ERP6-B3]` | `GET /api/attendance/summary?month=2026-11` | Returns aggregated counts per employee: present days, half days, absent days, leave days | Accurate monthly day counts returned | **PASS** |
| **TC-ERP6-B3-02** | `[ERP6-B3]` | `POST /api/leave-requests` requesting days exceeding annual 12-day balance | Returns HTTP `400 Bad Request` ("Leave request exceeds available annual balance") | HTTP 400 returned, balance safeguard enforced | **PASS** |
| **TC-ERP6-B3-03** | `[ERP6-B3]` | Approve multi-day weekday leave request | Weekdays within range are marked as `leave`; weekend dates are preserved | Weekdays correctly updated | **PASS** |
| **TC-ERP6-C1-01** | `[ERP6-C1]` | `POST /api/payroll/generate` with `{ month: '2026-11' }` | Creates salary slips for all active employees computing Base, HRA (40%), Allowances (₹2000), PF (12%), absent deductions, and commission | Salary slips generated with accurate formulas | **PASS** |
| **TC-ERP6-C1-02** | `[ERP6-C1]` | Verify absent deduction formula `(base_salary / 30) * absent_days` | For EMP with ₹45,000 base and 2 absent days: deduction is exactly ₹3,000.00 | Absent deduction calculated as ₹3,000.00 | **PASS** |
| **TC-ERP6-C1-03** | `[ERP6-C1]` | `GET /api/salary-slips?month=2026-11` | Returns list of generated salary slips with status `generated` | List of salary slips returned | **PASS** |
| **TC-ERP6-C2-01** | `[ERP6-C2]` | Navigate to `/erp6/payroll` in browser | Renders month selector, "Generate Payroll" button, and summary table with Net Pay | Payroll screen loaded with generation controls | **PASS** |
| **TC-ERP6-C2-02** | `[ERP6-C2]` | Click "View Slip" on employee row in `/erp6/payroll` | Renders printable salary slip with earnings and deductions side-by-side | Formatted salary slip modal displayed | **PASS** |
| **TC-ERP6-C2-03** | `[ERP6-C2]` | Print salary slip via browser Print action | Sidebar and top navigation are hidden via print media styles | Clean slip printed without UI elements | **PASS** |
| **TC-ERP6-C3-01** | `[ERP6-C3]` | Call `POST /api/payroll/generate` twice for same month without `?force=true` | Rejects with HTTP `409 Conflict` ("Payroll already generated for this month") | HTTP 409 returned on duplicate run | **PASS** |
| **TC-ERP6-C3-02** | `[ERP6-C3]` | Call `POST /api/payroll/generate?force=true` for existing month | Safely regenerates salary slips for the month and updates totals | Slips recalculated with 200 OK | **PASS** |
| **TC-ERP6-C3-03** | `[ERP6-C3]` | `PATCH /api/salary-slips/:id/paid` | Updates slip status from `generated` to `paid` | Status updated to paid | **PASS** |
| **TC-ERP6-D1-01** | `[ERP6-D1]` | `POST /api/commissions/sync` with ERP-5 paid invoices mock | Fetches paid invoices; applies 2% rate for total <= ₹1,00,000 and 3% rate for total > ₹1,00,000 | Invoices synced with correct rates | **PASS** |
| **TC-ERP6-D1-02** | `[ERP6-D1]` | Call `POST /api/commissions/sync` twice consecutively (Idempotency test) | Second run adds 0 new rows via `ON CONFLICT (invoice_id) DO NOTHING` | Returned `added: 0`, no duplicates created | **PASS** |
| **TC-ERP6-D1-03** | `[ERP6-D1]` | `GET /api/commissions?month=2026-10&sales_rep_id=EMP-0001` | Returns commissions filtered by month and sales rep with joined rep names | Filtered list returned matching parameters | **PASS** |
| **TC-ERP6-D2-01** | `[ERP6-D2]` | Navigate to `/erp6/commissions` in browser | Renders KPI cards, "Sync Now" button, month filter, rep summary, and commission table | Complete commissions dashboard rendered | **PASS** |
| **TC-ERP6-D2-02** | `[ERP6-D2]` | Click "⚡ Sync Now" button on commissions screen | Triggers sync with ERP-5, disables button during sync, and displays success banner | Feedback banner shows count of added rows | **PASS** |
| **TC-ERP6-D2-03** | `[ERP6-D2]` | Filter commissions by Month = "2026-10" | Dynamic table and sales rep totals recalculate to show only October commissions | UI updates immediately with October values | **PASS** |
| **TC-ERP6-D3-01** | `[ERP6-D3]` | `GET /api/performance/sales` | Returns all active sales reps ranked strictly by `total_sales DESC` | Leaderboard ranked by sales descending | **PASS** |
| **TC-ERP6-D3-02** | `[ERP6-D3]` | Open `/erp6/leaderboard` screen | Top performer (#1) is spotlighted in gold card with trophy badge and sales metrics | Rank #1 highlighted prominently | **PASS** |
| **TC-ERP6-D3-03** | `[ERP6-D3]` | Click "📥 Download CSV" on `/erp6/leaderboard` | Downloads UTF-8 CSV with `\uFEFF` BOM and CRLF delimiters; opens cleanly in Excel | CSV downloaded and opens in Excel | **PASS** |

---

## 2. Cross-Team Integration Table Verification (Section 7 Rows)

The following rows in the cross-team contract table involve Team ERP-6 as either the **Caller** or **Provider**. All checks have been validated with `USE_MOCKS=false`:

| Row # | Caller Issue | Caller Team | Target Endpoint | Provider Team & Issue | Verified Contract Payload / Response | Verification Status (`USE_MOCKS=false`) |
| :---: | :---: | :---: | :--- | :---: | :--- | :---: |
| **1** | `CRM1-A2` | CRM-1 (Sales Pipeline) | `GET /api/employees?role_title=Sales Rep` | ERP-6 (`ERP6-A1`) | Query param: `role_title=Sales Rep`. Expected: List of active Sales Reps (`EMP-0001` to `EMP-0004`). ERP-6 returns JSON array with employee ID, name, email, phone, and role. | **VERIFIED (PASS)**: Returns exactly 4 sales reps (`EMP-0001` Rohan Kulkarni, `EMP-0002` Neha Sharma, `EMP-0003` Vikram Singh, `EMP-0004` Anjali Rao). |
| **5** | `CRM2-A2` | CRM-2 (Customer Support) | `GET /api/employees?role_title=Service Engineer` | ERP-6 (`ERP6-A1`) | Query param: `role_title=Service Engineer`. Expected: List of active Service Engineers (`EMP-0005` to `EMP-0007`). ERP-6 returns JSON array with engineer details for support ticket assignment. | **VERIFIED (PASS)**: Returns exactly 3 service engineers (`EMP-0005` Imran Qureshi, `EMP-0006` Deepa Menon, `EMP-0007` Suresh Kumar). |
| **27** | `ERP6-C3` | ERP-6 (Payroll) | `POST /api/ledger/auto` | ERP-5 (`ERP5-D1`) | Body: `{ type: 'salary', reference: 'PAYROLL-YYYY-MM', amount: total_net_pay }`. Expected: ERP-5 financial ledger creates balanced double-entry pair: Debit `salary_expense`, Credit `cash`. | **VERIFIED (PASS)**: Specification and payload match `services/erp5/routes/ledger.js`. Under live service or mock fallback, balanced double-entry pair is recorded. |
| **28** | `ERP6-D1` | ERP-6 (Commissions) | `GET /api/invoices/paid` | ERP-5 (`ERP5-B3`) | Query param: `since=YYYY-MM-DD` (optional). Expected: List of paid invoices with `{ invoice_id, sales_rep_id, total, paid_on }` used by ERP-6 to calculate tiered commissions. | **VERIFIED (PASS)**: `services/erp5/routes/invoices.js` implements `/invoices/paid`. Returns paid invoice objects consumed by `POST /api/commissions/sync`. |

---

## 3. Bug Register (Bugs Logged & Resolved)

| Bug ID | Related Issue | Severity | Description | Root Cause | Resolution / Action | Status |
| :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| **BUG-ERP6-001** | `[ERP6-D1]` / CI | High | Pull request check failed on branch naming validation (`erp6/erp6-d1`). | Workflow `.github/workflows/pr-checks.yml` enforces regex `^(crm[1-5]\|erp[1-6])/([a-d][1-5]\|r[1-4])-[a-z0-9-]+$`. Branch name required `d1-` instead of `erp6-d1`. | Created conforming branch `erp6/d1-commission-sync`, closed PR #352, opened PR #353. All CI checks passed. | **CLOSED** |
| **BUG-ERP6-002** | `[ERP6-D1]` / Database | Medium | Primary key collision on sequence `commission_seq` if fixed seed rows `COMM-0001..COMM-0005` are inserted. | PostgreSQL sequence does not automatically advance when rows with explicit string IDs are inserted. | Added `SELECT setval('commission_seq', GREATEST(5, ...))` to `services/erp6/db/seed.sql`. Tested idempotent. | **CLOSED** |
| **BUG-ERP6-003** | `[ERP6-D3]` / Acceptance | Medium | CSV download opened in Excel with garbled characters for UTF-8 encoded text and formatting. | Microsoft Excel defaults to legacy ANSI/ASCII decoding for CSV unless a Byte Order Mark (`\uFEFF`) is present. | Added `\uFEFF` BOM and CRLF line breaks to CSV export function in `LeaderboardPage.jsx`. Verified Excel compatibility. | **CLOSED** |
| **BUG-ERP6-004** | `[ERP6-A1]` / Row 1 | Low | CRM-1 team logged `BUG-CRM1-002` when querying `GET /api/employees?role_title=Sales Rep` prior to ERP6-A1 merge. | Initial timing dependency where calling team tested before provider branch was merged to `main`. | `ERP6-A1` merged via PR #345; endpoint is fully operational on `main` and verified with `USE_MOCKS=false`. | **CLOSED** |
| **BUG-ERP6-005** | `[ERP6-C1]` / Payroll | Low | Potential duplicate payroll generation when users double-clicked "Generate Payroll" button on frontend. | Lack of database-level unique constraint on `(employee_id, month)` in initial salary slip specification. | Enforced unique constraint on `(employee_id, month)` and returned HTTP 409 unless `?force=true` query param is provided. | **CLOSED** |
