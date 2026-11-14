import React from 'react';
import { Orders, NewOrder, OrderDetails } from './pages/PurchaseOrders';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import RequestsPage from './pages/RequestsPage';
import GoodsReceiptsPage from './pages/GoodsReceiptsPage';

/**
 * ERP-2 Purchasing and Suppliers module registration.
 *
 * Roles: admin, warehouse, finance
 * Subsystems:
 * - Suppliers (ERP2-A1, ERP2-A3): /suppliers, /suppliers/:id
 * - Purchase Requests (ERP2-B1, ERP2-B2): /requests
 * - Purchase Orders (ERP2-C1, ERP2-C2): /orders, /orders/new, /orders/:id
 * - Goods Receipts (ERP2-D1): /receipts
 */
export default {
  id: 'erp2',
  title: 'Purchasing',
  roles: ['admin', 'warehouse', 'finance'],
  routes: [
    {
      path: '',
      label: 'Suppliers',
      element: <SuppliersPage />
    },
    {
      path: 'suppliers',
      element: <SuppliersPage />
    },
    {
      path: 'suppliers/:id',
      element: <SupplierDetailPage />
    },
    {
      path: 'orders',
      label: 'Purchase orders',
      element: <Orders />
    },
    {
      path: 'orders/new',
      element: <NewOrder />
    },
    {
      path: 'orders/:id',
      element: <OrderDetails />
    },
    {
      path: 'requests',
      label: 'Purchase requests',
      element: <RequestsPage />
    },
    {
      path: 'receipts',
      label: 'Goods Receipts',
      element: <GoodsReceiptsPage />
    }
  ]
};
