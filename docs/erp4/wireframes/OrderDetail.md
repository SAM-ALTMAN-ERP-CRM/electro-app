# Wireframe: Sales Order Detail & Reservation Screen

**Route**: `/erp4/orders/:id`  
**Issues**: ERP4-A2, ERP4-A3, ERP4-B1, ERP4-B2, ERP4-B3, ERP4-R3  
**Roles**: `admin`, `sales`, `warehouse`  
**Vector Mockup**: [order-detail.svg](order-detail.svg)

---

## 1. Screen Layout (ASCII Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-4 Orders & Dispatch       │  ← Back to Orders                                             │
│                                  │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│    > Orders          ← active    │  │ Order SO-0006 — Order Fulfillment Lifecycle [Dev·Admin] │  │
│    > Dispatch                    │  └─────────────────────────────────────────────────────────┘  │
│    > Returns                     │                                                               │
│                                  │  Order SO-0006  [confirmed]        [Confirm Order] [Cancel]   │
│                                  │  Customer: Global Electronics Pvt Ltd (CUST-0006)             │
│                                  │                                                               │
│                                  │  ┌── CUSTOMER & FINANCIAL SUMMARY CARDS ───────────────────┐  │
│                                  │  │ Customer: Global Elec │ Quotation: QUO-0006             │  │
│                                  │  │ GSTIN: 27AABCG1234F1Z8│ Sales Rep: EMP-0002 (Rahul)    │  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
│                                  │                                                               │
│                                  │  ┌── LINE ITEMS & TAX BREAKDOWN ───────────────────────────┐  │
│                                  │  │ #  SKU       PRODUCT DESCRIPTION  QTY  UNIT PRICE TOTAL  │  │
│                                  │  │ 1  SKU-0001  55" 4K Smart TV       1   ₹42,990.00 ₹42,990│  │
│                                  │  │ 2  SKU-0002  Wireless Soundbar     2   ₹16,000.00 ₹32,000│  │
│                                  │  │─────────────────────────────────────────────────────────│  │
│                                  │  │ Subtotal: ₹74,990.00 | CGST 9%: ₹6,749.10 | SGST: ₹6,749│  │
│                                  │  │ Grand Total (incl. 18% GST): ₹88,488.20                 │  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
│                                  │                                                               │
│                                  │  ┌── INVENTORY RESERVATIONS PANEL (ERP4-B2) ───────────────┐  │
│                                  │  │ Warehouse Inventory Check (WH-01)   [⚡ Reserve Stock]   │  │
│                                  │  │ SKU       REQUIRED  RESERVED  STATUS      SHORTAGE ALERT│  │
│                                  │  │ SKU-0001     1         1      [reserved]   In Stock (OK)│  │
│                                  │  │ SKU-0002     2         2      [reserved]   In Stock (OK)│  │
│                                  │  │ [✓ All items fully reserved. Ready for courier dispatch]│  │
│                                  │  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

1. **Top Context Navigation**:
   - Breadcrumb link `← Back to Orders` navigating back to `/erp4/orders`.
   - Title displaying active order key `Order SO-0006` with status badge.
2. **Order Lifecycle Action Buttons**:
   - `Confirm Order`: Transitions order from `created` $\rightarrow$ `confirmed`.
   - `Cancel Order`: Transitions order to `cancelled` (only permitted prior to dispatch). Automatically releases any held stock reservations.
3. **Customer & Corporate Lookup**:
   - Fetches corporate and retail details from CRM-3 (`GET /api/customers/:id`).
   - Displays 15-character corporate GSTIN (`27AABCG1234F1Z8`) or identifies retail consumers.
4. **Line Items & Tax Breakdown**:
   - Tabular view of all purchased items with SKU, description, unit price, quantity, and line total.
   - Comprehensive tax summary: Subtotal, CGST 9%, SGST 9%, and Grand Total in INR.
5. **Stock Reservation Panel (ERP4-B1 & ERP4-B2)**:
   - `Reserve Stock` Button: Calls ERP-1 stock availability check (`GET /api/stock/check`) and creates inventory reservations.
   - Status Chips: Green `reserved` chip for available stock; Red `shortage` chip for unavailable inventory.
   - Shortage Warning & Work Order Link (ERP4-B3): In case of inventory shortage, renders a prominent warning banner and allows requesting production from Team ERP-3 (`POST /api/work-orders`).
