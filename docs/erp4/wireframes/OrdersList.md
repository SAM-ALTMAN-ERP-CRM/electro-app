# Wireframe: Sales Orders List & Creation Screen

**Route**: `/erp4` / `/erp4/orders`  
**Issues**: ERP4-A1, ERP4-A2, ERP4-A3, ERP4-R3  
**Roles**: `admin`, `sales`, `warehouse`  
**Vector Mockup**: [orders.svg](orders.svg)

---

## 1. Screen Layout (ASCII Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-4 Orders & Dispatch       │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp4/orders — Sales Orders Management [Dev·Admin]      │  │
│    > Orders          ← active    │  └─────────────────────────────────────────────────────────┘  │
│    > Dispatch                    │                                                               │
│    > Returns                     │  Sales Orders Directory  [ERP-4 Orders]    [+ Create New Order]│
│                                  │  Manage accepted CRM-1 quotations, reserve stock & track orders│
│                                  │                                                               │
│                                  │  ┌── Quick Filter & Search Bar ────────────────────────────┐  │
│                                  │  │ Search ID, customer, SKU... [All Statuses ▼] [Apply]    │  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
│                                  │                                                               │
│                                  │  ┌── "NEW ORDER" FORM DRAWER (when toggled open) ──────────┐  │
│                                  │  │ Customer ID: [CUST-0001 ▼] Sales Rep: [EMP-0001 ▼]      │  │
│                                  │  │ Quote Ref: [QUO-0001  ] (CRM-1 accepted quotation)      │  │
│                                  │  │ ── Line Items ───────────────────────────────────────── │  │
│                                  │  │ SKU: [SKU-0001 (55" 4K Smart TV) ▼] Qty: [ 2 ] ₹42,990  │  │
│                                  │  │ [+ Add Another Item]                [Submit Sales Order] │  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
│                                  │                                                               │
│                                  │  ┌── SALES ORDERS DIRECTORY TABLE ─────────────────────────┐  │
│                                  │  │ ORDER ID   CUSTOMER      ITEMS  TOTAL (₹) STATUS   ACTIONS││
│                                  │  │─────────────────────────────────────────────────────────││
│                                  │  │ SO-0001    Aarav Mehta   1 item ₹50,728.20 [deliv] [View] ││
│                                  │  │ SO-0002    Sunrise Ltd   1 item ₹50,728.20 [deliv] [View] ││
│                                  │  │ SO-0003    Priya Nair    1 item ₹50,728.20 [ship]  [View] ││
│                                  │  │ SO-0004    TechWorld Hub 1 item ₹50,728.20 [ship]  [View] ││
│                                  │  │ SO-0005    Vijay Sharma  1 item ₹50,728.20 [pick]  [View] ││
│                                  │  │ SO-0006    Global Elec   2 item ₹88,480.00 [conf]  [View] ││
│                                  │  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

1. **Header & Primary Actions**:
   - Title: `Sales Orders Directory` with `badge-blue` indicating `ERP-4 Orders`.
   - Action Button: `+ Create New Order` toggles the collapsible order creation form drawer.
2. **Search & Filter Controls**:
   - Search Input: Real-time debounced query filtering across Order ID, Customer Name, and Quote ID.
   - Status Dropdown: Filters records by `all`, `created`, `confirmed`, `dispatched`, `delivered`, `cancelled`.
3. **New Order Form Drawer**:
   - Customer Selection: Dropdown of shared CRM-3 customers (`CUST-0001` to `CUST-0008`).
   - Sales Rep ID: Assigned representative (`EMP-0001` to `EMP-0004`).
   - Quote Reference: Optional accepted quote ID from CRM-1 (`QUO-0001`..).
   - Dynamic Line Items: Ability to add multiple SKUs (`SKU-0001` through `SKU-0015`), specify quantities, and automatically calculate line item totals.
4. **Orders Table**:
   - Displays Order ID in bold navy `#0f172a`.
   - Customer Name with subtitle Customer ID.
   - Items count badge.
   - Formatted INR Total (`₹50,728.20`).
   - Status Badge with semantic coloring (`created`: blue, `confirmed`: green, `dispatched`: amber, `delivered`: green, `cancelled`: red).
   - Action button linking directly to `/erp4/orders/:id`.
