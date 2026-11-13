# Wireframe: Products Master (`/products`)
**Issue**: ERP1-R3 / ERP1-A2  
**Route**: `/erp1/products`  
**Roles**: `admin`, `warehouse`, `sales`

---

## 1. ASCII Wireframe Layout

```text
+----------------------------------------------------------------------------------------------------+
|  Products Catalog                                            [+ Add New Product] [Export CSV]     |
|  Product master catalog and active SKU definitions                                                |
+----------------------------------------------------------------------------------------------------+
|  [ Search by SKU or Name...               ]   Category: [ All Categories   v ]   Status: [ All v ]|
+----------------------------------------------------------------------------------------------------+
|  SKU        | Name                   | Category     | Brand   | Price (INR)  | Reorder | Actions  |
+-------------+------------------------+--------------+---------+--------------+---------+----------+
|  SKU-0001   | 55-inch 4K Smart TV    | TV           | Electro | ₹42,990.00   | 10      | [Edit]   |
|  SKU-0002   | 43-inch Full HD TV     | TV           | Electro | ₹24,990.00   | 10      | [Edit]   |
|  SKU-0003   | 65-inch OLED TV        | TV           | Electro | ₹94,990.00   | 10      | [Edit]   |
|  SKU-0004   | Soundbar 2.1           | Audio        | Electro | ₹8,990.00    | 10      | [Edit]   |
|  SKU-0102   | Mainboard              | Component    | Electro | ₹4,990.00    | 10      | [Edit]   |
+----------------------------------------------------------------------------------------------------+
|  Showing 1 - 20 of 20 products                                                                     |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
|  Add / Edit Product Card (Appears below or on button click)                                        |
+----------------------------------------------------------------------------------------------------+
|  Product Name: [ 55-inch 4K Smart TV                             ]                                 |
|  Category:     [ TV                       v ]   Brand:        [ Electro                          ] |
|  Base Price:   [ 42990.00                   ]   Tax Rate (%): [ 18.00                            ] |
|  Reorder Level:[ 10                         ]   Active:       [X] Active in catalog                |
|                                                                                                    |
|  [ Save Product ]   [ Cancel ]   [ Deactivate Product ]                                            |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Key Interactive Elements

1. **Search Bar**: Debounced live filter matching against product name and SKU.
2. **Category Filter**: Dropdown with options: All, `TV`, `Audio`, `Mobile accessory`, `Appliance`, `Component`.
3. **Export CSV Button**: Triggers clientside CSV generation and download containing full product catalog with tax calculations.
4. **Deactivate Button**: Toggles active state (`active: false`) without hard deleting records to maintain historical integrity.
5. **Money Formatting**: Prices formatted with `₹` and commas (e.g. `₹42,990.00`).
