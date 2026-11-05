# 📋 Team CRM-1: Sales Pipeline — Detailed Engineering Specifications

> **Team Domain**: CRM-1 Sales Pipeline  
> **Database**: `crm1_db` (PostgreSQL 16) | **Backend Port**: `5101` (`services/crm1`)  
> **Frontend Module**: `frontend/src/modules/crm1` (`id: 'crm1'`, `title: 'Sales'`, `roles: ['admin', 'sales']`)  
> **Domain Responsibility**: Track sales leads, score leads, manage the deal opportunities pipeline, calculate 18% GST quotations, manage dealer partnerships, and hand off accepted orders to ERP-4.  
> **Business Workflow Position**: **Steps 1 & 2 of the 9-Step Order-to-Cash Workflow** (Lead Capture $\rightarrow$ Deal Qualification $\rightarrow$ Quotation Approval $\rightarrow$ Sales Order Handoff).

---

## 🛠 Shared Helpers & Architecture Rules (Must Follow)
1. **Directory Isolation**: Only write code in `services/crm1/`, `frontend/src/modules/crm1/`, and `docs/crm1/`.
2. **Database Helpers**:
   ```javascript
   const { makePool } = require('../_shared/db');
   const pool = makePool('crm1_db');
   ```
3. **Authentication & Roles**:
   ```javascript
   const { requireAuth, requireRole } = require('../_shared/auth');
   router.use(requireAuth); // Protect all routes
   ```
4. **Cross-Service Calls (`callService`)**:
   ```javascript
   const { callService } = require('../_shared/callService');
   // Example: callService('erp6', '/api/employees?role_title=Sales Rep', { mock: 'employees-sales' });
   ```
5. **Frontend API Calls**:
   ```javascript
   import { api } from '../../../api';
   // Example: const res = await api('crm1', '/api/leads');
   ```
6. **API Response Contract**:
   - Success: `{ "data": ... }`
   - Failure: `{ "error": "Clear human-readable error message" }` with appropriate status (`400`, `404`, `409`, `500`).

---

## 📦 Member A: Lead Capture & Scoring

### [CRM1-A1] Leads table and API
- **Assigned Role**: Member A (Lead Capture & Scoring)
- **Files to Create/Edit**:
  - `services/crm1/db/schema.sql` (table & sequence DDL)
  - `services/crm1/db/seed.sql` (5 seed rows)
  - `services/crm1/routes/leads.js` (Express router)
