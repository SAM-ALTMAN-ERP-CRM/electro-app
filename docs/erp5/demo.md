# ERP-5 Finance & Commercial Billing - 5-Step Demo Script

This script provides an interactive, reproducible 5-step walkthrough of Team ERP-5's commercial invoicing, bill printing, and credit note capabilities. It uses strictly the pinned shared seed contract IDs from Section 5.

---

## 📌 Shared Contract Test Data Referenced

| Entity | Contract ID | Name / Description | GSTIN / Attribute |
|---|---|---|---|
| **Corporate Customer** | `CUST-0002` | Sunrise Electronics Pvt Ltd | `27AABCS1234F1Z5` |
| **Dealer Customer** | `CUST-0004` | BrightHome Retail LLP | `27AAACB5678G1Z2` |
| **Retail Customer** | `CUST-0001` | Aarav Mehta | Unregistered / Consumer |
| **Products** | `SKU-0001` | Wireless Noise-Canceling Headphones | ₹4,999.00 |
| **Products** | `SKU-0002` | Smart Fitness Watch | ₹2,999.00 |
| **Products** | `SKU-0005` | Mechanical Gaming Keyboard | ₹3,499.00 |
| **Sales Rep** | `EMP-0001` / `EMP-0002` | Account Executives | Internal Sales |
| **Orders** | `SO-0001` .. `SO-0005` | Seed Orders (ERP-4) | Dispatched |

---

## Step 1: Browse Invoices & Financial KPI Summary

1. Open your browser and navigate to the ERP-5 module:
   ```text
   http://localhost:3000/erp5/invoices
   ```
2. **Observe**:
   - The top KPI dashboard displays real-time metrics computed via `GET /api/invoices/summary`:
     - **Total Billed**: Aggregated sales across all issued invoices.
     - **Total Outstanding**: Receivables due from `unpaid` and `partially_paid` invoices.
     - **Paid Invoices**: Settled invoice count.
   - The invoices table lists seeded contracts `INV-0001` through `INV-0005`.
3. **Filter**:
   - In the "Customer ID" field, enter `CUST-0002` and click **Filter**.
   - Verify that only Sunrise Electronics Pvt Ltd's invoice (`INV-0002`) appears.
   - Use the **Status** dropdown to filter by `Unpaid`.

---

## Step 2: Commercial GST Invoice Creation (ERP-4 Integration)

Simulate ERP-4 order fulfillment (Workflow Step 6) calling ERP-5 to generate a commercial GST invoice:

1. Send an authenticated `POST /api/invoices` request:
   ```bash
   curl -X POST http://localhost:5205/api/invoices \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
     -d '{
       "so_id": "SO-0006",
       "customer_id": "CUST-0002",
       "sales_rep_id": "EMP-0002",
       "invoice_date": "2026-11-06",
       "items": [
         { "sku": "SKU-0001", "description": "Wireless Noise-Canceling Headphones", "quantity": 2, "unit_price": 4999.00, "tax_rate": 18.00 }
       ]
     }'
   ```
2. **Observe Verification**:
   - `subtotal`: `9998.00`
   - `cgst` (9%): `899.82`
   - `sgst` (9%): `899.82`
   - `total`: `11797.64`
   - `customer_gstin`: Automatically resolved to `27AABCS1234F1Z5`.
3. **Idempotency Test**:
   - Re-send the exact same command.
   - ERP-5 returns HTTP `200 OK` with the existing invoice `INV-xxxx`, allowing ERP-4 to safely retry without duplicate billing.

---

## Step 3: View & Print Commercial Tax Invoice Bill

1. On the invoices table, click **View Bill** on invoice `INV-0002` (or open `http://localhost:3000/erp5/invoices/INV-0002`).
2. **Inspect Bill Layout**:
   - Corporate brand header: **⚡ ELECTRO APP TECHNOLOGIES INDIA PVT. LTD.**
   - Company GSTIN (`27AAACE1234F1Z8`) and State Code `27`.
   - Customer Billed To details including Customer GSTIN (`27AABCS1234F1Z5`).
   - Line items table showing unit prices, quantities, and GST rates.
   - **Amount Chargeable in Words**:
     ```text
     "Rupees Twenty-Two Thousand Four Hundred Eleven and Seventy-Four Paise Only"
     ```
3. **Print Test**:
   - Click the **🖨️ Print Tax Invoice** button (triggers `window.print()`).
   - In the print preview, confirm that the sidebar and top bars are completely hidden (`@media print`), leaving a clean, standard single-page commercial tax bill.

---

## Step 4: Credit Note Issuance for Warranty RMA Returns (Workflow Step 9)

Simulate ERP-4 processing a customer return and triggering an ERP-5 credit note:

1. Send an authenticated `POST /api/creditnotes` request:
   ```bash
   curl -X POST http://localhost:5205/api/creditnotes \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
     -d '{
       "so_id": "SO-0002",
       "serial_number": "SN-0002",
       "amount": 2999.00
     }'
   ```
2. **Observe**:
   - HTTP `201 Created` with generated Credit Note ID `CN-000x`.
   - Associated invoice `INV-0002` balance is reduced, and status reflects `partially_paid`.
3. **Duplicate Prevention (Safety Gate)**:
   - Re-run the exact same curl request for the same order and serial.
   - ERP-5 immediately returns HTTP `409 Conflict`:
     ```json
     { "error": "Credit note already exists for order 'SO-0002' and serial 'SN-0002'" }
     ```
4. View the issued credit notes directory at `http://localhost:3000/erp5/credit-notes`.

---

## Step 5: Manual Non-Order Invoice Creation

1. Return to `http://localhost:3000/erp5/invoices`.
2. Click **+ Create Manual Invoice**.
3. In the modal:
   - Select Customer: `CUST-0004 (BrightHome Retail LLP)`.
   - Notice Customer Name and GSTIN (`27AAACB5678G1Z2`) pre-fill automatically.
   - Add line items (e.g., `SKU-0005`, Quantity: 2, Unit Price: ₹3,499.00).
   - Observe live calculations: Subtotal ₹6,998.00, Tax ₹1,259.64, Grand Total ₹8,257.64.
4. Click **Create Invoice**.
5. The system saves the invoice with `so_id: null` (marked as **Manual**), generates `INV-xxxx`, and automatically redirects to the printable bill showing the correct amount in words:
   ```text
   "Rupees Eight Thousand Two Hundred Fifty-Seven and Sixty-Four Paise Only"
   ```

---

*Verified for compliance with Monorepo Week 8 Gate G4 standards.*
