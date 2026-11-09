# QA Test Cases & Cross-Team Verification Matrix — Team ERP-5 (Finance & Invoicing)

**Team**: ERP-5 Finance, Access & App Shell  
**Service Port**: `5205` (`services/erp5`) | **Database**: `erp5_db`  
**Frontend Module**: `frontend/src/modules/erp5`  
**QA & Docs Owner (Role R4)**: `@DevGr8`

---

## 1. Test Cases per Build Issue (Minimum 3 per issue)

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **TC-ERP5-A1-01** | `[ERP5-A1]` | `POST /api/invoices` with missing `customer_id` or empty line items array | API responds with `400 Bad Request` and clear error message; transaction rolled back | Returned 400 with "customer_id and items are required" | **PASS** |
| **TC-ERP5-A1-02** | `[ERP5-A1]` | `POST /api/invoices` with valid items, subtotal ₹10,000 | Computes 9% CGST (₹900) + 9% SGST (₹900) = Total ₹11,800.00; generates sequential `INV-xxxx` | Generated INV-0006 with total ₹11,800.00 | **PASS** |
| **TC-ERP5-A1-03** | `[ERP5-A1]` | `GET /api/invoices?status=unpaid` | Returns array of unpaid invoices filtered with correct totals | Returned list filtered by status='unpaid' | **PASS** |
| **TC-ERP5-A2-01** | `[ERP5-A2]` | Navigate to `/erp5/invoices` in browser | Table loads all invoices with colored status badges (`unpaid`, `partially_paid`, `paid`) | Status badges rendered correctly | **PASS** |
| **TC-ERP5-A2-02** | `[ERP5-A2]` | Click on invoice `INV-0001` in the invoices table | Opens `/erp5/invoices/INV-0001` showing customer name, GSTIN, line items and tax breakdown | Invoices detail page displays line items breakdown | **PASS** |
| **TC-ERP5-A2-03** | `[ERP5-A2]` | Test responsive print button on invoice detail page | Activates print stylesheet; hides top navigation bar and side menu | Invoice printable view formatted cleanly | **PASS** |
| **TC-ERP5-A3-01** | `[ERP5-A3]` | Invoice detail page for total ₹11,797.64 | Displays English words: "Rupees Eleven Thousand Seven Hundred Ninety Seven and Sixty Four Paise Only" | Correct words string rendered below total | **PASS** |
| **TC-ERP5-A3-02** | `[ERP5-A3]` | Filter invoices by customer dropdown `CUST-0001` | Invoices table updates to only show records belonging to `CUST-0001` | Filtered list matches customer Aarav Mehta | **PASS** |
| **TC-ERP5-A3-03** | `[ERP5-A3]` | Create manual invoice via UI form with 2 line items | Submits `POST /api/invoices`; redirects to detail view on success with new `INV-xxxx` | Created invoice saved and displayed | **PASS** |
| **TC-ERP5-A4-01** | `[ERP5-A4]` | `POST /api/creditnotes` with `{ so_id: 'SO-0001', serial_number: 'SN-0001', amount: 1000.00 }` | Generates credit note `CN-xxxx`; updates invoice balance if linked | Created CN-0003 with status 201 | **PASS** |
| **TC-ERP5-A4-02** | `[ERP5-A4]` | `POST /api/creditnotes` with duplicate `(so_id, serial_number)` pair | Rejects duplicate return attempt with `409 Conflict` | Returned 409 Conflict error message | **PASS** |
| **TC-ERP5-A4-03** | `[ERP5-A4]` | Navigate to `/erp5/credit-notes` in UI | Displays table of credit notes with serial number, sales order ID, and amount formatted in INR | Credit notes table loads with currency formatting | **PASS** |
| **TC-ERP5-B1-01** | `[ERP5-B1]` | `POST /api/payments` with `{ invoice_id: 'INV-0001', amount: 11797.64, method: 'upi' }` | Records payment, updates invoice status to `paid`, posts balanced ledger pair | Invoice status marked 'paid', ledger pair created | **PASS** |
| **TC-ERP5-B1-02** | `[ERP5-B1]` | `POST /api/payments` with amount greater than remaining unpaid invoice balance | Rejects with `400 Bad Request` ("Payment exceeds unpaid balance") | Returned 400 error cleanly | **PASS** |
| **TC-ERP5-B1-03** | `[ERP5-B1]` | `POST /api/payments` with partial payment (50% of invoice total) | Updates invoice status to `partially_paid` | Status changed to partially_paid | **PASS** |
| **TC-ERP5-B2-01** | `[ERP5-B2]` | Click "Record Payment" button on unpaid invoice screen | Opens modal/form pre-filled with invoice ID and remaining balance | Modal opens with remaining balance pre-filled | **PASS** |
| **TC-ERP5-B2-02** | `[ERP5-B2]` | Select payment method `upi` and submit | Success badge displayed; invoice status updates live on UI | Success confirmation shown and badge updated | **PASS** |
| **TC-ERP5-B2-03** | `[ERP5-B2]` | Submit payment form without selecting payment method | Inline form validation blocks submission with "Payment method is required" | Form validation blocked submission | **PASS** |
| **TC-ERP5-B3-01** | `[ERP5-B3]` | `GET /api/reports/receivables-ageing` | Returns buckets: Current (0-30 days), 31-60 days, 61-90 days, >90 days overdue | Buckets grouped correctly based on invoice due_date | **PASS** |
| **TC-ERP5-B3-02** | `[ERP5-B3]` | `GET /api/invoices/paid?since=2026-11-01` | Returns invoices paid since given date with sales_rep_id for ERP-6 sales commission sync | Returned paid invoices with rep EMP-0001 | **PASS** |
| **TC-ERP5-B3-03** | `[ERP5-B3]` | Ageing report screen in UI | Renders receivables breakdown cards with counts and amounts | Overdue cards display accurate totals | **PASS** |
| **TC-ERP5-C1-01** | `[ERP5-C1]` | Verify `services/_shared/db.js` pool connection | Successfully connects to database `erp5_db` using environment configuration | Database query returns results | **PASS** |
| **TC-ERP5-C1-02** | `[ERP5-C1]` | Verify `services/_shared/callService.js` with `USE_MOCKS=true` | Falls back to `services/<team>/mocks/<mock>.json` if external service port is down | Returned mock fallback rows | **PASS** |
| **TC-ERP5-C1-03** | `[ERP5-C1]` | Verify `services/_shared/callService.js` with `USE_MOCKS=false` | Throws descriptive integration error when external service is unreachable | Throws connection error as expected | **PASS** |
| **TC-ERP5-C2-01** | `[ERP5-C2]` | `POST /api/auth/login` with `admin@demo.com` and password `admin123` | Returns `200 OK` with JWT token and user profile `{ id, name, role: 'admin' }` | Returned valid JWT token | **PASS** |
| **TC-ERP5-C2-02** | `[ERP5-C2]` | `POST /api/auth/login` with invalid password | Returns `401 Unauthorized` with "Invalid email or password" | Rejected with 401 | **PASS** |
| **TC-ERP5-C2-03** | `[ERP5-C2]` | `GET /api/auth/me` with Bearer JWT token in Authorization header | Decodes token and returns current user session identity | Returns user object matching token payload | **PASS** |
| **TC-ERP5-C3-01** | `[ERP5-C3]` | Login as `sales@demo.com` (`role: 'sales'`) | Role-based navigation renders only Sales and Portal sections; Finance links hidden | Role filtering applied to sidebar menu | **PASS** |
| **TC-ERP5-C3-02** | `[ERP5-C3]` | Access protected route `/erp5/users` as non-admin user | Displays "Access Denied: Admin privileges required" guard screen | Guard blocked unauthorized access | **PASS** |
| **TC-ERP5-C3-03** | `[ERP5-C3]` | Click "Logout" button in top navigation bar | Clears token from `localStorage`; redirects immediately to `/erp5/login` | Session terminated and redirected | **PASS** |
| **TC-ERP5-C4-01** | `[ERP5-C4]` | Run root startup verification script | All service directories detected; ports `5101`..`5206` checked | All 11 service ports verified | **PASS** |
| **TC-ERP5-C4-02** | `[ERP5-C4]` | Execute database schema & seed scripts sequentially | Cleanly applies DDL sequences, tables and initial data without foreign key errors | Migrations ran cleanly | **PASS** |
| **TC-ERP5-C4-03** | `[ERP5-C4]` | Check health endpoint `GET /api/health` on port 5205 | Returns `{ status: 'ok', team: 'erp5', port: 5205 }` | Health check returned 200 OK | **PASS** |
| **TC-ERP5-C5-01** | `[ERP5-C5]` | Execute end-to-end Order-to-Cash script | Verifies complete journey: Lead -> Quote -> SO -> Dispatch -> Invoice -> Payment -> Ledger | Script reports 100% passed steps | **PASS** |
| **TC-ERP5-C5-02** | `[ERP5-C5]` | Run E2E script with forced offline service | Flags exact failing step without hanging or crashing process | Identifies failed dependency accurately | **PASS** |
| **TC-ERP5-C5-03** | `[ERP5-C5]` | Check Section 5 shared seed contract validation | Validates all customer, SKU, and employee IDs against canonical shared range | Zero foreign key mismatch errors | **PASS** |
| **TC-ERP5-D1-01** | `[ERP5-D1]` | `POST /api/ledger/auto` with `{ type: 'invoice', reference: 'INV-0003', amount: 11800.00 }` | Creates balanced pair: Debit `receivables` ₹11,800, Credit `sales` ₹11,800 | Balanced pair inserted with IDs LE-xxxx | **PASS** |
| **TC-ERP5-D1-02** | `[ERP5-D1]` | Call `POST /api/ledger/auto` twice with identical type and reference (Idempotency test) | Second request returns existing pair; does not create duplicate ledger records | Returned existing entries without duplicate insert | **PASS** |
| **TC-ERP5-D1-03** | `[ERP5-D1]` | `POST /api/ledger` with single manual entry (Debit: 500, Credit: 0, Account: 'cash') | Records manual ledger entry with generated `LE-xxxx` sequence ID | Manual entry created with status 201 | **PASS** |
| **TC-ERP5-D2-01** | `[ERP5-D2]` | Navigate to `/erp5/ledger` screen | Displays table of ledger entries with formatted INR currency and colored account badges | Table rendered with ₹ formatting | **PASS** |
| **TC-ERP5-D2-02** | `[ERP5-D2]` | Filter ledger by Account dropdown = "sales" | Table filters to show only sales entries; footer totals update to reflect only visible rows | Table and totals filtered accurately | **PASS** |
| **TC-ERP5-D2-03** | `[ERP5-D2]` | Submit manual entry form from the UI with zero debit and zero credit | Form displays error: "Please provide either a Debit or Credit amount greater than 0" | Form validation blocked submission | **PASS** |
| **TC-ERP5-D3-01** | `[ERP5-D3]` | `GET /api/reports/summary` | Computes live metrics: Total Sales, Cash Received, Outstanding Receivables, Cash Balance | Numbers match ledger_entries table calculations | **PASS** |
| **TC-ERP5-D3-02** | `[ERP5-D3]` | `GET /api/reports/monthly-sales` | Groups sales volume by `YYYY-MM` in ascending chronological order | Aggregated array returned | **PASS** |
| **TC-ERP5-D3-03** | `[ERP5-D3]` | Open `/erp5/reports` in UI and click "Download CSV Report" | Downloads `financial_report_YYYY-MM-DD.csv` containing KPI metrics and monthly trend lines | CSV file downloaded with accurate values | **PASS** |

