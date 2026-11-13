# Team ERP-1: Entity-Relationship Diagram & Data Dictionary

This document details the database architecture for **Team ERP-1 (Inventory & Warehouses)** in PostgreSQL (`erp1_db`), including the 3NF Entity-Relationship Diagram, data dictionary, normalization verification, and Section 5 shared seed contract compliance.

---

## 1. Entity-Relationship Diagram (3NF)

```mermaid
erDiagram
    PRODUCTS ||--o{ STOCK : "stored in"
    WAREHOUSES ||--o{ STOCK : "holds"
    PRODUCTS ||--o{ STOCK_MOVEMENTS : "audits"
    WAREHOUSES ||--o{ STOCK_MOVEMENTS : "tracks location"
    PRODUCTS ||--o{ BATCHES : "produced in"
    BATCHES ||--o{ SERIALS : "contains"
    PRODUCTS ||--o{ SERIALS : "identified by"
    WAREHOUSES ||--o{ SERIALS : "stored at"
    PRODUCTS ||--o{ ALERTS_LOG : "monitored by"

    PRODUCTS {
        varchar(20) id PK "SKU-xxxx"
        varchar(255) name UK "Product Name"
        varchar(50) category "TV, Audio, Mobile accessory, Appliance, Component"
        varchar(100) brand "Brand name (Default: Electro)"
        numeric(12_2) price "Base price (> 0)"
        numeric(5_2) tax_rate "GST rate (Default: 18.00)"
        int reorder_level "Reorder threshold (Default: 10)"
        boolean active "Active status (Default: TRUE)"
        timestamptz created_at "Creation timestamp"
    }

    WAREHOUSES {
        varchar(20) id PK "WH-01, WH-02, WH-03"
        varchar(100) name "Warehouse facility name"
        varchar(100) city "Location city"
    }

    STOCK {
        varchar(20) sku PK_FK "References PRODUCTS(id)"
        varchar(20) warehouse_id PK_FK "References WAREHOUSES(id)"
        int quantity "Available on-hand units (>= 0)"
    }

    STOCK_MOVEMENTS {
        varchar(30) id PK "MOV-xxxx"
        varchar(20) sku FK "Product SKU"
        varchar(20) warehouse_id FK "Warehouse facility"
        int delta "Quantity change (+/-)"
        text reason "Audit reason or reference ID"
        timestamptz created_at "Movement timestamp"
    }

    BATCHES {
        varchar(50) batch_no PK "Batch identifier"
        varchar(20) sku FK "References PRODUCTS(id)"
        int quantity "Batch production quantity"
        date manufactured_on "Date of manufacturing"
    }

    SERIALS {
        varchar(50) serial_number PK "Unique serial code"
        varchar(20) sku FK "References PRODUCTS(id)"
        varchar(50) batch_no FK "References BATCHES(batch_no)"
        varchar(20) warehouse_id FK "References WAREHOUSES(id)"
        varchar(20) status "in_stock, reserved, sold, returned"
        timestamptz created_at "Tracking timestamp"
    }

    ALERTS_LOG {
        varchar(20) id PK "ALT-xxxx"
        varchar(20) sku FK "References PRODUCTS(id)"
        text message "Alert description"
        boolean acknowledged "Acknowledged status (Default: FALSE)"
        timestamptz created_at "Alert timestamp"
    }
```

---

## 2. Comprehensive Data Dictionary

### 2.1 Table: `products`
The core catalog master for finished goods and raw components.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(20)` | `PRIMARY KEY` | — | Unique SKU code (e.g. `SKU-0001` to `SKU-0015`, `SKU-0101` to `SKU-0105`) |
| `name` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | — | Product name (e.g. '55-inch 4K Smart TV') |
| `category` | `VARCHAR(50)` | `NOT NULL` | — | Category: `TV`, `Audio`, `Mobile accessory`, `Appliance`, `Component` |
| `brand` | `VARCHAR(100)` | `NOT NULL` | `'Electro'` | Brand name |
| `price` | `NUMERIC(12,2)` | `NOT NULL, CHECK (price > 0)` | — | Selling or procurement unit price in INR |
| `tax_rate` | `NUMERIC(5,2)` | `NOT NULL` | `18.00` | Applicable GST percentage rate |
| `reorder_level`| `INT` | `NOT NULL` | `10` | Low-stock threshold triggering automated alerts |
| `active` | `BOOLEAN` | `NOT NULL` | `TRUE` | Whether SKU is active for sales and manufacturing |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `CURRENT_TIMESTAMP` | Record creation timestamp |

### 2.2 Table: `warehouses`
Physical fulfillment and storage facilities.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(20)` | `PRIMARY KEY` | — | Facility ID (`WH-01` Mumbai, `WH-02` Delhi, `WH-03` Bengaluru) |
| `name` | `VARCHAR(100)` | `NOT NULL` | — | Facility name |
| `city` | `VARCHAR(100)` | `NOT NULL` | — | City of warehouse operation |

