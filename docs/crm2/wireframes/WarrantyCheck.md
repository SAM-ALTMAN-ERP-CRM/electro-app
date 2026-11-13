# Wireframe: Warranty Check Page
**Route**: `/crm2/warranty`  
**Issue**: CRM2-B2, CRM2-B3 (Zoha)  
**Roles**: `admin`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Warranty Verification            [CRM-2]                  [ 🔄 Sync from ERP-4 ] │
│ Check coverage status by serial number and sync shipments from ERP-4             │
│──────────────────────────────────────────────────────────────────────────────────│
│ ┌─ LOOK UP SERIAL NUMBER ──────────────────────────────────────────────────────┐ │
│ │ [ TV55-2611-0001                          ]  [ Check Warranty ]              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ RESULT: TV55-2611-0001 is IN WARRANTY ──────────────────────────────────────┐ │
│ │ 55-inch Smart TV · Customer: CUST-0001 (Aarav Mehta) · Valid until Aug 2027  │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ SERIAL NUMBER   PRODUCT             CUSTOMER   PURCHASE DATE   STATUS        │ │
│ │──────────────────────────────────────────────────────────────────────────────│ │
│ │ TV55-2611-0001  55-inch Smart TV    CUST-0001  2026-08-12      [In warranty] │ │
│ │ TV55-2611-0004  55-inch Smart TV    CUST-0004  2024-11-01      [Expired]     │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Key Elements & Consistency
1. **Serial Lookup Form**: Input with Check button calling `/api/warranty/:serial`.
2. **Result Card**: Displays prominent `In warranty` (green badge/banner) or `Expired` (red badge/banner).
3. **Sync Action**: Button triggers `POST /api/warranty/sync` (syncs new serials from ERP-4 dispatches).
4. **Registered Serials Table**: Full list of known serials with customer reference and coverage badge.