---

## 2. Cross-Team Integration Table Verification (Section 7 Rows)

The following rows in the cross-team contract table involve Team ERP-5 as either the **Caller** or **Provider**. All checks verified with `USE_MOCKS=false`:

| Row # | Caller Issue | Caller Team | Target Endpoint | Provider Team & Issue | Verified Contract Payload / Response | Verification Status |
| :---: | :---: | :---: | :--- | :---: | :--- | :---: |
| **10** | `CRM5-A1` | CRM-5 (Customer Portal) | `GET /api/invoices?customer_id=CUST-0001` | ERP-5 (`ERP5-A1`) | Returns customer's invoices list with subtotal, tax and unpaid status | **VERIFIED (PASS)** |
| **15** | `ERP2-D1` | ERP-2 (Procurement) | `POST /api/ledger/auto` `{ type: 'purchase', reference: 'PO-0001', amount }` | ERP-5 (`ERP5-D1`) | Balanced double-entry pair: Debit `purchases`, Credit `cash` | **VERIFIED (PASS)** |
| **19** | `ERP5-A1` | ERP-5 (Finance) | `GET /api/customers/CUST-0001` | CRM-3 (`CRM3-A1`) | Fetches customer billing details, name, and GSTIN to populate tax invoice | **VERIFIED (PASS)** |
| **24** | `ERP4-C3` | ERP-4 (Dispatch) | `POST /api/invoices` `{ so_id: 'SO-0001', customer_id, items }` | ERP-5 (`ERP5-A1`) | Generates GST invoice upon order dispatch handoff | **VERIFIED (PASS)** |
| **26** | `ERP4-D3` | ERP-4 (Returns) | `POST /api/creditnotes` `{ so_id, serial_number, amount }` | ERP-5 (`ERP5-A4`) | Generates credit note against returned item serial | **VERIFIED (PASS)** |
| **27** | `ERP6-C3` | ERP-6 (Payroll) | `POST /api/ledger/auto` `{ type: 'salary', reference: 'PAYROLL-2026-11', amount }` | ERP-5 (`ERP5-D1`) | Balanced double-entry pair: Debit `salary_expense`, Credit `cash` | **VERIFIED (PASS)** |
| **28** | `ERP6-D1` | ERP-6 (Commissions) | `GET /api/invoices/paid?since=2026-11-01` | ERP-5 (`ERP5-B3`) | Returns paid invoices with `sales_rep_id` for commission leaderboard calculations | **VERIFIED (PASS)** |
| **29** | *All Teams* | All 11 Modules | `POST /api/auth/login` & JWT Verification | ERP-5 (`ERP5-C1/C2/C3`) | Validates Bearer token across all microservices using shared secret `JWT_SECRET` | **VERIFIED (PASS)** |
