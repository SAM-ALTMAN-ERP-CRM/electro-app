# Wireframe: Work Orders Management Screen
**Route**: `/erp3/work-orders`  
**Issues**: ERP3-B1, ERP3-B2, ERP3-R3  
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
│    > Quality Control             │  Work Orders Tracker                       [+ New Work Order] │
│                                  │  Schedule and monitor floor assembly line production jobs     │
│                                  │                                                               │
│                                  │  Filter by Status: [All Statuses ▼]    Filter Source: [All ▼] │
│                                  │                                                               │
│                                  │  ┌── Quick Create Work Order ─────────────────────────────┐   │
│                                  │  │ Choose BOM: [BOM-0001 (55" TV) ▼]  Quantity: [ 50    ] │   │
│                                  │  │ Start: [2026-11-12]  End: [2026-11-15]  Source: [manual]│   │
│                                  │  │                                    [Schedule Work Order]│   │
│                                  │  └────────────────────────────────────────────────────────┘   │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ WO ID   Product   Qty Status        Dates       Actions  │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ WO-0001 SKU-0001   50 [in_progress] 11-12..11-15 [Comp]  │ │
│                                  │  │ WO-0002 SKU-0003   25 [in_progress] 11-13..11-16 [Comp]  │ │
│                                  │  │ WO-0003 SKU-0001  100 [planned]     11-14..11-18 [Start] │ │
│                                  │  │ WO-0004 SKU-0001   40 [completed]   11-05..11-09 [View]  │ │
│                                  │  │ WO-0005 SKU-0003   10 [cancelled]   11-04..11-07 [View]  │ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header**:
   - Title: `Work Orders Tracker` with `ERP-3 Production` badge.
   - Quick Create form toggle button.
2. **Filters**:
   - Status: `All`, `planned`, `in_progress`, `completed`, `cancelled`.
   - Source: `All`, `manual`, `shortage`.
3. **Work Orders Table**:
   - `WO ID`: Identifiers `WO-0001` through `WO-0005`.
   - `Product`: SKU and model name (`SKU-0001` / `SKU-0003`).
   - `Quantity`: Number of units to produce.
   - `Status Badge`:
     - `planned`: Blue (`badge-blue`)
     - `in_progress`: Amber (`badge-amber`)
     - `completed`: Green (`badge-green`)
     - `cancelled`: Red (`badge-red`)
   - `Dates`: Planned start and planned completion.
   - `Row Action Buttons`:
     - `Start`: Moves `planned` $\rightarrow$ `in_progress`.
     - `Complete`: Moves `in_progress` $\rightarrow$ `completed` (subject to material & QC checks).
     - `Cancel`: Allowed only from `planned` state.
     - `View Details`: Links to `/erp3/work-orders/:id`.
4. **Create Work Order Form**:
   - Validates quantity $> 0$ and start date $\le$ end date.
   - When submitted, copies BOM component requirements into work order materials.
5. **Print Rules**:
   - Prints full floor job list; hides search filters and action buttons.
