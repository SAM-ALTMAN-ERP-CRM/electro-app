import React from 'react';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';

export default {
  id: 'crm3',
  title: 'Customers',
  roles: ['admin', 'sales', 'support'],
  routes: [
    {
      path: '',
      label: 'Customers',
      element: <CustomersPage />
    },
    {
      path: 'customers',
      element: <CustomersPage />
    },
    {
      path: 'customers/:id',
      element: <CustomerDetailPage />
    },
    {
      path: ':id',
      element: <CustomerDetailPage />
    }
  ]
};
