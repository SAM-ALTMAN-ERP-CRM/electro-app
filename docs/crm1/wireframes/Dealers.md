# Wireframe: Dealer Directory Screen
**Route**: `/crm1/dealers`  
**Issues**: CRM1-D1, CRM1-D2  
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
│    > New Quote                   │  └─────────────────────────────────────────────────────────┘  │
│    > Dealers          ←active    │                                                               │
│    > Approvals (admin)           │  Dealer Directory                          [+ Add New Dealer] │
│                                  │  Manage authorized electronics dealers & discount tiers       │
│                                  │                                                               │
│                                  │  Search: [Search dealer or contact...  ]  City: [All Cities▼] │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ ID       Business Name  Contact   City   Tier   Credit   │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ DLR-0001 Apex Electr.   Rajesh G. Mumbai [Gold] ₹5,00,000│ │
│                                  │  │ DLR-0002 Bharat Vision  Priya N.  Pune   [Silv] ₹3,00,000│ │
│                                  │  │ DLR-0003 Crompton Ret.  Amit D.   Ahmd.  [Bron] ₹1,50,000│ │
│                                  │  │ DLR-0004 Deccan Digital Suresh R. Blr    [Gold] ₹6,00,000│ │
│                                  │  │ DLR-0005 Eastern Appl.  Ananya S. Kolk.  [Silv] ₹2,50,000│ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  ┌── SELECTED DEALER: Quotes History (DLR-0001) ───────────┐  │
│                                  │  │ QUO-0001  2024-03-01  Discount: 5.0%   Total: ₹51,980.00│  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Specifications

1. **Header**:
   - Title: `Dealer Directory`
   - Subtitle: `Manage authorized partner dealers, tier discounts, and credit limits.`
   - Primary Action: `+ Add New Dealer` toggles inline creation modal.
2. **Filters & Search**:
   - Live search input matching dealer business name or contact person.
   - City dropdown filter (`Mumbai`, `Pune`, `Ahmedabad`, `Bengaluru`, `Kolkata`).
   - `Clear Filters` button.
3. **Table Columns**:
   - `Dealer ID`: Formatted text ID (`DLR-0001`)
   - `Business Name`: Bold organization name
   - `Contact Details`: Primary contact person name, telephone, and email
   - `City`: Operating city location
   - `Discount Tier`:
     - **Gold**: `★ Gold (15%)` - Amber badge
     - **Silver**: `✦ Silver (10%)` - Blue badge
     - **Bronze**: `● Bronze (5%)` - Bronze/peach badge
   - `Credit Limit`: Right-aligned currency format (`₹5,00,000.00`)
   - `Status`: `active` (green badge) / `inactive` (red badge)
   - `Actions`: `View Quotes` button to inspect all commercial quotes generated for this dealer.
4. **Dealer Quotes Panel**:
   - Expands below table when a dealer is selected.
   - Calls `api('crm1', '/api/quotes?dealer_id=DLR-xxxx')`.
   - Lists Quote ID, creation date, discount percentage, total amount in INR, and quote status badge.
5. **Add Dealer Form**:
   - Inputs: Business Name (required), Contact Person, Phone, Email, City (required), Discount Tier (gold/silver/bronze), Credit Limit (number in INR).
