# Wireframe: Courier Dispatch Board

**Route**: `/erp4/dispatch`  
**Issues**: ERP4-C1, ERP4-C2, ERP4-C3, ERP4-R3  
**Roles**: `admin`, `sales`, `warehouse`  
**Vector Mockup**: [dispatch.svg](dispatch.svg)

---

## 1. Screen Layout (ASCII Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-4 Orders & Dispatch       │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp4/dispatch — Courier Dispatch Board [Dev·Admin]     │  │
│    > Orders                      │  └─────────────────────────────────────────────────────────┘  │
│    > Dispatch        ← active    │                                                               │
│    > Returns                     │  Courier Dispatch Management  [ERP-4 Dispatch]                 │
│                                  │  Book courier shipments, allocate serials & manage tracking   │
│                                  │                                                               │
│                                  │  ┌── TWO-COLUMN DISPATCH BOOKING WORKSPACE ────────────────┐  │
│                                  │  │ LEFT: ORDERS READY TO SHIP   │ RIGHT: NEW DISPATCH FORM │  │
│                                  │  │ Select order with full stock │ Courier: [BlueDart     ▼]│  │
│                                  │  │ SO-0006 Global Elec ₹88,480  │ Tracking: [BD-84920192 ] │  │
│                                  │  │ SO-0007 Reliance Rt ₹42,990  │ Ship Date: [2026-11-13 ] │  │
│                                  │  │                              │ Address: Plot 45 MIDC... │  │
│                                  │  │ [✓ Selected: SO-0006]        │ [Book & Allocate Serials]│  │
│                                  │  └──────────────────────────────┴──────────────────────────┘  │
│                                  │                                                               │
│                                  │  ┌── DISPATCH CONSIGNMENTS DIRECTORY ──────────────────────┐  │
│                                  │  │ DISPATCH ID ORDER & CUSTOMER  COURIER & AWB  STATUS     │  │
│                                  │  │─────────────────────────────────────────────────────────│  │
│                                  │  │ DSP-0001    SO-0001 (Aarav)   BlueDart BD-01 [deliv]    │  │
│                                  │  │   Serials: [TV55-2611-0001]          [📄 Note]          │  │
│                                  │  │ DSP-0002    SO-0002 (Sunrise) Delhivery DL-02[deliv]    │  │
│                                  │  │   Serials: [TV55-2611-0002]          [📄 Note]          │  │
│                                  │  │ DSP-0005    SO-0005 (Sharma)  BlueDart BD-05 [picked]   │  │
│                                  │  │   Serials: [TV55-2611-0005]  [📄 Note] [Ship] [Deliver] │  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

1. **Header & Context**:
   - Title: `Courier Dispatch Management` with `badge-blue` indicating `ERP-4 Dispatch`.
   - Subtitle outlining the booking, serialization, and tracking workflow.
2. **Two-Column Booking Layout**:
   - **Left Column ("Orders Ready to Dispatch")**:
     - Lists sales orders in `confirmed` state that have complete stock reservations.
     - Unreserved or shortage orders are excluded per business rules.
     - One-click order selection automatically pre-fills the booking form and customer delivery address.
   - **Right Column ("New Dispatch Form")**:
     - Order selector with required validation.
     - Courier Dropdown: Constrained to contracted partners (`BlueDart`, `Delhivery`, `DTDC`).
     - Auto-generated AWB / tracking number field.
     - Delivery address text area (pre-populated with realistic Indian address for convenience).
     - Submit button triggers serial allocation from ERP-1 (`POST /api/serials/allocate`) and creates the dispatch record.
3. **Dispatch Consignments Table**:
   - Identifiers: `DSP-0001` through `DSP-0005`.
   - Associated Sales Order ID and Customer Name.
   - Courier partner name and monospace tracking number badge.
   - Status badge: `picked` (amber), `shipped` (blue), `delivered` (green).
   - Serial Numbers: Monospace tags displaying allocated individual serial numbers (e.g. `TV55-2611-0001`).
   - Action Buttons:
     - `📄 Note`: Direct navigation to printable dispatch note (`/erp4/dispatch/:id/note`).
     - `Shipped`: Advances status from `picked` $\rightarrow$ `shipped`. Updates sales order status to `dispatched`, triggers ERP-1 stock deduction, marks serials as `sold`, creates ERP-5 invoice, and logs CRM-3 timeline event.
     - `Delivered`: Advances status to `delivered`. Updates sales order status to `delivered` and logs CRM-3 timeline event.
