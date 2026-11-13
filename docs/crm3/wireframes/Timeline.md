# Wireframe: Customer Timeline Page
**Route**: `/crm3/customers/:id/timeline`  
**Issues**: CRM3-B2, CRM3-B3  
**Roles**: `admin`, `sales`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    CUSTOMERS (CRM-3)             │  ← Back to Customer Profile                   │
│    > Customers         ←active   │                                               │
│    > Segments                    │  Interaction Timeline                         │
│    > Duplicates                  │  Aarav Mehta (CUST-0001) · Mumbai             │
│    > Import                      │                                               │
│                                  │  ┌── Add Note / Interaction ────────────────┐ │
│                                  │  │ Type: [ Call ▼ ]                         │ │
│                                  │  │ Summary: [ Spoke regarding warranty... ] │ │
│                                  │  │ [ Save Note ]                            │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  Filters:                                     │
│                                  │  Type: [ All Types ▼ ]  From: [____] To: [___]│
│                                  │                                               │
│                                  │  ● 06 Nov 2026, 14:30 · [ERP-4] [order]       │
│                                  │  │  Order SO-0001 placed for 55-inch 4K Smart │
│                                  │  │  TV (SKU-0001). Total: ₹45,000.00          │
│                                  │  │                                            │
│                                  │  ● 05 Nov 2026, 10:15 · [CRM-1] [call]        │
│                                  │  │  Followed up on festive product inquiry.   │
│                                  │  │  Client interested in 4K OLED models.      │
│                                  │  │                                            │
│                                  │  ● 04 Nov 2026, 16:00 · [CRM-5] [ticket]      │
│                                  │     Ticket TKT-0012 resolved: remote setup    │
│                                  │     assistance completed successfully.        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Breadcrumb / Return Link**:
   - "← Back to Customer Profile" link navigates back to `/crm3/customers/:id`.
2. **Customer Identity Header**:
   - Customer name, ID, and city subtitle.
3. **Add Note Form Card**:
   - Top-level form allowing immediate logging of notes (`call`, `email`, `meeting`, `ticket`, `order`).
   - Posts to `POST /api/interactions` and updates the timeline instantaneously.
4. **Filter Bar**:
   - Filter dropdown by interaction type (`call`, `email`, `meeting`, `ticket`, `order`).
   - Date range pickers (`from`, `to`).
5. **Vertical Timeline Feed**:
   - Sorted in descending chronological order (newest interaction first).
   - Visual timeline rail with colored marker dots corresponding to event types.
   - Source team badges (`[CRM-1]`, `[CRM-2]`, `[ERP-4]`, `[CRM-5]`).
   - Formatted timestamp and rich event summary text.
   - De-duplicates events received from other systems within the same minute.
