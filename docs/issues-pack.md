GitHub Issues Pack v2: One App, 11 Teams
136 build issues + 44 role issues = 180 issues. All 11 teams push to one GitHub repo. When everyone
has merged, npm run dev starts the whole company app: one login screen, one role-based menu, 11 sections.
No PM-team work is needed. The combining work is done by one student: ERP-5 Member C (issues ERP5-C1
to ERP5-C5).
1. What changed from v1
Change Why
One repo (monorepo) instead of 11 repos Pushing to GitHub and running it gives one app
Teams build pages and APIs only: no own navbar, no own app shell,
no own frontend port
One shell (ERP5-C1/C3) shows every team's pages
Page routes get a team prefix ( /crm1/leads) and are registered in
one file per team ( index.jsx)
The shell finds every module automatically,
nobody edits the shell
One shared API helper (frontend api(), backend callService()) Same login token, same error handling, same
mock switch everywhere
Real login: every API checks a JWT (shared secret), every page is
behind login
"Login wired in" was missing
USE_MOCKS=true/false switch Mock data can no longer hide a broken integration
Every issue has Depends on (WAIT or MOCK) and Needed by lines You always know whom you wait for
Shared seed contract (Section 5) Customer, SKU, employee and serial IDs match
across teams
8 integration gaps fixed inside existing issues Details in Section 9
New issues: CRM4-B4, ERP5-A4, ERP5-C4, ERP5-C5 (ERP5-C1 to C3
rewritten)
Enquiry-to-lead, credit notes, start-everything,
end-to-end test
2. How to use this pack
Create all issues in one repo. Title format: [CRM1-A1] Leads table and API. The key (CRM1-A1) is how
issues refer to each other, so keep it in the title.
Labels: team ( crm1 ... erp6), member ( member-a ... member-d), and role. Assign each member their
own issues.
Issue body = the team context line (top of each team section) + Build + Depends on + Needed by +
Done when.
To code an issue: open your AI chat, paste the master prompt (Section 6), send it, then paste the issue
text and send. Run what it gives you. If something breaks, paste the error back.
Branch per issue (crm1/a1-leads-api), commit under your own name, open a PR with Closes #<number>.
Only touch files in your own folders: services/<team>/ and frontend/src/modules/<team>/.
WAIT / MOCK rule (read this once): - WAIT = you cannot finish without it. Do your other issues first, or
start the parts that do not need it. - MOCK = build now against mock data, then switch to the real call
once the other issue is merged. Mocks only work while USE_MOCKS=true. From the integration week
(week 5 in the workflow doc) everyone runs with USE_MOCKS=false, so a broken link shows as an error,
not as fake data. - Global dependencies, not repeated in every issue: every issue needs ERP5-C1
(foundation, merged in the first 2 days). Login enforcement turns on when ERP5-C3 is merged (until
then AUTH_REQUIRED=false).
Role issues (R1 to R4 per team, Section 8) are extra on top of the 12 build issues.
1. 
2. 
3. 
4. 
5. 
6. 
7. 
3. How the one app is built
electro-app/                      (the single GitHub repo)
  .env.example                    all ports, URLs, JWT_SECRET, AUTH_REQUIRED, USE_MOCKS
  package.json                    root scripts: dev, db:setup, reset, e2e
  docker-compose.yml              one Postgres with 11 databases
  scripts/                        db-setup.js, e2e.js          (ERP5-C4, ERP5-C5)
  services/
    _shared/                      auth.js, callService.js, db.js   (ERP5-C1 only)
    crm1/ ... erp6/               one backend per team
      server.js                   auto-mounts every file in routes/ at /api (do not edit)
      db/schema.sql, db/seed.sql
      routes/<resource>.js        your routers (one file per resource)
      mocks/<name>.json
  frontend/                       ONE React app (the shell)
    vite.config.js                proxies /svc/<team> to that team's backend
    src/api.js                    shared fetch helper  (ERP5-C1)
    src/App.jsx                   shell: login, sidebar, routes (ERP5-C1, C3)
    src/modules/<team>/
      index.jsx                   YOUR module file (register pages here)
      pages/*.jsx                 YOUR pages
Ports. Backend ports: CRM-1 5101, CRM-2 5102, CRM-3 5103, CRM-4 5104, CRM-5 5105, ERP-1 5201, ERP-2
5202, ERP-3 5203, ERP-4 5204, ERP-5 5205, ERP-6 5206. The whole frontend is one app on port 3000.
Eleven teams on eleven laptops is not needed: after git pull, anyone runs npm run dev and gets everything
on their own laptop.
3.1 Module file (every team has one)
// frontend/src/modules/crm1/index.jsx
import Leads from './pages/Leads.jsx';
import LeadDetail from './pages/LeadDetail.jsx';
export default {
  id: 'crm1',                       // route prefix: /crm1/...
  title: 'Sales',                   // sidebar group name
  roles: ['admin', 'sales'],        // roles that see this module (Section 4)
  routes: [
    { path: 'leads', label: 'Leads', element: <Leads /> },
    { path: 'leads/:id', element: <LeadDetail /> },              // no label = not in menu
    { path: 'approvals', label: 'Approvals', roles: ['admin'], element: <Approvals /> }, // optional route-
level roles
  ],
};
Rules: page paths written in the issues are relative to your module ( /leads means /crm1/leads). Links
inside your pages use the full path ( /crm1/leads/LEAD-0001). Never create your own BrowserRouter, navbar, or
main.jsx.
3.2 Frontend helper (ERP5-C1 writes it, everyone uses it)
// frontend/src/api.js
// api('crm1', '/api/leads?status=new')  ->  returns the "data" part, throws Error(message) on failure
// api('crm1', '/api/leads', { method: 'POST', body: {...} })
It adds the login token, turns {error} responses into thrown errors, and on 401 sends the user to /login.
Never call fetch directly and never write localhost in a page.
3.3 Backend helpers (ERP5-C1 writes them, everyone uses them)
// services/_shared/auth.js
const { requireAuth, requireRole } = require('../_shared/auth');
// in routes: router.use(requireAuth);  router.post('/users', requireRole('admin'), handler)
// admin passes every requireRole check. If AUTH_REQUIRED=false, requireAuth lets everyone in as admin (dev 
only).
// services/_shared/callService.js
const { callService } = require('../_shared/callService');
const customer = await callService('crm3', `/api/customers/${id}`, { mock: 'customer' });
await callService('erp5', '/api/invoices', { method: 'POST', body: {...}, mock: 'invoice-created' });
callService rules: it signs a short service token, calls <TEAM>_URL (default http://localhost:<port>), returns
the data part. If the other team answers with an error (400, 404, 409) the error is passed on unchanged. If the
other team is unreachable: with USE_MOCKS=true it logs [mock] used for crm3/api/customers/CUST-0001 and
returns mocks/<mock>.json; with USE_MOCKS=false it throws a 502 crm3 is not reachable. Side-effect calls
(timeline events, ledger posting, notifications) are wrapped in try/catch by the caller: log [integration-error]
and carry on, so a down partner never blocks the main action. The end-to-end test (ERP5-C5) checks that the
side effects really arrived.
4. Who sees what (roles and menu)
Roles: admin (also acts as manager and sees everything), sales, support, warehouse, finance, hr. Manager
means admin.
Module Sidebar title Roles
crm1 Sales admin, sales
crm2 Support admin, support
crm3 Customers admin, sales, support
crm4 Marketing admin, sales
crm5 Portal and Dashboards all roles
erp1 Inventory admin, warehouse, sales
erp2 Purchasing admin, warehouse, finance
erp3 Production admin, warehouse
erp4 Orders and Dispatch admin, sales, warehouse
erp5 Finance and Users admin, finance (Users page: admin only)
erp6 HR admin, hr
Demo logins (ERP5-C2 seeds them, password demo123): admin@demo.com, sales@demo.com, support@demo.com, 
warehouse@demo.com, finance@demo.com, hr@demo.com.
5. Shared seed contract (everyone's seed data must use these
IDs)
Teams still write their own seed.sql, but any ID that points into another team's data must come from this
list. Nothing else may be invented for cross-team fields.
Customers (CRM-3, CUST-0001 to CUST-0010): CUST-0001 Aarav Mehta (retail, Mumbai) · CUST-0002
Sunrise Electronics Pvt Ltd (corporate, Mumbai) · CUST-0003 Priya Nair (retail, Kochi) · CUST-0004 BrightHome
Retail LLP (dealer, Pune) · CUST-0005 Kiran Patel (retail, Ahmedabad) · CUST-0006 Metro Offices Ltd (corporate,
Delhi) · CUST-0007 Sneha Iyer (retail, Chennai) · CUST-0008 Gadget Hub (dealer, Bengaluru) · CUST-0009 is a
duplicate of CUST-0001 (same phone) · CUST-0010 is a duplicate of CUST-0002 (same email). Only CRM-3
uses CUST-0009 and 0010. Corporate and dealer customers have a 15-character GSTIN, for example 
27AABCS1234F1Z5.
Products (ERP-1): SKU-0001 55-inch 4K Smart TV ₹42,990 · SKU-0002 43-inch Full HD TV ₹24,990 · SKU-0003
65-inch OLED TV ₹94,990 · SKU-0004 Soundbar 2.1 ₹8,990 · SKU-0005 Soundbar 5.1 ₹17,990 · SKU-0006
Wireless Headphones ₹3,499 · SKU-0007 Bluetooth Earbuds ₹2,299 · SKU-0008 20W Fast Charger ₹899 ·
SKU-0009 Power Bank 20000mAh ₹1,799 · SKU-0010 Bluetooth Speaker ₹4,999 · SKU-0011 Party Speaker
₹14,999 · SKU-0012 Mixer-Grinder 750W ₹3,999 · SKU-0013 Air Fryer 4L ₹6,499 · SKU-0014 Microwave Oven
25L ₹9,999 · SKU-0015 Induction Cooktop ₹2,999. Categories: 0001 to 0003 TV; 0004 to 0007, 0010, 0011
Audio; 0008, 0009 Mobile accessory; 0012 to 0015 Appliance. Components (category Component):
SKU-0101 55-inch Panel · SKU-0102 Mainboard · SKU-0103 Power Supply · SKU-0104 Remote · SKU-0105
Packaging Box. Warehouses: WH-01 Mumbai (main), WH-02 Delhi, WH-03 Bengaluru. Stock rule for demos:
SKU-0003 has total stock 3 (below reorder level 10), SKU-0102 has total stock 4, everything else has 25 to 120
spread over the warehouses. Serials: ERP-1 seeds TV55-2611-0001 to TV55-2611-0030 for SKU-0001. 0001 to
0005 are sold (to CUST-0001 to CUST-0005 in that order), 0006 to 0030 are in_stock.
Employees (ERP-6): EMP-0001 Rohan Kulkarni, EMP-0002 Neha Sharma, EMP-0003 Vikram Singh, EMP-0004
Anjali Rao (all role_title = Sales Rep) · EMP-0005 Imran Qureshi, EMP-0006 Deepa Menon, EMP-0007 Suresh
Kumar (all Service Engineer) · EMP-0008 Meera Joshi (HR Manager) · EMP-0009 Arjun Das (Warehouse
Manager) · EMP-0010 Kavita Shah (Finance Manager) · EMP-0011 Manoj Pillai (Production Supervisor) ·
EMP-0012 Rahul Verma (Admin). Departments DEP-01 Sales, DEP-02 Support, DEP-03 HR, DEP-04 Warehouse
and Production, DEP-05 Finance. Dealers (CRM-1): DLR-0001 BrightHome Retail (Pune, gold, same business
as CUST-0004), DLR-0002 Gadget Hub (Bengaluru, silver, same as CUST-0008), DLR-0003 to DLR-0005 any. 
Orders (ERP-4): SO-0001 to SO-0005 for CUST-0001 to CUST-0005, each containing SKU-0001; SO-0001 to
SO-0005 have dispatches DSP-0001 to DSP-0005 using serials TV55-2611-0001 to 0005. Invoices (ERP-5):
INV-0001 to INV-0005 for SO-0001 to SO-0005. Warranties (CRM-2): the five serials above; 0001 to 0003
purchased 3 months ago (active), 0004 and 0005 purchased 2 years ago (expired). Sales reps on records:
sales_rep_id is always one of EMP-0001 to EMP-0004. Users: USR-0001 to USR-0006; sales@demo.com is
linked to EMP-0001.
6. Master prompt (paste this first, every time)
You are my senior developer and coding mentor. I am a college student in a
team of 4 building one small part of ONE shared end-to-end app (CRM + ERP) for
an electronics company. All 11 teams push to one GitHub repo. When everyone has
merged, `npm run dev` starts the whole app: one login screen, one menu, one
section per team. I will paste a GitHub issue after this message. Build exactly
what the issue asks, nothing more.
TECH STACK (do not change it)
- Backend: Node.js 18+ + Express, PostgreSQL via `pg`, plus `dotenv`, `cors`.
- Frontend: React (Vite) + react-router-dom, plain CSS. No UI library, no chart
  library. Add another package only if the issue says so.
WHERE MY FILES GO (only touch my own team folders)
- Backend: services/<team>/routes/<resource>.js (an Express Router with full
  paths like router.get('/leads', ...)), services/<team>/db/schema.sql,
  services/<team>/db/seed.sql, services/<team>/mocks/<name>.json.
  server.js already mounts every file in routes/ at /api. Do not edit server.js
  or anything in services/_shared/.
- Frontend: frontend/src/modules/<team>/pages/<Page>.jsx and the module file
  frontend/src/modules/<team>/index.jsx (default export {id, title, roles,
  routes:[{path,label,element,roles?}]}). Page paths are relative to my module.
  No BrowserRouter, no navbar, no main.jsx, no App.jsx of my own.
- If a file already exists, edit it and keep my teammates' code. Never delete or
  rewrite their parts.
SHARED HELPERS (already in the repo, just use them)
- Backend: const { requireAuth, requireRole } = require('../_shared/auth');
  const { callService } = require('../_shared/callService');
  callService(team, path, { method, body, mock }) calls another team and returns
  its data. If the team is down and USE_MOCKS=true it logs "[mock] used for
  <name>" and returns services/<team>/mocks/<mock>.json; if USE_MOCKS=false it
  throws. Side effects (timeline, ledger, notifications) go in try/catch: log
  "[integration-error]" and carry on. Create the mock file with 3 realistic rows
  using the exact field names in the issue.
- Frontend: import { api } from '../../../api'; api('crm1', '/api/leads').
  Never use fetch directly, never write localhost.
- If these helpers are not merged yet, tell me and write the code as if they
  exist. Do not recreate them.
PORTS (backend): CRM-1 5101, CRM-2 5102, CRM-3 5103, CRM-4 5104, CRM-5 5105,
ERP-1 5201, ERP-2 5202, ERP-3 5203, ERP-4 5204, ERP-5 5205, ERP-6 5206.
The frontend is one app on port 3000.
API RULES
- REST + JSON, paths start with /api/<resource>. Success: { "data": ... }.
  Failure: { "error": "clear message" } with the right status (400 bad input,
  404 not found, 409 duplicate).
- Validate input. Parameterised SQL ($1, $2) only.
- IDs are text with a prefix and a Postgres sequence, e.g. SKU-0001, SO-0001.
- Money in INR with 2 decimals. Dates as YYYY-MM-DD. GST is 18%.
- Use these exact IDs for anything that points into another team's data:
  customers CUST-0001 to CUST-0008, products SKU-0001 to SKU-0015 and
  SKU-0101 to SKU-0105, sales reps EMP-0001 to EMP-0004, service engineers
  EMP-0005 to EMP-0007, warehouses WH-01 to WH-03.
- Protect routes with router.use(requireAuth). Read PORT and DATABASE_URL from
  .env. schema.sql and seed.sql must be re-runnable on an empty database.
FRONTEND RULES
Simple, clean pages: heading, table, form, buttons. Show a loading text, an
empty-state message and friendly error messages. Statuses as coloured badges.
Format money with toLocaleString('en-IN') and a ₹ sign.
HOW TO ANSWER
1. Say in 3 to 5 lines what you will build.
2. Give every new or changed file in full, with its path as a heading, ready to
   copy-paste.
3. Give the SQL (tables + 5 realistic seed rows that follow the shared IDs).
4. Give the commands to run it and 3 sample requests I can test.
5. Put short comments in simple English so I can explain it in the viva.
6. Do not add extra features. If something is unclear, take the simplest
   assumption and tell me what you assumed.
The issue follows:
7. Cross-team contract table (the integration checklist)
Each row is one real call between teams. Caller builds the call, Provider builds the endpoint. ERP5-C5 tests
every row with mocks off.
# Caller issue Calls Provider issue
1 CRM1-A2 ERP-6 GET /api/employees?role_title=Sales Rep ERP6-A1
2 CRM1-C2, CRM4-B4 ERP-1 GET /api/products ERP1-A1
3 CRM1-C3 ERP-4 POST /api/sales-orders ERP4-A1
4 CRM1-C3, CRM2-A1, CRM2-
C3, CRM4-A3, ERP4-C3
CRM-3 POST /api/interactions/from-event CRM3-B3
5 CRM2-A2 ERP-6 GET /api/employees?role_title=Service
Engineer
ERP6-A1
6 CRM2-B3 ERP-4 GET /api/dispatches ERP4-C1
7 CRM2-C3 ERP-4 POST /api/returns/from-rma ERP4-D1
8 CRM4-A2, A3, B3 CRM-3 GET /api/segments, /api/segments/:id/
customers
CRM3-C1
9 CRM4-B4 CRM-1 POST /api/leads CRM1-A1
10 CRM5-A1, A3 CRM-3 customers, ERP-4 sales-orders, CRM-2 tickets (GET
and POST), ERP-5 invoices
CRM3-A1, ERP4-A1,
CRM2-A1, ERP5-A1
11 CRM5-B1, B3, C1, C3, D1 CRM-1 leads, opportunities, quotes CRM1-A1, B1, C1
12 CRM5-D1 CRM-2 tickets, CRM-3 customers CRM2-A1, CRM3-A1
13 ERP1-D3 ERP-2 POST /api/purchase-requests ERP2-B1
14 ERP2-D1 ERP-1 POST /api/stock/adjust ERP1-B1
15 ERP2-D1 ERP-5 POST /api/ledger/auto (type purchase) ERP5-D1
# Caller issue Calls Provider issue
16 ERP3-A3 ERP-1 GET /api/stock/check ERP1-B3
17 ERP3-A3 ERP-2 POST /api/purchase-requests (short
components)
ERP2-B1
18 ERP3-C1, C3 ERP-1 POST /api/stock/adjust, POST /api/serials/
bulk
ERP1-B1, C1
19 ERP4-A3, ERP5-A1 CRM-3 GET /api/customers/:id CRM3-A1
20 ERP4-B1 ERP-1 GET /api/stock/check ERP1-B3
21 ERP4-B3 ERP-3 POST /api/work-orders (shortage) ERP3-B3
22 ERP4-C1 ERP-1 POST /api/serials/allocate ERP1-C3
23 ERP4-C3 ERP-1 POST /api/stock/adjust (negative), 
PATCH /api/serials/:serial/status (sold)
ERP1-B1, C3
24 ERP4-C3 ERP-5 POST /api/invoices ERP5-A1
25 ERP4-D3 ERP-1 serial status and stock/adjust (+1) ERP1-C3, B1
26 ERP4-D3 ERP-5 POST /api/creditnotes ERP5-A4
27 ERP6-C3 ERP-5 POST /api/ledger/auto (type salary) ERP5-D1
28 ERP6-D1 ERP-5 GET /api/invoices/paid ERP5-B3
29 every team ERP-5 JWT login (token checked by _shared/auth.js) ERP5-C1, C2, C3
8a. Issues by team
Every issue below follows: Build, Depends on, Needed by (only when someone else uses it), Done when.
Global dependencies (ERP5-C1 foundation, ERP5-C3 login) are not repeated.
CRM-1 · Sales pipeline
Context line to paste at the top of every CRM-1 issue: Team: CRM-1 Sales pipeline. Database: crm1_db.
Backend services/crm1 on port 5101. Frontend module frontend/src/modules/crm1 (id crm1, title Sales,
roles admin and sales). Our job: track sales leads, opportunities and quotes for dealers and direct
customers.
Member A · Lead capture and scoring
[CRM1-A1] Leads table and API
Build: Table leads (id LEAD-0001, name, phone, email, source = dealer/web/walk-in, product_interest, status
= new/contacted/qualified/lost default new, score int default 0, sales_rep_id text (an EMP id), created_at).
Endpoints in routes/leads.js: GET /api/leads (optional ?status=), GET /api/leads/:id, POST, PUT /:id,
DELETE /:id. Validate: name required, source and status must be from the allowed lists. Seed 5 leads with a
mix of sources and sales_rep_id from EMP-0001 to EMP-0004.
Depends on: nothing from other teams.
Needed by: CRM1-A2, A3, B1 (lead_id), CRM4-B4 (creates leads here), CRM5-B1 and CRM5-D1 (read leads).
Done when: table and 5 seed leads exist; all five endpoints work in Postman; no name returns 400.
[CRM1-A2] Lead screens
Build: Pages /leads (table of name, source, status, score; status filter dropdown; "Add lead" form; edit form;
delete button) and register them in modules/crm1/index.jsx. The "sales rep" field is a dropdown filled from
ERP-6: api('erp6', '/api/employees?role_title=Sales Rep'). Status is a coloured badge.
Depends on: CRM1-A1 (WAIT, same person). ERP6-A1 (MOCK: until merged, use a hard-coded list of the 4
reps EMP-0001 to EMP-0004 in the page, then switch to the API call).
Done when: you can add, edit, delete and filter leads from the one app at /crm1/leads; the list refreshes
after each change; the rep dropdown shows real ERP-6 employees once ERP6-A1 is merged.
[CRM1-A3] Lead scoring and Hot leads
Build: On create and update calculate score: source dealer +30, web +20, walk-in +10; email present +10;
phone present +10; product_interest filled +10 (maximum 100). Recalculate on every PUT. Add GET /api/leads/
hot (score 60 or more); define this route before /:id. Show a "Hot" badge in the table.
Depends on: CRM1-A1 (WAIT), CRM1-A2 (WAIT, for the badge).
Done when: new leads get a score automatically; editing a lead updates it; /api/leads/hot returns only 60+
leads; the badge shows in the UI.
Member B · Opportunity pipeline
[CRM1-B1] Opportunities table and API
Build: Table opportunities (id OPP-0001, lead_id, customer_id nullable (a CUST id), title, expected_value
numeric, stage = prospect/proposal/negotiation/won/lost default prospect, expected_close_date, sales_rep_id,
created_at). CRUD plus PATCH /api/opportunities/:id/stage {stage}. lead_id must exist in leads (400 if not). 6
seed rows spread over the stages, lead_ids from the seed leads, customer_ids from CUST-0001 to CUST-0008.
Depends on: CRM1-A1 (WAIT, needs lead IDs).
Needed by: CRM1-B2, B3, C1 (opportunity_id), CRM5-B1, C1, C3 (read opportunities).
Done when: CRUD and the stage endpoint work; seed rows cover all stages; invalid stage returns 400.
[CRM1-B2] Pipeline board
Build: Page /pipeline: 5 columns (one per stage). Each card shows title and ₹ value, with a "Move to next
stage" button (no drag and drop). Total ₹ value at the top of each column.
Depends on: CRM1-B1 (WAIT).
Done when: cards appear in the right columns; clicking the button moves a card and updates the column
totals.
[CRM1-B3] Stage rules and summary
Build: A stage can only move one step forward (or to lost). Moving to won is allowed only if an accepted quote
exists: query GET /api/quotes?opportunity_id=...&status=accepted from this same service (use 
callService('crm1', ...) with mock: 'quotes-accepted' until C1 is merged). Add GET /api/opportunities/
summary (count and total value per stage) and show it above the board.
Depends on: CRM1-B1 (WAIT). CRM1-C1 (MOCK: use the mock file until the quotes API is merged).
Done when: skipping stages returns 400 with a clear message; won without an accepted quote is blocked;
summary numbers match the board.
Member C · Quotation builder and discounts
[CRM1-C1] Quotes tables and API
Build: Tables quotes (id QUO-0001, opportunity_id, customer_id, dealer_id nullable (a DLR id), sales_rep_id,
status = draft/sent/accepted/rejected default draft, discount_percent default 0, needs_approval boolean
default false, approved boolean default false, rejection_reason text nullable, created_at) and quote_items (id,
quote_id, sku, product_name, quantity, unit_price). POST /api/quotes accepts items in the same request (one
transaction). GET /api/quotes/:id returns items plus subtotal, discount amount, GST 18% and total. GET /api/
quotes supports ?opportunity_id=, ?status=, ?dealer_id=. Seed 4 quotes using SKU-0001 to SKU-0015 and
customers CUST-0001 to CUST-0008.
Depends on: CRM1-B1 (MOCK: store opportunity_id as plain text and use OPP-0001 to OPP-0006 in seeds, no
foreign key needed).
Needed by: CRM1-B3, C2, C3, D2, D3, CRM5-B1, B3.
Done when: you can create a quote with 3 items and GET shows the correct totals; the three filters work.
[CRM1-C2] Quote builder screen
Build: Page /quotes/new: choose opportunity ID, add item rows (SKU dropdown, quantity, price filled
automatically), discount % box, live totals (subtotal, discount, GST, total). Product list from ERP-1: api('erp1',
'/api/products'). Page /quotes lists all quotes. Save as draft.
Depends on: CRM1-C1 (WAIT). ERP1-A1 (MOCK: until merged, use a local array of 3 products from the shared
seed list).
Done when: totals update live as you type; saving creates a quote that appears in the list.
[CRM1-C3] Discount rule, quote status and order handoff
Build: If discount_percent is above 5, set needs_approval = true and block moving to sent until approved =
true (set by CRM1-D3). Add PATCH /api/quotes/:id/status (draft to sent, sent to accepted or rejected). When a
quote becomes accepted: (1) POST to ERP-4 /api/sales-orders with {quote_id, customer_id, sales_rep_id,
items:[{sku, product_name, quantity, unit_price}]}; (2) post a timeline event to CRM-3 /api/interactions/
from-event {customer_id, type:'order', summary:'Quote QUO-xxxx accepted', source_team:'CRM-1'}. Both are
side effects: wrap in try/catch and log failures; a 409 from ERP-4 (order already exists) is fine.
Depends on: CRM1-C1 (WAIT). CRM1-D3 (MOCK: until approvals exist, set approved=true by hand in the
database to test). ERP4-A1 (MOCK: log the payload). CRM3-B3 (MOCK: log the payload).
Needed by: CRM1-B3 (accepted quotes), ERP4-A1 (receives the order).
Done when: a 10% discount quote cannot be sent without approval; accepting a quote creates an ERP-4 order
(or logs the mock) and a timeline entry.
Member D · Dealer accounts and quote approval
[CRM1-D1] Dealers table and API
Build: Table dealers (id DLR-0001, name, contact_person, phone, email, city, tier = gold/silver/bronze,
credit_limit numeric, status = active/inactive default active). CRUD plus GET /api/dealers?q=&city=. Seed
DLR-0001 to DLR-0005 as in the shared seed contract (tiers spread across gold, silver, bronze).
Depends on: nothing.
Needed by: CRM1-D2, D3, C1 (dealer_id).
Done when: CRUD works; search by name or city works; 5 seed dealers across tiers.
[CRM1-D2] Dealer screens
Build: Page /dealers (table, search box, city filter, add/edit form). Page /dealers/:id shows dealer details
and that dealer's quotes via GET /api/quotes?dealer_id=....
Depends on: CRM1-D1 (WAIT). CRM1-C1 (MOCK: show an empty "No quotes yet" state until the quotes API
exists).
Done when: you can manage dealers from the browser and see each dealer's quotes on its page.
[CRM1-D3] Quote approval screen
Build: GET /api/approvals (quotes with needs_approval = true, approved = false and status draft), PATCH /api/
quotes/:id/approve (sets approved = true) and /reject {reason} (stores rejection_reason). Both only for role
admin ( requireRole('admin')). Page /approvals (route-level roles: ['admin']): table with approve and reject
buttons. Show each dealer's tier next to the quote (gold up to 15% discount, silver 10%, bronze 5%) as a hint.
Depends on: CRM1-C1 (WAIT), CRM1-D1 (WAIT).
Needed by: CRM1-C3 (the send step checks approved).
Done when: approving a quote lets CRM1-C3's flow send it; rejecting stores the reason and shows it on the
quote; a non-admin gets 403.
Role issues for CRM-1: CRM1-R1 to CRM1-R4 (Section 8b)
CRM-2 · Support and warranty
Context line to paste at the top of every CRM-2 issue: Team: CRM-2 Support and warranty. Database:
crm2_db. Backend services/crm2 on port 5102. Frontend module frontend/src/modules/crm2 (id crm2, title
Support, roles admin and support). Our job: handle customer support tickets, warranty checks by serial
number and product returns (RMA).
Member A · Ticketing and SLA timers
[CRM2-A1] Tickets table and API
Build: Table tickets (id TKT-0001, customer_id, customer_name, serial_number nullable, subject, description,
priority = low/medium/high, status = open/in_progress/resolved/closed default open, assigned_to nullable (an
EMP id of a service engineer), created_at, due_at, resolved_at). Endpoints: GET /api/tickets (filters ?status= ?
priority= ?customer_id=), GET /:id, POST, PUT /:id, PATCH /api/tickets/:id/status. Setting resolved fills
resolved_at. After a ticket is created, post a timeline event to CRM-3 /api/interactions/from-event
{customer_id, type:'ticket', summary:'Ticket TKT-xxxx: <subject>', source_team:'CRM-2'} (side effect, try/
catch). 6 seed tickets using CUST-0001 to CUST-0008 and EMP-0005 to EMP-0007.
Depends on: CRM3-B3 (MOCK: log the payload until the endpoint exists).
Needed by: CRM2-A2, A3, C1 (ticket_id), D1, CRM5-A1, A3 (portal reads and creates tickets), CRM5-D1.
Done when: all endpoints work; 6 seed tickets; resolved fills resolved_at; a created ticket produces a timeline
event (or the mock log).
[CRM2-A2] Ticket screens
Build: Page /tickets (table, status and priority filters, "New ticket" form) and /tickets/:id (details, status
dropdown that saves). The "assigned to" field is a dropdown from ERP-6: api('erp6', '/api/employees?
role_title=Service Engineer').
Depends on: CRM2-A1 (WAIT). ERP6-A1 (MOCK: hard-code EMP-0005 to EMP-0007 until merged).
Done when: you can create a ticket, filter the list and change status from the browser.
[CRM2-A3] SLA timer and comments
Build: On create set due_at = created_at + 4 hours (high), 24 hours (medium), 72 hours (low). GET /api/
tickets/overdue (past due and not resolved). In the UI show a red "Overdue" badge or "x h left". Table 
ticket_comments (id, ticket_id, author, text, created_at) with POST and GET /api/tickets/:id/comments, shown
on the ticket page; the author is the logged-in user's name.
Depends on: CRM2-A1 (WAIT), CRM2-A2 (WAIT, for the ticket page).
Done when: due_at is set automatically; overdue tickets show a red badge; comments can be added and
listed.
Member B · Warranty lookup by serial number
[CRM2-B1] Warranty table and lookup API
Build: Table warranties (serial_number primary key, sku, product_name, customer_id, purchase_date,
warranty_months default 12, created_at). GET /api/warranties, POST /api/warranties, GET /api/warranty/:serial
returning the record plus expires_on and status (active/expired) calculated from today. Seed the 5 serials
TV55-2611-0001 to 0005 as in the shared seed contract (0001 to 0003 active, 0004 and 0005 expired).
Depends on: nothing.
Needed by: CRM2-B2, B3, C3.
Done when: lookup of a seeded serial returns correct expires_on and status; unknown serial returns 404.
[CRM2-B2] Warranty check screen
Build: Page /warranty: search box for serial number; result card (product, purchase date, expires on) with a
green "In warranty" or red "Expired" badge; a "not found" message; below it, a list of all registered serials.
Depends on: CRM2-B1 (WAIT).
Done when: searching works for found, expired and unknown serials; the list shows below.
[CRM2-B3] Sync warranties from dispatch
Build: POST /api/warranty/sync calls ERP-4 GET /api/dispatches (rows with serial_number, sku, customer_id,
ship_date; mock: 'dispatches' with 5 rows), inserts serials not yet present using ship_date as purchase_date
(product_name looked up by sku is optional, use sku if unknown), and returns how many were added. "Sync
from dispatch" button on the screen.
Depends on: CRM2-B1 (WAIT). ERP4-C1 (MOCK: 5-row mock until the dispatch API is merged).
Done when: pressing the button adds new rows; pressing it again adds none.
Member C · RMA (return) requests
[CRM2-C1] RMA table and API
Build: Table rmas (id RMA-0001, ticket_id, serial_number, reason, status = requested/approved/rejected/
received/closed default requested, outcome = restock/repair/credit_note nullable, requested_at, decided_at).
CRUD plus PATCH /api/rmas/:id/decision {status, outcome}. Approving requires an outcome (else 400). Seed 3
RMAs.
Depends on: CRM2-A1 (MOCK: ticket_id is plain text, seed with TKT-0001 to TKT-0003).
Needed by: CRM2-C2, C3, ERP4-D1 (receives RMAs).
Done when: CRUD and decision endpoint work; approving without outcome returns 400.
[CRM2-C2] RMA screens
Build: Page /rmas (table and "Request RMA" form: ticket id, serial, reason). Page /rmas/:id (details, approve
and reject buttons, outcome dropdown).
Depends on: CRM2-C1 (WAIT).
Done when: you can request, approve and reject an RMA from the browser.
[CRM2-C3] Warranty rule and return handoff
Build: An RMA can only be requested if the serial is in warranty (call this service's GET /api/warranty/:serial;
expired returns 400 "Out of warranty"). When an RMA is approved with an outcome, POST to ERP-4 /api/
returns/from-rma with {rma_id, serial_number, reason, outcome} (ERP-4 owns returns; ERP-4 then calls ERP-1
and ERP-5). Also post a timeline event to CRM-3 (type ticket, source_team CRM-2). Both are side effects: log
failures. Status timeline (requested, approved, received, closed) on the detail page.
Depends on: CRM2-C1 (WAIT), CRM2-B1 (WAIT). ERP4-D1 (MOCK: log the payload until
/api/returns/from-rma exists). CRM3-B3 (MOCK: log).
Needed by: ERP4-D1.
Done when: an expired serial is refused; approving creates an ERP-4 return (or logs the mock); the timeline
highlights the current step.
Member D · Service centre assignment and reports
[CRM2-D1] Service centres and assignment API
Build: Tables service_centres (id SC-0001, name, city, phone, capacity int, active boolean default true) and 
ticket_assignments (id, ticket_id, centre_id, assigned_at). CRUD for centres, POST /api/assignments {ticket_id,
centre_id}, GET /api/assignments?ticket_id=. Assigning a ticket twice replaces the earlier assignment. 4 seed
centres.
Depends on: CRM2-A1 (MOCK: ticket_id is plain text, use TKT-0001 to TKT-0006 in seeds).
Done when: centres CRUD works; assigning twice replaces; 4 seed centres.
[CRM2-D2] Assign screen
Build: Page /centres to manage centres. Page /assign lists unassigned tickets (from this service's GET /api/
tickets, minus assigned ones) with a centre dropdown and an Assign button.
Depends on: CRM2-D1 (WAIT), CRM2-A1 (WAIT).
Done when: assigning from the page removes the ticket from the unassigned list.
[CRM2-D3] Support reports
Build: GET /api/reports/tickets-summary: counts by status and priority, average resolution hours, overdue
count, tickets per centre. Page /reports with tables plus simple HTML/CSS bar charts (no chart library).
Depends on: CRM2-A1 (WAIT), CRM2-A3 (WAIT, for overdue), CRM2-D1 (WAIT).
Done when: the numbers match the tickets table; the page loads without errors even with no data.
Role issues for CRM-2: CRM2-R1 to CRM2-R4 (Section 8b)
CRM-3 · Customer 360
Context line to paste at the top of every CRM-3 issue: Team: CRM-3 Customer 360. Database: crm3_db.
Backend services/crm3 on port 5103. Frontend module frontend/src/modules/crm3 (id crm3, title Customers,
roles admin, sales and support). Our job: keep the single customer master (used by every other team)
with contacts, history, segments and clean data.
Member A · Customer and contact master
[CRM3-A1] Customers and contacts API
Build: Tables customers (id CUST-0001, name, type = retail/corporate/dealer, email, phone, gstin nullable,
billing_address, shipping_address, city, created_at) and contacts (id, customer_id, name, phone, email,
designation). CRUD for customers (GET list supports ?q= and ?type=), GET /api/customers/:id (returns gstin;
used by ERP-4, ERP-5, CRM-5), POST and GET /api/customers/:id/contacts. Seed exactly the 10 customers in
the shared seed contract (CUST-0001 to CUST-0010, including the two duplicate rows), each with 1 to 2
contacts.
Depends on: nothing. This is the most-used API in the project: merge it early.
Needed by: CRM3-A2 and the rest of CRM-3, ERP4-A3, ERP5-A1, CRM5-A1, CRM5-D1.
Done when: all endpoints work; the 10 seed customers match the shared seed contract.
[CRM3-A2] Customer screens
Build: Page /customers (table, search box, type filter, add/edit form including both addresses). Page /
customers/:id (details, contacts table, add-contact form).
Depends on: CRM3-A1 (WAIT).
Done when: you can add, edit and search customers and add contacts from the browser.
[CRM3-A3] Validation rules
Build: Backend validation plus inline messages in the form: phone must be 10 digits; email format; email
unique (409 on duplicate); GSTIN required and 15 characters for corporate and dealer types; a "Same as billing
address" checkbox copies the address. Enforce email uniqueness in the API code (not as a database UNIQUE
constraint), because the shared seed deliberately contains two duplicate rows (CUST-0009 and CUST-0010) for
the merge feature.
Depends on: CRM3-A1 (WAIT), CRM3-A2 (WAIT, for the form).
Done when: each bad input is rejected with a clear message and nothing is saved.
Member B · Interaction timeline
[CRM3-B1] Interactions API
Build: Table interactions (id, customer_id, type = call/email/meeting/ticket/order, summary, source_team,
created_by, created_at). POST /api/interactions, GET /api/customers/:id/interactions (newest first, supports ?
type= and ?from=&to=). 10 seed interactions over CUST-0001 to CUST-0003.
Depends on: nothing.
Done when: adding and listing work; filters work; 10 seed interactions.
[CRM3-B2] Timeline screen
Build: Page /customers/:id/timeline: vertical list with icon per type, date, summary, source team. "Add note"
form at the top. Link to this page from the customer detail page.
Depends on: CRM3-B1 (WAIT). CRM3-A2 (WAIT, for the link).
Done when: the timeline is sorted newest first and a new note appears at once.
[CRM3-B3] Events from other teams
Build: POST /api/interactions/from-event for other teams {customer_id, type, summary, source_team}; returns
201 and ignores exact duplicates sent within the same minute. Type filter dropdown and a date range on the
timeline page. This is the endpoint four teams call (CRM1-C3, CRM2-A1, CRM2-C3, CRM4-A3, ERP4-C3), so keep
the body exactly as written and merge early.
Depends on: CRM3-B1 (WAIT), CRM3-B2 (WAIT).
Needed by: CRM1-C3, CRM2-A1, CRM2-C3, CRM4-A3, ERP4-C3.
Done when: a Postman call from "another team" shows up on the timeline; duplicates are ignored.
Member C · Segments
[CRM3-C1] Segments API
Build: Table segments (id SEG-0001, name, customer_type nullable, city nullable, created_at). CRUD, plus
GET /api/segments/:id/customers returning customers matching type and city (blank means any; calls this
service's own customers table). 4 seed segments, including "Corporate in Mumbai" (matches CUST-0002 only).
Depends on: CRM3-A1 (WAIT, needs the customers table).
Needed by: CRM3-C2, C3, CRM4-A2, A3, B3.
Done when: "Corporate in Mumbai" returns only matching customers.
[CRM3-C2] Segment screens
Build: Page /segments (list, create form with name, type dropdown, city dropdown). /segments/:id shows the
matching customers table and a count.
Depends on: CRM3-C1 (WAIT).
Done when: creating a segment and opening it shows the right customers and count.
[CRM3-C3] Tags and CSV export
Build: Table customer_tags (customer_id, tag) with POST and DELETE /api/customers/:id/tags; tags as small
chips on the customer detail page. GET /api/segments/:id/export.csv and a "Download CSV" button on the
segment page (columns name, email, phone, city).
Depends on: CRM3-A2 (WAIT, detail page), CRM3-C1 (WAIT), CRM3-C2 (WAIT).
Done when: tags can be added and removed; the CSV opens in Excel.
Member D · Duplicate merge and import
[CRM3-D1] Duplicate detection and merge API
Build: GET /api/customers/duplicates returns groups sharing the same email or the same phone (the shared
seed has 2 pairs: 0001/0009 and 0002/0010). POST /api/customers/merge {keep_id, remove_id} moves
contacts, interactions and tags of remove_id to keep_id, then deletes remove_id, all in one database
transaction. Skip tag rows that would duplicate.
Depends on: CRM3-A1, CRM3-B1 (WAIT). CRM3-C3 (MOCK: add the tag move after C3 is merged).
Done when: merging one pair leaves one customer with all contacts.
[CRM3-D2] Duplicates screen
Build: Page /duplicates: each group side by side with a "Keep this one" button and a confirmation popup
before merging. Refresh after a merge.
Depends on: CRM3-D1 (WAIT).
Done when: merging from the page works and the group disappears.
[CRM3-D3] CSV import
Build: Page /import with a file input; read the CSV in the browser (split by lines and commas, no library),
show a preview table, then a button posting a JSON array to POST /api/customers/import. The backend inserts
valid rows (same validation as CRM3-A3), skips invalid ones and returns {inserted, skipped, errors[]}. Show
the result.
Depends on: CRM3-A3 (WAIT, reuses the validation).
Done when: a 10-row CSV with 2 bad rows imports 8 and lists the 2 errors.
Role issues for CRM-3: CRM3-R1 to CRM3-R4 (Section 8b)
CRM-4 · Marketing and engagement
Context line to paste at the top of every CRM-4 issue:
Team: CRM-4 Marketing and engagement. Database: crm4_db. Backend services/crm4 on port 5104. Frontend
module frontend/src/modules/crm4 (id crm4, title Marketing, roles admin and sales). Our job: run
marketing campaigns to customer segments, capture enquiries as leads, and measure customer feedback.
Messages are only simulated (nothing is really sent).
Member A · Campaign builder
[CRM4-A1] Campaigns table and API
Build: Table campaigns (id CMP-0001, name, objective, channel = email/whatsapp/sms, status = draft/
scheduled/sent default draft, segment_id, template_id, scheduled_at, created_at). CRUD plus PATCH /api/
campaigns/:id/status. 5 seed campaigns in different statuses; segment_id from SEG-0001 to SEG-0004,
template_id from TPL-0001 to TPL-0004.
Depends on: nothing (IDs are plain text).
Needed by: CRM4-A2, A3.
Done when: CRUD works; 5 seed campaigns in different statuses.
[CRM4-A2] Campaign screens
Build: Page /campaigns (table, status badges, create/edit form). Dropdowns: segment from api('crm3', '/
api/segments'), template from this team's api('crm4', '/api/templates').
Depends on: CRM4-A1 (WAIT). CRM3-C1 (MOCK: hard-code 4 segments until merged). CRM4-C1 (MOCK: hard-
code 4 templates until merged).
Done when: you can create and edit a campaign choosing a segment and a template.
[CRM4-A3] Send simulation
Build: POST /api/campaigns/:id/send: fetch the segment's customers from CRM-3 GET /api/segments/:id/
customers ( mock: 'segment-customers'), insert one row per customer in campaign_messages (id, campaign_id,
customer_id, status = sent, sent_at), mark the campaign sent. Sending twice returns 409. For each customer
also post a timeline event to CRM-3 /api/interactions/from-event {customer_id, type:'email',
summary:'Campaign CMP-xxxx sent', source_team:'CRM-4'} (side effect, try/catch). "Send now" button showing
"Sent to N customers".
Depends on: CRM4-A1 (WAIT). CRM3-C1 (MOCK: 3-row mock). CRM3-B3 (MOCK: log).
Done when: the message count equals the segment size; second send is blocked; timeline entries appear on
those customers (or the mock log).
Member B · Audience lists and enquiry capture
[CRM4-B1] Audiences API
Build: Tables audiences (id AUD-0001, name, description, created_at) and audience_members (id, audience_id,
customer_id, name, email, phone, opted_out boolean default false). CRUD for audiences, POST and DELETE
members, GET /api/audiences/:id/members. 3 seed audiences with members from CUST-0001 to CUST-0008.
Depends on: nothing.
Done when: all endpoints work; 3 seed audiences with members.
[CRM4-B2] Audience screens
Build: Page /audiences (list with member counts, create form). Page /audiences/:id (members table, add-
member form, remove button).
Depends on: CRM4-B1 (WAIT).
Done when: members can be added and removed and the counts update.
[CRM4-B3] Import from segment and opt-out
Build: POST /api/audiences/:id/import-segment {segment_id} copies customers from CRM-3 GET /api/
segments/:id/customers ( mock: 'segment-customers'), skipping ones already in the audience. "Opt out" toggle
per member; opted-out members are not counted as reachable. Show the "reachable" count on the list.
Depends on: CRM4-B1 (WAIT), CRM4-B2 (WAIT). CRM3-C1 (MOCK).
Done when: importing twice adds no duplicates; toggling opt-out changes the reachable count.
[CRM4-B4] Enquiry capture form (creates a CRM-1 lead) NEW
Build: Page /enquiry: a simple public-style form (name, phone, email, source dropdown dealer/web/walk-in,
product interest dropdown from api('erp1', '/api/products')). Backend POST /api/enquiries stores the
enquiry in table enquiries (id ENQ-0001, name, phone, email, source, product_interest, lead_id, created_at)
and then creates a lead in CRM-1 with 
callService('crm1', '/api/leads', {method:'POST', body:{name, phone, email, source, product_interest,
sales_rep_id:'EMP-0001'}}), saving the returned lead id in lead_id. This is the "dealer enquiry arrives as a
lead" demo step. Do not use a mock for this call when USE_MOCKS=false; if CRM-1 is down return 502 so the
user sees the failure.
Depends on: CRM1-A1 (MOCK: log and store lead_id LEAD-MOCK until merged). ERP1-A1 (MOCK: 3-product
local list).
Needed by: ERP5-C5 (step 1 of the end-to-end test).
Done when: submitting the form creates an enquiry row and a lead visible on /crm1/leads.
Member C · Email and WhatsApp templates
[CRM4-C1] Templates API
Build: Table templates (id TPL-0001, name, channel = email/whatsapp/sms, subject nullable, body,
created_at). Body may contain placeholders {{name}}, {{product}}, {{offer}}. CRUD. Seed 4 templates
TPL-0001 to TPL-0004: product launch, festive offer, warranty reminder, feedback request.
Depends on: nothing.
Needed by: CRM4-A2, C2, C3.
Done when: CRUD works; seed templates exist.
[CRM4-C2] Template editor screen
Build: Page /templates: list and editor with channel dropdown, subject (hidden for whatsapp), body textarea,
buttons that insert each placeholder, and a live preview that replaces placeholders with sample values.
Depends on: CRM4-C1 (WAIT).
Done when: typing updates the preview instantly; saving creates or updates the template.
[CRM4-C3] Render endpoint and validation
Build: POST /api/templates/:id/render {name, product, offer} returns the final text. Warn (in the response and
in the editor) about unknown placeholders like {{abc}}. Limit sms body to 160 characters and show a
character counter.
Depends on: CRM4-C1 (WAIT), CRM4-C2 (WAIT, for the editor warning).
Done when: render replaces all three placeholders; unknown ones are reported; sms over 160 characters is
rejected.
Member D · Feedback and NPS surveys
[CRM4-D1] Surveys API
Build: Tables surveys (id SRV-0001, title, type = nps/csat, created_at) and survey_responses (id, survey_id,
customer_id, score int 0 to 10, comment, created_at). CRUD for surveys, POST /api/surveys/:id/responses
(score 0 to 10 else 400), GET /api/surveys/:id/responses. 2 seed surveys with 10 responses from CUST-0001 to
CUST-0008.
Depends on: nothing.
Done when: responses are validated and stored; 2 seed surveys with 10 responses.
[CRM4-D2] Survey screens
Build: Page /surveys (list and create). Page /surveys/:id/respond (buttons 0 to 10, comment box, Submit,
thank-you message).
Depends on: CRM4-D1 (WAIT).
Done when: submitting a response stores it and shows the thank-you.
[CRM4-D3] NPS results
Build: GET /api/surveys/:id/results: total responses, average score, promoters (9 to 10), passives (7 to 8),
detractors (0 to 6), NPS = %promoters minus %detractors. Page /surveys/:id/results shows the NPS number,
three coloured bars and the latest 5 comments.
Depends on: CRM4-D1 (WAIT), CRM4-D2 (WAIT).
Done when: NPS matches a hand calculation on the seed data.
Role issues for CRM-4: CRM4-R1 to CRM4-R4 (Section 8b)
CRM-5 · Portal and analytics
Context line to paste at the top of every CRM-5 issue: Team: CRM-5 Portal and analytics. Database:
crm5_db. Backend services/crm5 on port 5105. Frontend module frontend/src/modules/crm5 (id crm5, title
Portal and Dashboards, roles all). Our job: a customer self-service portal and management dashboards. We
mostly read data from other teams' APIs (use mocks only until they are merged).
Member A · Customer portal
[CRM5-A1] Portal overview API
Build: Table portal_visits (id, customer_id, visited_at). GET /api/portal/:customer_id/overview returns the
customer (CRM-3 /api/customers/:id), their orders (ERP-4 /api/sales-orders?customer_id=), tickets (CRM-2 /
api/tickets?customer_id=) and invoices (ERP-5 /api/invoices?customer_id=), each with its own mock file. Each
part is fetched independently: if one team is down, return that part as [] with "unavailable": true, but with 
USE_MOCKS=false the response must say which team failed. Every call logs a row in portal_visits.
Depends on: CRM3-A1, ERP4-A1, CRM2-A1, ERP5-A1 (all MOCK: one mock file each).
Done when: the overview returns all four parts (mock data is fine at first); visits are logged; with real services
running, CUST-0001 shows SO-0001, its invoice and its tickets.
[CRM5-A2] Portal screens
Build: Page /portal with a box to enter a customer ID (like CUST-0001). Page /portal/home shows the
customer name and three cards/tables: My orders, My tickets, My invoices, with status badges.
Depends on: CRM5-A1 (WAIT).
Done when: entering a customer ID shows that customer's data; an unknown ID shows a friendly message.
[CRM5-A3] Raise a ticket and track an order
Build: A "Raise a ticket" form on the portal (subject, description, priority) posting through this service to
CRM-2 POST /api/tickets with customer_id and customer_name (from the overview), showing the new ticket
ID. Page /portal/orders/:id shows the order status (read from ERP-4 GET /api/sales-orders/:id) as steps:
created, confirmed, dispatched, delivered, with the current step highlighted.
Depends on: CRM5-A1, CRM5-A2 (WAIT). CRM2-A1 (MOCK: log it and return TKT-MOCK). ERP4-A1 (MOCK).
Done when: submitting the form shows a ticket ID (a real one once CRM2-A1 is merged); the order page
highlights the right step.
Member B · Sales dashboards
[CRM5-B1] Sales summary API and snapshots
Build: GET /api/dashboard/sales-summary: total leads, opportunities per stage, won value, quotes sent/
accepted, using CRM-1 /api/leads, /api/opportunities, /api/quotes (one mock file each). Table 
dashboard_snapshots (id, taken_at, metrics JSON text). POST /api/dashboard/snapshot saves the current
numbers; GET /api/dashboard/snapshots lists them.
Depends on: CRM1-A1, CRM1-B1, CRM1-C1 (MOCK each).
Done when: summary numbers are correct on mock data and on real CRM-1 data; snapshots can be saved
and listed.
[CRM5-B2] Dashboard screen
Build: Page /dashboard: 4 KPI cards (leads, open opportunities, won value in ₹, quotes accepted) and an
HTML/CSS bar chart of opportunities per stage (no chart library).
Depends on: CRM5-B1 (WAIT).
Done when: the page shows live numbers and the bars scale with the values.
[CRM5-B3] Date filter and history
Build: Date filter (this week, this month, all time) sent as ?range= and applied to created_at. "Save snapshot"
button and a history table of snapshots at the bottom.
Depends on: CRM5-B1, CRM5-B2 (WAIT).
Done when: changing the filter changes the numbers; saved snapshots appear in the history.
Member C · Sales forecast
[CRM5-C1] Targets and weighted pipeline API
Build: Table forecasts (id, month text YYYY-MM, target_amount numeric, notes). CRUD. GET /api/forecast/
weighted: sum of expected_value times stage probability (prospect 10%, proposal 30%, negotiation 60%) from
CRM-1 /api/opportunities ( mock: 'opportunities').
Depends on: CRM1-B1 (MOCK).
Done when: CRUD works; the weighted value matches a hand calculation.
[CRM5-C2] Forecast screen
Build: Page /forecast: table of monthly targets, add/edit form, a card with the weighted pipeline value, and a
progress bar comparing it with the current month's target.
Depends on: CRM5-C1 (WAIT).
Done when: you can set a target and the progress bar shows the percentage.
[CRM5-C3] Trend and next-month estimate
Build: GET /api/forecast/trend: won value per month for the last 6 months (CRM-1 opportunities with stage
won) and next-month estimate = average of the last 3 months. 6 CSS bars plus the estimate, with the formula
in small text on the page.
Depends on: CRM5-C1 (WAIT), CRM5-C2 (WAIT). CRM1-B1 (MOCK).
Done when: bars show 6 months; the estimate equals the average of the last 3 bars.
Member D · Role-based reports
[CRM5-D1] Reports API with roles
Build: Table reports (id, name, source, allowed_roles text). Seed 3 reports: leads by source (CRM-1, allowed
"sales,admin"), tickets by status (CRM-2, "support,admin"), customers by type (CRM-3, "sales,support,admin").
GET /api/reports returns only reports allowed for the logged-in user's role ( req.user.role; admin sees all).
Admin may pass ?role=sales|support to preview another role. GET /api/reports/:id/run returns rows from the
source team (one mock file each). Manager means admin.
Depends on: CRM1-A1, CRM2-A1, CRM3-A1 (MOCK each).
Done when: logging in as sales shows only leads and customers; support shows tickets and customers; admin
sees all three; running each returns rows.
[CRM5-D2] Reports screen
Build: Page /reports: the list of reports the logged-in role may see, and a results table when you click Run. A
role dropdown appears only for admin (to preview other roles). The role comes from the login, not from a
dropdown for everyone else.
Depends on: CRM5-D1 (WAIT).
Done when: logging in as different demo users changes the report list; running a report shows its table.
[CRM5-D3] CSV and print
Build: "Download CSV" button for the report shown (build the CSV in the browser) and a "Print" button with a
print-friendly style (hide the shell sidebar and the buttons when printing, using @media print).
Depends on: CRM5-D2 (WAIT).
Done when: the CSV opens in Excel with the right columns; the print preview shows only the report.
Role issues for CRM-5: CRM5-R1 to CRM5-R4 (Section 8b)
ERP-1 · Inventory and warehouse
Context line to paste at the top of every ERP-1 issue: Team: ERP-1 Inventory and warehouse. Database:
erp1_db. Backend services/erp1 on port 5201. Frontend module frontend/src/modules/erp1 (id erp1, title
Inventory, roles admin, warehouse and sales). Our job: the product (SKU) master and the stock of every
warehouse. Other teams call us to check prices and stock.
Member A · Product (SKU) master
[ERP1-A1] Products table and API
Build: Table products (id SKU-0001, name, category = TV/Audio/Mobile accessory/Appliance/Component,
brand, price numeric, tax_rate default 18, reorder_level int default 10, active boolean default true, created_at).
CRUD plus GET /api/products?category=&q=. Price must be above 0; duplicate name returns 409.
Depends on: nothing.
Needed by: CRM1-C2, CRM4-B4, and every ERP-1 issue.
Done when: CRUD and filters work; price above 0 enforced; duplicate name returns 409.
[ERP1-A2] Product screens
Build: Page /products (table, search box, category filter, add/edit form, Deactivate button, price in ₹).
Depends on: ERP1-A1 (WAIT).
Done when: you can add, edit, search and deactivate products from the browser.
[ERP1-A3] Seed data and price lookup
Build: seed.sql with exactly the 15 products SKU-0001 to SKU-0015 and the 5 components SKU-0101 to
SKU-0105 from the shared seed contract (same names, categories and prices). GET /api/products/:id/price
returns price, tax_rate and price with tax. "Export CSV" button on the products page.
Depends on: ERP1-A1 (WAIT), ERP1-A2 (WAIT, for the button).
Done when: the seed loads with npm run db:setup; the price endpoint is correct; CSV downloads.
Member B · Multi-warehouse stock and transfers
[ERP1-B1] Stock tables and API
Build: Tables warehouses (id WH-01, name, city), stock (sku, warehouse_id, quantity int, primary key sku +
warehouse_id) and stock_movements (id, sku, warehouse_id, delta int, reason, created_at). GET /api/stock?sku=
(per warehouse and total), POST /api/stock/adjust {sku, warehouse_id, delta, reason} which updates stock and
logs a movement. Seed WH-01 to WH-03 and stock following the stock rule in the shared seed contract
(SKU-0003 total 3, SKU-0102 total 4, others 25 to 120).
Depends on: ERP1-A1 (WAIT, SKU ids; no foreign key needed across seed order).
Needed by: ERP2-D1, ERP3-C1, C3, ERP4-C3, D3 (all call stock/adjust), ERP1-B2, B3, D1.
Done when: adjusting stock changes the quantity and adds a movement row; stock can never go below 0
(400).
[ERP1-B2] Stock screens
Build: Page /stock: table of SKU, name, one column per warehouse, total. "Adjust stock" form (SKU,
warehouse, +/- quantity, reason). Page /movements with history, newest first.
Depends on: ERP1-B1 (WAIT).
Done when: adjusting from the form updates the table; the movement appears in history.
[ERP1-B3] Transfers and stock check
Build: POST /api/transfers {sku, from_wh, to_wh, qty}: reject if the source has too little stock; both updates
inside one database transaction; log two movements. GET /api/stock/check?sku=&qty= returns {available:
true/false, total}. Transfer form on the stock page.
Depends on: ERP1-B1, ERP1-B2 (WAIT).
Needed by: ERP3-A3, ERP4-B1 (stock/check). Merge early.
Done when: a transfer moves stock between warehouses; an over-transfer returns 400 and changes nothing;
stock/check answers correctly.
Member C · Serial and batch tracking
[ERP1-C1] Serials and batches API
Build: Tables batches (batch_no, sku, quantity, manufactured_on) and serials (serial_number primary key,
sku, batch_no, warehouse_id, status = in_stock/reserved/sold/returned default in_stock, created_at). POST /api/
serials/bulk {sku, batch_no, count, prefix} generates serials like TV55-2611-0001; GET /api/serials?
sku=&status=; GET /api/serials/:serial. Seed the 30 serials TV55-2611-0001 to 0030 as in the shared seed
contract (0001 to 0005 sold).
Depends on: ERP1-A1 (WAIT).
Needed by: ERP3-C3 (serials/bulk), CRM2-B1 and ERP4 seeds (same serial numbers).
Done when: generating 10 serials creates 10 unique rows; filters work; seeded serials exist.
[ERP1-C2] Serial screens
Build: Page /serials: generate form (SKU, batch no, count, prefix), table with status filter and a serial-
number search box, and a batches list.
Depends on: ERP1-C1 (WAIT).
Done when: generating and searching work from the browser.
[ERP1-C3] Status rules and allocation
Build: PATCH /api/serials/:serial/status with allowed moves only: in_stock to reserved, reserved to sold, sold to
returned, returned to in_stock (else 400). POST /api/serials/allocate {sku, qty} returns qty in_stock serials and
marks them reserved (400 if not enough). Status badge in the UI.
Depends on: ERP1-C1 (WAIT), ERP1-C2 (WAIT, for the badge).
Needed by: ERP4-C1 (allocate), ERP4-C3 (reserved to sold), ERP4-D3 (sold to returned to in_stock).
Done when: an illegal move is refused; allocate returns the right count and flips them to reserved.
Member D · Reorder levels and low-stock alerts
[ERP1-D1] Low-stock API
Build: GET /api/alerts/low-stock returns products whose total stock is at or below reorder_level, with shortfall.
Table alerts_log (id, sku, message, acknowledged boolean default false, created_at). POST /api/alerts/scan
inserts alerts for low items that have no unacknowledged alert; PATCH /api/alerts/:id/ack. PUT /api/products/:id/
reorder-level {reorder_level}.
Depends on: ERP1-A1, ERP1-B1 (WAIT).
Done when: scanning twice creates no duplicates (SKU-0003 is flagged by the seed data); acknowledging
hides the alert from the open list.
[ERP1-D2] Alerts screen
Build: Page /alerts: red banner with the count of open alerts, table (SKU, stock, reorder level, shortfall), "Run
scan" button, Acknowledge per row. The open-alert count also appears as a badge next to the module's menu
label: set label in index.jsx from a small hook that calls the count endpoint, or show it on the page header if
the shell does not support dynamic labels.
Depends on: ERP1-D1 (WAIT).
Done when: running a scan shows alerts; acknowledging removes them and updates the count.
[ERP1-D3] Reorder suggestion and summary
Build: Suggested order quantity = (reorder_level times 2) minus current stock. "Create purchase request"
button posts {sku, product_name, quantity, requested_by:'ERP-1 low stock', reason} to ERP-2 POST /api/
purchase-requests using callService('erp2', ..., mock: 'purchase-request'). GET /api/inventory/summary
(total SKUs, low-stock count, out-of-stock count) shown as 3 cards on the alerts page.
Depends on: ERP1-D1, ERP1-D2 (WAIT). ERP2-B1 (MOCK: log it).
Done when: the suggestion number is correct; the button creates a real request in ERP-2 (or logs the mock);
cards match the data.
Role issues for ERP-1: ERP1-R1 to ERP1-R4 (Section 8b)
ERP-2 · Procurement and suppliers
Context line to paste at the top of every ERP-2 issue: Team: ERP-2 Procurement and suppliers.
Database: erp2_db. Backend services/erp2 on port 5202. Frontend module frontend/src/modules/erp2 (id
erp2, title Purchasing, roles admin, warehouse and finance). Our job: buy components and products from
suppliers: supplier list, purchase requests, purchase orders and goods receipt.
Member A · Supplier master and rating
[ERP2-A1] Suppliers table and API
Build: Table suppliers (id SUP-0001, name, contact_person, phone, email, city, gstin, payment_terms =
advance/net15/net30, rating numeric default 0, active boolean default true). CRUD plus GET /api/suppliers?
q=&city=. 6 seed suppliers SUP-0001 to SUP-0006.
Depends on: nothing.
Needed by: ERP2-A2, A3, B3 (supplier_id), C1 (supplier_id).
Done when: CRUD and filters work; 6 seed suppliers.
[ERP2-A2] Supplier screens
Build: Page /suppliers (table, search, add/edit form). Page /suppliers/:id with all details.
Depends on: ERP2-A1 (WAIT).
Done when: you can add, edit and search suppliers from the browser.
[ERP2-A3] Supplier rating
Build: Table supplier_ratings (id, supplier_id, delivery_score 1 to 5, quality_score 1 to 5, comment,
created_at). POST /api/suppliers/:id/ratings stores the rating and recalculates suppliers.rating as the average of
all scores. GET /api/suppliers/top returns the 3 best. Stars on the list and a "Rate supplier" form on the detail
page.
Depends on: ERP2-A1, ERP2-A2 (WAIT).
Done when: submitting a rating changes the supplier's average; the top 3 are correct.
Member B · Purchase requests
[ERP2-B1] Purchase requests API
Build: Table purchase_requests (id PR-0001, sku, product_name, quantity, requested_by, reason, status =
pending/approved/rejected/converted default pending, created_at). CRUD, GET with ?status=, PATCH /api/
purchase-requests/:id/decision {status}. Only pending requests can be decided (else 400). ERP-1 (low stock)
and ERP-3 (short components) post requests here, so POST must accept {sku, product_name, quantity,
requested_by, reason} with no other required fields.
Depends on: nothing.
Needed by: ERP1-D3, ERP3-A3 (both create requests), ERP2-B2, B3.
Done when: CRUD and decision work; a POST from another team works with only the five fields above.
[ERP2-B2] Request screens
Build: Page /requests: table, status filter, "New request" form, Approve/Reject buttons on pending rows.
Depends on: ERP2-B1 (WAIT).
Done when: you can create a request and approve or reject it from the browser.
[ERP2-B3] Convert request to purchase order
Build: POST /api/purchase-requests/:id/convert {supplier_id}: only for approved requests; creates a draft
purchase order with one item through this service's PO API (ERP2-C1; unit_cost from the request's product
price if known, otherwise from the form) and sets the request to converted. "Create PO" button with a supplier
dropdown on approved rows.
Depends on: ERP2-B1, ERP2-B2 (WAIT). ERP2-C1 (WAIT: the PO table is needed; until then build the endpoint
up to the "create PO" call and test with a stub). ERP2-A1 (WAIT, supplier ids).
Done when: converting an approved request creates a PO; converting a pending one returns 400.
Member C · Purchase orders
[ERP2-C1] Purchase orders API
Build: Tables purchase_orders (id PO-0001, supplier_id, status = draft/sent/partially_received/received/
cancelled default draft, expected_date, total_amount, sent_at, created_at) and po_items (id, po_id, sku,
product_name, quantity, unit_cost, received_qty default 0). POST creates a PO with items (one transaction) and
calculates total_amount; GET /:id returns items; GET list supports ?status=; PATCH /api/purchase-orders/:id/
status. 4 seed POs (sent, partially_received, received, draft) using SUP-0001 to SUP-0006 and SKU-0101 to
SKU-0105.
Depends on: ERP2-A1 (MOCK: supplier_id is plain text; seed with SUP-0001 to SUP-0006).
Needed by: ERP2-B3, C2, C3, D1.
Done when: creating a PO with 3 items gives the correct total; 4 seed POs.
[ERP2-C2] PO screens
Build: Page /orders listing POs. Page /orders/new: supplier dropdown, expected date, item rows (SKU, name,
quantity, unit cost) with a running total. Page /orders/:id shows items and status buttons (Send, Cancel).
Depends on: ERP2-C1 (WAIT). ERP2-A1 (WAIT, supplier dropdown).
Done when: you can build and save a PO and see the total update as you add rows.
[ERP2-C3] PO rules and printable view
Build: Only draft POs can be edited or deleted. Send sets status sent and sent_at. Validate quantity above 0
and unit_cost above 0. Print-friendly view of the PO (supplier details, items, total in ₹) with a Print button
( @media print hides the shell sidebar).
Depends on: ERP2-C1, ERP2-C2 (WAIT).
Done when: editing a sent PO returns 400; print preview looks like a clean document.
Member D · Goods receipt
[ERP2-D1] Goods receipt API
Build: Tables goods_receipts (id GRN-0001, po_id, received_by, received_on, notes) and grn_items (id, grn_id,
sku, received_qty). POST /api/goods-receipts saves the receipt, adds to po_items.received_qty and sets the PO
to partially_received or received. For each item call ERP-1 
POST /api/stock/adjust {sku, warehouse_id:'WH-01', delta, reason: GRN id} ( mock: 'stock-adjust'). After
saving, post the purchase to the ledger: ERP-5 POST /api/ledger/auto {type:'purchase', reference: GRN id,
amount: sum(received_qty x unit_cost)} (side effect, try/catch).
Depends on: ERP2-C1 (WAIT). ERP1-B1 (MOCK: log it). ERP5-D1 (MOCK: log it).
Done when: a partial receipt gives partially_received; a full one gives received; ERP-1 stock goes up and the
ledger gets a purchase entry (or both mock logs appear).
[ERP2-D2] Receipt screens
Build: Page /receipts: choose a sent PO, see each item with ordered, already received, remaining and an
input "received now". Submit button. Below, a list of past receipts.
Depends on: ERP2-D1 (WAIT).
Done when: receiving from the page updates the PO and appears in the list.
[ERP2-D3] Receipt checks and late orders
Build: Refuse receiving more than the remaining quantity (400). GET /api/receipts/pending lists sent POs not
yet fully received. Show POs whose expected_date has passed in red as "Late". Print-friendly GRN page.
Depends on: ERP2-D1, ERP2-D2 (WAIT).
Done when: over-receiving is refused; late POs show in red.
Role issues for ERP-2: ERP2-R1 to ERP2-R4 (Section 8b)
ERP-3 · Production and quality
Context line to paste at the top of every ERP-3 issue: Team: ERP-3 Production and quality. Database:
erp3_db. Backend services/erp3 on port 5203. Frontend module frontend/src/modules/erp3 (id erp3, title
Production, roles admin and warehouse). Our job: define what each product is made of (bill of
materials), run work orders on the assembly line and do quality checks.
Member A · Bill of materials (BOM)
[ERP3-A1] BOM tables and API
Build: Tables boms (id BOM-0001, product_sku, product_name, version int default 1, active boolean default
true) and bom_items (id, bom_id, component_sku, component_name, qty_per_unit numeric). POST /api/boms
accepts items in the same request; GET /api/boms/:id returns the items; GET /api/boms?product_sku=. Seed a
BOM for SKU-0001 (55-inch TV) with 5 components using the shared component SKUs: SKU-0101 panel,
SKU-0102 mainboard, SKU-0103 power supply, SKU-0104 remote, SKU-0105 packaging box (1 each).
Depends on: nothing.
Needed by: ERP3-A2, A3, B1, B3.
Done when: a BOM with 5 components can be created and read; the seed BOM uses the shared component
SKUs.
[ERP3-A2] BOM screens
Build: Page /boms listing BOMs. Page /boms/new: product SKU and name plus component rows (SKU, name,
quantity per unit) with an "Add row" button. Page /boms/:id shows the components table.
Depends on: ERP3-A1 (WAIT).
Done when: you can build and view a BOM from the browser.
[ERP3-A3] Material requirement, availability and purchase request
Build: GET /api/boms/:id/requirements?qty= returns each component with qty_per_unit times qty. For each
component call ERP-1 GET /api/stock/check?sku=&qty= ( mock: 'stock-check': available for all except one
component). "Check materials" button on the BOM page shows a green tick or red cross per component and
the shortfall. New: a "Request purchase" button on every red row posts {sku, product_name, quantity:
shortfall, requested_by:'ERP-3 production', reason:'Work order shortage'} to ERP-2 POST /api/purchase-
requests (mock: log it) and shows "Purchase requested". This is how a production shortage reaches
Purchasing.
Depends on: ERP3-A1, ERP3-A2 (WAIT). ERP1-B3 (MOCK: mock stock check). ERP2-B1 (MOCK: log the
request).
Done when: requirements scale with quantity; with real ERP-1 data a 20-TV requirement shows SKU-0102 in
red; pressing "Request purchase" creates a pending request in ERP-2 (or logs the mock).
Member B · Work orders
[ERP3-B1] Work orders API
Build: Table work_orders (id WO-0001, bom_id, product_sku, quantity, status = planned/in_progress/
completed/cancelled default planned, source = manual/shortage default manual, planned_start, planned_end,
created_at, completed_at). CRUD, GET ?status=&source=, PATCH /api/work-orders/:id/status (planned to
in_progress to completed; cancel only from planned). 5 seed work orders.
Depends on: ERP3-A1 (WAIT, bom_id).
Needed by: ERP3-B2, B3, C1, C3, D1.
Done when: legal status moves work, illegal ones return 400; 5 seed work orders.
[ERP3-B2] Work order screens
Build: Page /work-orders: table with status badges, a create form (choose BOM, quantity, dates), Start /
Complete / Cancel buttons on the rows.
Depends on: ERP3-B1 (WAIT).
Done when: you can create a work order and move it through its states from the browser.
[ERP3-B3] Auto materials and shortage requests
Build: When a work order is created, copy the BOM requirements into work_order_materials (wo_id,
component_sku, required_qty, issued_qty default 0). POST /api/work-orders must also accept only 
{product_sku, quantity, source: "shortage"} (use the active BOM for that SKU; 400 if there is none) because 
ERP-4 calls it this way. Show materials on the work order detail page /work-orders/:id.
Depends on: ERP3-B1 (WAIT), ERP3-A1 (WAIT).
Needed by: ERP4-B3, ERP3-C1, C2.
Done when: creating a work order fills its materials; a shortage-style request works without a bom_id.
Member C · Material issue and finished goods
[ERP3-C1] Material issue API
Build: Table material_issues (id, wo_id, component_sku, qty, issued_at). POST /api/work-orders/:id/issue
{component_sku, qty} adds to issued_qty (cannot exceed required_qty, else 400), logs the issue and calls
ERP-1 POST /api/stock/adjust with a negative delta ( warehouse_id:'WH-01', reason = WO id; mock: 'stock-
adjust'). GET /api/work-orders/:id/issues.
Depends on: ERP3-B1, ERP3-B3 (WAIT). ERP1-B1 (MOCK: log it).
Done when: issuing more than required is refused; issued_qty and history update; ERP-1 stock goes down (or
the mock log appears).
[ERP3-C2] Issue materials screen
Build: On the work order detail page add an "Issue materials" section: table (component, required, issued,
pending) with a quantity box and an Issue button per row, and a history table below.
Depends on: ERP3-C1 (WAIT), ERP3-B2 (WAIT, detail page).
Done when: pressing Issue updates the table and the history.
[ERP3-C3] Finished goods posting
Build: POST /api/work-orders/:id/post-finished: allowed only when every component is fully issued and GET /
api/work-orders/:id/qc-status (ERP3-D3, same service) says allowed. It calls ERP-1 POST /api/stock/adjust
with +quantity for the finished SKU in WH-01 and ERP-1 POST /api/serials/bulk {sku, batch_no: WO id,
count: quantity, prefix} (mock: log both), then sets the work order to completed. The button is disabled until
materials are fully issued.
Depends on: ERP3-C1, ERP3-C2 (WAIT). ERP3-D3 (MOCK: treat qc-status as allowed until D3 is merged). ERP1-
B1, ERP1-C1 (MOCK: log both).
Done when: posting is blocked with a clear message when materials are missing; success marks the work
order completed and adds stock and serials in ERP-1 (or logs).
Member D · Quality checks (QC)
[ERP3-D1] QC API
Build: Table qc_checks (id QC-0001, wo_id, inspector, checked_qty, passed_qty, failed_qty, defect_reason
nullable, result = pass/fail/rework, checked_at). POST validates passed + failed = checked. Result rule: pass if
failed is 0; fail if failed is more than 20% of checked; otherwise rework. GET /api/qc?wo_id=.
Depends on: ERP3-B1 (MOCK: wo_id is plain text; seed with WO-0001 to WO-0005).
Done when: the result is calculated correctly for the 3 cases; bad sums return 400.
[ERP3-D2] QC screens
Build: Page /qc: list of checks (result badge) and a form: work order, inspector, checked, passed, failed,
defect reason (dropdown: scratch, dead pixel, no power, wrong label, other). Check that the numbers add up
before submitting.
Depends on: ERP3-D1 (WAIT).
Done when: submitting shows the calculated result badge.
[ERP3-D3] QC summary and gate
Build: GET /api/qc/summary: overall pass rate % and per product, plus a count per defect reason. GET /api/
work-orders/:id/qc-status returns {allowed: true/false}: false if the latest QC result for that work order is fail
(ERP3-C3 calls it). Page card with pass rate and CSS bars per defect reason.
Depends on: ERP3-D1, ERP3-D2 (WAIT).
Needed by: ERP3-C3.
Done when: pass rate matches a manual calculation; a failed QC makes allowed false.
Role issues for ERP-3: ERP3-R1 to ERP3-R4 (Section 8b)
ERP-4 · Orders and dispatch
Context line to paste at the top of every ERP-4 issue: Team: ERP-4 Orders and dispatch. Database:
erp4_db. Backend services/erp4 on port 5204. Frontend module frontend/src/modules/erp4 (id erp4, title
Orders and Dispatch, roles admin, sales and warehouse). Our job: turn accepted quotes into sales orders,
reserve stock, dispatch with a courier and handle returns.
Member A · Sales orders
[ERP4-A1] Sales orders API
Build: Tables sales_orders (id SO-0001, quote_id nullable unique, customer_id, customer_name,
customer_gstin nullable, sales_rep_id, status = created/confirmed/dispatched/delivered/cancelled default
created, total_amount, created_at) and so_items (id, so_id, sku, product_name, quantity, unit_price). POST /
api/sales-orders accepts items (CRM-1 calls this with quote_id; a repeated quote_id returns 409). GET /:id
with items; GET list supports ?customer_id= and ?status=. Seed SO-0001 to SO-0005 as in the shared seed
contract (each for CUST-0001 to CUST-0005, each containing SKU-0001).
Depends on: nothing (CRM1-C3 is the caller, not a dependency).
Needed by: CRM1-C3, CRM5-A1, A3, ERP4-A2, A3, B1, C1.
Done when: creating an order with 3 items stores the correct total; duplicate quote_id returns 409; 5 seed
orders.
[ERP4-A2] Order screens
Build: Page /orders (table, filters, "New order" form with customer ID and item rows). Page /orders/:id
shows items, subtotal, GST 18%, grand total in ₹ and the status.
Depends on: ERP4-A1 (WAIT).
Done when: you can create and view orders from the browser.
[ERP4-A3] Confirm, cancel and customer lookup
Build: PATCH /api/sales-orders/:id/confirm (only from created) and /cancel (only before dispatched). On create,
fetch the customer from CRM-3 GET /api/customers/:id ( mock: 'customer') to fill customer_name and
customer_gstin. Status timeline on the order page.
Depends on: ERP4-A1, ERP4-A2 (WAIT). CRM3-A1 (MOCK).
Done when: illegal status moves return 400; customer_name and gstin are filled automatically (corporate
customers show a 15-character GSTIN).
Member B · Stock reservation
[ERP4-B1] Reservation API
Build: Table reservations (id, so_id, sku, quantity, status = reserved/released/shortage, created_at). POST /
api/sales-orders/:id/reserve: for each item call ERP-1 GET /api/stock/check?sku=&qty= ( mock: 'stock-check':
available except one SKU); create a reservation row per item as reserved or shortage and return a summary.
Running it again updates rows, never duplicates.
Depends on: ERP4-A1 (WAIT). ERP1-B3 (MOCK: mock stock check).
Needed by: ERP4-B2, B3, C1.
Done when: a mixed order produces both reserved and shortage rows (with real ERP-1 data, SKU-0003 gives
a shortage); running twice does not duplicate rows.
[ERP4-B2] Reservation panel
Build: On the order detail page add a "Reservation" panel: "Reserve stock" button, table of items with status
chips (green reserved, red shortage) and a warning banner if any item is short.
Depends on: ERP4-B1 (WAIT), ERP4-A2 (WAIT).
Done when: pressing the button fills the panel with the right chips.
[ERP4-B3] Shortage and release
Build: For each shortage item POST ERP-3 /api/work-orders {product_sku, quantity, source: "shortage"}
( mock: 'work-order') and show "Production requested". DELETE /api/sales-orders/:id/reservations sets
reservations to released; call it automatically when an order is cancelled.
Depends on: ERP4-B1, ERP4-B2 (WAIT). ERP3-B3 (MOCK: log it).
Done when: shortage items create a real work order in ERP-3 (or log); cancelling an order releases its
reservations.
Member C · Picking, dispatch and courier
[ERP4-C1] Dispatch API
Build: Tables dispatches (id DSP-0001, so_id, courier = BlueDart/Delhivery/DTDC, tracking_no, status =
picked/shipped/delivered, ship_date, delivered_date, address) and dispatch_serials (dispatch_id, sku,
serial_number). POST /api/dispatches only for orders where every reservation is reserved (else 400); it gets
serials from ERP-1 POST /api/serials/allocate {sku, qty} ( mock: 'serials-allocate': generate fake serials).
GET /api/dispatches returns rows {serial_number, sku, customer_id, ship_date} (CRM-2 uses this). PATCH /
api/dispatches/:id/status. Seed DSP-0001 to DSP-0005 with serials TV55-2611-0001 to 0005 (shared seed
contract).
Depends on: ERP4-B1 (WAIT). ERP1-C3 (MOCK: fake serials).
Needed by: CRM2-B3, ERP4-C2, C3, D1.
Done when: dispatching an unreserved order returns 400; serials are stored per dispatch; with real ERP-1 the
allocated serials are reserved in ERP-1.
[ERP4-C2] Dispatch screens
Build: Page /dispatch: orders ready to dispatch with a dispatch form (courier dropdown, tracking number,
address). Table of dispatches with Shipped and Delivered buttons.
Depends on: ERP4-C1 (WAIT).
Done when: you can dispatch an order and move it to shipped and delivered.
[ERP4-C3] Status sync, stock deduction, invoice, timeline and dispatch note
Build: When a dispatch becomes shipped: (1) set the order to dispatched; (2) deduct stock: for each item
POST ERP-1 /api/stock/adjust {sku, warehouse_id:'WH-01', delta: -quantity, reason: dispatch id} and
PATCH each serial in ERP-1 /api/serials/:serial/status {status:'sold'}; (3) create the invoice: POST ERP-5
/api/invoices {so_id, customer_id, customer_name, customer_gstin, sales_rep_id, items} (mock: log it); (4)
timeline event to CRM-3 /api/interactions/from-event {customer_id, type:'order', summary:'Order SO-xxxx
dispatched', source_team:'ERP-4'}. When delivered set the order to delivered (and another timeline event).
Steps 2 to 4 are side effects: try/catch and log [integration-error]. Page /dispatch/:id/note is a printable
dispatch note with serial numbers and address.
Depends on: ERP4-C1, ERP4-C2 (WAIT). ERP1-B1, ERP1-C3 (MOCK: log). ERP5-A1 (MOCK: log). CRM3-B3
(MOCK: log).
Needed by: ERP5-A1 (receives invoices), ERP6-D1 (commission follows paid invoices), ERP5-C5.
Done when: statuses change together; with real services running, shipping an order lowers ERP-1 stock, flips
serials to sold, creates an ERP-5 invoice with the customer GSTIN, and adds a timeline entry; the note prints
cleanly.
Member D · Returns
[ERP4-D1] Returns API
Build: Table returns (id RET-0001, so_id, serial_number, reason, rma_id nullable unique, outcome nullable,
status = requested/received/restocked/scrapped default requested, created_at). POST /api/returns checks that
the serial exists in dispatch_serials for that order (else 400). CRUD, PATCH /api/returns/:id/status. New: POST /
api/returns/from-rma {rma_id, serial_number, reason, outcome} (CRM-2 calls this): finds the order from
dispatch_serials by serial (400 if the serial was never dispatched), creates the return with status requested; a
repeated rma_id returns the existing return with 200. Seed 4 returns using serials TV55-2611-0001 to 0004.
Depends on: ERP4-C1 (WAIT, dispatch_serials). CRM2-C1 (MOCK: test from-rma with Postman until CRM-2
calls it).
Needed by: CRM2-C3, ERP4-D2, D3.
Done when: a return for a serial not in the order is refused; from-rma creates a return and is safe to call
twice; 4 seed returns.
[ERP4-D2] Return screens
Build: Page /returns (table and "New return" form: order ID, serial, reason). Page /returns/:id with details
and status buttons (Received, Restocked, Scrapped). Show the linked RMA id and outcome when present.
Depends on: ERP4-D1 (WAIT).
Done when: you can raise a return and move it through its statuses.
[ERP4-D3] Restock, credit note and summary
Build: When a return becomes restocked: ERP-1 PATCH /api/serials/:serial/status to returned and then to
in_stock, and ERP-1 POST /api/stock/adjust {sku, warehouse_id:'WH-01', delta:+1, reason: return id}
(mock: log it). If the return's outcome is credit_note (or it has none and the user ticks "issue credit note"),
POST ERP-5 /api/creditnotes {so_id, serial_number, amount} where amount is that item's unit_price from 
so_items (mock: log it). GET /api/returns/summary (counts by status and by reason) shown as cards.
Depends on: ERP4-D1, ERP4-D2 (WAIT). ERP1-B1, ERP1-C3 (MOCK: log). ERP5-A4 (MOCK: log).
Done when: restocking changes the serial and stock in ERP-1 and, for credit-note returns, creates a credit
note in ERP-5 (or logs); summary matches the data.
Role issues for ERP-4: ERP4-R1 to ERP4-R4 (Section 8b)
ERP-5 · Finance, access and the app shell
Context line to paste at the top of every ERP-5 issue: Team: ERP-5 Finance, access and the app shell.
Database: erp5_db. Backend services/erp5 on port 5205. Frontend module frontend/src/modules/erp5 (id
erp5, title Finance and Users, roles admin and finance). Our job: GST invoices, payments, credit notes,
a simple ledger, finance reports, user login and roles, and the one shared app (shell, shared helpers,
start-everything script, end-to-end test) that connects all 11 teams.
ERP-5 Member C is the integrator. Member C owns everything shared: services/_shared/, the empty
service skeletons, the frontend shell, login, roles, start-everything and the end-to-end test. Nobody else
edits those files. If another team needs a change there, they open an issue and tag Member C.
Member A · GST invoicing and credit notes
[ERP5-A1] Invoices API
Build: Tables invoices (id INV-0001, so_id, customer_id, customer_name, customer_gstin nullable,
sales_rep_id, invoice_date, due_date = invoice_date + 15 days, subtotal, cgst, sgst, total, status = unpaid/
partially_paid/paid default unpaid, created_at) and invoice_items (id, invoice_id, sku, description, quantity,
unit_price, tax_rate default 18). POST /api/invoices (ERP-4 calls this) calculates CGST 9% and SGST 9% on
the subtotal. If customer_gstin is missing in the body and the customer is corporate or dealer, fetch it from
CRM-3 GET /api/customers/:id ( mock: 'customer'). A repeated so_id returns the existing invoice (200), so
ERP-4 can safely retry. After saving, post the ledger pair by calling the same internal function as POST /
api/ledger/auto {type:'invoice', reference: invoice id, amount: total} (ERP5-D1); do it in the same
database transaction. GET list (?customer_id= ?status=) and GET /:id with items. Seed INV-0001 to INV-0005
for SO-0001 to SO-0005 (shared seed contract), GSTIN present for corporate and dealer customers.
Depends on: ERP5-D1 (MOCK: until the ledger function exists, skip the ledger line and add it once D1 is
merged). CRM3-A1 (MOCK).
Needed by: ERP4-C3 (creates invoices), CRM5-A1 (reads invoices), ERP5-A2, A3, B1.
Done when: an invoice with 2 items has the correct subtotal, CGST, SGST and total; the same so_id twice
returns one invoice; creating an invoice adds a balanced pair of ledger rows.
[ERP5-A2] Invoice screens
Build: Page /invoices (table with status badges). Page /invoices/:id looks like a bill: company header,
customer with GSTIN, items table, tax breakdown, grand total in ₹ and a Print button ( @media print hides the
shell sidebar).
Depends on: ERP5-A1 (WAIT).
Done when: the invoice page prints cleanly on one page.
[ERP5-A3] Amount in words, filters and manual invoice
Build: Total in words (for example "Rupees Twelve Thousand Five Hundred Only") with a small function you
write yourself. Date range and status filters on the list. "Create manual invoice" form for non-order items (so_id
empty). GET /api/invoices/summary returns total billed and total outstanding.
Depends on: ERP5-A1, ERP5-A2 (WAIT).
Done when: words are correct for 5 test amounts; filters and summary work.
[ERP5-A4] Credit notes NEW
Build: Table credit_notes (id CN-0001, so_id, invoice_id nullable, serial_number, amount, created_at). POST /
api/creditnotes {so_id, serial_number, amount} (ERP-4 calls this when a return is credited): finds the invoice
by so_id, stores the note, reduces that invoice's outstanding balance (a fully credited unpaid invoice becomes
paid), and posts the ledger pair via type:'credit_note' (debit sales, credit receivables). GET /api/creditnotes.
Page /credit-notes with a table, and a link from the invoice page. 2 seed credit notes.
Depends on: ERP5-A1 (WAIT). ERP5-D1 (MOCK: skip the ledger line until D1 is merged).
Needed by: ERP4-D3.
Done when: posting a credit note lowers the invoice balance and adds balanced ledger rows; a second POST
for the same serial and order returns 409.
Member B · Payments and receivables
[ERP5-B1] Payments API
Build: Table payments (id PAY-0001, invoice_id, amount, method = upi/card/bank_transfer/cash, reference,
paid_on). POST /api/payments stores the payment and updates the invoice: paid when payments add up to the
total (after credit notes), otherwise partially_paid. Overpaying returns 400. After saving, post the ledger
pair ( type:'payment', debit cash, credit receivables) in the same transaction. GET /api/payments?invoice_id=.
Depends on: ERP5-A1 (WAIT). ERP5-D1 (MOCK: skip the ledger line until D1 is merged).
Done when: two part payments turn an invoice from unpaid to partially_paid to paid; each payment adds
balanced ledger rows.
[ERP5-B2] Payment screens
Build: Page /payments: "Record payment" form (choose an unpaid invoice, amount prefilled with the balance,
method, reference) and a payments table. On the invoice detail page show payment history and the balance
due.
Depends on: ERP5-B1 (WAIT), ERP5-A2 (WAIT).
Done when: recording a payment updates the invoice status shown in the browser.
[ERP5-B3] Receivables ageing and paid-invoice feed
Build: GET /api/receivables/ageing groups outstanding amounts by customer into buckets: not yet due, 1 to 15
days overdue, 16 to 30, 31 or more. Page with the table. GET /api/invoices/paid returns {invoice_id,
sales_rep_id, total, paid_on} for paid invoices (ERP-6 uses this for commission).
Depends on: ERP5-B1, ERP5-B2 (WAIT).
Needed by: ERP6-D1.
Done when: ageing buckets are correct for the seed data; the paid feed lists only paid invoices.
Member C · The integrator: foundation, auth, shell, start-everything, end-to-
end test
[ERP5-C1] Monorepo foundation and shared helpers (everyone waits for this; merge in
the first 2 days)
Build: Create, in this order: 1. Root: package.json (npm workspaces services/* and frontend; scripts dev, 
db:setup, reset, e2e; concurrently as dev dependency), .env.example (all 11 <TEAM>_URL, DATABASE_URL
template per team, JWT_SECRET, AUTH_REQUIRED=false, USE_MOCKS=true), .gitignore, a first README. 2. 
services/_shared/auth.js ( requireAuth, requireRole exactly as in Section 3.3, using jsonwebtoken), 
callService.js (exactly the rules in Section 3.3), db.js (exports makePool(dbName)). 3. 11 service skeletons 
services/<team>/ each with package.json, server.js (loads dotenv, enables cors and JSON, GET /api/health,
then auto-mounts every file in routes/ at /api, then a JSON 404 and error handler, listens on the team's
port), empty db/schema.sql, db/seed.sql, routes/, mocks/. 4. Frontend: Vite + React + react-router-dom in 
frontend/ on port 3000; vite.config.js proxying /svc/<team> to http://localhost:<port> (strip the prefix); 
src/api.js (Section 3.2); src/App.jsx that loads modules with import.meta.glob('./modules/*/index.jsx',
{ eager: true }), builds a sidebar grouped by module title and routes /<id>/<path>; src/modules/<team>/
index.jsx for all 11 teams with routes: [] and a "Coming soon" placeholder route so every module already
shows in the menu.
Depends on: nothing. This issue is the first thing to merge. Tell the class on the group chat when it is
merged.
Needed by: every other issue in the project.
Done when: npm install && npm run dev starts 11 backends and the frontend; GET /api/health works on all
11 ports; the browser at localhost:3000 shows 11 menu groups; a test route added to a module file appears in
the menu without touching App.jsx.
[ERP5-C2] Auth API and demo users
Build (extra packages: bcryptjs, jsonwebtoken): Table users (id USR-0001, name, email unique,
password_hash, role = admin/sales/support/warehouse/finance/hr, employee_id nullable (an EMP id), active
boolean default true). POST /api/auth/login returns a JWT (8 hours; payload id, name, role, employee_id), GET /
api/auth/me, POST /api/users (admin only) with a hashed password, GET /api/users (admin only), GET /api/auth/
verify?token= (returns the payload or 401, for any outside caller). Seed the 6 demo users from Section 4
(password demo123, hashed); sales@demo.com links to EMP-0001.
Depends on: ERP5-C1 (WAIT).
Needed by: ERP5-C3, and every team once login is switched on.
Done when: login with a seeded user returns a token that _shared/auth.js accepts on another team's API; a
wrong password returns 401; no password is ever stored in plain text.
[ERP5-C3] Login screen, role-based menu and route guards (the thing that makes it
one app)
Build: In the shell: page /login; an auth context that keeps the token in localStorage; a protected layout
that redirects to /login when there is no token; sidebar that shows only modules whose roles include the
user's role and, inside a module, only routes whose own roles (if any) include it; a header with the user's
name, role and a Logout button; api() sends the token and redirects to /login on any 401; a "Not allowed"
page for URLs the role may not open. In the module erp5: page /users (admin only) with a users table and an
"Add user" form. Backend: use requireRole('admin') on /api/users. Last step of this issue: change 
AUTH_REQUIRED to true in .env.example, announce it to the class, and make sure every team's service picks it
up (they already use requireAuth).
Depends on: ERP5-C1 (WAIT), ERP5-C2 (WAIT, the login endpoint).
Needed by: everyone (login switches on for the whole app).
Done when: with the 6 demo users each sees only their own menu groups; a logged-out browser cannot open
any page or any /api call (401); a non-admin gets 403 on /api/users; logout works.
[ERP5-C4] Start-everything script, database setup and README NEW
Build: docker-compose.yml with one Postgres 16 container and an init script that creates the 11 databases
( crm1_db ... erp6_db). scripts/db-setup.js: for each team runs services/<team>/db/schema.sql then 
seed.sql, in this order: ERP-6, CRM-3, ERP-1, then the rest (it drops and recreates each database first, so it
can be run again and again; if a team's files are empty it prints "skipped" and carries on). Scripts: npm run
db:setup, npm run reset (db:setup plus fresh seed), npm run dev (11 backends plus frontend with prefixed
coloured logs). The README: install Node and Docker, the 4 commands to run the whole app, the demo logins,
the port table, how to switch USE_MOCKS and AUTH_REQUIRED, and a troubleshooting section. Also a docs/ link to
this issues pack.
Depends on: ERP5-C1 (WAIT). All teams' schema.sql/ seed.sql (MOCK: the script handles missing or empty
files; re-test every Friday as teams merge).
Done when: on a clean laptop, docker compose up -d && npm install && npm run db:setup && npm run dev
brings up the full app with all merged seed data and login.
[ERP5-C5] End-to-end test script NEW
Build: scripts/e2e.js (Node, no framework): sets USE_MOCKS=false, logs in as admin@demo.com, runs the 9-
step demo from the workflow doc step by step and prints PASS or FAIL with the reason for each step, then exits
non-zero if any step failed. Suggested chain (rename to match your workflow doc): 1 enquiry via CRM-4
creates a CRM-1 lead; 2 opportunity plus a quote with 3 items, discount 10%, approve, send, accept, which
creates an ERP-4 order and a CRM-3 timeline entry; 3 reserve stock, a shortage creates an ERP-3 work order
and an ERP-3 purchase request in ERP-2; 4 approve, convert to PO, send, goods receipt which raises ERP-1
stock and a purchase ledger entry; 5 issue materials, QC pass, post finished goods (ERP-1 stock and serials); 6
dispatch the order (ERP-1 stock goes down, serials become sold) and ERP-5 creates the invoice with GSTIN and
ledger entries; 7 record the payment (invoice paid, ledger balanced); 8 ERP-6 commission sync creates a
commission and payroll picks it up; 9 warranty sync, an RMA is approved with outcome credit_note, ERP-4
return is restocked and an ERP-5 credit note appears. After each step it checks the receiving team's data, not
just the response. Add a docs/e2e-checklist.md with the same steps for a manual run in the browser. Run it
every week from week 4 and post the result in the group chat.
Depends on: ERP5-C4 (WAIT). All teams (MOCK: start with the steps whose teams are merged and mark the
rest SKIPPED, then fill in as teams merge; in integration week no step may be SKIPPED).
Done when: npm run e2e runs on a freshly reset database with mocks off and every step passes; one
deliberately stopped service makes its step fail loudly instead of passing on mock data.
Member D · General ledger and finance reports
[ERP5-D1] Ledger API
Build: Table ledger_entries (id, entry_date, account = sales/receivables/cash/purchases/salary_expense,
debit numeric default 0, credit numeric default 0, reference, description). POST /api/ledger adds one entry.
POST /api/ledger/auto {type, reference, amount} adds the balanced pair for: invoice (debit receivables,
credit sales); payment (debit cash, credit receivables); credit_note (debit sales, credit receivables); purchase
(debit purchases, credit cash); salary (debit salary_expense, credit cash). Export the pairing as a plain
function the invoice, payment and credit-note code in this same service can call. GET /api/ledger with ?
account= and date range. Requests with the same type and reference return the existing pair (safe to retry).
Depends on: nothing.
Needed by: ERP5-A1, A4, B1 (own service), ERP2-D1 (purchase), ERP6-C3 (salary), ERP5-D2, D3.
Done when: auto entries always have equal debit and credit totals for all 5 types; a repeated call changes
nothing.
[ERP5-D2] Ledger screen
Build: Page /ledger: table, account and date filters, a manual entry form, and totals of debit and credit at the
bottom (they must match).
Depends on: ERP5-D1 (WAIT).
Done when: filters work and the totals update.
[ERP5-D3] Finance reports
Build: GET /api/reports/summary: total sales (credit minus debit on sales), total received (debit on cash from
payments), outstanding (debit minus credit on receivables) and cash balance (debit minus credit on cash).
GET /api/reports/monthly-sales groups sales by month. Page /reports with 4 KPI cards, CSS bars per month
and a CSV download button.
Depends on: ERP5-D1, ERP5-D2 (WAIT). ERP5-A1, B1 (WAIT for real numbers; the seed ledger is enough to
start).
Done when: the summary numbers match the ledger and the invoices table; CSV downloads.
Role issues for ERP-5: ERP5-R1 to ERP5-R4 (Section 8b)
ERP-6 · HR and workforce
Context line to paste at the top of every ERP-6 issue: Team: ERP-6 HR and workforce. Database:
erp6_db. Backend services/erp6 on port 5206. Frontend module frontend/src/modules/erp6 (id erp6, title
HR, roles admin and hr). Our job: employee records, attendance and leave, payroll with salary slips, and
sales commission. Other teams use our employee list for sales reps and engineers.
Member A · Employee master and departments
[ERP6-A1] Employees and departments API
Build: Tables departments (id DEP-01, name) and employees (id EMP-0001, name, email unique, phone,
department_id, role_title, manager_id nullable, join_date, base_salary numeric, active boolean default true).
CRUD for both; GET /api/employees?department=&role_title=&q= (CRM-1 and CRM-2 call this with 
role_title=Sales Rep and role_title=Service Engineer). Seed exactly DEP-01 to DEP-05 and EMP-0001 to
EMP-0012 from the shared seed contract (4 Sales Rep, 3 Service Engineer; keep these exact role_title
strings).
Depends on: nothing. Merge early: three teams read it.
Needed by: CRM1-A2, CRM2-A2, ERP6 everything else, ERP5-C2 (employee_id link).
Done when: CRUD and filters work; the seed matches the shared seed contract; ?role_title=Sales Rep
returns 4 rows.
[ERP6-A2] Employee screens
Build: Page /employees (table, search box, department filter, add/edit form). Page /departments to add and
rename departments.
Depends on: ERP6-A1 (WAIT).
Done when: you can add, edit and filter employees from the browser.
[ERP6-A3] Manager link and deactivate
Build: Employee detail page /employees/:id showing the manager and the direct reports. Rules: manager
cannot be the employee themself; email must be unique (409). Replace Delete by a Deactivate button (active
= false); hide inactive staff by default with a "Show inactive" checkbox. Other teams' dropdowns
( ?role_title=) must also hide inactive staff.
Depends on: ERP6-A1, ERP6-A2 (WAIT).
Done when: the rules are enforced with clear messages; deactivated staff disappear from the default list and
from other teams' dropdowns.
Member B · Attendance and leave
[ERP6-B1] Attendance and leave API
Build: Tables attendance (id, employee_id, date, status = present/absent/half_day/leave, check_in, check_out,
unique employee_id + date) and leave_requests (id LV-0001, employee_id, from_date, to_date, type = casual/
sick/earned, status = pending/approved/rejected default pending, reason). POST /api/attendance/mark (saves
or updates the day), GET /api/attendance?month=YYYY-MM&employee_id=, CRUD for leave requests, PATCH /
api/leave-requests/:id/decision.
Depends on: ERP6-A1 (WAIT, employee ids).
Done when: marking the same employee and day twice updates instead of duplicating.
[ERP6-B2] Attendance and leave screens
Build: Page /attendance: pick a date, see all active employees with Present/Absent/Half day radio buttons and
a Save button. Page /leaves: apply form plus a table with Approve and Reject buttons.
Depends on: ERP6-B1 (WAIT).
Done when: saving attendance and approving leave work from the browser.
[ERP6-B3] Monthly summary and leave balance
Build: GET /api/attendance/summary?month= returns per employee present days, half days, absent days and
leave days. Approved leave marks the weekdays in the range as leave in attendance. Each employee gets 12
leave days per year; a request above the balance returns 400. Summary table on a page.
Depends on: ERP6-B1, ERP6-B2 (WAIT).
Needed by: ERP6-C1 (absent days).
Done when: the summary matches the marked data; over-balance leave is refused.
Member C · Payroll and salary slips
[ERP6-C1] Payroll generation API
Build: Table salary_slips (id, employee_id, month YYYY-MM, base_salary, hra = 40% of base, allowances =
2000, pf_deduction = 12% of base, absent_days, absent_deduction = base/30 per absent day, commission
default 0, net_pay, status = generated/paid, generated_at, unique employee_id + month). POST /api/payroll/
generate {month} creates slips for all active employees (absent days from the attendance table; 0 if none)
and adds commission from ERP6-D1's commissions table for that month. GET list and GET /:id.
Depends on: ERP6-A1 (WAIT). ERP6-B3 (MOCK: absent days 0 until attendance exists). ERP6-D1 (MOCK:
commission 0 until the table exists).
Done when: net pay = base + HRA + allowances + commission minus PF minus absent deduction; the
formula is correct for 3 employees.
[ERP6-C2] Payroll screens
Build: Page /payroll: choose a month, a "Generate payroll" button and a table of slips with net pay. Page /
payroll/:id is a printable salary slip with earnings and deductions side by side.
Depends on: ERP6-C1 (WAIT).
Done when: generating shows the slips; the slip prints on one page.
[ERP6-C3] Payroll safeguards and ledger posting
Build: Generating a month twice returns 409 "Already generated" unless ?force=true. PATCH /api/salary-
slips/:id/paid marks a slip paid. Card with total payroll cost for the month. When a month is generated, POST
ERP-5 /api/ledger/auto {type:'salary', reference: month, amount: total} (side effect, mock: 'ledger').
Depends on: ERP6-C1, ERP6-C2 (WAIT). ERP5-D1 (MOCK: log it).
Done when: duplicate generation is blocked; the total card is correct; the ledger gets a salary entry (or the
mock log appears).
Member D · Sales commission and performance
[ERP6-D1] Commission sync API
Build: Table commissions (id, sales_rep_id, invoice_id unique, invoice_amount, rate_percent,
commission_amount, month YYYY-MM, created_at). POST /api/commissions/sync fetches ERP-5 GET /api/
invoices/paid ( {invoice_id, sales_rep_id, total, paid_on}; mock: 'invoices-paid') and inserts a row for
each new invoice: rate 2%, or 3% if the amount is above 100000; month comes from paid_on. Returns how
many were added. GET /api/commissions?month=&sales_rep_id=.
Depends on: ERP6-A1 (WAIT, rep names). ERP5-B3 (MOCK: 3-row mock).
Needed by: ERP6-C1, D2, D3.
Done when: syncing twice adds nothing the second time; rates are applied correctly.
[ERP6-D2] Commission screens
Build: Page /commissions: "Sync now" button, month filter, table of commissions and a total per sales rep
(employee name from this service's employees table).
Depends on: ERP6-D1 (WAIT).
Done when: syncing and filtering work from the browser.
[ERP6-D3] Sales performance leaderboard
Build: GET /api/performance/sales?month= returns per rep: name, number of deals, total sales, commission.
Page /leaderboard shows a ranked table with the top performer highlighted and a CSV download button.
Depends on: ERP6-D1, ERP6-D2 (WAIT).
Done when: ranking is by total sales; CSV opens in Excel.
Role issues for ERP-6: ERP6-R1 to ERP6-R4 (Section 8b)
8b. Role issues (44 issues: R1 to R4 for every team)
Create these four issues in each of the 11 team sections with the team prefix, for example [CRM1-R1] Team
Lead: README and demo script. They are on top of the 12 build issues. The role holder is the team's Team Lead
(R1), Data owner (R2), UI owner (R3) and QA and docs owner (R4). These can be the same people who have
build issues; the roles are extra work, not extra members.
Key Role Build Depends on Done when
<TEAM>-
R1
Team
Lead
Keep docs/<team>/README.md (what the module does,
how to run it, endpoint list, which other teams you call
and who calls you). Write docs/<team>/demo.md: a 5-
step demo script of your module, with the exact
customer, SKU and rep IDs from Section 5. Run a 10-
minute check every Friday: every merged PR of the
team follows the folder rules, index.jsx lists every
page, nothing outside your own folders was changed.
Chase teams you are waiting for using the Depends on
lines.
Start now. Final demo
script waits for all 12
build issues of your
team (WAIT).
README and demo
script in main;
demo script can be
followed by
someone outside
the team.
<TEAM>-
R2
Data
owner
Draw the ER diagram of your tables in 3NF ( docs/
<team>/er-diagram.md as a Mermaid diagram or an
image) and write a short data dictionary (table, column,
type, meaning). Review every schema.sql change in
the team. Check that your seed.sql follows the shared
seed contract (Section 5): same customer, SKU,
employee, dealer and serial IDs, and that npm run
reset loads it with no error.
Tables arrive with the
team's A1, B1, C1, D1
issues (WAIT for the
final diagram; draw
the first version from
the issue text on day
1).
ER diagram and
data dictionary
match the final
schema; seed
matches the
contract; reset runs
clean.
Draw simple wireframes (paper photo, Figma or draw.io)
for every page of your module, one image per page in 
None to start. 
Needed by the
Wireframes for all
pages exist; every
Key Role Build Depends on Done when
<TEAM>-
R3
UI
owner
docs/<team>/wireframes/, before the page issues
start. Agree the look with the other UI owners (same
badge colours, same table style, same form layout).
Check that every page is registered in frontend/src/
modules/<team>/index.jsx with the right path prefix
and roles, that nothing creates its own router or
navbar, and that print styles hide the sidebar.
team's frontend
issues (A2, B2, C2,
D2 and similar):
wireframes should be
ready within the first
3 days of the sprint.
page opens from
the sidebar at /
<team>/... and
looks consistent.
<TEAM>-
R4
QA
and
docs
Write test cases (a table: id, issue key, steps, expected
result, actual, pass/fail), at least 3 per build issue, in 
docs/<team>/tests.md. Write the API spec docs/
<team>/api.md (every endpoint: method, path, request
body, response, error codes) and a Postman collection.
Run your team's rows of the cross-team table (Section
7) with USE_MOCKS=false and file a bug issue for any
failure.
Test cases wait for
each build issue to be
merged (WAIT per
issue). ERP5-C5 (end-
to-end test) is the
final check.
Test cases all run
with results; API
spec matches the
code; bug issues
are filed and
closed.
Which cross-team rows (Section 7) each team's R4 must verify:
Team Rows
CRM-1 1, 2, 3, 4, 9, 11
CRM-2 4, 5, 6, 7, 10, 12
CRM-3 4, 8, 10, 12, 19
CRM-4 2, 4, 8, 9
CRM-5 10, 11, 12
ERP-1 2, 13, 14, 16, 18, 20, 22, 23, 25
ERP-2 13, 14, 15, 17
ERP-3 16, 17, 18, 21
ERP-4 3, 4, 6, 7, 10, 19 to 26
ERP-5 10, 15, 19, 24, 26, 27, 28, 29
ERP-6 1, 5, 27, 28
9. What was fixed from the review (gaps found when tracing
dealer enquiry to warranty return)
Gap found Fix (issue)
ERP-3 never raised a purchase for
short parts
ERP3-A3 "Request purchase" posts to ERP-2 purchase requests (ERP2-B1 accepts
it)
CRM-2 posted returns to an ERP-1
endpoint that did not exist
CRM2-C3 now posts to ERP-4 /api/returns/from-rma; ERP4-D1 provides it;
ERP4-D3 then calls ERP-1 and ERP-5
ERP-5 had no credit-note endpoint New ERP5-A4; ERP4-D3 calls it
Stock was never deducted on dispatch ERP4-C3 deducts ERP-1 stock and sets serials to sold when a dispatch is shipped
The ledger stayed empty ERP5-A1, A4 and B1 post ledger pairs automatically; ERP2-D1 (purchase) and
ERP6-C3 (salary) call /api/ledger/auto; ERP5-D1 supports all 5 types
Login was not wired in ERP5-C2/C3 plus _shared/auth.js: every API checks the token, every page is
behind login, menu follows the role
Nobody fed the CRM-3 timeline CRM1-C3, CRM2-A1, CRM2-C3, CRM4-A3 and ERP4-C3 post to /api/
interactions/from-event
Employee master was never called CRM1-A2 (sales reps) and CRM2-A2 (service engineers) read ERP-6
Gap found Fix (issue)
Nothing created the "enquiry becomes
a lead" step
New CRM4-B4
Invoices lacked the customer GSTIN ERP4-A3 stores it on the order, ERP4-C3 sends it, ERP5-A1 falls back to CRM-3
Mock fallbacks could hide broken
integrations
USE_MOCKS=true/false in callService; mocks off from integration week;
ERP5-C5 checks the receiving side
localhost URLs only work on one
machine
One repo, one command ( npm run dev) on one laptop; ERP5-C4
IDs must match across teams Section 5 shared seed contract, enforced by each team's R2
44 role issues were missing Section 8b
Separate pmo-integration repo with
10 to 15 integration issues
Not needed. There is no PM team. The same work is ERP5-C1 to C5 (one student)
plus the contract table in Section 7
10. Suggested merge order (so nobody waits long)
Wave Merge these first Why
0 (day 1 to 2) ERP5-C1 Everything depends on the skeleton and
shared helpers
1 (week 1) ERP5-C2, ERP5-C3, CRM3-A1, ERP6-A1, ERP1-A1, ERP1-
A3, ERP1-B1, CRM1-A1, ERP2-B1, ERP4-A1, ERP5-D1
Master data and the endpoints most teams
call
2 (weeks 2 to
3)
ERP1-B3, ERP1-C1, ERP1-C3, CRM3-B3, CRM3-C1, CRM1-
B1, CRM1-C1, ERP3-A1, ERP3-B3, ERP4-B1, ERP4-C1,
ERP5-A1, ERP5-A4, ERP5-B1, ERP5-B3
Stock, serial, timeline, segment, order,
invoice and payment APIs
3 (week 4) The caller issues (CRM1-C3, CRM2-C3, ERP4-C3, ERP4-
D3, ERP3-A3, ERP2-D1, ERP6-C3, ERP6-D1, CRM4-B4)
Replace every MOCK with the real call; delete
local fallback lists; ERP5-C4 and C5 running
weekly
4 (integration
week)
Everything USE_MOCKS=false, npm run e2e passes
every step, demo rehearsal
Count check: 11 teams x 12 issues = 132, plus CRM4-B4, ERP5-A4, ERP5-C4 and ERP5-C5 = 136 build issues,
plus 44 role issues = 180 issues.
