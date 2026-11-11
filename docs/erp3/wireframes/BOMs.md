# Wireframe: Bill of Materials (BOM) List Screen
**Route**: `/erp3/boms`  
**Issues**: ERP3-A1, ERP3-A2, ERP3-R3  
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
│    > Quality Control             │  Bill of Materials (BOM)                     [+ Create BOM]   │
│                                  │  Define product composition and raw component structures      │
│                                  │                                                               │
│                                  │  Filter by Product: [All Products ▼]   [🔍 Search SKU/Name...]│
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ BOM ID   Product SKU Product Name     Ver Status Action  │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ BOM-0001 SKU-0001    55" Smart TV     v1  [active] View  │ │
│                                  │  │ BOM-0002 SKU-0003    65" OLED TV      v1  [active] View  │ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  Showing 2 registered engineering bills of materials          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header**:
   - Title: `Bill of Materials (BOM)` with `ERP-3 Production` badge.
   - Action: `+ Create BOM` button navigating to `/erp3/boms/new`.
2. **Filters**:
   - Search bar: Filter by SKU or product title.
   - Status / Product dropdown.
3. **Table Columns**:
   - `BOM ID`: Identifier formatted as `BOM-0001`.
   - `Product SKU`: Finished good SKU (e.g. `SKU-0001`, `SKU-0003`).
   - `Product Name`: Display name (e.g. `55" 4K Smart TV`).
   - `Version`: Integer version number (e.g. `v1`).
   - `Components`: Count of constituent component parts (5 components).
   - `Status`: Badge (`active` in green `badge-green`).
   - `Actions`: Clickable link `View Details >` navigating to `/erp3/boms/:id`.
4. **Print Media Behavior**:
   - Printable master BOM directory without sidebar or action headers.