### 2.3 Table: `stock`
Current quantity of each SKU allocated at each warehouse.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `sku` | `VARCHAR(20)` | `PK, FK -> products(id)` | — | Product SKU reference |
| `warehouse_id`| `VARCHAR(20)` | `PK, FK -> warehouses(id)` | — | Warehouse location reference |
| `quantity` | `INT` | `NOT NULL, CHECK (quantity >= 0)` | `0` | Physical stock count |

### 2.4 Table: `stock_movements`
Immutable audit log of all stock adjustments and transfers.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(30)` | `PRIMARY KEY` | Sequence | Sequential movement ID (`MOV-xxxx`) |
| `sku` | `VARCHAR(20)` | `NOT NULL` | — | Target product SKU |
| `warehouse_id`| `VARCHAR(20)` | `NOT NULL` | — | Target warehouse facility |
| `delta` | `INT` | `NOT NULL` | — | Stock delta (+/- quantity) |
| `reason` | `TEXT` | `NULLABLE` | — | Adjustment reason or transaction ID |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `CURRENT_TIMESTAMP` | Timestamp of movement execution |

### 2.5 Table: `batches`
Manufacturing batch lots for traceable production.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `batch_no` | `VARCHAR(50)` | `PRIMARY KEY` | — | Manufacturing lot identifier (e.g. `BATCH-2611-01`) |
| `sku` | `VARCHAR(20)` | `NOT NULL, FK -> products(id)` | — | Manufactured product SKU |
| `quantity` | `INT` | `NOT NULL` | — | Total lot production count |
| `manufactured_on`| `DATE` | `NOT NULL` | — | Date of manufacturing |

### 2.6 Table: `serials`
Individual serial numbers for serialized electronics and warranty tracking.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `serial_number` | `VARCHAR(50)` | `PRIMARY KEY` | — | Unique serial code (e.g. `TV55-2611-0001`) |
| `sku` | `VARCHAR(20)` | `NOT NULL, FK -> products(id)` | — | Associated product SKU |
| `batch_no` | `VARCHAR(50)` | `NULLABLE, FK -> batches(batch_no)` | — | Production batch reference |
| `warehouse_id` | `VARCHAR(20)` | `NULLABLE, FK -> warehouses(id)` | — | Current warehouse location |
| `status` | `VARCHAR(20)` | `NOT NULL, CHECK (status IN (...))` | `'in_stock'` | Status: `in_stock`, `reserved`, `sold`, `returned` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `CURRENT_TIMESTAMP` | Registration timestamp |

### 2.7 Table: `alerts_log`
Persistent low-stock alert records with acknowledgement states.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `VARCHAR(20)` | `PRIMARY KEY` | Sequence | Sequential alert ID (`ALT-xxxx`) |
| `sku` | `VARCHAR(20)` | `NOT NULL, FK -> products(id)` | — | Low-stock product SKU |
| `message` | `TEXT` | `NOT NULL` | — | Detailed alert summary message |
| `acknowledged`| `BOOLEAN` | `NOT NULL` | `FALSE` | Archive state (`TRUE` when acknowledged) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `CURRENT_TIMESTAMP` | Detection timestamp |

---

## 3. Third Normal Form (3NF) Justification

1. **First Normal Form (1NF)**:
   - All columns hold atomic scalar values (no repeating groups, comma-separated lists, or nested records).
   - Every table possesses an explicit primary key (`id`, `(sku, warehouse_id)`, `batch_no`, `serial_number`).
2. **Second Normal Form (2NF)**:
   - In composite-key table `stock (sku, warehouse_id)`, the non-key attribute `quantity` is fully functionally dependent on the entire composite key `(sku, warehouse_id)`. Quantity represents the count of a specific SKU at a specific warehouse.
3. **Third Normal Form (3NF)**:
   - No transitive dependencies exist. In `products`, attributes `(category, brand, price, tax_rate)` depend only on `id`.
   - Warehouse location details (`city`) are stored in `warehouses` rather than repeated in `stock` or `serials`.

---

## 4. Section 5 Shared Seed Contract Verification

- **Products**: Strictly seeds all 15 products `SKU-0001` through `SKU-0015` and 5 components `SKU-0101` through `SKU-0105` with exact catalog pricing and categories.
- **Warehouses**: Pinned to `WH-01` (Mumbai), `WH-02` (Delhi), and `WH-03` (Bengaluru).
- **Demo Stock Rule**:
  - `SKU-0003` has total warehouse stock of `3` units (WH-01: 2, WH-02: 1, WH-03: 0), correctly triggering low-stock threshold `< 10`.
  - `SKU-0102` has total warehouse stock of `4` units (WH-01: 2, WH-02: 2, WH-03: 0), correctly triggering low-stock threshold `< 10`.
  - All other items are stocked between 25 and 120 units across facilities.
- **Serials**: Exact 30 serials `TV55-2611-0001` to `TV55-2611-0030` seeded for `SKU-0001`:
  - `0001` to `0005`: marked `sold` (linked to `CUST-0001` through `CUST-0005` in ERP-4/ERP-5 order flows).
  - `0006` to `0030`: marked `in_stock`.
- **Idempotency**: All `INSERT` statements utilize `ON CONFLICT (...) DO UPDATE` or `ON CONFLICT DO NOTHING` ensuring clean re-execution during `npm run reset`.
