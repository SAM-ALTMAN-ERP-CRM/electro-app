# Wireframe: Quote Builder Screen
**Route**: `/crm1/quotes/new`  
**Issues**: CRM1-C1, CRM1-C2, CRM1-C3  
**Roles**: `admin`, `sales`

---

## Screen Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro CRM + ERP             │                                                               │
│    > Leads                       │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│    > Pipeline                    │  │ Active Workspace: Sales (CRM-1)        Role: [sales]    │  │
│    > Quotes                      │  │                                        User: Rajesh K.  │  │
│    > New Quote        ←active    │  └─────────────────────────────────────────────────────────┘  │
│    > Dealers                     │                                                               │
│    > Approvals (admin)           │  Create New Quotation                         [← Back to List]│
│                                  │  Build pricing, select product SKUs & calculate taxes         │
│                                  │                                                               │
│                                  │  ┌── SECTION 1: Quote Header Details ──────────────────────┐  │
│                                  │  │ Customer: [CUST-0001 (Acme) ▼] Opportunity: [OPP-0001▼] │  │
│                                  │  │ Dealer:   [DLR-0001 (Apex) ▼] Sales Rep:   [EMP-0001 ▼] │  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
│                                  │                                                               │
│                                  │  ┌── SECTION 2: Line Items ────────────────────────────────┐  │
│                                  │  │ #  SKU & Product Name            Qty   Unit Price  Total│  │
│                                  │  │ 1. [SKU-0001 - 55" 4K TV   ▼]    [ 2 ] ₹22,000.00 ₹44K  │  │
│                                  │  │ 2. [SKU-0004 - Soundbar 2.1▼]    [ 1 ] ₹ 8,000.00  ₹8K  │  │
│                                  │  │    [+ Add Line Item]                                    │  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
│                                  │                                                               │
│                                  │  ┌── SECTION 3: Discount & Live Pricing Calculation ───────┐  │
│                                  │  │ Discount (%): [ 5.0 ] %                                 │  │
│                                  │  │                                 Subtotal:  ₹52,000.00   │  │
│                                  │  │                                 Discount: -₹ 2,600.00   │  │
│                                  │  │                                 GST (18%): ₹ 8,892.00   │  │
│                                  │  │                                 Total:     ₹58,292.00   │  │
│                                  │  │ [Cancel]                         [Save as Draft Quote]  │  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Specifications

1. **Header & Navigation**:
   - Title: `Create New Quotation`
   - Navigation button: `← Back to Quotes` returning to `/crm1/quotes`.
2. **Quote Information Form**:
   - `Customer`: Dropdown loaded from shared seed customers (`CUST-0001` to `CUST-0008`).
   - `Opportunity`: Dropdown of open opportunities (`OPP-0001` to `OPP-0006`).
   - `Dealer (Optional)`: Dropdown of registered dealers (`DLR-0001` to `DLR-0005`) with tier indicators.
   - `Sales Rep`: Dropdown of sales representatives (`EMP-0001` to `EMP-0004`).
3. **Dynamic Line Items Table**:
   - Product SKU picker loaded via `api('erp1', '/api/products')` with fallback to shared product catalog:
     - `SKU-0001` (55-inch 4K Smart TV - ₹22,000)
     - `SKU-0002` (65-inch OLED TV - ₹48,000)
     - `SKU-0003` (43-inch Full HD LED TV - ₹14,500)
     - `SKU-0004` (Soundbar 2.1 Channel - ₹8,000)
     - `SKU-0005` (Dolby Atmos Soundbar - ₹18,000)
   - Unit price auto-fills based on SKU selection.
   - Quantity input (minimum 1) with instant line total calculation.
   - `Remove Item` row button.
4. **Live Summary & Discount Calculation**:
   - Inputs update live on every keystroke.
   - High Discount Notice: If `discount_percent > 5%`, a warning banner appears stating:  
     `"Notice: Discounts above 5% require Manager Approval (CRM1-D3) before the quote can be sent."`
5. **Form Submission**:
   - Submits single payload `{ customer_id, opportunity_id, dealer_id, sales_rep_id, discount_percent, items: [...] }` to `POST /api/quotes`.
   - On success, redirects to `/crm1/quotes`.
