import React from 'react';
import DuplicatesPage from './pages/DuplicatesPage';

export default {
  id: 'crm3',
  title: 'Customers',
  roles: ['admin', 'sales', 'support'],
  routes: [
    {
      path: 'duplicates',
      label: 'Duplicates',
      element: <DuplicatesPage />
    },
    {
      path: '',
      element: <DuplicatesPage />
    }
  ]
};
