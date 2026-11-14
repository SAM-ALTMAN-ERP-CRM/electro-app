# ERP-4 UI Consistency & Screen Design Guide

**Issue**: [ERP4-R3] UI owner: Wireframes and screen consistency (#171)  
**Team**: ERP-4 Orders & Dispatch | **Service**: `services/erp4` (Port 5204) | **Database**: `erp4_db`  
**Frontend Module**: `frontend/src/modules/erp4` (`id: 'erp4'`, `title: 'Orders and Dispatch'`)  
**Authorized Roles**: `admin`, `sales`, `warehouse`  
**Order-to-Cash Workflow**: Steps 3, 5 & 6 of 9 (Sales Orders, Courier Dispatch & Return Receipts)

---

## 1. Executive Summary & Design Principles

This document establishes the single source of truth for all frontend interfaces in **Team ERP-4 Orders & Dispatch**. All 6 pages built by our team adhere to common styling guidelines agreed upon across the 11 integrated CRM and ERP teams:
1. **Shared Shell Respect**: Our module strictly mounts within the application shell (`frontend/src/App.jsx`). We never instantiate an independent router (`BrowserRouter`), custom top navbar, or duplicated sidebar.
2. **Unified Color & Status Language**: Standardized badge colors and semantic alerts ensure cohesive status transitions throughout the Order-to-Cash flow.
3. **Consistent Data Formatting**: Indian Rupee values formatted as `₹` with `toLocaleString('en-IN')`, dates as `YYYY-MM-DD`, and GST calculated at 18% (9% CGST + 9% SGST).
4. **Resilient Offline States**: Every page renders clean loading spinners, empty-state placeholders, and user-friendly alert banners with graceful fallbacks.
5. **Print Optimization**: Official warehouse documents like the Dispatch Note (`/erp4/dispatch/:id/note`) include dedicated `@media print` stylesheets that hide navigation chrome and format cleanly to a single standard A4 sheet.

---

## 2. Screen Inventory & Route Registry

All pages are cleanly registered in `frontend/src/modules/erp4/index.jsx` relative to `/erp4`:

| Screen Name | Module Route | Full Browser Path | Roles | Wireframe Specs | Vector Mockup |
|:---|:---|:---|:---|:---|:---|
| **Sales Orders List** | `''` / `'orders'` | `/erp4` / `/erp4/orders` | `admin`, `sales`, `warehouse` | [OrdersList.md](OrdersList.md) | [orders.svg](orders.svg) |
| **Sales Order Detail** | `'orders/:id'` | `/erp4/orders/:id` | `admin`, `sales`, `warehouse` | [OrderDetail.md](OrderDetail.md) | [order-detail.svg](order-detail.svg) |
| **Courier Dispatch Board**| `'dispatch'` | `/erp4/dispatch` | `admin`, `sales`, `warehouse` | [Dispatch.md](Dispatch.md) | [dispatch.svg](dispatch.svg) |
| **Printable Dispatch Note**| `'dispatch/:id/note'`| `/erp4/dispatch/:id/note` | `admin`, `sales`, `warehouse` | [DispatchNote.md](DispatchNote.md) | [dispatch-note.svg](dispatch-note.svg) |
| **Returns & RMA Receipts** | `'returns'` | `/erp4/returns` | `admin`, `sales`, `warehouse` | [ReturnsList.md](ReturnsList.md) | [returns.svg](returns.svg) |
| **Return Receipt Detail** | `'returns/:id'` | `/erp4/returns/:id` | `admin`, `sales`, `warehouse` | [ReturnDetail.md](ReturnDetail.md) | [return-detail.svg](return-detail.svg) |

---

## 3. Global Color Tokens & Typography

| Semantic Token | Hex Code | Usage in ERP-4 Screens |
|:---|:---|:---|
| **Heading Slate** | `#0f172a` | Primary titles, modal titles, table header text, key ID references |
| **Body Slate** | `#1e293b` / `#334155` | Table cell copy, form label text, description paragraphs |
| **Muted Slate** | `#64748b` / `#94a3b8` | Subtitles, input placeholders, unit price notes, timestamps |
| **Border Slate** | `#e2e8f0` / `#cbd5e1` | Table dividers, container cards, form input borders |
| **Canvas Background** | `#f8fafc` / `#ffffff` | Background cards, alternating table rows, drawer backgrounds |
| **Action Blue** | `#2563eb` / `#1d4ed8` | Primary submission buttons, link triggers, active tabs |
| **Success Green** | `#16a34a` / `#15803d` | `confirmed`, `delivered`, `restocked`, `reserved` badges |
| **Warning Amber** | `#d97706` / `#b45309` | `picked`, `received`, `shipped` badges, action buttons |
| **Danger Red** | `#dc2626` / `#991b1b` | `cancelled`, `scrapped`, `shortage` badges, delete actions |

---

## 4. Status Badges Design System

Our badges adhere to shared CSS classes defined in `frontend/src/index.css`:

```html
<!-- Green Badges (Fulfillment Success / Positive State) -->
<span class="badge badge-green">confirmed</span>
<span class="badge badge-green">delivered</span>
<span class="badge badge-green">restocked</span>
<span class="badge badge-green">reserved</span>

<!-- Blue Badges (Identity & Tracking) -->
<span class="badge badge-blue">ERP-4 Orders</span>
<span class="badge badge-blue">created</span>

<!-- Amber Badges (Logistics & Processing) -->
<span class="badge badge-amber">picked</span>
<span class="badge badge-amber">shipped</span>
<span class="badge badge-amber">received</span>

<!-- Red Badges (Shortages & Cancellations) -->
<span class="badge badge-red">cancelled</span>
<span class="badge badge-red">scrapped</span>
<span class="badge badge-red">shortage</span>

<!-- Gray Badges (Pending / Initial) -->
<span class="badge badge-gray">requested</span>
<span class="badge badge-gray">released</span>
```

---

## 5. Standard Currency & Financial Formatting

In compliance with Indian accounting standards (GST 18%):
- **Formatting Function**:
  ```javascript
  const formatINR = (amount) => {
    const val = parseFloat(amount) || 0;
    return `₹${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };
  ```
- **Tax Calculation**:
  - Subtotal = $\sum (\text{Quantity} \times \text{Unit Price})$
  - CGST (9%) = $\text{Math.round}(\text{Subtotal} \times 0.09 \times 100) / 100$
  - SGST (9%) = $\text{Math.round}(\text{Subtotal} \times 0.09 \times 100) / 100$
  - Grand Total = $\text{Subtotal} + \text{CGST} + \text{SGST}$

---

## 6. Table & Form Layout Templates

### A. Data Tables
- Wrapped in clean container cards (`background: #ffffff`, `borderRadius: 8px`, `border: 1px solid #e2e8f0`).
- Headers styled with `background: #f8fafc`, `fontSize: 0.8rem`, `color: #475569`, `textTransform: uppercase`.
- Identifiers (`SO-0001`, `DSP-0001`, `RET-0001`) emphasized in bold with deep navy `#0f172a`.
- Serials and tracking numbers rendered in clean monospace chips (`fontFamily: monospace`, `background: #f1f5f9`).
- Action cells aligned right with compact, high-contrast action pills.

### B. Input Forms & Drawers
- Input fields use consistent padding (`0.45rem 0.75rem`), rounded borders (`6px`), and clear focus rings.
- Required labels marked with a red asterisk (`*`).
- Responsive grid structure adapting from single-column on mobile to multi-column on desktop (`minmax(220px, 1fr)`).

---

## 7. Print Media Architecture (`@media print`)

Official shipping documents and delivery challans (specifically `DispatchNotePage.jsx`) require pristine physical output:
- **Navigation Chrome Removal**: `.sidebar`, `.top-bar`, `.no-print`, buttons, and hyperlinks are suppressed with `display: none !important;`.
- **Canvas Expansion**: Margins and paddings reset to ensure zero clipping.
- **High-Contrast Borders**: Tables and signature blocks print in pure black/dark grey (`#000000` / `#333333`) on clean white canvas.
- **Page Dimensions**: Fixed to standard A4 portrait with uniform 10mm margins (`@page { size: A4 portrait; margin: 10mm; }`).

---

## 8. Cross-Team Verification & Shell Compliance

1. **No Localhost or Custom Ports**: No frontend file specifies `localhost` or `5204`. All communication uses `import { api } from '../../../api';`.
2. **No Raw `fetch`**: Raw network calls are avoided in favor of the shared authenticated API client.
3. **No Duplicate Router**: Neither `BrowserRouter` nor top-level routing wrappers are instantiated within `frontend/src/modules/erp4/`.
4. **Role Guarantees**: Module metadata exports `roles: ['admin', 'sales', 'warehouse']`, ensuring access control is enforced consistently by the global shell.
