# Test Cases for Team CRM3

## Build Issue: [CRM3-A3] Validation rules

| ID | Issue Key | Steps | Expected Result | Actual | Pass/Fail |
|----|-----------|-------|-----------------|--------|-----------|
| TC-CRM3-A3-001 | CRM3-A3 | Submit customer creation with a 9-digit or 11-digit phone number | API returns 400 with "Phone number must be exactly 10 digits"; form displays inline error; nothing saved | 400 returned, bad input rejected | PASS |
| TC-CRM3-A3-002 | CRM3-A3 | Submit customer creation with an invalid email address (e.g. `invalid-email`) | API returns 400 with "Invalid email format"; form displays inline message; nothing saved | 400 returned, bad input rejected | PASS |
| TC-CRM3-A3-003 | CRM3-A3 | Submit customer creation with an email already belonging to another customer | API returns 409 Conflict with "Customer with email already exists"; form displays inline conflict error; nothing saved | 409 returned, duplicate rejected | PASS |
| TC-CRM3-A3-004 | CRM3-A3 | Submit corporate or dealer customer with missing or invalid length GSTIN (not 15 characters) | API returns 400 with "GSTIN is required for corporate/dealer customer type"; nothing saved | 400 returned, bad input rejected | PASS |
| TC-CRM3-A3-005 | CRM3-A3 | Check "Same as billing address" checkbox in customer form | Shipping address textarea updates dynamically to match billing address and becomes disabled/synced | Form updates shipping address | PASS |
| TC-CRM3-A3-006 | CRM3-A3 | Submit valid retail customer with 10-digit phone, valid unique email, and no GSTIN | API returns 201 with created CUST-xxxx record; saved to directory | 201 returned with created customer | PASS |
