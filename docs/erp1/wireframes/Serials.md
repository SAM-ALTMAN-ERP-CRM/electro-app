# Wireframe: Serial Numbers & Batches (`/serials`)
**Issue**: ERP1-R3 / ERP1-C2  
**Route**: `/erp1/serials`  
**Roles**: `admin`, `warehouse`, `sales`

---

## 1. ASCII Wireframe Layout

```text
+----------------------------------------------------------------------------------------------------+
|  Serial & Batch Management                                            [+ Bulk Generate Serials]   |
|  Unit-level serialization, batch registration, and lifecycle status tracking                       |
+----------------------------------------------------------------------------------------------------+
|  [ Search by Serial Number (e.g. TV55-2611-0001)...      ]  Status: [ in_stock v ]  SKU: [ All v ] |
+----------------------------------------------------------------------------------------------------+
|  Serial Number    | SKU        | Batch No       | Warehouse | Status       | Actions / Moves       |
+-------------------+------------+----------------+-----------+--------------+-----------------------+
|  TV55-2611-0001   | SKU-0001   | BATCH-2611-01  | WH-01     | [ sold     ] | [View Order SO-0001]  |
|  TV55-2611-0002   | SKU-0001   | BATCH-2611-01  | WH-01     | [ sold     ] | [View Order SO-0002]  |
|  TV55-2611-0006   | SKU-0001   | BATCH-2611-01  | WH-01     | [ in_stock ] | [Reserve for Order]   |
|  TV55-2611-0007   | SKU-0001   | BATCH-2611-01  | WH-01     | [ reserved ] | [Mark Dispatched]     |
|  TV55-2611-0011   | SKU-0001   | BATCH-2611-01  | WH-02     | [ in_stock ] | [Reserve for Order]   |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
|  Bulk Generate Serials Modal / Card                                                                |
+----------------------------------------------------------------------------------------------------+
|  Product SKU:    [ SKU-0001 - 55-inch 4K Smart TV                   v ]                            |
|  Batch Lot No:   [ BATCH-2611-02                                      ]                            |
|  Quantity Count: [ 10                         ]                                                    |
|  Serial Prefix:  [ TV55-2611-                 ]  (Preview: TV55-2611-0031 to TV55-2611-0040)       |
|  Warehouse:      [ WH-01 - Mumbai Central Warehouse                 v ]                            |
|                                                                                                    |
|  [ Generate 10 Serials ]   [ Cancel ]                                                             |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Key Interactive Elements

1. **Lifecycle Transition Buttons**: Enforces state machine progression (`in_stock` → `reserved` → `sold` → `returned` → `in_stock`).
2. **Status Filter Dropdown**: Allows filtering specifically for available inventory (`in_stock`) or units in field (`sold`).
3. **Bulk Serial Generation**: Generates padded sequential codes given a prefix and count.
