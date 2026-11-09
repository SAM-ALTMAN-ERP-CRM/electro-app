# Wireframe: Login Page
**Route**: `/erp5/login`  **Issue**: ERP5-C3  **Roles**: public (all)

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  (Full-page centred card — sidebar HIDDEN on this page) │
│                                                         │
│  ┌─────────────────────────────────────┐                │
│  │  ⚡ Electro App                     │                │
│  │  CRM + ERP Integrated Suite        │                │
│  │                                     │                │
│  │  Sign In                            │                │
│  │  Use a demo account below…          │                │
│  │                                     │                │
│  │  ┌── Demo logins (password: demo123)─┐               │
│  │  │ admin@demo.com     [admin]        │               │
│  │  │ sales@demo.com     [sales]        │               │
│  │  │ finance@demo.com   [finance]      │               │
│  │  │ support@demo.com   [support]      │               │
│  │  │ warehouse@demo.com [warehouse]    │               │
│  │  │ hr@demo.com        [hr]           │               │
│  │  └───────────────────────────────────┘               │
│  │                                     │                │
│  │  Email                              │                │
│  │  ┌───────────────────────────────┐  │                │
│  │  │ admin@demo.com                │  │                │
│  │  └───────────────────────────────┘  │                │
│  │                                     │                │
│  │  Password                           │                │
│  │  ┌───────────────────────────────┐  │                │
│  │  │ ••••••••                      │  │                │
│  │  └───────────────────────────────┘  │                │
│  │                                     │                │
│  │  [!] Error: Invalid credentials     │  ← red banner  │
│  │                                     │                │
│  │  ┌───────────────────────────────┐  │                │
│  │  │         Sign In               │  │  ← blue btn    │
│  │  └───────────────────────────────┘  │                │
│  └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

---

## UI Notes

- Background: `#f1f5f9` (light grey)
- Card: white, `border-radius: 12px`, subtle shadow
- Demo table: monospace email column, role badges (colour-coded)
- Error state: red banner with `role="alert"` for accessibility
- Submit button disabled + text changes to "Signing in…" while loading
- **Print style**: this page has no sidebar — no print rule needed

---

## Badge Colour Map (shared across all ERP-5 pages)

| Role / Status | Badge class | Colour |
|---------------|-------------|--------|
| `admin` | `badge-red` | red |
| `sales` | `badge-blue` | blue |
| `finance` | `badge-green` | green |
| `support` | `badge-yellow` | yellow |
| `warehouse` | `badge-blue` | blue |
| `hr` | `badge-green` | green |
| `active` | `badge-green` | green |
| `inactive` | `badge-red` | red |
| `unpaid` | `badge-red` | red |
| `partially_paid` | `badge-yellow` | yellow |
| `paid` | `badge-green` | green |
