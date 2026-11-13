# Wireframe: Return Receipt Detail & Inspection Screen

**Route**: `/erp4/returns/:id`  
**Issues**: ERP4-D2, ERP4-D3, ERP4-R3  
**Roles**: `admin`, `sales`, `warehouse`  
**Vector Mockup**: [return-detail.svg](return-detail.svg)

---

## 1. Screen Layout (ASCII Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-4 Orders & Dispatch       │  ← Back to Returns                                            │
│                                  │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│    > Orders                      │  │ Return RET-0001 — Hardware Return Inspection [Dev·Admin]│  │
│    > Dispatch                    │  └─────────────────────────────────────────────────────────┘  │
│    > Returns         ← active    │                                                               │
│                                  │  Return RET-0001  [requested]      [Mark Received at WH]      │
│                                  │  Order SO-0001 · Serial TV55-2611-0001                        │
│                                  │                                                               │
│                                  │  ┌── CONSIGNMENT IDENTIFICATION ──┐ ┌── RMA & RESOLUTION ─────┐│
│                                  │  │ Return ID: RET-0001            │ │ Customer: Aarav Mehta   ││
│                                  │  │ Order Ref: SO-0001             │ │ Customer ID: CUST-0001  ││
│                                  │  │ Serial: TV55-2611-0001         │ │ Linked RMA: RMA-0001    ││
│                                  │  │ Created: 2026-10-15            │ │ Outcome: Credit Note    ││
│                                  │  └────────────────────────────────┘ └─────────────────────────┘│
│                                  │                                                               │
│                                  │  ┌── DEFECT & RETURN DESCRIPTION ──────────────────────────┐  │
│                                  │  │ Customer noted display panel flickering on HDMI 2 port. │  │
│                                  │  │ Packaging intact. Unit returned with original power cord│  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
│                                  │                                                               │
│                                  │  ┌── WAREHOUSE PROCESSING ACTIONS (when received) ─────────┐  │
│                                  │  │ [✓ Restock to Inventory]        [✕ Scrap Damaged Item]  │  │
│                                  │  │ Restocks ERP-1 & issues ERP-5   Marks item unsalvageable│  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

1. **Top Context Navigation**:
   - Breadcrumb navigation `← Back to Returns` pointing to `/erp4/returns`.
   - Title displaying return ID `Return RET-0001` with status badge.
2. **Status Transition Action Buttons**:
   - `Mark Received at Warehouse`: Moves status from `requested` $\rightarrow$ `received` when hardware reaches WH-01.
   - `Restock to Inventory`: Moves status from `received` $\rightarrow$ `restocked`. Automatically triggers ERP-1 stock adjustment (`POST /api/stock/adjust delta: +1`), updates serial status in ERP-1 to `in_stock`, and triggers ERP-5 credit note (`POST /api/creditnotes`) if outcome is `credit_note`.
   - `Scrap Damaged Item`: Moves status from `received` $\rightarrow$ `scrapped` for unrecoverable hardware defects.
3. **Identification & Customer Cards**:
   - Return ID, Order link, Monospace Serial Number chip.
   - Customer details from CRM-3, linked CRM-2 RMA reference, and designated resolution outcome (`Credit Note` / `Replacement`).
4. **Defect Description**:
   - High-contrast card displaying documented defect reasons and warehouse inspection notes.
