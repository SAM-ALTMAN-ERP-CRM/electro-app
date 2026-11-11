# Wireframe: Duplicates Detection & Merge Page
**Route**: `/crm3/duplicates`  
**Issues**: CRM3-D2  
**Roles**: `admin`, `sales`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    CUSTOMERS (CRM-3)             │  Duplicate Customer Detection [CRM-3]         │
│    > Customers                   │  Resolve records sharing the same phone/email │
│    > Segments                    │                                               │
│    > Duplicates        ←active   │  ┌── Group: Duplicate Phone (9820011111) ───┐ │
│    > Import                      │  │ Shared: Phone · 2 Customers Detected     │ │
│                                  │  │                                          │ │
│                                  │  │ ┌─ CUST-0001 ────────┐ ┌─ CUST-0009 ────┐│ │
│                                  │  │ │ Aarav Mehta        │ │ Aarav Mehta    ││ │
│                                  │  │ │ [retail] · Mumbai  │ │ [retail]·Mumbai││ │
│                                  │  │ │ aarav@example.com  │ │ aarav.dup@...  ││ │
│                                  │  │ │ Phone: 9820011111  │ │ Phone:982001111││ │
│                                  │  │ │ Contacts: 1        │ │ Contacts: 0    ││ │
│                                  │  │ │                    │ │                ││ │
│                                  │  │ │ [ Keep This One ]  │ │ [Keep This One]││ │
│                                  │  │ └────────────────────┘ └────────────────┘│ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  ┌── Group: Duplicate Phone (9820022222) ───┐ │
│                                  │  │ Shared: Phone · 2 Customers Detected     │ │
│                                  │  │ (CUST-0002 & CUST-0010)                  │ │
│                                  │  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header & Context**:
   - Title: `Duplicate Customer Detection` with badge `<span className="badge badge-red">CRM-3</span>`.
   - Subtitle: "Review duplicate customer records sharing the same email or phone number. Merge them cleanly without losing contacts, interactions, or tags."
2. **Duplicate Groups List**:
   - Evaluates pairs/groups retrieved from `GET /api/customers/duplicates`.
   - Shows match field and value (`Duplicate Phone Number (9820011111)`).
3. **Side-by-Side Comparison Cards**:
   - Each customer card in the group displays ID, Name, Type, Email, Phone, City, and number of associated contacts.
   - Primary action button on each card: "Keep This One".
4. **Merge Confirmation Modal**:
   - Clicking "Keep This One" prompts a confirmation modal stating:
     `"Are you sure you want to merge into CUST-0001? All contacts, interactions, and tags from CUST-0009 will be re-assigned to CUST-0001, and CUST-0009 will be permanently deleted."`
   - Triggering confirm calls `POST /api/customers/merge` with `{ keep_id, remove_id }` within a single database transaction.
   - Automatically removes the merged group from the view upon success and shows a green success banner.
