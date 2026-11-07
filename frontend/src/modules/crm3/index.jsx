import React from 'react';
import CustomerTimeline from './pages/CustomerTimeline';

export default {
  id: 'crm3',
  title: 'Customers',
  roles: ['admin', 'sales', 'support'],
  routes: [
    {
      path: 'customers/:id/timeline',
      label: 'Customer Timeline',
      element: <CustomerTimeline />
    },
    {
      path: 'customers/:id',
      element: <CustomerTimeline />
    },
    {
      path: 'timeline',
      element: <CustomerTimeline defaultCustomerId="CUST-0001" />
    },
    {
      path: '',
      element: <CustomerTimeline defaultCustomerId="CUST-0001" />
    }
  ]
};
