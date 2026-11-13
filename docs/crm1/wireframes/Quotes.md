# Wireframe: Quotations List Screen
**Route**: `/crm1/quotes`  
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
│    > Quotes           ←active    │  │                                        User: Rajesh K.  │  │
│    > New Quote                   │  └─────────────────────────────────────────────────────────┘  │
│    > Dealers                     │                                                               │
│    > Approvals (admin)           │  Quotations                                  [+ Create Quote] │
│                                  │  Commercial sales quotations and pricing                      │
│                                  │                                                               │
│                                  │  Filters:                                                     │
│                                  │  Status: [All Statuses ▼]  Dealer: [All Dealers ▼]            │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ Quote ID  Customer   Dealer   Discount  Total (₹) Status │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ QUO-0001  CUST-0001  DLR-0001  5.0%   ₹51,980.00  [draft]│ │
│                                  │  │ QUO-0002  CUST-0002  Direct    0.0%   ₹38,940.00  [sent] │ │
│                                  │  │ QUO-0003  CUST-0003  DLR-0002  10.0%  ₹95,000.00  [acpt] │ │
│                                  │  │ QUO-0004  CUST-0004  DLR-0003  8.0%   ₹47,748.80  [draft]│ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  [Selected Quote Item Details Drawer / Invoice Breakdown]     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Specifications

1. **Header**:
   - Title: `Quotations`
   - Subtitle: `Manage commercial quotes, discounts, approvals, and order handoffs.`
   - Primary Action: `+ Create Quote` linking to `/crm1/quotes/new`.
2. **Filters Bar**:
   - Status: `All Statuses`, `Draft`, `Sent`, `Accepted`, `Rejected`.
   - Dealer Filter: Dropdown of dealers (`DLR-0001` to `DLR-0005`).
   - Search: Filter by customer or quotation reference ID.
3. **Table Columns**:
   - `Quote ID`: Structured ID (`QUO-0001`)
   - `Customer ID`: (`CUST-0001` to `CUST-0008`)
   - `Dealer`: Name and ID or "Direct"
   - `Discount %`: Highlighted discount rate
   - `Total Amount`: Right-aligned INR currency (`₹xx,xxx.xx`)
   - `Status`: Badges
     - Draft: `badge badge-blue`
     - Sent: `badge badge-amber`
     - Accepted: `badge badge-green`
     - Rejected: `badge badge-red`
   - `Actions`: `View Details`, `Send Quote`, `Accept Quote`
4. **Selected Quote Drawer**:
   - Shows line items (`sku`, `product_name`, `quantity`, `unit_price`, `line_total`).
   - Financial calculation summary:
     - Subtotal: $\sum (\text{qty} \times \text{unit\_price})$
     - Discount Amount: $\text{Subtotal} \times \frac{\text{discount\_percent}}{100}$
     - GST (18%): $(\text{Subtotal} - \text{Discount}) \times 0.18$
     - Total Amount: $(\text{Subtotal} - \text{Discount}) + \text{GST}$
5. **State Transition Controls**:
   - "Send to Customer": Blocked if `discount_percent > 5` and `approved === false` (requires manager approval).
   - "Accept Quote": Triggers downstream event integration to ERP-4 Sales Order and CRM-3 Customer Timeline.
