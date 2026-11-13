# Wireframe: Returns & RMA Receipts Dashboard

**Route**: `/erp4/returns`  
**Issues**: ERP4-D1, ERP4-D2, ERP4-D3, ERP4-R3  
**Roles**: `admin`, `sales`, `warehouse`  
**Vector Mockup**: [returns.svg](returns.svg)

---

## 1. Screen Layout (ASCII Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-4 Orders & Dispatch       │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp4/returns — Returns & RMA Receipts [Dev·Admin]      │  │
│    > Orders                      │  └─────────────────────────────────────────────────────────┘  │
│    > Dispatch                    │                                                               │
│    > Returns         ← active    │  Returns & Return Receipts  [ERP-4 Returns]   [+ Raise Return] │
│                                  │  Inspect incoming returns, restock inventory & credit notes   │
│                                  │                                                               │
│                                  │  ┌── SUMMARY KPI CARDS (ERP4-D3) ──────────────────────────┐  │
│                                  │  │ TOTAL RETURNS │ REQUESTED │ RECEIVED │ RESTOCKED │SCRAP │  │
│                                  │  │       4       │     1     │    1     │     1     │  1   │  │
│                                  │  └───────────────┴───────────┴──────────┴───────────┴──────┘  │
│                                  │                                                               │
│                                  │  ┌── "RAISE RETURN" FORM DRAWER (when toggled open) ───────┐  │
│                                  │  │ Sales Order ID: [SO-0001]  Serial: [TV55-2611-0001      ]  │  │
│                                  │  │ Linked RMA ID:  [RMA-0001] Outcome:[Issue Credit Note  ▼]  │  │
│                                  │  │ Reason: [Display panel flickering on HDMI 2 port       ]  │  │
│                                  │  │                                      [Register Return]  │  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
│                                  │                                                               │
│                                  │  ┌── RETURNS DIRECTORY TABLE ──────────────────────────────┐  │
│                                  │  │ RETURN ID  ORDER    SERIAL NO       REASON    STATUS ACT│  │
│                                  │  │─────────────────────────────────────────────────────────│  │
│                                  │  │ RET-0001   SO-0001  TV55-2611-0001  Display   [req]  [→]│  │
│                                  │  │ RET-0002   SO-0002  TV55-2611-0002  Transit   [rec]  [→]│  │
│                                  │  │ RET-0003   SO-0003  TV55-2611-0003  Cancelled [rest] [→]│  │
│                                  │  │ RET-0004   SO-0004  TV55-2611-0004  Internal  [scra] [→]│  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

1. **Header & Primary Actions**:
   - Title: `Returns & Return Receipts` with `badge-blue` indicating `ERP-4 Returns`.
   - Action Button: `+ Raise New Return` toggles the collapsible return registration form.
2. **KPI Summary Cards (ERP4-D3)**:
   - Displays real-time aggregate counts for Total Returns, Requested, Received, Restocked, and Scrapped.
3. **Raise Return Form Drawer**:
   - Order ID: Reference to originating sales order.
   - Serial Number: Must exist in `dispatch_serials` for that order.
   - Linked RMA ID: Optional CRM-2 RMA reference (`RMA-0001`..).
   - Resolution Outcome: `credit_note`, `replacement`, or `scrapped`.
   - Defect Reason: Multi-line description of physical condition and defect.
4. **Returns Table**:
   - Return ID: Sequential identifier (`RET-0001` through `RET-0004`).
   - Order Reference and Serial Number monospace tag.
   - Return Reason description.
   - Linked RMA identifier.
   - Resolution outcome tag.
   - Status badge: `requested` (gray), `received` (amber), `restocked` (green), `scrapped` (red).
   - Action link: `Inspect →` navigating directly to `/erp4/returns/:id`.
