# ERP-5 ER Diagram (3NF)

```mermaid
erDiagram
    USERS {
        text id PK
        text name
        text email
        text password_hash
        text role
        text employee_id
        boolean active
        timestamp created_at
    }
    INVOICES {
        varchar id PK
        varchar so_id
        varchar customer_id
        varchar customer_name
        varchar customer_gstin
        varchar sales_rep_id
        date invoice_date
        date due_date
        numeric subtotal
        numeric cgst
        numeric sgst
        numeric total
        varchar status
        timestamp created_at
    }
    INVOICE_ITEMS {
        varchar id PK
        varchar invoice_id FK
        varchar sku
        text description
        int quantity
        numeric unit_price
        numeric tax_rate
        timestamp created_at
    }
    PAYMENTS {
        text id PK
        text invoice_id FK
        numeric amount
        text method
        text reference
        date paid_on
        timestamp created_at
    }
    CREDIT_NOTES {
        text id PK
        varchar so_id
        text invoice_id FK
        text serial_number
        numeric amount
        timestamp created_at
    }
    LEDGER_ENTRIES {
        text id PK
        date entry_date
        text account
        numeric debit
        numeric credit
        text reference
        text description
        timestamp created_at
    }

    INVOICES ||--o{ INVOICE_ITEMS : contains
    INVOICES ||--o{ PAYMENTS : paid_by
    INVOICES ||--o{ CREDIT_NOTES : credited_by
```

## Data dictionary

| Table | Column | Type | Meaning |
|---|---|---|---|
| users | id | text | Primary key, e.g. USR-0001 |
| users | email | text | Unique login email |
| users | password_hash | text | Stored hash, never plain text |
| users | role | text | admin/sales/support/warehouse/finance/hr |
| invoices | id | varchar | Primary key, e.g. INV-0001 |
| invoices | so_id | varchar | Source sales order id (idempotency key) |
| invoices | customer_id, customer_name | varchar | Customer header and snapshot |
| invoices | customer_gstin | varchar | GST number for corporate/dealer |
| invoices | subtotal/cgst/sgst/total | numeric | Money in INR, 2 decimals; GST 18% split 9/9 |
| invoices | status | varchar | unpaid / partially_paid / paid |
| invoice_items | quantity/unit_price/tax_rate | number | Line-level quantity, rate, tax % |
| payments | id | text | Primary key, e.g. PAY-0001 |
| payments | method | text | upi / card / bank_transfer / cash |
| payments | paid_on | date | Date the money was received |
| credit_notes | id | text | Primary key, e.g. CN-0001 |
| credit_notes | serial_number | text | Returned product serial that triggered the credit |
| ledger_entries | account | text | sales / receivables / cash / purchases / salary_expense |
| ledger_entries | debit, credit | numeric | Balanced pair amounts for double entry |

## Seed verification checklist
- Customer, SKU, employee, dealer, and serial IDs follow the shared contract.
- `npm run reset` re-creates the databases and reloads schema plus seed data cleanly.
- Payment/credit-note/ledger tables are re-runnable with `CREATE TABLE IF NOT EXISTS`.
