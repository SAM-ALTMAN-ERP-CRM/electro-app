# Wireframe: Customer Bulk CSV Import Page
**Route**: `/crm3/import`  
**Issues**: CRM3-D3  
**Roles**: `admin`, `sales`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    CUSTOMERS (CRM-3)             │  Customer CSV Import          [CRM-3]         │
│    > Customers                   │  Bulk upload customer master records via CSV  │
│    > Segments                    │                                               │
│    > Duplicates                  │  ┌── Upload CSV File ───────────────────────┐ │
│    > Import            ←active   │  │  [ Choose File ] or Drag & drop .csv here│ │
│                                  │  │  Required columns: name, type, email,    │ │
│                                  │  │  phone, gstin, billing_addr, city        │ │
│                                  │  │  [ Load Sample 10-Row CSV ]              │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  ┌── Parsed Preview (10 rows) ──────────────┐ │
│                                  │  │ Name         Type   Email    Phone Status│ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │Rohit Sharma  retail rohit@.. 98201 [Valid]│ │
│                                  │  │Alpha Tech    corp   proc@... 98201 [Valid]│ │
│                                  │  │Invalid Phone retail bad@...  12345 [Error]│ │
│                                  │  │Corp Missing  corp   miss@... 98201 [Error]│ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  [ 🚀 Import Valid Customers ]                │
│                                  │                                               │
│                                  │  ┌── Import Results ────────────────────────┐ │
│                                  │  │ ✓ 8 Customers Imported Successfully      │ │
│                                  │  │ ⚠ 2 Rows Skipped (Validation Errors):    │ │
│                                  │  │ • Row 3: Phone number must be 10 digits  │ │
│                                  │  │ • Row 6: GSTIN required for corporate    │ │
│                                  │  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header & Context**:
   - Title: `Customer CSV Import` with badge `<span className="badge badge-blue">CRM-3</span>`.
   - Subtitle: "Bulk upload new customer master records from a standard CSV spreadsheet."
2. **File Upload Card**:
   - Standard browser file input `<input type="file" accept=".csv" />` and drag-and-drop zone.
   - Built-in "Load Sample 10-Row Acceptance CSV" helper button for testing with 8 valid rows and 2 invalid rows.
   - Column format guidelines (`name,type,email,phone,gstin,billing_address,shipping_address,city`).
3. **Browser Native CSV Parser & Preview**:
   - Pure client-side parsing without heavy third-party libraries (splits lines and handles commas/quotes).
   - Instant preview table displaying parsed rows, detected types, and format preview.
4. **Import Action & Summary Card**:
   - "Import Valid Customers" button posts `{ customers: [...] }` to `POST /api/customers/import`.
   - The backend inserts valid rows, skips invalid rows, and returns `{ inserted, skipped, errors }`.
   - Displays a success/warning result box listing inserted count, skipped count, and exact reasons for skipped rows (e.g., duplicate email, phone length &ne; 10, GSTIN missing for corporate).
