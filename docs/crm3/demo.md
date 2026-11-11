# CRM-3 Customer 360 — 5-Step Demo Script

This script provides an interactive, reproducible 5-step walkthrough of Team CRM-3's **Customer 360** module. Designed to be followed by anyone outside the team (PMs, QA, external evaluators, and peer teams), it utilizes strictly the pinned master data IDs defined in **Section 5 (Shared Seed Contract)**.

---

## 📌 Shared Contract Test Data Referenced

| Entity Category | Contract ID | Name / Description | Attribute / Shared Value |
|---|---|---|---|
| **Corporate Customer** | `CUST-0002` | Sunrise Electronics Pvt Ltd | Mumbai · GSTIN: `27AABCS1234F1Z5` · `contact@sunrise.com` |
| **Retail Customer** | `CUST-0001` | Aarav Mehta | Mumbai · Phone: `9820123456` · `aarav@gmail.com` |
| **Dealer Customer** | `CUST-0004` | BrightHome Retail LLP | Pune · GSTIN: `27AAACB5678G1Z2` · `dealer@brighthome.com` |
| **Duplicate Row 1** | `CUST-0009` | Duplicate of `CUST-0001` | Phone duplicate: `9820123456` |
| **Duplicate Row 2** | `CUST-0010` | Duplicate of `CUST-0002` | Email duplicate: `contact@sunrise.com` |
| **Target Product** | `SKU-0001` | 55-inch 4K Smart TV | ₹42,990.00 (ERP-1 product) |
| **Sales Rep** | `EMP-0001` | Rohan Kulkarni | Sales Department (`DEP-01`) |
| **Sales Rep** | `EMP-0002` | Neha Sharma | Sales Department (`DEP-01`) |
| **Service Engineer** | `EMP-0005` | Imran Qureshi | Support Department (`DEP-02`) |
| **Demo User** | `sales@demo.com` | Demo Sales Login | Password: `demo123` (ERP5-C2 login) |

---

## Pre-requisites: Start Services

Ensure the backend and frontend are running:
```bash
# Terminal 1: Backend service (Port 5103)
npm --workspace=services/crm3 run dev

# Terminal 2: Frontend unified shell (Port 3000)
npm --workspace=frontend run dev
```

Log in to the web shell at `http://localhost:3000` using `sales@demo.com` / `demo123` (or `admin@demo.com`).

---

## Step 1: Customer Master Directory & Customer 360 Profile

**Objective**: Verify customer discovery, archetype filtering, statutory GSTIN validation, multi-address support, contact management, and tag assignment.

1. In your browser, navigate to the customer directory:
   ```text
   http://localhost:3000/crm3/customers
   ```
2. **Filter & Search**:
   - In the **Type Filter** dropdown, select `Corporate`. Notice that only corporate accounts (`CUST-0002`, `CUST-0006`, and duplicate `CUST-0010`) are displayed.
   - In the search bar, type `Sunrise`. The table immediately filters to `CUST-0002` (**Sunrise Electronics Pvt Ltd**).
3. **Inspect Customer 360 Detail**:
   - Click on `CUST-0002` (or open `http://localhost:3000/crm3/customers/CUST-0002`).
   - Verify the profile header:
     - **Name**: Sunrise Electronics Pvt Ltd
     - **Customer Type Badge**: `corporate` (blue badge)
     - **Statutory GSTIN**: `27AABCS1234F1Z5` (valid 15-character GSTIN)
     - **Billing Address**: `101 Nariman Point, Marine Lines, Mumbai`
     - **Shipping Address**: `Plot 42, MIDC Industrial Area, Andheri East, Mumbai`
4. **Contacts & Tagging**:
   - Scroll to the **Contacts** table: confirm primary contact **Rajesh Sharma** (`Operations Director`, Phone: `9820234568`).
   - Click **+ Add Contact**:
     - Name: `Pooja Mehta`
     - Designation: `Procurement Lead`
     - Email: `pooja@sunrise.com`
     - Phone: `9820234569`
     - Click **Save Contact**; confirm Pooja Mehta appears in the contacts table.
   - In the **Tags** section, enter `VIP-Account` and click **Add Tag**. Confirm the `VIP-Account` chip renders alongside existing tags.

---

## Step 2: Cross-Team Event Ingestion & Unified Chronological Timeline

**Objective**: Verify the cross-team event bus endpoint (`POST /api/interactions/from-event`), sliding-window duplicate suppression, and unified timeline visualization.

