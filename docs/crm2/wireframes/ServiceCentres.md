# Wireframe: Service Centres Page
**Route**: `/crm2/centres`  
**Issue**: CRM2-D2 (Anant)  
**Roles**: `admin`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Service Centres                  [CRM-2]                                         │
│ Manage authorized regional service centres, repair capacity, and active status   │
│──────────────────────────────────────────────────────────────────────────────────│
│ ┌─ ADD NEW SERVICE CENTRE ─────────────────────────────────────────────────────┐ │
│ │ [ Centre Name       ] [ City       ] [ Phone Number  ] [ Cap ] [+ Add Centre]│ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ CENTRE ID  NAME                     CITY       PHONE             CAP  STATUS │ │
│ │──────────────────────────────────────────────────────────────────────────────│ │
│ │ SC-0001    Mumbai Central Care      Mumbai     +91 22 2490 1100  50   [Active]│ │
│ │ SC-0002    Pune Deccan Repair Hub   Pune       +91 20 2553 2200  30   [Active]│ │
│ │ SC-0003    Delhi Connaught Plaza    Delhi      +91 11 2334 3300  45   [Active]│ │
│ │ SC-0004    Bengaluru Tech Care      Bengaluru  +91 80 2552 4400  40   [Active]│ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Key Elements & Consistency
1. **Creation Card**: Inline form for Name, City, Phone, and non-negative integer Capacity.
2. **Table**: Lists all centres with ID formatted as `SC-0001`, city, contact phone, capacity, and active status badge.
3. **Status Badges**: `Active` (green badge), `Inactive` (gray badge).
4. **Validation**: Friendly feedback on empty name/city or negative capacity.
