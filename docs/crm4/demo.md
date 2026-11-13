# CRM-4 Marketing & Engagement — 5-Step Module Demo Script

This demo script provides a reproducible, 5-step walkthrough of **Team CRM-4 (Marketing & Engagement)** designed to be followed end-to-end by any reviewer or evaluator outside the team. Every scenario uses the shared identifiers defined in **Section 5 (Shared Seed Contract)**.

---

## 📌 Section 5 Shared Contract Identifiers Referenced

| Entity Type | Contract ID | Name / Description | Shared Reference in Flow |
|---|---|---|---|
| **Retail Customer** | `CUST-0001` | Aarav Mehta | Mumbai · Order `SO-0001` · NPS Rating `10` |
| **Corporate Customer** | `CUST-0002` | Sunrise Electronics Pvt Ltd | Mumbai · GSTIN `27AABCS1234F1Z5` · NPS Rating `9` |
| **Retail Customer** | `CUST-0003` | Priya Nair | Kochi · Opted-out Subscriber (`opted_out: true`) |
| **Dealer Customer** | `CUST-0004` | BrightHome Retail LLP (`DLR-0001`) | Pune · Dealer Inquiry · Order `SO-0002` |
| **Product (Smart TV)** | `SKU-0001` | Smart LED TV 55" 4K UHD | Flagship SKU · Inquiry interest |
| **Product (Refrigerator)** | `SKU-0002` | Double Door Refrigerator 350L | Dealer wholesale inquiry |
| **Sales Representative** | `EMP-0001` | Rohan Kulkarni | Department `DEP-01` Sales · Lead assignee |
| **Customer Segments** | `SEG-0001`..`SEG-0004` | High Value Retail, Corporate Accounts, Dealers, Warranty AMC | CRM-3 Segment links |
| **Message Templates** | `TPL-0001`..`TPL-0004` | Product Launch, Festive Offer, Warranty Care, CSAT Review | Standard communication templates |
| **Campaigns** | `CMP-0001`..`CMP-0005` | Festive Promo, Smart TV Launch, Warranty Reminder, etc. | Marketing broadcasts |
| **Surveys** | `SRV-0001`, `SRV-0002` | Annual Product Experience NPS, Installation CSAT | Post-delivery feedback |

---

## Prerequisites: Start Backend & Frontend

Ensure dependencies are installed and launch the CRM-4 backend service (`Port 5104`) and unified frontend shell (`Port 3000`):

```bash
# Terminal 1: Start CRM-4 backend service (Port 5104)
npm --workspace=services/crm4 run dev

# Terminal 2: Start unified frontend shell (Port 3000)
npm --workspace=frontend run dev
```

Verify service health first:
```bash
curl -s http://localhost:5104/api/health
```

Expected response:
```json
{
  "status": "ok",
  "team": "crm4",
  "name": "CRM-4 Marketing & Engagement",
  "port": 5104
}
```

---

## Step 1: Web & Dealer Enquiry Ingestion (The "Enquiry Arrives as a Lead" Demo Step)

**Goal**: Verify public inquiry capture, ERP-1 product catalog integration, and automated cross-service provision of leads into CRM-1 (`POST /api/leads`) with Sales Rep `EMP-0001`.

1. Open the browser to:
   ```text
   http://localhost:3000/crm4/enquiry
   ```
2. **Fill out the Enquiry Form**:
   - **Customer / Contact Name**: `Apex Electronics Dealer`
   - **Phone**: `9820077777`
   - **Email**: `purchasing@apexelectronics.com`
   - **Inquiry Source**: Select `dealer`
   - **Product Interest**: Select `SKU-0002 (Double Door Refrigerator 350L)`
   - **Notes**: `Dealer requesting quotation for 10 units wholesale shipment`
3. Click **Submit Enquiry & Provision Lead**.
4. **Verify the Results**:
   - A success banner appears:  
     `✓ Enquiry ENQ-0002 saved! Lead LEAD-0002 automatically generated in CRM-1 and assigned to Sales Rep EMP-0001.`
   - The enquiry row appears in the **Recent Enquiries** table with a blue `dealer` badge and linked Lead ID `LEAD-0002`.
5. **Verify via Backend API**:
   ```bash
   # Submit enquiry via curl (synchronously provisions CRM-1 lead)
   curl -s -X POST http://localhost:5104/api/enquiries \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Apex Electronics Dealer",
       "phone": "9820077777",
       "email": "purchasing@apexelectronics.com",
       "source": "dealer",
       "product_interest": "SKU-0002",
       "notes": "Wholesale inquiry for refrigerator fleet"
     }'

   # List recent enquiries
   curl -s http://localhost:5104/api/enquiries?source=dealer
   ```

---

## Step 2: Multi-Channel Marketing Campaign Lifecycle (`/crm4/campaigns`)

**Goal**: Verify campaign creation, segment linking from CRM-3 (`SEG-0001`..`SEG-0004`), template selection from CRM-4 (`TPL-0001`..`TPL-0004`), and state transitions (`draft` $\rightarrow$ `scheduled` $\rightarrow$ `sent`).

1. Open the browser to:
   ```text
   http://localhost:3000/crm4/campaigns
   ```
2. **Review Existing Campaigns**:
   - Confirm 5 seed campaigns (`CMP-0001` to `CMP-0005`) are loaded in different statuses.
   - Test the channel filter tabs: click **Email**, **WhatsApp**, **SMS** to verify filtering.
