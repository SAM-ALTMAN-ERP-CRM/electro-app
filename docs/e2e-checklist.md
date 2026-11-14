# End-to-End Manual Demonstration Checklist (The Golden Path)

**Document**: E2E Manual Browser Verification Guide  
**Milestone**: Gate 4 Release Candidate / Final Demo  
**Shared App Base URL**: `http://localhost:3000`  
**Demo User**: `admin@demo.com` (password: `demo123`)  
**Scope**: 9-step connected story across all 11 modules (`CRM-1` through `CRM-5`, `ERP-1` through `ERP-6`).

---

## Pre-Demo Setup
1. Ensure databases are seeded: `npm run reset` (or `npm run db:setup`).
2. Start the integrated platform: `npm run dev`.
3. Open browser at `http://localhost:3000`.

---

## The 9-Step Golden Path Demonstration

### Step 1: Capture Lead from Marketing Enquiry
- **Module**: CRM-4 Marketing & Engagement -> CRM-1 Sales Pipeline
- **Navigation**:
  - Open **Marketing** in sidebar -> click **Capture Enquiry** (`/crm4/enquiry`).
- **User Actions**:
  1. Fill in form:
     - **Name**: `Ramesh Patel`
     - **Phone**: `9820088112`
     - **Email**: `ramesh.patel@sunrise.in`
     - **Source**: `Dealer`
     - **Product Interest**: `SKU-0001` (55-inch 4K Smart TV)
  2. Click **Submit Enquiry**.
- **Expected Result on Screen**:
  - Banner shows: `Enquiry submitted successfully. Linked Lead ID: LEAD-xxxx`.
  - Navigate to **Sales** -> **Leads** (`/crm1/leads`): The new lead appears at the top of the table in `new` status with computed score badge (`Hot`).

---

### Step 2: Opportunity, Quotation, Approval & Acceptance
- **Module**: CRM-1 Sales Pipeline -> ERP-4 Orders -> CRM-3 Customer 360
- **Navigation**:
  - Open **Sales** -> **Pipeline** (`/crm1/pipeline`).
- **User Actions**:
  1. Click **Add Opportunity**:
     - **Title**: `Sunrise Tech Upgrade`
     - **Customer**: Select `CUST-0002` (Sunrise Electronics Pvt Ltd)
     - **Lead**: Select `LEAD-xxxx` (created in Step 1)
     - **Expected Value**: `₹75,000`
     - Click **Create Opportunity**.
  2. Navigate to **Sales** -> **Quote Builder** (`/crm1/quotes/new`):
     - Select Opportunity `Sunrise Tech Upgrade` and Customer `CUST-0002`.
     - Add 3 items:
       - `SKU-0001` (55-inch 4K Smart TV) - Qty 1
       - `SKU-0002` (43-inch Full HD TV) - Qty 1
       - `SKU-0004` (Soundbar 2.1) - Qty 1
     - Set **Discount**: `5%` (allowed without escalation).
     - Click **Save Quote** -> Generates `QUO-xxxx`.
  3. Go to **Quotes** (`/crm1/quotes`), select `QUO-xxxx`:
     - Click **Send Quote** (status becomes `sent`).
     - Click **Accept Quote** (status becomes `accepted`).
- **Expected Result on Screen**:
  - Quote status updates to green `accepted` badge.
  - Navigate to **Orders** -> **Orders List** (`/erp4/orders`): A new order `SO-xxxx` is visible with `Quote: QUO-xxxx` and `GSTIN: 27AABCS1234F1Z5`.
  - Navigate to **Customers** -> Open `CUST-0002` -> **Timeline** (`/crm3/customers/CUST-0002/timeline`): A timeline interaction appears stating `Quote QUO-xxxx accepted (source: CRM-1)`.

---

### Step 3: Stock Reservation & Shortage Trigger
- **Module**: ERP-4 Orders -> ERP-3 Production -> ERP-2 Procurement
- **Navigation**:
  - Open **Orders** -> **Orders List** (`/erp4/orders`).
- **User Actions**:
  1. Open the created order `SO-xxxx` (`/erp4/orders/:id`).
  2. Click **Reserve Stock** button.
     - For items with stock shortage (e.g. `SKU-0003` or components), ERP-4 triggers an automated work order.
