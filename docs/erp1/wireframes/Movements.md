# Wireframe: Stock Movements Audit Trail (`/movements`)
**Issue**: ERP1-R3 / ERP1-B2  
**Route**: `/erp1/movements`  
**Roles**: `admin`, `warehouse`

---

## 1. ASCII Wireframe Layout

```text
+----------------------------------------------------------------------------------------------------+
|  Stock Movements Log                                                         [ Export CSV Audit ]  |
|  Immutable historical audit log of all stock adjustments, receipts, and transfers                  |
+----------------------------------------------------------------------------------------------------+
|  [ Filter by Movement ID or SKU...             ]   Warehouse: [ All Facilities v ]   [ Reset ]     |
+----------------------------------------------------------------------------------------------------+
|  Movement ID | SKU        | Warehouse | Delta    | Reason / Reference          | Timestamp     |
+--------------+------------+-----------+----------+-----------------------------+---------------+
|  MOV-0012    | SKU-0001   | WH-02     | +5 units | Transfer from WH-01         | 2 mins ago    |
|  MOV-0011    | SKU-0001   | WH-01     | -5 units | Transfer to WH-02           | 2 mins ago    |
|  MOV-0010    | SKU-0002   | WH-01     | +10 unit | Goods Receipt ERP2-GR-004   | 1 hour ago    |
|  MOV-0009    | SKU-0001   | WH-01     | -1 unit  | Dispatch for SO-0001        | 3 hours ago   |
|  MOV-0008    | SKU-0003   | WH-01     | -2 units | Work Order Issue ERP3-WO-01 | 5 hours ago   |
+----------------------------------------------------------------------------------------------------+
|  Showing latest 25 movements (ordered newest first)                                                |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Key Interactive Elements

1. **Newest-First Chronology**: Sorted descending by timestamp to provide immediate visibility into recent stock activity.
2. **Delta Colour Formatting**: Positive additions formatted in green badge (`+5 units`); negative deductions formatted in red badge (`-5 units`).
3. **Traceable Audit References**: Cross-references external documents such as Sales Order dispatches (`SO-xxxx`), Goods Receipts (`GR-xxxx`), and Production Work Orders (`WO-xxxx`).