3. **Create a New Campaign**:
   - Click **+ New Campaign**.
   - **Campaign Name**: `Republic Day Smart TV Launch`
   - **Channel**: Select `whatsapp`
   - **Target Segment**: Select `SEG-0002 (Corporate Key Accounts)`
   - **Message Template**: Select `TPL-0001 (Product Launch Announcement)`
   - **Scheduled Date**: Enter `2026-12-20`
   - **Campaign Objective**: `Target institutional clients with 4K UHD launch pricing`
   - Click **Create Campaign**.
4. **Transition Campaign Status**:
   - Find the newly created campaign (`status: draft`).
   - Click **Schedule** $\rightarrow$ status transitions to `scheduled` with a warning amber badge.
   - Click **Send Simulation** $\rightarrow$ status flips to `sent` with a success green badge.
5. **Verify via Backend API**:
   ```bash
   # Retrieve all campaigns
   curl -s http://localhost:5104/api/campaigns

   # Update status via atomic PATCH
   curl -s -X PATCH http://localhost:5104/api/campaigns/CMP-0003/status \
     -H "Content-Type: application/json" \
     -d '{"status":"scheduled"}'
   ```

---

## Step 3: Target Audience Management & Opt-Out Compliance (`/crm4/audiences`)

**Goal**: Verify audience list management, member roster inspection, and communication compliance (opt-out toggling).

1. Open the browser to:
   ```text
   http://localhost:3000/crm4/audiences
   ```
2. **Inspect Audiences**:
   - Verify `AUD-0001 (High Value Retail Buyers)`, `AUD-0002 (Corporate Accounts)`, and `AUD-0003 (Regional Dealers)`.
   - Confirm member counts and active statuses.
3. **Drill Down into `AUD-0001`**:
   - Click **View Members** on `AUD-0001` (navigates to `/crm4/audiences/AUD-0001`).
   - Review the roster of 8 customers (`CUST-0001` to `CUST-0008`).
4. **Test Opt-Out Toggle**:
   - Locate customer `CUST-0003 (Priya Nair)`.
   - Note the status displays `Opted Out` (red badge).
   - Toggle opt-out status to observe compliance synchronization.
   - Confirm broadcast reach calculation dynamically decrements when opt-out is activated.

---

## Step 4: Author Personalized Message Templates (`/crm4/templates`)

**Goal**: Author reusable templates, verify dynamic token interpolation, and validate channel-specific constraints (160-char SMS limit).

1. Open the browser to:
   ```text
   http://localhost:3000/crm4/templates
   ```
2. **Inspect Standard Templates**:
   - Confirm 4 seed templates (`TPL-0001` to `TPL-0004`) covering WhatsApp, Email, and SMS.
3. **Create a New Promotional Template**:
   - Click **+ New Template**.
   - **Template Name**: `Festive Flash Sale VIP`
   - **Channel**: Select `whatsapp`
   - **Message Body**: Enter `Hi {{name}}! Exclusive festive savings on {{product}}: get {{offer}} today!`
   - Click the token chips (`{{name}}`, `{{product}}`, `{{offer}}`) to auto-insert placeholders.
4. **Verify Live Preview**:
   - The right-hand preview panel renders a simulated mobile chat bubble with sample customer values (`Aarav Mehta`, `Smart LED TV 55"`, `20% Off`).
5. **Test SMS 160-Character Warning**:
   - Switch channel to `sms`.
   - Observe the live character counter. If message exceeds 160 characters, an amber warning badge warns of multi-part SMS billing.

---

## Step 5: Customer Feedback Surveys & Net Promoter Score (NPS) (`/crm4/surveys`)

**Goal**: Collect 0–10 numeric customer satisfaction feedback, verify NPS mathematical calculation ($\% \text{Promoters} - \% \text{Detractors}$), and review the print-ready dashboard.

1. Open the browser to:
   ```text
   http://localhost:3000/crm4/surveys
   ```
2. **Select Survey**:
   - Locate `SRV-0001 (Annual Product Experience NPS)`.
   - Click **Respond** (navigates to `/crm4/surveys/SRV-0001/respond`).
3. **Submit Customer Response**:
   - **Customer**: Select `CUST-0001 (Aarav Mehta)`
   - **Associated Order**: Select `SO-0001`
   - **Score**: Click `10` on the interactive 0–10 rating pill selector.
   - **Feedback**: `Outstanding display quality and prompt installation delivery.`
   - Click **Submit Feedback**.
4. **View NPS Results Dashboard**:
   - Click **View Results** (navigates to `/crm4/surveys/SRV-0001/results`).
   - **Verify the Net Promoter Score**:
     - **Promoters (9–10)**: 6 responses ($60.0\%$)
     - **Passives (7–8)**: 2 responses ($20.0\%$)
     - **Detractors (0–6)**: 2 responses ($20.0\%$)
     - **Formula**: $\text{NPS} = 60.0\% - 20.0\% = \mathbf{+40}$
     - **Average Score**: $8.2 / 10$
5. **Inspect Customer Comments & Print Optimization**:
   - Review recent verified customer reviews in the feedback stream.
   - Click **Print Report** (or trigger browser print dialog `Ctrl+P` / `Cmd+P`) and verify `@media print` cleanly hides sidebar and top navigation for single-page presentation.
