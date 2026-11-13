# Wireframe: New BOM Creation Screen
**Route**: `/erp3/boms/new`  
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
│    > Bill of Materials           │  │                                        User: Alina P.   │  │
│    > New BOM         ←active     │  └─────────────────────────────────────────────────────────┘  │
│    > Work Orders                 │                                                               │
│    > Quality Control             │  Create Bill of Materials                  [← Back to List]   │
│                                  │  Define product header and required component bill            │
│                                  │                                                               │
│                                  │  ┌── BOM Header Details ──────────────────────────────────┐   │
│                                  │  │ Finished Product SKU: [SKU-0001 ▼]                     │   │
│                                  │  │ Product Title:        [55" 4K Smart LED TV           ] │   │
│                                  │  │ Version: [1]          Status: [✓] Active               │   │
│                                  │  └────────────────────────────────────────────────────────┘   │
│                                  │                                                               │
│                                  │  ┌── Components Table ────────────────────────────────────┐   │
│                                  │  │ Component SKU     Component Name      Qty / Unit   Del │   │
│                                  │  │────────────────────────────────────────────────────────│   │
│                                  │  │ [SKU-0101 ▼]      55" Display Panel   [ 1.0 ]      [✕] │   │
│                                  │  │ [SKU-0102 ▼]      Smart TV Mainboard  [ 1.0 ]      [✕] │   │
│                                  │  │ [SKU-0103 ▼]      150W Power Supply   [ 1.0 ]      [✕] │   │
│                                  │  │ [SKU-0104 ▼]      Bluetooth Remote    [ 1.0 ]      [✕] │   │
│                                  │  │ [SKU-0105 ▼]      Packaging Box       [ 1.0 ]      [✕] │   │
│                                  │  │                                                        │   │
│                                  │  │ [+ Add Component Row]                                  │   │
│                                  │  └────────────────────────────────────────────────────────┘   │
│                                  │                                                               │
│                                  │  [Cancel]                                 [Save & Publish BOM]│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header**:
   - Title: `Create Bill of Materials` with `ERP-3 Production` badge.
   - Secondary action: `← Back to List` link returning to `/erp3/boms`.
2. **Form Card - Header**:
   - `Finished Product SKU`: Dropdown populated from Section 5 catalog (`SKU-0001`, `SKU-0003`, etc.).
   - `Product Title`: Auto-populated on SKU selection or custom input.
   - `Version`: Default `1`.
   - `Active`: Toggle checkbox (default checked).
3. **Dynamic Components Table**:
   - Pre-populated or dynamic rows with:
     - Component SKU dropdown (`SKU-0101` to `SKU-0105`).
     - Component Name auto-filled from SKU selection.
     - Quantity per unit numerical input (positive number).
     - Row delete button `[✕]`.
   - `+ Add Component Row` button appending a blank row.
4. **Form Actions**:
   - Validation ensures at least 1 component exists and all quantities are positive.
   - `Save & Publish BOM`: Posts to backend `POST /api/boms` or local storage with feedback banner.
5. **Print Rules**:
   - Form inputs and action buttons hidden; creates a clean engineering specification sheet.
