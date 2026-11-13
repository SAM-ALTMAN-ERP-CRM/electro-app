import React from 'react';
import OrdersListPage from './pages/OrdersListPage';
import OrderDetailPage from './pages/OrderDetailPage';
import DispatchPage from './pages/DispatchPage';
import DispatchNotePage from './pages/DispatchNotePage';

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
    },
    {
      path: 'dispatch',
      label: 'Dispatch',
      element: <DispatchPage />
    },
    {
      path: 'dispatch/:id/note',
      element: <DispatchNotePage />
    }
  ]
};
