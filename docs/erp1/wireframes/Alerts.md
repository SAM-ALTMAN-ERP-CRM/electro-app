# Wireframe: Low-Stock Alerts & Procurement Trigger (`/alerts`)
**Issue**: ERP1-R3 / ERP1-D2 & D3  
**Route**: `/erp1/alerts`  
**Roles**: `admin`, `warehouse`, `sales`

---

## 1. ASCII Wireframe Layout

```text
+----------------------------------------------------------------------------------------------------+
|  Low-Stock Inventory Alerts [ 2 Open Alerts ]                                      [⚡ Run Scan]   |
|  Real-time stock monitoring, shortfall alerts, and automated ERP-2 purchase requests               |
+----------------------------------------------------------------------------------------------------+
|  +--------------------+    +--------------------+    +--------------------+                        |
|  | TOTAL SKUS         |    | LOW-STOCK ITEMS    |    | OUT OF STOCK       |                        |
|  | 20                 |    | 2                  |    | 0                  |                        |
|  | Active in catalog  |    | Stock <= Reorder   |    | 0 units available  |                        |
|  +--------------------+    +--------------------+    +--------------------+                        |
+----------------------------------------------------------------------------------------------------+
|  [!] Warning: 2 product(s) have reached or fallen below reorder levels! Action required.          |
+----------------------------------------------------------------------------------------------------+
|  Alert ID | SKU      | Product Name        | Stock    | Reorder | Shortfall | Suggested | Actions  |
+-----------+----------+---------------------+----------+---------+-----------+-----------+----------+
|  ALT-0001 | SKU-0003 | 65-inch OLED TV     | 3 units  | 10 unit | -7 units  | 17 units  | [Reorder]|
|           |          |                     |          |         |           |           | [Ack]    |
|  ALT-0002 | SKU-0102 | Mainboard           | 4 units  | 10 unit | -6 units  | 16 units  | [Reorder]|
|           |          |                     |          |         |           |           | [Ack]    |
+-----------+----------+---------------------+----------+---------+-----------+-----------+----------+

+----------------------------------------------------------------------------------------------------+
|  Feedback banner: Purchase request PR-0001 created in ERP-2 for SKU-0003 (Order Qty: 17 units)     |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Key Interactive Elements

1. **KPI Metric Cards**: 3 summary analytics at top of dashboard (Total SKUs, Low-Stock Count, Out-of-Stock Count).
2. **Dynamic Red Alert Banner**: Prominently highlights critical shortfall items when `alerts.length > 0`.
3. **Run Scan Button**: Executes deduplicated stock scan (`POST /api/alerts/scan`) to evaluate live inventory across warehouses without generating duplicate rows.
4. **Suggested Order Qty Calculation**: Automatically computes $\max(1, (\text{reorder\_level} \times 2) - \text{current\_stock})$.
5. **Reorder Action Button**: Directly calls ERP-2 `POST /api/purchase-requests` via backend `callService()`, generating a purchase request with no manual entry required.
6. **Acknowledge Action Button**: Sets `acknowledged = true` and archives the alert from the open list view.
