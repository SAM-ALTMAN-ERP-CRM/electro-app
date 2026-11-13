# Wireframe: Manager Discount Approvals Screen
**Route**: `/crm1/approvals`  
**Issues**: CRM1-D3, CRM1-C3  
**Roles**: `admin` only

---

## Screen Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro CRM + ERP             │                                                               │
│    > Leads                       │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│    > Pipeline                    │  │ Active Workspace: Sales (CRM-1)        Role: [admin]    │  │
│    > Quotes                      │  │                                        User: Admin User │  │
│    > New Quote                   │  └─────────────────────────────────────────────────────────┘  │
│    > Dealers                     │                                                               │
│    > Approvals (admin)←active    │  Manager Discount Approvals                      [Admin Only] │
│                                  │  Review high-discount quotes exceeding standard tier caps     │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ Quote ID  Customer / Dealer   Tier Limit  Req. Disc Total│ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ QUO-0004  CUST-0004           Bronze      8.0%      ₹47K │ │
│                                  │  │           Crompton (DLR-0003) (Max 5%)   (+3% over)      │ │
│                                  │  │           [ Approve ]  [ Reject ]                        │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ QUO-0005  CUST-0002           Silver      12.0%     ₹98K │ │
│                                  │  │           Bharat (DLR-0002)   (Max 10%)  (+2% over)      │ │
│                                  │  │           [ Approve ]  [ Reject ]                        │ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  ┌── REJECTION JUSTIFICATION MODAL (when Reject clicked) ───┐ │
│                                  │  │ Reject Quotation QUO-0004                                │ │
│                                  │  │ Reason: [Discount exceeds standard policy without VP...] │ │
│                                  │  │                             [Cancel] [Confirm Rejection] │ │
│                                  │  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Specifications

1. **Header & Security**:
   - Title: `Manager Discount Approvals`
   - Role Badge: `Admin Only` (`badge badge-red`).
   - Route Access: Enforced at route level with `roles: ['admin']` in `index.jsx`.
2. **Review Table**:
   - `Quote ID`: Clickable quote reference.
   - `Customer / Dealer`: Customer account ID and associated dealer details.
   - `Dealer Tier Limit`: Helpful reference guideline:
     - Gold: Max 15% discount
     - Silver: Max 10% discount
     - Bronze: Max 5% discount
   - `Requested Discount`: Highlighted in bold red with note of how much it exceeds the dealer's standard tier allowance.
   - `Total Amount (₹)`: Right-aligned quotation total formatted in Indian currency.
   - `Sales Rep`: Submitting sales representative.
   - `Actions`:
     - **Approve**: Sends `PATCH /api/quotes/:id/approve` (sets `approved = true`). Once approved, sales reps can transition the quote from `draft` to `sent`.
     - **Reject**: Prompts for a rejection reason and sends `PATCH /api/quotes/:id/reject` with `{ reason }`.
3. **Empty State**:
   - When no approvals are pending:  
     `"🎉 All pending quotations have been reviewed! No approval requests waiting."`
4. **Integration with CRM1-C3**:
   - Approved quotes become eligible to be sent to customers.
   - Rejected quotes display the recorded manager's rejection reason on `/crm1/quotes`.
