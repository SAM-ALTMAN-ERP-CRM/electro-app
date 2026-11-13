# CRM-5 Portal & Analytics — 5-Step Module Demo Script

This demo script provides a reproducible, 5-step walkthrough of **Team CRM-5 (Portal & Analytics)** designed to be followed end-to-end by any reviewer or evaluator outside the team. Every scenario uses the shared identifiers defined in **Section 5 (Shared Seed Contract)**.

---

## 📌 Section 5 Shared Contract Identifiers Referenced

| Entity Type | Contract ID | Name / Description | Shared Reference |
|---|---|---|---|
| **Retail Customer** | `CUST-0001` | Aarav Mehta | Mumbai · Order `SO-0001`, `SO-0005` · Ticket `TKT-0001` |
| **Corporate Customer** | `CUST-0002` | Sunrise Electronics Pvt Ltd | Mumbai · GSTIN `27AABCS1234F1Z5` · Order `SO-0004` |
| **Retail Customer** | `CUST-0003` | Priya Nair | Kochi · Order `SO-0003` · Ticket `TKT-0002` |
| **Dealer Customer** | `CUST-0004` | BrightHome Retail LLP (`DLR-0001`) | Pune · Order `SO-0002` · Ticket `TKT-0003` |
| **Product (Flagship SKU)** | `SKU-0001` | 55-inch 4K Smart TV | ₹42,990.00 (18% GST) · Serials `TV55-2611-0001..0005` |
| **Product (Soundbar)** | `SKU-0004` | Soundbar 2.1 | ₹8,990.00 (18% GST) |
| **Sales Representatives** | `EMP-0001`..`EMP-0004` | Rohan Kulkarni (`EMP-0001`), Neha Sharma (`EMP-0002`), Vikram Singh (`EMP-0003`), Anjali Rao (`EMP-0004`) | Department `DEP-01` Sales |
| **Service Engineers** | `EMP-0005`..`EMP-0007` | Imran Qureshi (`EMP-0005`), Deepa Menon (`EMP-0006`), Suresh Kumar (`EMP-0007`) | Department `DEP-02` Support |
| **Warehouses** | `WH-01`..`WH-03` | `WH-01` Mumbai, `WH-02` Delhi, `WH-03` Bengaluru | Regional fulfillment centers |
| **Orders / Quotes / Invoices** | `SO-0001..0005`, `QUO-0001..0005`, `INV-0001..0005` | Seeded Order-to-Cash transactions | Linked to `CUST-0001..CUST-0004` |

---

## Prerequisites: Start Backend & Frontend

Ensure dependencies are installed (`npm ci`) and start the CRM-5 backend (`5105`) and frontend shell (`3000`):

```bash
# Terminal 1: Start CRM-5 backend service (Port 5105)
npm --workspace=services/crm5 run dev

# Terminal 2: Start unified frontend shell (Port 3000)
npm --workspace=frontend run dev
```

*(In local dev mode with `.env` default `AUTH_REQUIRED=false`, APIs auto-authenticate as `admin@demo.com` / `EMP-0012`. If `AUTH_REQUIRED=true`, log in via `POST http://localhost:5205/api/auth/login` with `admin@demo.com` / `demo123` and pass `-H "Authorization: Bearer <TOKEN>"` on curl calls.)*

Verify service health first:
```bash
curl -s http://localhost:5105/api/health
```
Expected response:
```json
{
  "status": "ok",
  "team": "crm5",
  "name": "CRM-5 Portal & Analytics",
  "port": 5105
}
```

---

## Step 1: Executive Sales Dashboard & Snapshot Persistence (`/crm5/dashboard`)

**Goal**: Verify live KPI cards, the zero-library CSS pipeline stage bar chart, stage drill-down filtering, and snapshot capture.

1. Open the browser to:
   ```text
   http://localhost:3000/crm5/dashboard
   ```
2. **Verify the 4 KPI Cards**:
   - **Total Leads**: `12` (or live count when CRM-1 `5101` is running)
   - **Open Opportunities**: `3` (from `recent_opportunities` in `mocks/sales-summary.json`, or `7` in frontend offline fallback / live CRM-1 data)
   - **Won Value**: `₹2,09,970.00` (Indian comma formatting with `₹`)
   - **Quotes Accepted**: `1` (from `services/crm1/mocks/quotes.json` `QUO-0003`, or live CRM-1 accepted quote count)
