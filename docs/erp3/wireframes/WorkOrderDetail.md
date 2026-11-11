# Wireframe: Work Order Detail & Material Issuance Screen
**Route**: `/erp3/work-orders/:id`  
**Issues**: ERP3-B3, ERP3-C1, ERP3-C2, ERP3-C3, ERP3-R3  
**Roles**: `admin`, `warehouse`

---

## Screen Layout (ASCII Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro CRM + ERP             │                                                               │
│    PRODUCTION (ERP-3)            │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│    > Overview                    │  │ Active Workspace: Production (ERP-3)    Role: [admin]   │  │
│    > Bill of Materials           │  │                                        User: Alina P.   │  │
│    > New BOM                     │  └─────────────────────────────────────────────────────────┘  │
│    > Work Orders     ←active     │                                                               │
│    > Quality Control             │  WO-0001: 55" 4K Smart TV Assembly         [← All Orders]     │
│                                  │  Order Status: [in_progress]  | Target: 50 Units              │
│                                  │                                                               │
│                                  │  ┌── Order Information Card ──────────────────────────────┐   │
│                                  │  │ Product: SKU-0001 (55" TV)   BOM: BOM-0001 (v1)         │   │
│                                  │  │ Planned Start: 2026-11-12    Planned End: 2026-11-15    │   │
│                                  │  │ Source: manual               Warehouse: WH-01           │   │
│                                  │  └────────────────────────────────────────────────────────┘   │
│                                  │                                                               │
│                                  │  Material Requirements & Floor Issuance (ERP3-C2)             │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ Component SKU Component Name    Req  Issued Pend Issue   │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ SKU-0101      Display Panel      50      50    0 [✓ Done]│ │
│                                  │  │ SKU-0102      Smart Mainboard    50      30   20 [ 20 ][+]│ │
│                                  │  │ SKU-0103      150W Power Supply  50      50    0 [✓ Done]│ │
│                                  │  │ SKU-0104      Bluetooth Remote   50      50    0 [✓ Done]│ │
│                                  │  │ SKU-0105      Packaging Box      50      50    0 [✓ Done]│ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  Recent Material Issues Log (ERP3-C1)                         │
│                                  │  • 2026-11-12 10:15 - Issued 50 units of SKU-0101 (WH-01)     │
│                                  │  • 2026-11-12 11:30 - Issued 30 units of SKU-0102 (WH-01)     │
│                                  │                                                               │
│                                  │  ┌── Finished Goods Gate & Completion (ERP3-C3) ──────────┐   │
│                                  │  │ QC Inspection Gate: [✓ PASSED] (QC-0001)               │   │
│                                  │  │ Material Issuance:  [⚠ PENDING] (SKU-0102 has 20 left) │   │
│                                  │  │ [Post Finished Goods to ERP-1 Stock & Serials (WH-01)] │   │
│                                  │  │ (Button enabled only when all parts issued & QC passes)│   │
│                                  │  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header & Order Status**:
   - Order ID (`WO-0001`) with product label and current state badge (`planned`, `in_progress`, `completed`).
   - Navigation: `← All Orders` link.
2. **Material Issuance Table (ERP3-C2)**:
   - Lists each required component copied from BOM requirements:
     - `Component SKU` & `Name`.
     - `Required Qty`: Total units needed for this batch.
     - `Issued Qty`: Sum of units already deducted from stock.
     - `Pending Qty`: `Required - Issued`.
     - `Issue Input & Action`: Number box + `[Issue]` button.
     - Validation: Input cannot exceed pending quantity.
     - On issue: Posts to `/api/work-orders/:id/issue`, adjusts ERP-1 stock with negative delta, updates log.
3. **Issuance History Log (ERP3-C1)**:
   - Detailed chronological audit trail of material issues for this work order.
4. **Finished Goods Posting Gate (ERP3-C3)**:
   - Checks two strict gates:
     1. All components must be 100% issued (`Pending == 0`).
     2. QC status from `/api/work-orders/:id/qc-status` must be `allowed: true`.
   - `[Post Finished Goods]` button is disabled until both conditions are met.
   - When clicked, calls ERP-1 `/api/stock/adjust` (+50 units in WH-01) and ERP-1 `/api/serials/bulk`, then transitions work order to `completed`.
5. **Print Rules**:
   - Forms and buttons hidden; prints as official Production Traveler / Assembly Work Ticket.
