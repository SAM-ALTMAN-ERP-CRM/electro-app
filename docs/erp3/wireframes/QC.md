# Wireframe: Quality Control & Inspection Screen
**Route**: `/erp3/qc`  
**Issues**: ERP3-D1, ERP3-D2, ERP3-D3, ERP3-R3  
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
│    > Work Orders                 │                                                               │
│    > Quality Control ←active     │  Quality Control (QC) & Inspection        [+ Record QC Check] │
│                                  │  Assembly line inspections, defect tracking & quality gates   │
│                                  │                                                               │
│                                  │  ┌── QC Summary & Defect Distribution (ERP3-D3) ──────────┐   │
│                                  │  │ Overall Quality Pass Rate: 92.5%                       │   │
│                                  │  │ [████████████████████████████████████░░] 92.5% Pass    │   │
│                                  │  │ Defect Distribution:                                   │   │
│                                  │  │ • scratch: 3 [███░░░░░░░]  • dead pixel: 2 [██░░░░░░░]  │   │
│                                  │  │ • no power: 1 [█░░░░░░░░]  • wrong label: 0 [░░░░░░░░] │   │
│                                  │  └────────────────────────────────────────────────────────┘   │
│                                  │                                                               │
│                                  │  ┌── Record Inspection Form (ERP3-D2) ────────────────────┐   │
│                                  │  │ Work Order: [WO-0001 ▼]       Inspector: [EMP-0005 ▼]  │   │
│                                  │  │ Checked Qty: [ 50 ]   Passed: [ 50 ]   Failed: [ 0 ]   │   │
│                                  │  │ Defect Reason: [ None / Scratch / Dead Pixel... ▼ ]    │   │
│                                  │  │ Auto Result: [✓ PASS]                 [Submit QC Check]│   │
│                                  │  └────────────────────────────────────────────────────────┘   │
│                                  │                                                               │
│                                  │  QC Inspections Log                                           │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ QC ID   WO ID    Inspector Checked Pass Fail Result Date │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ QC-0001 WO-0001  EMP-0005       50   50    0 [PASS] 11-12│ │
│                                  │  │ QC-0002 WO-0002  EMP-0006       25   23    2 [REWO] 11-13│ │
│                                  │  │ QC-0003 WO-0003  EMP-0005       20   14    6 [FAIL] 11-14│ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header**:
   - Title: `Quality Control (QC) & Inspection` with `ERP-3 Production` badge.
   - Quick Inspection toggle button.
2. **QC Summary Metrics Card (ERP3-D3)**:
   - Overall inspection pass rate % with visual progress indicator.
   - Per-defect breakdown bars:
     - `scratch`
     - `dead pixel`
     - `no power`
     - `wrong label`
     - `other`
3. **Record QC Inspection Form (ERP3-D2)**:
   - Input fields:
     - Work Order selector (`WO-0001` to `WO-0005`).
     - Inspector selector (`EMP-0005` to `EMP-0007`).
     - Numerical quantities: `Checked Qty`, `Passed Qty`, `Failed Qty`.
     - Defect Reason dropdown (`scratch`, `dead pixel`, `no power`, `wrong label`, `other`).
   - Client-side validation:
     - Validates that `Passed + Failed === Checked`.
     - Automatically computes result badge:
       - **Pass** (`badge-green`): If `Failed === 0`.
       - **Fail** (`badge-red`): If `Failed > 20% * Checked`.
       - **Rework** (`badge-amber`): If $0 < \text{Failed} \le 20\%$.
4. **QC Inspections History Table (ERP3-D1)**:
   - Lists historical inspection records with timestamp and calculated status badges.
5. **Print Rules**:
   - Hides input controls; prints as official quality certificate and batch inspection sign-off.