- **Database Schema**:
  ```sql
  CREATE SEQUENCE IF NOT EXISTS leads_seq START 1;

  CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(20) PRIMARY KEY DEFAULT ('LEAD-' || LPAD(nextval('leads_seq')::TEXT, 4, '0')),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    source VARCHAR(20) NOT NULL CHECK (source IN ('dealer', 'web', 'walk-in')),
    product_interest VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'lost')),
    score INT NOT NULL DEFAULT 0,
    sales_rep_id VARCHAR(20), -- references EMP-0001..EMP-0004
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Seed Data (5 rows)**:
  - `LEAD-0001`: Aarav Mehta, `9820011223`, `aarav@gmail.com`, source `dealer`, interest `55-inch 4K Smart TV`, status `qualified`, score `70`, sales_rep `EMP-0001`
  - `LEAD-0002`: Sunrise Electronics, `022-28491029`, `procurement@sunrise.com`, source `web`, interest `Soundbar 5.1`, status `contacted`, score `50`, sales_rep `EMP-0002`
  - `LEAD-0003`: Priya Nair, `9847012345`, `priya.nair@yahoo.com`, source `walk-in`, interest `Microwave Oven 25L`, status `new`, score `30`, sales_rep `EMP-0003`
  - `LEAD-0004`: BrightHome Retail, `020-25671199`, `orders@brighthome.in`, source `dealer`, interest `65-inch OLED TV`, status `qualified`, score `80`, sales_rep `EMP-0001`
  - `LEAD-0005`: Kiran Patel, `9825098765`, `kiran.patel@rediffmail.com`, source `web`, interest `Air Fryer 4L`, status `new`, score `40`, sales_rep `EMP-0004`
- **API Endpoints**:
  - `GET /api/leads` (optional query: `?status=new`): Returns `{ "data": [...] }`
  - `GET /api/leads/:id`: Returns `{ "data": { lead } }` or `404` `{ "error": "Lead not found" }`
  - `POST /api/leads`: Body `{ name, phone?, email?, source, product_interest?, sales_rep_id? }`. Validates `name` (required, 400), `source` in allowed list (400). Returns `201` with `{ "data": { lead } }`
  - `PUT /api/leads/:id`: Updates lead details and recalculates score. Returns `{ "data": { lead } }`
  - `DELETE /api/leads/:id`: Returns `200` with `{ "data": { "message": "Lead deleted successfully" } }`
- **Depends on**: Nothing from other teams.
- **Needed by**: CRM1-A2, CRM1-A3, CRM1-B1, CRM4-B4 (web form pushes leads here), CRM5-B1 & CRM5-D1 (analytics reads leads).
- **Done When**: Tables and 5 seed rows created; all 5 endpoints tested and working via Postman / curl; invalid source or missing name returns 400.

---

### [CRM1-A2] Lead screens
- **Assigned Role**: Member A
- **Files to Create/Edit**:
  - `frontend/src/modules/crm1/pages/LeadsPage.jsx`
  - `frontend/src/modules/crm1/index.jsx`
- **Screen Requirements**:
  - Route: `/crm1/leads` registered in `index.jsx`.
  - **Leads Table**: Displays Name, Phone, Email, Source, Status (colored badge: `new` blue, `contacted` yellow, `qualified` green, `lost` red), Score, Assigned Rep, and Action buttons (Edit, Delete).
  - **Status Filter**: Dropdown with options: `All`, `new`, `contacted`, `qualified`, `lost`.
  - **Add Lead Form**: Modal or toggle form with inputs for Name, Phone, Email, Source dropdown, Product Interest, and Sales Rep dropdown.
  - **Edit Lead Form**: Pre-filled form allowing updates to status, rep, and contact info.
  - **Sales Rep Dropdown**: Fetches sales reps via `api('erp6', '/api/employees?role_title=Sales Rep')`.
- **Mock Fallback**: If ERP-6 is not merged yet, fallback to a local array of `[ { id: 'EMP-0001', name: 'Rohan Kulkarni' }, { id: 'EMP-0002', name: 'Neha Sharma' }, { id: 'EMP-0003', name: 'Vikram Singh' }, { id: 'EMP-0004', name: 'Anjali Rao' } ]`.
- **Done When**: You can add, edit, delete, and filter leads in the browser; list refreshes immediately upon changes; rep dropdown dynamically loads ERP-6 reps.

---

### [CRM1-A3] Lead scoring and Hot leads
- **Assigned Role**: Member A
- **Files to Create/Edit**:
  - `services/crm1/routes/leads.js`
  - `frontend/src/modules/crm1/pages/LeadsPage.jsx`
- **Scoring Algorithm**:
  - Source: `dealer` (+30 pts), `web` (+20 pts), `walk-in` (+10 pts)
  - Contact Details: `email` present (+10 pts), `phone` present (+10 pts)
  - Product Interest: `product_interest` present and non-empty (+10 pts)
  - Maximum score cap: `100` points.
  - Trigger: Automatically compute score on `POST /api/leads` and re-compute on `PUT /api/leads/:id`.
- **API Endpoint**:
  - `GET /api/leads/hot`: Returns all leads with `score >= 60`.
  - ⚠️ **Critical Express Route Ordering**: Define `router.get('/leads/hot', ...)` **BEFORE** `router.get('/leads/:id', ...)` to prevent Express from capturing the string `"hot"` as an ID parameter!
- **UI Requirement**:
  - Display a distinct flame or orange badge: **"🔥 Hot (Score: X)"** in the leads table when `score >= 60`.
- **Done When**: Adding/editing a lead updates score automatically; `/api/leads/hot` returns only leads with score $\ge 60$; UI reflects the Hot badge.

---

## 📈 Member B: Opportunities & Pipeline Board

### [CRM1-B1] Opportunities table and API
- **Assigned Role**: Member B (Opportunities & Pipeline)
- **Files to Create/Edit**:
  - `services/crm1/db/schema.sql`
  - `services/crm1/db/seed.sql`
  - `services/crm1/routes/opportunities.js`
- **Database Schema**:
  ```sql
  CREATE SEQUENCE IF NOT EXISTS opp_seq START 1;

  CREATE TABLE IF NOT EXISTS opportunities (
    id VARCHAR(20) PRIMARY KEY DEFAULT ('OPP-' || LPAD(nextval('opp_seq')::TEXT, 4, '0')),
    lead_id VARCHAR(20) REFERENCES leads(id) ON DELETE SET NULL,
    customer_id VARCHAR(20), -- references CRM-3 CUST-0001..CUST-0008
    title VARCHAR(150) NOT NULL,
    expected_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stage VARCHAR(20) NOT NULL DEFAULT 'prospect' CHECK (stage IN ('prospect', 'proposal', 'negotiation', 'won', 'lost')),
    expected_close_date DATE,
    sales_rep_id VARCHAR(20), -- references EMP-0001..EMP-0004
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Seed Data (6 rows across stages)**:
  - `OPP-0001`: `lead_id` `LEAD-0001`, `customer_id` `CUST-0001`, title `55" Smart TV bulk purchase`, `₹1,28,970`, stage `won`, rep `EMP-0001`
  - `OPP-0002`: `lead_id` `LEAD-0002`, `customer_id` `CUST-0002`, title `Corporate sound system setup`, `₹89,950`, stage `proposal`, rep `EMP-0002`
  - `OPP-0003`: `lead_id` `LEAD-0003`, `customer_id` `CUST-0003`, title `Kitchen appliances bundle`, `₹25,490`, stage `negotiation`, rep `EMP-0003`
  - `OPP-0004`: `lead_id` `LEAD-0004`, `customer_id` `CUST-0004`, title `Dealer annual TV quota`, `₹4,74,950`, stage `proposal`, rep `EMP-0001`
  - `OPP-0005`: `lead_id` `LEAD-0005`, `customer_id` `CUST-0005`, title `Home audio upgrades`, `₹35,980`, stage `prospect`, rep `EMP-0004`
  - `OPP-0006`: `lead_id` `LEAD-0002`, `customer_id` `CUST-0006`, title `Office TV installation`, `₹94,990`, stage `lost`, rep `EMP-0002`
- **API Endpoints**:
  - `GET /api/opportunities`: Returns list `{ "data": [...] }`
  - `GET /api/opportunities/:id`: Returns single opportunity
  - `POST /api/opportunities`: Validates `lead_id` exists (400 if invalid). Creates opportunity.
  - `PUT /api/opportunities/:id`: Update details.
  - `PATCH /api/opportunities/:id/stage`: Body `{ "stage": "proposal" }`. Validates stage transitions.
- **Done When**: CRUD and stage endpoints pass; invalid stage returns 400; seed rows cover all 5 stages.

---

### [CRM1-B2] Pipeline board
- **Assigned Role**: Member B
- **Files to Create/Edit**:
  - `frontend/src/modules/crm1/pages/PipelinePage.jsx`
  - `frontend/src/modules/crm1/index.jsx`
- **Screen Requirements**:
  - Route: `/crm1/pipeline` registered in `index.jsx`.
  - **Kanban Board Layout**: 5 vertical columns:
    1. Prospect
    2. Proposal
    3. Negotiation
    4. Won (Green header)
    5. Lost (Red/Grey header)
  - **Column Headers**: Show stage name, count of deals, and total monetary value formatted in INR (`₹4,74,950`).
  - **Cards**: Show Deal Title, Customer ID / Name, Value in `₹`, Expected Close Date, and a button: **"Advance Stage ➔"**.
  - Clicking the button advances the opportunity one stage forward and immediately updates the board and totals.
- **Done When**: Cards appear in correct columns with accurate sums; clicking advance updates database and UI without errors.

---

### [CRM1-B3] Stage rules and summary
- **Assigned Role**: Member B
- **Files to Create/Edit**:
  - `services/crm1/routes/opportunities.js`
  - `services/crm1/mocks/quotes-accepted.json`
- **Validation Rules**:
  - Stage transitions must move forward **strictly one step at a time** (`prospect` $\rightarrow$ `proposal` $\rightarrow$ `negotiation` $\rightarrow$ `won`).
  - An opportunity can move to `lost` from any stage.
  - Skipping stages (e.g. `prospect` $\rightarrow$ `won`) must be blocked with `400 Bad Request` `{ "error": "Cannot skip stages. Next allowed stage: proposal or lost" }`.
  - **Won Gate**: Moving to `won` is **strictly prohibited** unless an accepted quotation exists for this opportunity.
    - Check quotes: `callService('crm1', '/api/quotes?opportunity_id=' + id + '&status=accepted', { mock: 'quotes-accepted' })`.
    - If no accepted quote exists: return `400 Bad Request` `{ "error": "Cannot close as won without an accepted quote" }`.
- **API Endpoint**:
  - `GET /api/opportunities/summary`: Returns counts and total ₹ values per stage:
    ```json
    {
      "data": {
        "prospect": { "count": 1, "total_value": 35980.00 },
        "proposal": { "count": 2, "total_value": 564900.00 },
        "negotiation": { "count": 1, "total_value": 25490.00 },
        "won": { "count": 1, "total_value": 128970.00 },
        "lost": { "count": 1, "total_value": 94990.00 }
      }
    }
    ```
- **Done When**: Skipping stages is rejected with 400; closing Won without accepted quote is blocked; summary statistics match the board numbers.

---

## 💰 Member C: Quotations & ERP-4 Order Handoff

### [CRM1-C1] Quotes tables and API
- **Assigned Role**: Member C (Quotations & Order Handoff)
- **Files to Create/Edit**:
  - `services/crm1/db/schema.sql`
  - `services/crm1/db/seed.sql`
  - `services/crm1/routes/quotes.js`
- **Database Schema**:
  ```sql
  CREATE SEQUENCE IF NOT EXISTS quote_seq START 1;
  CREATE SEQUENCE IF NOT EXISTS quote_items_seq START 1;

  CREATE TABLE IF NOT EXISTS quotes (
    id VARCHAR(20) PRIMARY KEY DEFAULT ('QUO-' || LPAD(nextval('quote_seq')::TEXT, 4, '0')),
    opportunity_id VARCHAR(20),
    customer_id VARCHAR(20) NOT NULL, -- references CUST-0001..CUST-0008
    dealer_id VARCHAR(20), -- references DLR-0001..DLR-0005
    sales_rep_id VARCHAR(20) NOT NULL, -- references EMP-0001..EMP-0004
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    needs_approval BOOLEAN NOT NULL DEFAULT FALSE,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS quote_items (
    id VARCHAR(20) PRIMARY KEY DEFAULT ('QI-' || LPAD(nextval('quote_items_seq')::TEXT, 4, '0')),
    quote_id VARCHAR(20) NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    sku VARCHAR(20) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL
  );
  ```
- **Tax & Calculation Rules**:
  - Subtotal = $\sum (\text{quantity} \times \text{unit\_price})$
  - Discount Amount = $\text{subtotal} \times (\text{discount\_percent} / 100)$
  - Taxable Value = $\text{subtotal} - \text{discount\_amount}$
  - GST 18% = $\text{taxable\_value} \times 0.18$ (9% CGST + 9% SGST)
  - Total = $\text{taxable\_value} + \text{GST 18\%}$
- **API Endpoints**:
  - `GET /api/quotes` (filters: `?opportunity_id=`, `?status=`, `?dealer_id=`): Returns list of quotes.
  - `GET /api/quotes/:id`: Returns quote details, items array, subtotal, discount, GST 18%, and grand total.
  - `POST /api/quotes`: Body `{ opportunity_id, customer_id, dealer_id?, sales_rep_id, discount_percent, items: [{ sku, product_name, quantity, unit_price }] }`. Creates quote and items in a single PostgreSQL transaction (`BEGIN ... COMMIT`).
- **Seed Data**: 4 quotes using `SKU-0001..SKU-0005` and `CUST-0001..CUST-0004`.
- **Done When**: Quotes with items are created atomically; GET returns calculated tax breakdown; query filters work.

---

### [CRM1-C2] Quote builder screen
- **Assigned Role**: Member C
- **Files to Create/Edit**:
  - `frontend/src/modules/crm1/pages/QuoteBuilderPage.jsx`
  - `frontend/src/modules/crm1/pages/QuotesListPage.jsx`
  - `frontend/src/modules/crm1/index.jsx`
- **Screen Requirements**:
  - Routes: `/crm1/quotes` (list view) and `/crm1/quotes/new` (builder view).
  - **Product Selection**: Calls ERP-1 `api('erp1', '/api/products')`.
    - Fallback Mock: Array with 3 products (`SKU-0001 55" TV ₹42,990`, `SKU-0004 Soundbar 2.1 ₹8,990`, `SKU-0006 Headphones ₹3,499`).
  - **Dynamic Item Rows**: Button to "Add Item", selecting SKU pre-populates product name and unit price. Changing quantity calculates row total.
  - **Live Totals Box**: Automatically calculates and renders Subtotal, Discount %, GST (18%), and Grand Total in INR.
  - Save button saves as `draft` and redirects to `/crm1/quotes`.
- **Done When**: Totals update live in the UI as prices and quantities are modified; quotes save and display in the list.

---

### [CRM1-C3] Discount rule, quote status and order handoff
- **Assigned Role**: Member C
- **Files to Create/Edit**:
  - `services/crm1/routes/quotes.js`
  - `services/crm1/mocks/sales-orders.json`
  - `services/crm1/mocks/timeline-event.json`
- **Discount & Approval Enforcement**:
  - If `discount_percent > 5`, automatically set `needs_approval = true`.
  - When `needs_approval = true`, moving status from `draft` to `sent` is blocked with `400 Bad Request` unless `approved = true`.
- **Endpoints**:
  - `PATCH /api/quotes/:id/status`: Body `{ "status": "sent" | "accepted" | "rejected" }`.
- **Order Handoff & Timeline Side Effects (When status $\rightarrow$ `accepted`)**:
  1. **Handoff to ERP-4**:
     ```javascript
     try {
       await callService('erp4', '/api/sales-orders', {
         method: 'POST',
         body: {
           quote_id: quote.id,
           customer_id: quote.customer_id,
           sales_rep_id: quote.sales_rep_id,
           items: quote.items
         },
         mock: 'sales-orders'
       });
     } catch (err) {
       console.error('[integration-error] ERP-4 order handoff failed:', err.message);
     }
     ```
  2. **Customer 360 Timeline Event (CRM-3)**:
     ```javascript
     try {
       await callService('crm3', '/api/interactions/from-event', {
         method: 'POST',
         body: {
           customer_id: quote.customer_id,
           type: 'order',
           summary: `Quote ${quote.id} accepted by customer. Handed off to ERP-4.`,
           source_team: 'CRM-1'
         },
         mock: 'timeline-event'
       });
     } catch (err) {
       console.error('[integration-error] CRM-3 timeline event failed:', err.message);
     }
     ```
- **Done When**: Quotes with $>5\%$ discount require approval before sending; accepting a quote triggers ERP-4 order creation and posts to CRM-3 timeline.

---

## 🤝 Member D: Dealer Management & Quote Approvals

### [CRM1-D1] Dealers table and API
- **Assigned Role**: Member D (Dealers & Approvals)
- **Files to Create/Edit**:
  - `services/crm1/db/schema.sql`
  - `services/crm1/db/seed.sql`
  - `services/crm1/routes/dealers.js`
- **Database Schema**:
  ```sql
  CREATE SEQUENCE IF NOT EXISTS dealer_seq START 1;

  CREATE TABLE IF NOT EXISTS dealers (
    id VARCHAR(20) PRIMARY KEY DEFAULT ('DLR-' || LPAD(nextval('dealer_seq')::TEXT, 4, '0')),
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    city VARCHAR(50) NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('gold', 'silver', 'bronze')),
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 100000.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Seed Data (5 rows from Section 5 Contract)**:
  - `DLR-0001`: BrightHome Retail, Rahul Deshmukh, `020-25671199`, `rahul@brighthome.in`, Pune, `gold`, `₹15,00,000`, `active`
  - `DLR-0002`: Gadget Hub, Suresh Rao, `080-22345678`, `contact@gadgethub.in`, Bengaluru, `silver`, `₹8,00,000`, `active`
  - `DLR-0003`: Metro Electronics, Amit Verma, `011-23456789`, `amit@metroelec.com`, Delhi, `gold`, `₹20,00,000`, `active`
  - `DLR-0004`: Western Appliance Mart, Manoj Joshi, `022-26789012`, `manoj@westernmart.com`, Mumbai, `bronze`, `₹3,00,000`, `active`
  - `DLR-0005`: Royal Vision Hub, Priya S., `044-24567890`, `priya@royalvision.com`, Chennai, `silver`, `₹6,00,000`, `active`
- **API Endpoints**:
  - `GET /api/dealers` (query filters: `?q=` name search, `?city=` city filter)
  - `GET /api/dealers/:id`
  - `POST /api/dealers`: Validates name, city, and tier in `['gold', 'silver', 'bronze']`.
  - `PUT /api/dealers/:id`
- **Done When**: Full CRUD tested; search by name and city filter work; 5 seed dealers loaded across tiers.

---

### [CRM1-D2] Dealer screens
- **Assigned Role**: Member D
- **Files to Create/Edit**:
  - `frontend/src/modules/crm1/pages/DealersPage.jsx`
  - `frontend/src/modules/crm1/pages/DealerDetailPage.jsx`
  - `frontend/src/modules/crm1/index.jsx`
- **Screen Requirements**:
  - Routes: `/crm1/dealers` and `/crm1/dealers/:id` registered in `index.jsx`.
  - **Dealers List**: Table with Name, City, Tier badge (Gold: gold, Silver: silver, Bronze: bronze), Credit Limit in INR, Contact info, and Action links.
  - **Dealer Detail**: Shows dealer profile card, credit limit, and lists all quotes associated with this dealer via `api('crm1', '/api/quotes?dealer_id=' + id)`.
- **Done When**: Dealers can be added, viewed, and filtered from the browser; detail page lists all dealer quotes.

---

### [CRM1-D3] Quote approval screen
- **Assigned Role**: Member D
- **Files to Create/Edit**:
  - `services/crm1/routes/quotes.js` (approval endpoints)
  - `frontend/src/modules/crm1/pages/ApprovalsPage.jsx`
  - `frontend/src/modules/crm1/index.jsx`
- **Role Enforcement & Security**:
  - Endpoints protected with `requireRole('admin')`.
- **API Endpoints**:
  - `GET /api/approvals`: Returns all quotes where `needs_approval = true AND approved = false AND status = 'draft'`.
  - `PATCH /api/quotes/:id/approve`: Sets `approved = true`.
  - `PATCH /api/quotes/:id/reject`: Body `{ "reason": "Discount too high for bronze tier" }`. Sets `rejection_reason` and sets `status = 'rejected'`.
- **Screen Requirements**:
  - Route: `/crm1/approvals` registered with `roles: ['admin']`.
  - Table of pending quotes showing Quote ID, Customer/Dealer, Discount %, and a hint showing Dealer Tier policy:
    - **Gold**: Up to 15% discount allowed.
    - **Silver**: Up to 10% discount allowed.
    - **Bronze**: Up to 5% discount allowed.
  - Action buttons: **Approve** (green) and **Reject** (opens modal for reason).
- **Done When**: Non-admin receives 403; approving unlocks the send status in CRM1-C3; rejecting records reason.

---

## 👥 Role Issues (All 4 Team Members)

### [CRM1-R1] Team Lead: README and demo script
- **Owner**: Member A (`@hazelnutbytes`)
- **Deliverables**:
  1. `docs/crm1/README.md`: Module architecture, port 5101, all routes, cross-team calls.
  2. `docs/crm1/demo.md`: 5-step viva demo script:
     - Step 1: Create lead `LEAD-0001` with score calculation.
     - Step 2: Convert lead to Opportunity `OPP-0001`.
     - Step 3: Advance opportunity through the Kanban pipeline.
     - Step 4: Build Quote `QUO-0001` with 10% discount, approve it as Admin, and accept it.
     - Step 5: Verify order handoff to ERP-4 and CRM-3 timeline event.
- **Done When**: Complete README and demo script committed to `main`.

### [CRM1-R2] Data owner: ER diagram, data dictionary and seed verification
- **Owner**: Member B (`@tanmay01-D3V`)
- **Deliverables**:
  1. `docs/crm1/er-diagram.md`: Mermaid diagram showing tables `leads`, `opportunities`, `quotes`, `quote_items`, and `dealers` in 3NF.
  2. Data dictionary explaining every column, type, constraint, and default value.
  3. Verify that `npm run reset` executes cleanly with zero errors.
- **Done When**: ER diagram and dictionary match database schemas perfectly.

### [CRM1-R3] UI owner: Wireframes and screen consistency
- **Owner**: Member C (`@2025prince-control`)
- **Deliverables**:
  1. Wireframes for `/leads`, `/pipeline`, `/quotes`, `/quotes/new`, `/dealers`, and `/approvals` in `docs/crm1/wireframes/`.
  2. Ensure plain CSS styles match color guidelines (badges, buttons, ₹ currency format).
- **Done When**: All 6 pages open from the navigation sidebar at `/crm1/...` without navbar duplications.

### [CRM1-R4] QA and docs owner: Test cases, API spec and cross-team verification
- **Owner**: Member D (`@PranavNair2007`)
- **Deliverables**:
  1. `docs/crm1/tests.md`: Test suite with at least 3 test cases per build issue (total $\ge 36$ test cases).
  2. `docs/crm1/api.md`: Comprehensive OpenAPI-style specification for all endpoints.
  3. Verify Cross-Team Rows:
     - Row 1: Read sales reps from ERP-6 (`GET /api/employees?role_title=Sales Rep`).
     - Row 2: Read products from ERP-1 (`GET /api/products`).
     - Row 3: Push sales order to ERP-4 (`POST /api/sales-orders`).
     - Row 4: Push timeline interaction to CRM-3 (`POST /api/interactions/from-event`).
- **Done When**: All test cases verified with `USE_MOCKS=false`.
