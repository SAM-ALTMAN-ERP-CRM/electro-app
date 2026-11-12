import React from 'react';
import OrdersListPage from './pages/OrdersListPage';
import OrderDetailPage from './pages/OrderDetailPage';

export default {
  id: 'erp4',
  title: 'Orders and Dispatch',
  roles: ['admin', 'sales', 'warehouse'],
  routes: [
    {
      path: '',
      label: 'Orders',
      element: <OrdersListPage />
    },
    {
      path: 'orders',
      element: <OrdersListPage />
    },
    {
      path: 'orders/:id',
      element: <OrderDetailPage />
    }
  ]
};