1. **Simulate Cross-Team Event from CRM-2 (Support & Warranty)**:
   In a terminal, simulate CRM-2 Support creating a ticket event for `CUST-0002`:
   ```bash
   curl -X POST http://localhost:5103/api/interactions/from-event \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN>" \
     -d '{
       "customer_id": "CUST-0002",
       "type": "ticket",
       "summary": "Ticket TKT-0001: 55-inch 4K Smart TV display panel inspection requested",
       "source_team": "CRM-2"
     }'
   ```
   **Expected Response**: HTTP `201 Created` with the newly created interaction record.

2. **Verify Duplicate Suppression (Idempotency Safety Gate)**:
   Re-send the exact same curl request immediately (within 60 seconds):
   ```bash
   curl -X POST http://localhost:5103/api/interactions/from-event \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN>" \
     -d '{
       "customer_id": "CUST-0002",
       "type": "ticket",
       "summary": "Ticket TKT-0001: 55-inch 4K Smart TV display panel inspection requested",
       "source_team": "CRM-2"
     }'
   ```
   **Expected Response**: HTTP `201 Created` with `"duplicate": true` or the existing record returned without creating a second timeline entry.

3. **Inspect Unified Timeline in UI**:
   - In the browser, navigate to the timeline:
     ```text
     http://localhost:3000/crm3/customers/CUST-0002/timeline
     ```
   - Confirm the new event appears at the top of the chronological feed:
     - **Icon**: Ticket / Support badge
     - **Summary**: `Ticket TKT-0001: 55-inch 4K Smart TV display panel inspection requested`
     - **Source Team**: `CRM-2` (orange badge)
     - **Timestamp**: Current timestamp (just now)
4. **Log Internal Sales Interaction**:
   - At the top of the timeline page, use the **Add Note** form:
     - Type: `meeting`
     - Rep: `EMP-0001 (Rohan Kulkarni)`
     - Summary: `Quarterly review meeting with Rajesh Sharma: discussing repeat order for 20x SKU-0001.`
     - Click **Post Note**.
   - Confirm the note immediately renders at the top with source badge `CRM-3` and rep `EMP-0001`.

---

## Step 3: Dynamic Segmentation & CSV Audience Export (CRM-4 Integration)

**Objective**: Verify the dynamic segmentation query engine and CSV audience export used by CRM-4 Marketing for targeted campaigns.

1. Navigate to the segments directory:
   ```text
   http://localhost:3000/crm3/segments
   ```
2. **Review Seeded Segment**:
   - Observe the pre-seeded segment **"Corporate in Mumbai"** (`SEG-0001`):
     - **Target Customer Type**: `corporate`
     - **Target City**: `Mumbai`
3. **Inspect Live Segment Evaluation**:
   - Click **View Segment** on `SEG-0001` (or open `http://localhost:3000/crm3/segments/SEG-0001`).
   - Observe the live query evaluation:
     - **Matching Customers Count**: `1` (or `2` if duplicate `CUST-0010` is not yet merged).
     - Customer table displays: `CUST-0002 (Sunrise Electronics Pvt Ltd)`.
     - Confirm other retail customers in Mumbai (`CUST-0001`) and corporate customers in Delhi (`CUST-0006`) are strictly excluded.
4. **Export CSV Audience**:
   - Click the **📥 Download CSV** button on the page (or test via curl):
     ```bash
     curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:5103/api/segments/SEG-0001/export.csv
     ```
   - **Expected CSV Output**:
     ```csv
     name,email,phone,city
     Sunrise Electronics Pvt Ltd,contact@sunrise.com,9820234567,Mumbai
     ```
   - Open the downloaded file in Excel or text editor to confirm standard CSV formatting.

---

## Step 4: Data Quality & AI Deduplication: Atomic Merge

**Objective**: Verify automated duplicate detection clusters and execute an atomic PostgreSQL multi-table merge transaction.

1. Navigate to the duplicate detection center:
   ```text
   http://localhost:3000/crm3/duplicates
   ```
2. **Observe Flagged Duplicate Clusters**:
   The screen displays two flagged duplicate groups:
   - **Group A (Phone Match `9820123456`)**:
     - `CUST-0001` (Aarav Mehta - retail, Mumbai)
     - `CUST-0009` (Aarav Mehta Duplicate - retail, Mumbai)
   - **Group B (Email Match `contact@sunrise.com`)**:
     - `CUST-0002` (Sunrise Electronics Pvt Ltd)
     - `CUST-0010` (Sunrise Electronics Pvt Ltd Duplicate)
