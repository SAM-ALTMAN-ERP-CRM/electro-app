import React from 'react';
import CustomerImportPage from './pages/CustomerImportPage';

export default {
  id: 'crm3',
  title: 'Customers',
  roles: ['admin', 'sales', 'support'],
  routes: [
    {
      path: 'import',
      label: 'Import CSV',
      element: <CustomerImportPage />
    },
    {
      path: '',
      element: <CustomerImportPage />
    }
  ]
};
