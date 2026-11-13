# Wireframe: Customers Directory Page
**Route**: `/crm3` (or `/crm3/customers`)  
**Issue**: CRM3-A2  
**Roles**: `admin`, `sales`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    CUSTOMERS (CRM-3)             │  ┌── TOP BAR ─────────────────────────────┐  │
│    > Customers         ←active   │  │  Active: Customer 360        [admin]   │  │
│    > Segments                    │  │                   Pratik Swain [Logout]│  │
│    > Duplicates                  │  └────────────────────────────────────────┘  │
│    > Import                      │                                               │
│                                  │  Customers Directory         [CRM-3]          │
│                                  │                                               │
│                                  │  Search & Filters:                            │
│                                  │  [ 🔍 Search by name, city, email... ]        │
│                                  │  Type: [ All Types ▼ ]                        │
│                                  │                                               │
│                                  │  ┌──────────────────────────────────────────┐ │
│                                  │  │ ID       Name         Type   City  Action│ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │CUST-0001 Aarav Mehta [retail] Mumbai View│ │
│                                  │  │CUST-0002 Sunrise El. [corp]   Mumbai View│ │
│                                  │  │CUST-0004 BrightHome  [dealer] Pune   View│ │
│                                  │  │CUST-0006 Metro Off.  [corp]   Delhi  View│ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  ┌── Add New Customer ─────────────────────┐  │
│                                  │  │ Name: [_______________________________] │  │
│                                  │  │ Type: [ Retail ▼ ]                      │  │
│                                  │  │ Email: [_______]  Phone: [____________] │  │
│                                  │  │ GSTIN (corporate/dealer): [___________] │  │
│                                  │  │ Billing Address: [____________________] │  │
│                                  │  │ [✓] Same as billing address             │  │
│                                  │  │ Shipping Address: [___________________] │  │
│                                  │  │ City: [_______________________________] │  │
│                                  │  │ [ Save Customer ]                       │  │
│                                  │  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header & Badge**:
   - Title: `Customers`
   - Badge: `<span className="badge badge-blue">CRM-3</span>`
2. **Search & Filter Bar**:
   - Search input triggers live filtering matching name, email, or city.
   - Type filter dropdown with options `all`, `retail`, `corporate`, `dealer`.
3. **Customer Table**:
   - Columns: `ID`, `Name`, `Customer Type`, `Email`, `Phone`, `City`, `Actions`.
   - Customer ID formatted in monospace font.
   - Status badge color matches type: `retail` (blue), `corporate` (green), `dealer` (amber).
   - "View Details" link opens `/crm3/customers/:id`.
4. **Add Customer Form Card**:
   - Inputs: Name, Customer Type, Email, 10-digit Phone, GSTIN (required for corporate/dealer), Billing Address, Shipping Address, City.
   - "Same as billing address" checkbox instantly duplicates billing address into shipping address.
   - Inline validation and error messages.
5. **Print Styles**:
   - Sidebar, top-bar, search toolbar, and creation form card hidden in print.
