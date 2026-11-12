# Test Cases for Team CRM1

## Build Issue: [CRM1-C1] Quotes tables and API

| ID | Issue Key | Steps | Expected Result | Actual | Pass/Fail |
|----|-----------|-------|-----------------|--------|-----------|
| TC-CRM1-C1-001 | CRM1-C1 | Submit `POST /api/quotes` without `customer_id` | API returns HTTP 400 with "customer_id is required"; transaction not committed | 400 returned, bad input rejected | PASS |
| TC-CRM1-C1-002 | CRM1-C1 | Submit `POST /api/quotes` without `sales_rep_id` | API returns HTTP 400 with "sales_rep_id is required"; transaction not committed | 400 returned, bad input rejected | PASS |
| TC-CRM1-C1-003 | CRM1-C1 | Submit `POST /api/quotes` with empty `items: []` | API returns HTTP 400 with "items must be a non-empty array of quote items" | 400 returned, bad input rejected | PASS |
| TC-CRM1-C1-004 | CRM1-C1 | Submit `POST /api/quotes` with item `quantity: 0` or negative | API returns HTTP 400 with "quantity must be a positive integer" | 400 returned, bad input rejected | PASS |
| TC-CRM1-C1-005 | CRM1-C1 | Submit `POST /api/quotes` with invalid `discount_percent: 150` | API returns HTTP 400 with "discount_percent must be a number between 0 and 100" | 400 returned, bad input rejected | PASS |
| TC-CRM1-C1-006 | CRM1-C1 | Submit valid `POST /api/quotes` with 3 items (SKU-0001, SKU-0004, SKU-0006) and 10% discount | API returns HTTP 201 with generated `QUO-xxxx` id, 3 `QI-xxxx` item rows, subtotal, 10% discount, 18% GST and grand total accurately computed; `needs_approval` set to true | 201 returned with calculated totals and items | PASS |
| TC-CRM1-C1-007 | CRM1-C1 | Request `GET /api/quotes/QUO-0001` for existing quote | API returns HTTP 200 with quote metadata, items list, subtotal, discount, GST 18%, and grand total | 200 returned with complete quote details | PASS |
| TC-CRM1-C1-008 | CRM1-C1 | Request `GET /api/quotes/QUO-9999` for non-existent quote | API returns HTTP 404 with error message "Quote with ID 'QUO-9999' not found" | 404 returned | PASS |
| TC-CRM1-C1-009 | CRM1-C1 | Request `GET /api/quotes?status=accepted` | API returns HTTP 200 with list of only quotes whose status is `accepted` | 200 returned with filtered list | PASS |
| TC-CRM1-C1-010 | CRM1-C1 | Request `GET /api/quotes?opportunity_id=OPP-0001` | API returns HTTP 200 with quotes belonging to opportunity `OPP-0001` | 200 returned with filtered list | PASS |
| TC-CRM1-C1-011 | CRM1-C1 | Request `GET /api/quotes?dealer_id=DLR-0001` | API returns HTTP 200 with quotes associated with dealer `DLR-0001` | 200 returned with filtered list | PASS |

## Build Issue: [CRM1-C3] Discount rule, quote status and order handoff

| ID | Issue Key | Steps | Expected Result | Actual | Pass/Fail |
|----|-----------|-------|-----------------|--------|-----------|
| TC-CRM1-C3-001 | CRM1-C3 | Submit `PATCH /api/quotes/:id/status` moving `draft` quote with discount > 5% to `sent` without approval | HTTP 400 with "Quote requires approval before it can be sent (discount exceeds 5%)" | 400 returned, unapproved high discount blocked | PASS |
| TC-CRM1-C3-002 | CRM1-C3 | Submit `PATCH /api/quotes/:id/status` moving `draft` quote with discount <= 5% to `sent` | HTTP 200 with updated status `sent` | 200 returned, status updated | PASS |
| TC-CRM1-C3-003 | CRM1-C3 | Submit `PATCH /api/quotes/:id/status` skipping directly from `draft` to `accepted` | HTTP 400 with "Quotes in 'draft' status must be moved to 'sent' before being accepted or rejected" | 400 returned, illegal transition blocked | PASS |
| TC-CRM1-C3-004 | CRM1-C3 | Submit `PATCH /api/quotes/:id/status` moving `sent` quote to `accepted` | HTTP 200 with status `accepted`, calls ERP-4 order handoff & CRM-3 timeline event | 200 returned, side effects executed | PASS |
| TC-CRM1-C3-005 | CRM1-C3 | Submit `PATCH /api/quotes/:id/status` moving `sent` quote to `rejected` with `rejection_reason` | HTTP 200 with status `rejected` and recorded `rejection_reason` | 200 returned, rejection recorded | PASS |
| TC-CRM1-C3-006 | CRM1-C3 | Submit `PATCH /api/quotes/:id/status` on quote that is already `accepted` or `rejected` | HTTP 400 with "Cannot change status of a quote that is already '...'" | 400 returned, terminal state protected | PASS |
