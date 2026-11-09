import React from 'react';
import CustomersPage from './pages/CustomersPage';

export default {
  id: 'crm3',
  title: 'Customers',
  roles: ['admin', 'sales', 'support'],
  routes: [
    {
      path: '',
      label: 'Customers',
      element: <CustomersPage />
    }
  ]
};
