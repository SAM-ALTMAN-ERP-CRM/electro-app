# Issues for Team ERP6

**Context Line**:
> Team: ERP-6 HR and workforce. Database: erp6_db. Backend services/erp6 on port 5206. Frontend module frontend/src/modules/erp6 (id erp6, title HR, roles admin and hr). Our job: employee records, attendance and leave, payroll with salary slips, and sales commission. Other teams use our employee list for sales reps and engineers.

## Build Issues

### [ERP6-A1] Employees and departments API

- **Build**: Tables departments (id DEP-01, name) and employees (id EMP-0001, name, email unique, phone, department_id, role_title, manager_id nullable, join_date, base_salary numeric, active boolean default true). CRUD for both; GET /api/employees?department=&role_title=&q= (CRM-1 and CRM-2 call this with role_title=Sales Rep and role_title=Service Engineer). Seed exactly DEP-01 to DEP-05 and EMP-0001 to EMP-0012 from the shared seed contract (4 Sales Rep, 3 Service Engineer; keep these exact role_title strings).
- **Depends on**: nothing. Merge early: three teams read it.
- **Needed by**: CRM1-A2, CRM2-A2, ERP6 everything else, ERP5-C2 (employee_id link).
- **Done when**: CRUD and filters work; the seed matches the shared seed contract; ?role_title=Sales Rep returns 4 rows.

### [ERP6-A2] Employee screens

- **Build**: Page /employees (table, search box, department filter, add/edit form). Page /departments to add and rename departments.
- **Depends on**: ERP6-A1 (WAIT).
- **Done when**: you can add, edit and filter employees from the browser.

### [ERP6-A3] Manager link and deactivate

- **Build**: Employee detail page /employees/:id showing the manager and the direct reports. Rules: manager cannot be the employee themself; email must be unique (409). Replace Delete by a Deactivate button (active = false); hide inactive staff by default with a "Show inactive" checkbox. Other teams' dropdowns ( ?role_title=) must also hide inactive staff.
- **Depends on**: ERP6-A1, ERP6-A2 (WAIT).
- **Done when**: the rules are enforced with clear messages; deactivated staff disappear from the default list and from other teams' dropdowns.

### [ERP6-B1] Attendance and leave API

- **Build**: Tables attendance (id, employee_id, date, status = present/absent/half_day/leave, check_in, check_out, unique employee_id + date) and leave_requests (id LV-0001, employee_id, from_date, to_date, type = casual/ sick/earned, status = pending/approved/rejected default pending, reason). POST /api/attendance/mark (saves or updates the day), GET /api/attendance?month=YYYY-MM&employee_id=, CRUD for leave requests, PATCH /api/leave-requests/:id/decision.
- **Depends on**: ERP6-A1 (WAIT, employee ids).
- **Done when**: marking the same employee and day twice updates instead of duplicating.

### [ERP6-B2] Attendance and leave screens

- **Build**: Page /attendance: pick a date, see all active employees with Present/Absent/Half day radio buttons and a Save button. Page /leaves: apply form plus a table with Approve and Reject buttons.
- **Depends on**: ERP6-B1 (WAIT).
- **Done when**: saving attendance and approving leave work from the browser.

### [ERP6-B3] Monthly summary and leave balance

- **Build**: GET /api/attendance/summary?month= returns per employee present days, half days, absent days and leave days. Approved leave marks the weekdays in the range as leave in attendance. Each employee gets 12 leave days per year; a request above the balance returns 400. Summary table on a page.
- **Depends on**: ERP6-B1, ERP6-B2 (WAIT).
- **Needed by**: ERP6-C1 (absent days).
- **Done when**: the summary matches the marked data; over-balance leave is refused.

### [ERP6-C1] Payroll generation API

- **Build**: Table salary_slips (id, employee_id, month YYYY-MM, base_salary, hra = 40% of base, allowances = 2000, pf_deduction = 12% of base, absent_days, absent_deduction = base/30 per absent day, commission default 0, net_pay, status = generated/paid, generated_at, unique employee_id + month). POST /api/payroll/ generate {month} creates slips for all active employees (absent days from the attendance table; 0 if none) and adds commission from ERP6-D1's commissions table for that month. GET list and GET /:id.
- **Depends on**: ERP6-A1 (WAIT). ERP6-B3 (MOCK: absent days 0 until attendance exists). ERP6-D1 (MOCK: commission 0 until the table exists).
- **Done when**: net pay = base + HRA + allowances + commission minus PF minus absent deduction; the formula is correct for 3 employees.

### [ERP6-C2] Payroll screens

- **Build**: Page /payroll: choose a month, a "Generate payroll" button and a table of slips with net pay. Page / payroll/:id is a printable salary slip with earnings and deductions side by side.
- **Depends on**: ERP6-C1 (WAIT).
- **Done when**: generating shows the slips; the slip prints on one page.

### [ERP6-C3] Payroll safeguards and ledger posting

- **Build**: Generating a month twice returns 409 "Already generated" unless ?force=true. PATCH /api/salary-slips/:id/paid marks a slip paid. Card with total payroll cost for the month. When a month is generated, POST ERP-5 /api/ledger/auto {type:'salary', reference: month, amount: total} (side effect, mock: 'ledger').
- **Depends on**: ERP6-C1, ERP6-C2 (WAIT). ERP5-D1 (MOCK: log it).
- **Done when**: duplicate generation is blocked; the total card is correct; the ledger gets a salary entry (or the mock log appears).

### [ERP6-D1] Commission sync API

- **Build**: Table commissions (id, sales_rep_id, invoice_id unique, invoice_amount, rate_percent, commission_amount, month YYYY-MM, created_at). POST /api/commissions/sync fetches ERP-5 GET /api/invoices/paid ( {invoice_id, sales_rep_id, total, paid_on}; mock: 'invoices-paid') and inserts a row for each new invoice: rate 2%, or 3% if the amount is above 100000; month comes from paid_on. Returns how many were added. GET /api/commissions?month=&sales_rep_id=.
- **Depends on**: ERP6-A1 (WAIT, rep names). ERP5-B3 (MOCK: 3-row mock).
- **Needed by**: ERP6-C1, D2, D3.
- **Done when**: syncing twice adds nothing the second time; rates are applied correctly.

### [ERP6-D2] Commission screens

- **Build**: Page /commissions: "Sync now" button, month filter, table of commissions and a total per sales rep (employee name from this service's employees table).
- **Depends on**: ERP6-D1 (WAIT).
- **Done when**: syncing and filtering work from the browser.

### [ERP6-D3] Sales performance leaderboard

- **Build**: GET /api/performance/sales?month= returns per rep: name, number of deals, total sales, commission. Page /leaderboard shows a ranked table with the top performer highlighted and a CSV download button.
- **Depends on**: ERP6-D1, ERP6-D2 (WAIT).
- **Done when**: ranking is by total sales; CSV opens in Excel.

## Role Issues (Section 8b)

### [ERP6-R1] Team Lead: README and demo script

- **Build**: Keep docs/erp6/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/erp6/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a daily 10-minute check during morning standup: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 12 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [ERP6-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/erp6/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [ERP6-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/erp6/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/erp6/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /erp6/... and looks consistent.

### [ERP6-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/erp6/tests.md. Write the API spec docs/erp6/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 1, 5, 27, 28.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.
