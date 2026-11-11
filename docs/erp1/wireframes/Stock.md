# Wireframe: Warehouse Stock (`/stock`)
**Issue**: ERP1-R3 / ERP1-B2  
**Route**: `/erp1/stock`  
**Roles**: `admin`, `warehouse`, `sales`

---

## 1. ASCII Wireframe Layout

```text
+----------------------------------------------------------------------------------------------------+
|  Warehouse Stock Overview                                         [Adjust Stock] [Transfer Stock]  |
|  Inventory distribution across regional distribution centers                                       |
+----------------------------------------------------------------------------------------------------+
|  [ Filter by SKU or Product Name...                                      ]   [ Refresh Stock ]    |
+----------------------------------------------------------------------------------------------------+
|  SKU        | Product Name           | WH-01 (Mumbai) | WH-02 (Delhi) | WH-03 (BLR)   | Total Stock |
+-------------+------------------------+----------------+---------------+---------------+-------------+
|  SKU-0001   | 55-inch 4K Smart TV    | 35 units       | 25 units      | 15 units      | 75 units    |
|  SKU-0002   | 43-inch Full HD TV     | 20 units       | 20 units      | 10 units      | 50 units    |
|  SKU-0003   | 65-inch OLED TV        | 2 units        | 1 unit        | 0 units       | 3 units [!] |
|  SKU-0102   | Mainboard              | 2 units        | 2 units       | 0 units       | 4 units [!] |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
|  Adjust Stock Form Card                                                                            |
+----------------------------------------------------------------------------------------------------+
|  Target Product: [ SKU-0001 - 55-inch 4K Smart TV       v ]                                        |
|  Warehouse:      [ WH-01 - Mumbai Central Warehouse      v ]                                        |
|  Adjustment Delta: [ +10                        ] (Enter positive or negative integer)             |
|  Reason / Notes:   [ Cycle count adjustment                                                      ] |
|                                                                                                    |
|  [ Submit Stock Adjustment ]   [ Cancel ]                                                          |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
|  Inter-Warehouse Transfer Form Card                                                                |
+----------------------------------------------------------------------------------------------------+
|  Product SKU:    [ SKU-0001 - 55-inch 4K Smart TV       v ]                                        |
|  Source (From):  [ WH-01 - Mumbai Central Warehouse      v ]                                        |
|  Target (To):    [ WH-02 - Delhi Regional Warehouse     v ]                                        |
|  Quantity:       [ 5                            ]                                                  |
|                                                                                                    |
|  [ Execute Inter-Warehouse Transfer ]   [ Cancel ]                                                 |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Key Interactive Elements

1. **Warehouse Matrix Grid**: Dynamic columns representing each warehouse facility (`WH-01`, `WH-02`, `WH-03`) with a calculated row total.
2. **Low Stock Indicators**: Amber/red pill badges for items falling below reorder levels (`SKU-0003` with 3 units, `SKU-0102` with 4 units).
3. **Stock Adjustment Action**: Modifies stock count with audit reason and logs to `stock_movements`.
4. **Atomic Transfer**: Prevents transfer if source warehouse stock < requested quantity; executes both warehouse updates in a single transaction.
