# Wireframe: Printable Dispatch Note & Delivery Challan

**Route**: `/erp4/dispatch/:id/note`  
**Issues**: ERP4-C3, ERP4-R3  
**Roles**: `admin`, `sales`, `warehouse`  
**Vector Mockup**: [dispatch-note.svg](dispatch-note.svg)

---

## 1. Screen Layout (ASCII Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SCREEN VIEW WITH CONTROLS (Screen Only, Suppressed in @media print)                              │
│  ← Back to Dispatches                                        [🖨️ Print Dispatch Note]           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PRINTABLE A4 SHEET CANVAS (Bordered in screen view, full-bleed in print view)                    │
│                                                                                                  │
│  ⚡ ELECTRO ENTERPRISES PVT LTD                        DISPATCH NOTE                             │
│  Central Warehouse WH-01, Mumbai, MH 400093            Delivery Challan & Packing Slip           │
│  GSTIN: 27AAACE1234F1Z8 · Tel: +91 22 4900 8800        Status: [SHIPPED]                         │
│  ═══════════════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                                  │
│  ┌── CONSIGNMENT & LOGISTICS ─────────────┐ ┌── CONSIGNEE & SHIPPING DESTINATION ───────────┐    │
│  │ Dispatch ID: DSP-0001                  │ │ Customer Name: Aarav Mehta                     │    │
│  │ Sales Order: SO-0001                   │ │ Customer ID: CUST-0001                         │    │
│  │ Ship Date: 2026-10-02                  │ │ GSTIN: Consumer / Unregistered                 │    │
│  │ Courier: BlueDart                      │ │ Address: 1201 Marina Bay, Bandra West,         │    │
│  │ Tracking / AWB: BD-84920192            │ │          Mumbai, Maharashtra 400050            │    │
│  └────────────────────────────────────────┘ └────────────────────────────────────────────────┘    │
│                                                                                                  │
│  ┌── DISPATCHED LINE ITEMS TABLE ────────────────────────────────────────────────────────────┐    │
│  │ #   SKU CODE    PRODUCT DESCRIPTION               QTY DISPATCHED   UNIT PRICE    TOTAL    │    │
│  │ 1   SKU-0001    55-inch 4K Smart TV                     1          ₹42,990.00    ₹42,990  │    │
│  │ ───────────────────────────────────────────────────────────────────────────────────────── │    │
│  │ Total Units Dispatched: 1 Unit                                                            │    │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                  │
│  ┌── ASSIGNED SERIAL NUMBERS (1 UNIT) ───────────────────────────────────────────────────────┐    │
│  │ [ SKU-0001: TV55-2611-0001 ]                                                              │    │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                  │
│  ───────────────────────────────────────────────────────────────────────────────────────────────  │
│     [ Dispatch Officer ]         [ Courier Carrier Rep ]        [ Receiver's Stamp & Signature ]  │
│    Warehouse WH-01 (Mumbai)      BlueDart Pickup Agent          Goods Received in Good Condition  │
│                                                                                                  │
│  This is a computer-generated dispatch document and delivery challan under Section 31 of CGST Act│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

1. **Screen Toolbar (Suppressed on Print)**:
   - `← Back to Dispatches` breadcrumb button returning to `/erp4/dispatch`.
   - `🖨️ Print Dispatch Note` button triggering browser `window.print()`.
2. **Document Header**:
   - Company identity: `⚡ Electro App Enterprises` with Central Distribution Warehouse (WH-01, Mumbai) and corporate GSTIN `27AAACE1234F1Z8`.
   - Official title: `DISPATCH NOTE (Delivery Challan & Packing Slip)` with dispatch status badge.
3. **Logistics & Destination Metadata**:
   - Consignment Info: Dispatch ID (`DSP-0001`), Order reference (`SO-0001`), Ship date, Courier name (`BlueDart`), and tracking number.
   - Consignee Info: Customer Name, Customer ID, GSTIN status, and full multi-line delivery address.
4. **Dispatched Line Items Table**:
   - Columns: Line #, SKU Code, Product Description, Quantity Dispatched, and Unit Price in INR.
   - Total Units Dispatched count summary.
5. **Assigned Serial Numbers Box**:
   - Dedicated box highlighting allocated serial numbers for hardware warranty verification (CRM-2 integration).
6. **Signatures & Verification**:
   - Three-column signature blocks: Warehouse Dispatch Officer, Courier Pickup Agent, and Customer/Receiver's Signature and Stamp.
7. **Print Media Rules (`@media print`)**:
   - Suppression of all navigation bars, sidebars, top headers, and buttons.
   - Explicit `@page { size: A4 portrait; margin: 10mm; }` ensuring clean fit on a single A4 sheet with zero clipping.