3. **Inspect the HTML/CSS Pipeline Bar Chart**:
   - Confirm 5 colored horizontal CSS bars (`Prospect`, `Proposal`, `Negotiation`, `Won`, `Lost`) scale proportionally to deal counts.
   - Click the **Negotiation** bar (or the **Negotiation** filter button above the **Contributing Opportunities** table) to filter the drill-down table to `OPP-0003` (`CUST-0003`, Rep `EMP-0003`, `₹1,12,980.00`).
   - Confirm `OPP-0001` (`CUST-0001`, `EMP-0001`) and `OPP-0002` (`CUST-0004`, `EMP-0002`) appear when **All Stages** is selected.
4. **Filter by Date Range & Save Snapshot (`[CRM5-B3]`)**:
   - Switch the date range selector (`this_week`, `this_month`, `all_time`) and confirm `?range=` updates the KPI cards and stage counts.
   - Click **Save Snapshot** and verify a new `SNP-xxxx` row appears in the **Snapshot History** table at the bottom.
5. **Test Backend Summary & Snapshot APIs**:
   ```bash
   # Fetch aggregated sales summary (with optional ?range=this_month)
   curl -s "http://localhost:5105/api/dashboard/sales-summary?range=all_time"

   # Save a dashboard KPI snapshot (returns 201 Created with SNP-xxxx)
   curl -s -X POST http://localhost:5105/api/dashboard/snapshot \
     -H "Content-Type: application/json" \
     -d '{"range":"all_time","metrics":{"total_leads":12,"open_opportunities":7,"won_value":209970.00,"quotes_accepted":4}}'

   # List historical snapshots (SNP-0001..SNP-0005 + newly saved snapshot)
   curl -s http://localhost:5105/api/dashboard/snapshots
   ```

---

## Step 2: Customer Self-Service Portal Lookup & Visit Audit (`/crm5/portal`)

**Goal**: Verify customer lookup by Section 5 ID (`CUST-0001`), consolidated orders/tickets/invoices tables, friendly error handling for invalid IDs, and automatic `portal_visits` logging.

1. Navigate to:
   ```text
   http://localhost:3000/crm5/portal
   ```
2. **Lookup `CUST-0001`**:
   - Enter `CUST-0001` in the Customer Identifier input (or click the **CUST-0001** quick demo chip) and click **View My Account →**.
   - The page navigates to `/crm5/portal/home?id=CUST-0001` and displays:
     - **Summary Cards**: `2` Total Orders, `2` Support Tickets, `2` Invoices & Billing.
     - **My Orders**: `SO-0001` (`QUO-0001`, Rep `EMP-0001`, `₹61,336.40`, `delivered` green badge) and `SO-0005` (`QUO-0005`, Rep `EMP-0002`, `₹42,990.00` for 1x `SKU-0001`, `confirmed` purple badge).
     - **My Tickets**: `TKT-0001` (`Display panel flickering on OLED 65`, Engineer `EMP-0005`, `in-progress`) and `TKT-0005` (`Firmware update support for Soundbar 2.1`, `SKU-0004`, Engineer `EMP-0006`, `resolved`).
     - **My Invoices**: `INV-0001` (`SO-0001`, `₹61,336.40`, `paid`) and `INV-0005` (`SO-0005`, `₹42,990.00`, `issued`).
3. **Raise a Support Ticket & Track Order Fulfillment (`[CRM5-A3]`)**:
   - On `/crm5/portal/home?id=CUST-0001`, use the **Raise a Ticket** form (`subject`, `description`, `priority: "high"`) to post via `POST /api/portal/tickets` and confirm the returned ticket ID (`TKT-xxxx` or `TKT-MOCK`).
   - Click order `SO-0001` (or navigate to `http://localhost:3000/crm5/portal/orders/SO-0001`) and confirm the 4-step tracker highlights `created` → `confirmed` → `dispatched` → `delivered`.
4. **Verify Friendly Error Handling (`CUST-9999`)**:
   - Click **← Switch Customer**, enter `CUST-9999`, and submit.
   - Verify an amber/red notice displays: *"Customer ID 'CUST-9999' was not found in our records..."* (API returns HTTP `404`).
5. **Verify Visit Telemetry & Order APIs**:
   ```bash
   # Trigger overview API for CUST-0001 and inspect logged visit PV-xxxx
   curl -s http://localhost:5105/api/portal/CUST-0001/overview
   curl -s http://localhost:5105/api/portal/visits
   curl -s http://localhost:5105/api/portal/orders/SO-0001
   ```

---

## Step 3: Weighted Pipeline & Monthly Sales Targets (`/crm5/forecast`)

**Goal**: Verify probability-weighted pipeline calculations against Section 5 opportunities and test monthly target CRUD + progress bar recalculation.

1. Navigate to:
   ```text
   http://localhost:3000/crm5/forecast
   ```
