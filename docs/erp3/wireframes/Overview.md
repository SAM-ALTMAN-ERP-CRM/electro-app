# Wireframe: Production Overview Dashboard
**Route**: `/erp3`  
**Issues**: ERP3-R1, ERP3-R3  
**Roles**: `admin`, `warehouse`

---

## Screen Layout (ASCII Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro CRM + ERP             │                                                               │
│    PRODUCTION (ERP-3)            │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│    > Overview        ←active     │  │ Active Workspace: Production (ERP-3)    Role: [admin]   │  │
│    > Bill of Materials           │  │                                        User: Alina P.   │  │
│    > New BOM                     │  └─────────────────────────────────────────────────────────┘  │
│    > Work Orders                 │                                                               │
│    > Quality Control             │  Production Dashboard                      [+ New Work Order] │
│                                  │  Assembly line work orders, BOM recipes & inspection metrics  │
│                                  │                                                               │
│                                  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌────┐ │
│                                  │  │ ACTIVE BOMS   │ │ IN PROGRESS   │ │ COMPLETED     │ │QC% │ │
│                                  │  │ 2 Recipes     │ │ 3 Orders      │ │ 12 This Week  │ │92% │ │
│                                  │  └───────────────┘ └───────────────┘ └───────────────┘ └────┘ │
│                                  │                                                               │
│                                  │  Active Assembly Line Orders                                  │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ WO ID    Product SKU  Qty  Status      Due Date  Action  │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ WO-0001  SKU-0001      50  [in_progress] 2026-11-15 View │ │
│                                  │  │ WO-0002  SKU-0003      25  [in_progress] 2026-11-16 View │ │
│                                  │  │ WO-0003  SKU-0001     100  [planned]     2026-11-18 View │ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  Quick Links:                                                 │
│                                  │  • [Manage BOMs & Check Stock Shortages →]                    │
│                                  │  • [Inspect Assembly Batches in Quality Control →]            │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header Bar**:
   - Title: `Production Dashboard` with `ERP-3 Production` blue badge.
   - Primary Action: `+ New Work Order` button linking to `/erp3/work-orders`.
2. **KPI Metric Cards**:
   - `Active BOMs`: Count of released manufacturing recipes.
   - `In-Progress Orders`: Active shop-floor work orders.
   - `Completed`: Work orders finished this sprint.
   - `QC Pass Rate`: Real-time quality yield percentage.
3. **Active Assembly Table**:
   - Displays real-time orders on the floor with clickable links to `/erp3/work-orders/:id`.
4. **Print Media Behavior**:
   - Hides sidebar, top-bar, and buttons; outputs clean snapshot for shift briefing.
