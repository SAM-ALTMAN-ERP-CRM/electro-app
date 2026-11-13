# Wireframe: BOM Detail & Material Requirements
**Route**: `/erp3/boms/:id`  
**Issues**: ERP3-A2, ERP3-A3, ERP3-R3  
**Roles**: `admin`, `warehouse`

---

## Screen Layout (ASCII Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro CRM + ERP             │                                                               │
│    PRODUCTION (ERP-3)            │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│    > Overview                    │  │ Active Workspace: Production (ERP-3)    Role: [admin]   │  │
│    > Bill of Materials ←active   │  │                                        User: Alina P.   │  │
│    > New BOM                     │  └─────────────────────────────────────────────────────────┘  │
│    > Work Orders                 │                                                               │
│    > Quality Control             │  BOM-0001: 55" 4K Smart LED TV             [← Back to BOMs]   │
│                                  │  Product SKU: SKU-0001 | Version: 1 | Status: [active]        │
│                                  │                                                               │
│                                  │  ┌── Material Requirement & Availability Checker ─────────┐   │
│                                  │  │ Batch Target Qty: [ 20 ]  Units        [Check Materials]│   │
│                                  │  │ Check against ERP-1 real-time stock levels             │   │
│                                  │  └────────────────────────────────────────────────────────┘   │
│                                  │                                                               │
│                                  │  Components & Inventory Shortfall Matrix                      │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ Component SKU Component Name   Required Avail Short Action│ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ SKU-0101      Display Panel    20       35    0  [✓ OK]   │ │
│                                  │  │ SKU-0102      Smart Mainboard  20       12    8  [Req Pur]│ │
│                                  │  │ SKU-0103      Power Supply     20       40    0  [✓ OK]   │ │
│                                  │  │ SKU-0104      BT Remote        20       85    0  [✓ OK]   │ │
│                                  │  │ SKU-0105      Packaging Box    20       50    0  [✓ OK]   │ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  ⚠ Shortfall Detected: SKU-0102 requires 8 more units.        │
│                                  │  Pressing "Request purchase" alerts ERP-2 Purchasing module.  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header**:
   - Title: `BOM ID: Product Name` with `active` badge (`badge-green`).
   - Navigation: `← Back to BOMs` link.
2. **Material Requirement Calculator (ERP3-A3)**:
   - Input: Target batch production quantity (default `20`).
   - Button: `[Check Materials]` calling ERP-1 inventory stock check (`/api/stock/check?sku=&qty=`).
3. **Availability & Shortfall Table**:
   - `Component SKU`: Component part number (`SKU-0101` to `SKU-0105`).
   - `Component Name`: Readable part name.
   - `Required Qty`: Scaled calculation (`qty_per_unit * target_qty`).
   - `Available Qty`: Live warehouse stock reported by ERP-1.
   - `Shortfall`: `max(0, Required - Available)`.
   - `Status & Action`:
     - If available: Green tick `✓ Available` (`badge-green`).
     - If shortfall $> 0$: Red badge `✗ Shortfall: N` (`badge-red`) plus `Request Purchase` button.
     - When clicked, posts `{ sku, product_name, quantity: shortfall, requested_by: 'ERP-3 production', reason: 'Work order shortage' }` to ERP-2 and changes state to `✓ Purchase Requested`.
4. **Print Media Behavior**:
   - Form inputs and action buttons hidden; table prints cleanly for floor requisitioning.
