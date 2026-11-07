# ERP-5 End-to-End Test Checklist

> **Script**: `npm run e2e` → `node scripts/e2e.js`  
> **Frequency**: Run every week from Week 4; post results in the group chat.  
> **Prerequisites**: `npm run db:setup` on a fresh database, all services started with `npm run dev`.  
> **Goal**: By integration week every step must show **PASS** (no SKIPs allowed).

---

## How to Run

```bash
# 1. Reset to clean seed data
npm run db:setup

# 2. Start all services
npm run dev

# 3. In a second terminal, run the e2e test with mocks off
USE_MOCKS=false npm run e2e
```

Expected exit code: `0` (all PASS). Exit code `1` means at least one failure.

---

## 9-Step Order-to-Cash Workflow

The script tests the complete business cycle of Electro App from customer enquiry to warranty credit note.

---

### Step 0 — Authentication (ERP-5)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 0a | Login as `admin@demo.com` with password `demo123` | `POST http://localhost:5205/api/auth/login` | HTTP 200, response contains `data.token` | Token is a valid JWT string |
| 0b | Call the "who am I" endpoint with the token | `GET http://localhost:5205/api/auth/me` | HTTP 200, response contains `data.role = "admin"` | Role matches seeded user |
| 0c | Attempt login with wrong password | `POST http://localhost:5205/api/auth/login` body `{ password: "wrong" }` | HTTP 401 | Error message present, no token returned |
| 0d | Call `/api/users` without a token | `GET http://localhost:5205/api/users` | HTTP 401 | Auth middleware is enforcing protection |

**Local test command:**
```bash
curl -s -X POST http://localhost:5205/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"demo123"}' | jq .
```

---

### Step 1 — Enquiry → Lead (CRM-4 → CRM-1)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 1a | Submit a customer enquiry | `POST http://localhost:5104/api/enquiries` | HTTP 201, `data.id` starts with `ENQ-` | Enquiry stored |
| 1b | Confirm enquiry converts to lead | `GET http://localhost:5101/api/leads` | HTTP 200, new lead exists | Lead `source` = `portal`, `status` = `new` |

**Status**: SKIP until CRM-4 and CRM-1 merge their APIs.

---

### Step 2 — Opportunity + Quote → Order (CRM-1 → ERP-4)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 2a | Mark lead as opportunity | `PATCH http://localhost:5101/api/leads/:id` | HTTP 200, `status = opportunity` | Lead updated |
| 2b | Create quote: 3 items, 10% discount, approve & send | `POST http://localhost:5101/api/quotes` | HTTP 201, correct subtotal + GST | Quote `status = sent` |
| 2c | Accept quote → creates ERP-4 order | `POST http://localhost:5101/api/quotes/:id/accept` | HTTP 200, `order_id` returned | Order exists in ERP-4 |
| 2d | CRM-3 timeline entry created | `GET http://localhost:5103/api/timeline?ref=:order_id` | HTTP 200, entry visible | Cross-team write succeeded |

**Status**: SKIP until CRM-1 and ERP-4 merge.

---

### Step 3 — Reserve Stock → Work Order (ERP-4 → ERP-3 → ERP-2)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 3a | Reserve stock for order | `POST http://localhost:5204/api/orders/:id/reserve` | HTTP 200 or 409 (shortage) | Shortage triggers work order |
| 3b | Work order created in ERP-3 | `GET http://localhost:5203/api/workorders` | HTTP 200, new work order exists | `status = pending` |
| 3c | Purchase request raised in ERP-2 | `GET http://localhost:5202/api/purchase-requests` | HTTP 200, new request exists | Linked to work order |

**Status**: SKIP until ERP-4, ERP-3, ERP-2 merge.

---

### Step 4 — PO Approval → GRN → Stock Increase (ERP-2 → ERP-1)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 4a | Approve purchase request → PO | `POST http://localhost:5202/api/purchase-orders` | HTTP 201 | PO `status = sent` |
| 4b | Record goods receipt | `POST http://localhost:5202/api/grn` | HTTP 201 | GRN links to PO |
| 4c | ERP-1 stock level increases | `GET http://localhost:5201/api/stock?sku=SKU-0001` | HTTP 200, `quantity` increased | Stock reflects GRN |
| 4d | Purchase ledger entry in ERP-5 | `GET http://localhost:5205/api/ledger?type=purchase` | HTTP 200, balanced pair exists | Debit purchases, credit cash |

**Status**: SKIP until ERP-2, ERP-1 merge.

---

### Step 5 — Production → Finished Goods (ERP-3 → ERP-1)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 5a | Issue materials from ERP-1 | `POST http://localhost:5203/api/workorders/:id/issue` | HTTP 200 | Materials deducted from stock |
| 5b | QC pass, post finished goods | `POST http://localhost:5203/api/workorders/:id/complete` | HTTP 200 | Work order `status = done` |
| 5c | Finished goods stock in ERP-1 | `GET http://localhost:5201/api/stock?sku=SKU-0001` | HTTP 200 | Stock updated, serial numbers assigned |

