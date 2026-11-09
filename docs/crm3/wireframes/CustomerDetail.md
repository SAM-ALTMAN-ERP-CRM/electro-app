# Wireframe: Customer Detail Page
**Route**: `/crm3/customers/:id`  
**Issues**: CRM3-A2, CRM3-C3  
**Roles**: `admin`, `sales`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    CUSTOMERS (CRM-3)             │  ← Back to Customers                          │
│    > Customers         ←active   │                                               │
│    > Segments                    │  Sunrise Electronics Pvt Ltd   [corporate]    │
│    > Duplicates                  │  ID: CUST-0002 · GSTIN: 27AABCS1234F1Z5       │
│    > Import                      │                                               │
│                                  │  [ ⏱ View Interaction Timeline ]               │
│                                  │                                               │
│                                  │  ┌── Customer Tags ─────────────────────────┐ │
│                                  │  │ [ VIP × ]  [ Corporate Tier 1 × ]        │ │
│                                  │  │ [ Enter tag... ] [ + Add Tag ]           │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  ┌── Address Details ───────────────────────┐ │
│                                  │  │ Billing Address:  45 Nariman Point       │ │
│                                  │  │ Shipping Address: 45 Nariman Point       │ │
│                                  │  │ City: Mumbai                             │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  ┌── Contacts (2) ──────────────────────────┐ │
│                                  │  │ Name         Phone       Email   Design. │ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │Rajesh Gupta  9820022223  r@sun.  Manager │ │
│                                  │  │Neha Sharma   9820022224  n@sun.  Procure │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  ┌── Add New Contact ───────────────────────┐ │
│                                  │  │ Name: [_______]  Phone: [______________] │ │
│                                  │  │ Email: [______]  Designation: [________] │ │
│                                  │  │ [ Add Contact ]                          │ │
│                                  │  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header & Navigation**:
   - "← Back to Customers" link returns to `/crm3`.
   - Customer name as main `<h2>`, accompanied by Customer Type badge (`[corporate]`, `[retail]`, `[dealer]`).
   - Customer ID and GSTIN displayed cleanly.
2. **Action Bar**:
   - "View Interaction Timeline" button redirects to `/crm3/customers/:id/timeline`.
3. **Interactive Customer Tags Section**:
   - Small rounded chips for existing tags (`VIP`, `Corporate Tier 1`, etc.).
   - Each chip has an inline `×` removal button making a `DELETE /api/customers/:id/tags/:tag` request.
   - Inline "Add Tag" input field and button triggering `POST /api/customers/:id/tags`.
4. **Address Cards**:
   - Billing and Shipping address display with clean card borders and muted labels.
5. **Contacts Table & Form**:
   - Table of contacts with columns: `Name`, `Phone`, `Email`, `Designation`.
   - "Add New Contact" form for appending contacts directly to this customer record.