3. **Execute Atomic Customer Merge**:
   - On Group B, review the side-by-side card comparison.
   - Click **Keep This Record** on `CUST-0002`.
   - A modal prompt appears:
     > *"Merge CUST-0010 into CUST-0002? All contacts, timeline interactions, and tags from CUST-0010 will be safely transferred to CUST-0002, and CUST-0010 will be deleted."*
   - Click **Confirm Merge**.
4. **Verify Merge Integrity**:
   - The merge executes atomically via `POST /api/customers/merge`:
     ```json
     { "keep_id": "CUST-0002", "remove_id": "CUST-0010" }
     ```
   - The duplicates screen refreshes automatically: Group B is now completely resolved and disappears from the duplicate queue.
   - Open `http://localhost:3000/crm3/customers/CUST-0002`: verify all combined contacts and timeline interactions are consolidated under `CUST-0002`.
   - Attempting to access `http://localhost:3000/crm3/customers/CUST-0010` returns HTTP 404 Not Found.

---

## Step 5: High-Volume Customer Onboarding via CSV Import

**Objective**: Verify browser-native CSV file parsing, preview validation, backend CRM3-A3 rule enforcement, error reporting, and bulk customer creation.

1. Navigate to the CSV import wizard:
   ```text
   http://localhost:3000/crm3/import
   ```
2. **Prepare or Download Test Dataset**:
   Create a test CSV file named `test_customers.csv` containing 10 rows (8 valid, 2 invalid):
   ```csv
   name,type,email,phone,gstin,billing_address,shipping_address,city
   Apex Solutions,corporate,billing@apex.com,9821001122,27AABCA1234D1Z1,MG Road,MIDC,Mumbai
   Ramesh Kumar,retail,ramesh.k@gmail.com,9821001123,,Bandra West,Bandra West,Mumbai
   Bad Phone User,retail,badphone@example.com,12345,,Indiranagar,Indiranagar,Bengaluru
   Zenith Retailers,dealer,orders@zenith.com,9821001124,29AABCZ5678K1Z5,Brigade Road,Peenya,Bengaluru
   Kavita Patel,retail,kavita@yahoo.com,9821001125,,Navrangpura,Navrangpura,Ahmedabad
   Missing GSTIN Corp,corporate,procure@corpbad.com,9821001126,,Connaught Place,Okhla,Delhi
   BlueStar Enterprises,corporate,info@bluestar.com,9821001127,07AABCB9012M1Z8,Barakhamba,Noida,Delhi
   Suresh Reddy,retail,suresh@outlook.com,9821001128,,Banjara Hills,Banjara Hills,Hyderabad
   Delta Appliances,dealer,sales@delta.com,9821001129,36AABCD3456F1Z9,Gachibowli,HITEC City,Hyderabad
   Pooja Hegde,retail,pooja.h@gmail.com,9821001130,,Koramangala,Koramangala,Bengaluru
   ```
3. **Upload & Inspect Client-Side Preview**:
   - Drag and drop or select `test_customers.csv` in the file picker.
   - The table renders instantly using browser-native parsing (no external library).
   - Rows with validation defects are visually flagged:
     - **Row 3** (Bad Phone User): Red warning badge on phone (`12345` is not 10 digits).
     - **Row 6** (Missing GSTIN Corp): Red warning badge on missing GSTIN for corporate type.
4. **Submit Bulk Ingestion**:
   - Click **Import Customers (10 rows)**.
   - The UI submits the array to `POST /api/customers/import`.
5. **Verify Diagnostics Banner**:
   - The result card displays:
     - **Inserted**: `8` customers successfully added.
     - **Skipped**: `2` rows rejected with detailed explanations:
       - *Row 3 (Bad Phone User): Phone number must be exactly 10 digits*
       - *Row 6 (Missing GSTIN Corp): GSTIN is required for corporate customer type*
   - Click **View in Directory**: confirm that newly inserted customers (`Apex Solutions`, `Ramesh Kumar`, etc.) appear in `/crm3/customers` with newly allocated monotonic sequence IDs (`CUST-0011`, `CUST-0012`...).

---

*Demo script verified end-to-end against Electro App Monorepo Week 8 Release Candidate standards.*