- **Expected Result on Screen**:
  - Order items show `reserved` status badges.
  - Navigate to **Production** -> **Work Orders** (`/erp3/work-orders`): Work order appears with `source: shortage` and `status: planned`.
  - Navigate to **Purchasing** -> **Requests** (`/erp2/requests`): A new Purchase Request `PR-xxxx` appears in `pending` status for the shortage components.

---

### Step 4: Purchase Approval, PO Conversion & Inward Goods Receipt
- **Module**: ERP-2 Procurement -> ERP-1 Inventory -> ERP-5 Finance
- **Navigation**:
  - Open **Purchasing** -> **Requests** (`/erp2/requests`).
- **User Actions**:
  1. Locate `PR-xxxx`: Click **Approve** (status becomes `approved`).
  2. Click **Convert to PO**:
     - **Supplier**: Select `SUP-0001` (Semicon India Tech).
     - **Unit Cost**: `₹450.00`.
     - Click **Create Purchase Order** -> Generates `PO-xxxx`.
  3. Navigate to **Purchasing** -> **Purchase Orders** (`/erp2/purchase-orders`), find `PO-xxxx`, click **Send PO**.
  4. Navigate to **Purchasing** -> **Goods Receipt** (`/erp2/receipts`):
     - Select `PO-xxxx`.
     - Enter Received Qty: `10`.
     - Received By: `EMP-0009`.
     - Click **Post Goods Receipt** -> Generates `GRN-xxxx`.
- **Expected Result on Screen**:
  - PO status updates to `received` with green badge.
  - Navigate to **Inventory** -> **Stock Balance** (`/erp1/stock`): Component stock has increased by `+10`.
  - Navigate to **Finance** -> **General Ledger** (`/erp5/ledger`): Purchase ledger entries appear under reference `GRN-xxxx` (Debit: `purchases`, Credit: `accounts_payable`).

---

### Step 5: Material Issue, QC Pass & Finished Goods Posting
- **Module**: ERP-3 Production -> ERP-1 Inventory & Serials
- **Navigation**:
  - Open **Production** -> **Work Orders** (`/erp3/work-orders`).
- **User Actions**:
  1. Open planned Work Order (`/erp3/work-orders`):
     - Click **Issue Materials** for all listed components.
  2. Navigate to **Production** -> **QC Inspections** (`/erp3/qc`):
     - Click **Log Inspection**:
       - Select Work Order `WO-xxxx`.
       - Inspector: `EMP-0005`.
       - Checked: `2`, Passed: `2`, Failed: `0`.
       - Click **Submit QC** -> Status displays green `PASS`.
  3. In Work Orders, click **Post Finished Goods**:
     - System marks Work Order as `completed`.
- **Expected Result on Screen**:
  - Navigate to **Inventory** -> **Stock Balance** (`/erp1/stock`): Finished goods stock rises by `+2`.
  - Navigate to **Inventory** -> **Serial Numbers** (`/erp1/serials`): New serial numbers appear with prefix `PROD-xxxx` in `in_stock` status.

---

### Step 6: Order Dispatch, Invoicing & Delivery
- **Module**: ERP-4 Orders & Dispatch -> ERP-1 Serials -> ERP-5 Invoices -> CRM-3 Timeline
- **Navigation**:
  - Open **Orders** -> **Dispatch Desk** (`/erp4/dispatch`).
- **User Actions**:
  1. Select Order `SO-xxxx` (from Step 2).
  2. Fill Dispatch Form:
     - **Courier**: `BlueDart`
     - **Tracking Number**: `TRK-98200112`
     - **Shipping Address**: `Sunrise Electronics, MIDC Andheri East, Mumbai`
  3. Click **Dispatch Order** -> Generates `DSP-xxxx`.
