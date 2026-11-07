# Wireframe: Users Page
**Route**: `/erp5/users`  **Issue**: ERP5-C3  **Roles**: `admin` only

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│  ─────────────────               │  ┌── TOP BAR ─────────────────────────────┐  │
│  Finance & Auth  [ERP5]          │  │  Active: Finance & Auth           [admin]│  │
│    > Users                       │  │                    System Administrator  │  │
│                                  │  │                           [Logout]       │  │
│  [other modules…]                │  └─────────────────────────────────────────┘  │
│                                  │                                               │
│                                  │  Users  [Admin only]                          │
│                                  │                                               │
│                                  │  ┌──────────────────────────────────────────┐ │
│                                  │  │ ID       Name        Email    Role  EmpID│ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │USR-0001  Sys Admin   admin@…  [admin] …  │ │
│                                  │  │USR-0002  Rohan K.    sales@…  [sales] …  │ │
│                                  │  │USR-0003  Support Ag. supp@…   [supp]  —  │ │
│                                  │  │USR-0004  Warehouse … wh@…     [wh]    —  │ │
│                                  │  │USR-0005  Finance Mg. fin@…    [fin]   …  │ │
│                                  │  │USR-0006  HR Manager  hr@…     [hr]    …  │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  Add User                                     │
│                                  │  ┌──────────────────────────────────────────┐ │
│                                  │  │  Name *      │  Email *                  │ │
│                                  │  │  [________]  │  [____________________]   │ │
│                                  │  │                                          │ │
│                                  │  │  Password *  │  Role *                   │ │
│                                  │  │  [________]  │  [admin ▼]                │ │
│                                  │  │                                          │ │
│                                  │  │  Employee ID (optional)                  │ │
│                                  │  │  [EMP-0001]                              │ │
│                                  │  │                                          │ │
│                                  │  │  [Add User]                              │ │
│                                  │  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Notes

- Table header: `background: #f8fafc`, bold labels
- Roles shown as colour-coded badges (see Login.md badge map)
- Status column: `[active]` green / `[inactive]` red
- Error banner: red, appears above the table
- Success banner: green, appears above the table after adding a user
- **Non-admin who navigates here**: sees a 403 error message (enforced server-side by `requireRole('admin')`)
- **Print style**: `@media print { .sidebar { display: none; } }`