2. **Verify Weighted Pipeline Hand Calculation**:
   - Confirm the **Weighted Pipeline Value** card displays **`₹93,374.00`**, computed from active opportunities:
     - `OPP-0001` (`CUST-0001`, `EMP-0001`, `prospect` 10%): `₹51,980.00 × 0.10 = ₹5,198.00`
     - `OPP-0002` (`CUST-0004`, `EMP-0002`, `proposal` 30%): `₹67,960.00 × 0.30 = ₹20,388.00`
     - `OPP-0003` (`CUST-0003`, `EMP-0003`, `negotiation` 60%): `₹1,12,980.00 × 0.60 = ₹67,788.00`
     - **Sum**: `5,198 + 20,388 + 67,788 = ₹93,374.00`
   - Against the `2026-11` target (`FCST-0004`: `₹1,50,000.00`), verify the progress bar shows **`62.2% Achieved`**.
3. **Create / Update Monthly Target**:
   - In **Set Monthly Sales Target**, enter Month `2027-01`, Target Amount `220000`, Notes `Q1 enterprise SKU-0001 rollout`, and click **+ Set Target**.
   - Confirm `2027-01` appears in the **Monthly Sales Target Records** table formatted as `₹2,20,000.00`.
   - Click **✏️ Edit** on `2026-11` (`FCST-0004`), change target to `186748`, and save — confirm the realization bar updates to **`50%`**.
4. **Inspect 6-Month Won Trend & Next-Month Estimate (`[CRM5-C3]`)**:
   - Scroll to the 6-month CSS bar chart showing monthly `won` revenue and verify the **Next-Month Estimate** equals the 3-month rolling average formula displayed on the page.
5. **Verify via API**:
   ```bash
   curl -s http://localhost:5105/api/forecast/weighted
   curl -s http://localhost:5105/api/forecast/trend
   curl -s -X POST http://localhost:5105/api/forecasts \
     -H "Content-Type: application/json" \
     -d '{"month":"2027-01","target_amount":220000.00,"notes":"Q1 enterprise SKU-0001 rollout"}'
   ```

---

## Step 4: Role-Based Executive & Operational Reports (`/crm5/reports`)

**Goal**: Verify role-filtered report catalogs, admin role preview dropdown, live report execution, and `403 Forbidden` enforcement.

1. Navigate to:
   ```text
   http://localhost:3000/crm5/reports
   ```
2. **Admin Full Access & Role Preview**:
   - Logged in as `admin@demo.com`, confirm **7 reports** appear in the catalog.
   - Use the **Admin Role Preview** dropdown (`Preview Role`):
     - Select `Sales`: catalog narrows to `sales-by-rep` (`EMP-0001`..`EMP-0004`) and `conversion-rate`.
     - Select `Support`: catalog narrows to `tickets-by-priority` (`TKT-0001..0004`, `CUST-0001..0004`, `EMP-0005..0007`) and `sla-breaches` (`WH-01`).
     - Select `Finance` / `HR`: shows `won-revenue-by-month` (18% GST breakdown) or `rep-performance`.
3. **Execute Report, Export CSV & Print (`[CRM5-D3]`)**:
   - Click **▶ Run Report** on `tickets-by-priority` (or `sales-by-rep`).
   - Confirm the **Report Results** table renders with formatted INR currency values and colored status/priority badges (`HIGH`, `URGENT`, `RESOLVED`).
   - Click **📥 Download CSV** to download an Excel-ready CSV file, and test **Print** to verify `@media print` hides the shell sidebar and action buttons.
4. **Verify Role Enforcement via API (`403 Forbidden`)**:
   ```bash
   # Sales role sees only sales reports
   curl -s -H "x-user-role: sales" http://localhost:5105/api/reports

   # Support role attempting to run finance report returns 403 Forbidden
   curl -i -s -H "x-user-role: support" http://localhost:5105/api/reports/won-revenue-by-month/run
   ```

---

## Step 5: Monorepo Health, Cross-Team Checks & Automated Suite

**Goal**: Confirm CRM-5 integrates cleanly into the unified monorepo with zero build or test regressions.

1. Run the full verification commands from the repository root:
   ```bash
   # Syntax check across all 11 services + frontend module shell check
   npm run smoke

   # Unified Vite production build (all 11 modules)
   npm run build

   # CRM-5 backend unit test suite (19+ tests across dashboard, forecasts, portal, reports, R1/R2 checks)
   npm --workspace=services/crm5 test
   ```
2. **Expected Outcome**:
   - `npm run smoke` passes all backend JS syntax checks and confirms `frontend/src/modules/crm5/index.jsx` exists.
   - `npm run build` compiles cleanly with zero errors.
   - All tests under `services/crm5/tests/*.test.js` pass.
