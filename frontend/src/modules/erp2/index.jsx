import React from 'react';
import { Orders, NewOrder, OrderDetails } from './pages/PurchaseOrders';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import GoodsReceiptsPage from './pages/GoodsReceiptsPage';
import RequestsPage from './pages/RequestsPage';

/**
 * ERP-2 Purchasing and Suppliers module registration.
 *
 * Rules:
 * - Module accessible to roles: admin, warehouse, finance
 * - Pages:
 *   - /suppliers: Suppliers table, search, add/edit form
 *   - /suppliers/:id: Detailed supplier profile and performance ratings
 *   - /receipts: Goods receipts creation and receipt history
 * - No internal BrowserRouter or navbar: handled by shared shell
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
      path: 'receipts',
      label: 'Goods Receipts',
      element: <GoodsReceiptsPage />
    { path: 'orders', label: 'Purchase orders', element: <Orders /> },
    { path: 'orders/new', element: <NewOrder /> },
    { path: 'orders/:id', element: <OrderDetails /> },
    {
      path: 'requests',
      label: 'Purchase requests',
      element: <RequestsPage />
    }
  ]
};