- **Expected Result on Screen**:
  - Dispatch note opens with printable voucher.
  - Navigate to **Inventory** -> **Serial Numbers** (`/erp1/serials`): The allocated serial number transitions from `reserved` to red `sold` badge.
  - Navigate to **Finance** -> **Invoices** (`/erp5/invoices`): A new invoice `INV-xxxx` appears with Customer GSTIN `27AABCS1234F1Z5` and 18% GST calculation.
  - Navigate to **Finance** -> **General Ledger** (`/erp5/ledger`): Balanced entries under `INV-xxxx` (Debit: `receivables`, Credit: `sales_revenue`, Credit: `gst_payable`).
  - Navigate to **Customers** -> Open `CUST-0002` -> **Timeline** (`/crm3/customers/CUST-0002/timeline`): Event logged: `Order SO-xxxx dispatched via BlueDart`.

---

### Step 7: Payment Collection & Ledger Reconciliation
- **Module**: ERP-5 Finance & Accounting
- **Navigation**:
  - Open **Finance** -> **Payments** (`/erp5/payments`).
- **User Actions**:
  1. Click **Record Payment**:
     - **Invoice**: Select `INV-xxxx` (from Step 6).
     - **Amount**: Full invoice total (e.g. `₹89,203.20`).
     - **Payment Method**: `UPI`
     - **Transaction Reference**: `UPI-DEMO-991`
  2. Click **Submit Payment** -> Generates `PAY-xxxx`.
- **Expected Result on Screen**:
  - Navigate to **Finance** -> **Invoices** (`/erp5/invoices`): Invoice status updates from `issued` to green `paid` badge.
  - Navigate to **Finance** -> **General Ledger** (`/erp5/ledger`): Payment entries appear under `PAY-xxxx` (Debit: `bank`, Credit: `receivables`).

---

### Step 8: Sales Commission Calculation & Payroll Integration
- **Module**: ERP-6 HR & Workforce
- **Navigation**:
  - Open **HR** -> **Commissions** (`/erp6/commissions`).
- **User Actions**:
  1. Click **Sync Commissions from Paid Invoices**:
     - System queries ERP-5 paid invoices and calculates 2% commission for sales rep `EMP-0001` (Rohan Kulkarni).
  2. Navigate to **HR** -> **Payroll** (`/erp6/payroll`):
     - Select Month: `2026-11`.
     - Click **Generate Monthly Payroll**.
- **Expected Result on Screen**:
  - Commissions table shows commission row linked to `INV-xxxx` for rep `EMP-0001`.
  - Salary Slips table displays generated slip for `EMP-0001` with commission added to gross earnings.

---

### Step 9: Warranty Verification, RMA Approval & Credit Note Restock
- **Module**: CRM-2 Support & Warranty -> ERP-4 Returns -> ERP-1 Serials -> ERP-5 Credit Notes
- **Navigation**:
  - Open **Support** -> **Warranty Lookup** (`/crm2/warranty`).
- **User Actions**:
  1. Enter the serial number dispatched in Step 6 (`PROD-xxxx` or `TV55-2611-0001`) -> Shows **Active Warranty**.
  2. Navigate to **Support** -> **Tickets** (`/crm2/tickets`):
     - Click **Create Ticket**:
       - Customer: `CUST-0002`
       - Serial: Enter dispatched serial number
       - Title: `Display flickering`
       - Priority: `Medium`
       - Click **Create Ticket** -> Generates `TKT-xxxx`.
  3. Navigate to **Support** -> **RMA Requests** (`/crm2/rmas`):
     - Click **Request RMA**:
       - Ticket: Select `TKT-xxxx`
       - Serial: Enter dispatched serial number
       - Reason: `Screen flickering hardware defect`
       - Click **Submit RMA** -> Generates `RMA-xxxx`.
  4. Open `RMA-xxxx`, click **Approve**:
     - Select Outcome: **Credit Note**.
     - Click **Confirm Approval** (automatically dispatches return to ERP-4).
  5. Navigate to **Orders** -> **Returns List** (`/erp4/returns`):
     - Open return `RET-xxxx` linked to the RMA.
     - Change status to **Restocked** (check *Issue Credit Note*).
- **Expected Result on Screen**:
  - Navigate to **Inventory** -> **Serial Numbers** (`/erp1/serials`): The serial status returns to green `in_stock` badge.
  - Navigate to **Finance** -> **Credit Notes** (`/erp5/creditnotes`): Credit note `CN-xxxx` appears with reference to the order and serial number.
  - The entire 9-step circle is complete!