**Status**: SKIP until ERP-3, ERP-1 merge.

---

### Step 6 — Dispatch → GST Invoice (ERP-4 → ERP-1 → ERP-5)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 6a | Dispatch order | `POST http://localhost:5204/api/orders/:id/dispatch` | HTTP 200 | Stock deducted in ERP-1, serials marked sold |
| 6b | GST invoice created in ERP-5 | `GET http://localhost:5205/api/invoices` | HTTP 200, invoice `INV-xxxx` exists | Correct CGST 9% + SGST 9% |
| 6c | Ledger pair posted | `GET http://localhost:5205/api/ledger?type=invoice` | HTTP 200 | Debit receivables, credit sales — balanced |
| 6d | Same `so_id` posted again returns 200 | `POST http://localhost:5205/api/invoices` same body | HTTP 200 | Idempotent — returns existing invoice |

**Status**: SKIP until ERP-4, ERP-1 merge. ERP-5 `/api/invoices` needed by A1 (dependent issue).

---

### Step 7 — Payment → Invoice Paid (ERP-5)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 7a | Record partial payment | `POST http://localhost:5205/api/payments` | HTTP 201 | Invoice `status = partially_paid` |
| 7b | Record second payment for balance | `POST http://localhost:5205/api/payments` | HTTP 201 | Invoice `status = paid` |
| 7c | Overpayment is rejected | `POST http://localhost:5205/api/payments` amount > balance | HTTP 400 | Error message returned |
| 7d | Ledger balanced after payment | `GET http://localhost:5205/api/ledger?type=payment` | HTTP 200 | Debit cash, credit receivables |

**Status**: SKIP until ERP-5-B1 (Payments API) is merged.

---

### Step 8 — Commission Sync (ERP-6)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 8a | ERP-6 creates commission for sales rep | `GET http://localhost:5206/api/commissions` | HTTP 200, entry for `EMP-0001` | Commission = agreed % of invoice total |
| 8b | Payroll picks up commission | `GET http://localhost:5206/api/payroll` | HTTP 200, commission included | Salary ledger entry in ERP-5 |
| 8c | Salary ledger pair in ERP-5 | `GET http://localhost:5205/api/ledger?type=salary` | HTTP 200 | Debit salary_expense, credit cash |

**Status**: SKIP until ERP-6 merges commission and payroll APIs.

---

### Step 9 — Warranty RMA → Credit Note (CRM-2 → ERP-4 → ERP-5)

| # | Action | Endpoint | Expected | Checks |
|---|--------|----------|----------|--------|
| 9a | Customer raises warranty claim | `POST http://localhost:5102/api/warranties` | HTTP 201 | Claim `status = open` |
| 9b | RMA approved, outcome = credit_note | `PATCH http://localhost:5102/api/warranties/:id` | HTTP 200, `outcome = credit_note` | Triggers ERP-4 return |
| 9c | ERP-4 creates return, stock restocked | `GET http://localhost:5204/api/returns` | HTTP 200, return exists | ERP-1 stock increased |
| 9d | ERP-5 credit note created | `GET http://localhost:5205/api/creditnotes` | HTTP 200, `CN-xxxx` exists | Linked to original invoice |
| 9e | Duplicate serial + order returns 409 | `POST http://localhost:5205/api/creditnotes` same body | HTTP 409 | Idempotent guard works |
| 9f | Invoice balance reduced | `GET http://localhost:5205/api/invoices/:id` | HTTP 200 | Balance = `total - credit_note_amount` |
| 9g | Ledger balanced | `GET http://localhost:5205/api/ledger?type=credit_note` | HTTP 200 | Debit sales, credit receivables |

**Status**: SKIP until CRM-2, ERP-4 merge.

---

## Failure Behaviour Test

The script must **not** silently pass when a service is down:

```bash
# Stop ERP-5 and confirm step 0 fails loudly
# (kill the erp5 process, then re-run e2e)
npm run e2e
# Expected output: FAIL: admin login - connect ECONNREFUSED 127.0.0.1:5205
# Exit code: 1
```

This confirms `USE_MOCKS=false` is effective and the test is not masking failures.

---

## Weekly Checklist (run every Friday)

- [ ] `npm run db:setup` completes with no errors
- [ ] `npm run smoke` exits 0
- [ ] `npm run e2e` output recorded and posted in group chat
- [ ] All currently-merged teams show **PASS**
- [ ] Previously-SKIP steps filled in as new teams merge
- [ ] Any new **FAIL** result has a GitHub bug issue filed

---

## Related Files

| File | Purpose |
|------|---------|
| `scripts/e2e.js` | Automated Node.js e2e test runner |
| `scripts/db-setup.js` | Drops & recreates all 11 databases |
| `scripts/smoke.js` | PMO syntax and module-shell checks |
| `docs/erp5/README.md` | Full setup and onboarding guide |
| `.env.example` | Environment variable template |
