import React from 'react';
import CustomerTimeline from './pages/CustomerTimeline';

export default {
  id: 'crm3',
  title: 'Customers',
  roles: ['admin', 'sales', 'support'],
  routes: [
    {
      path: '',
      label: 'Timeline',
      element: <CustomerTimeline />
    },
    {
      path: 'timeline',
      element: <CustomerTimeline />
    },
    {
      path: 'customers/:id/timeline',
      element: <CustomerTimeline />
    },
    {
      path: ':id/timeline',
      element: <CustomerTimeline />
    }
  ]
};
