import React from 'react';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';

export default {
  id: 'erp5',
  title: 'Finance and Users',
  roles: ['admin', 'finance'],
  routes: [
    {
      path: 'invoices',
      label: 'Invoices',
      element: <InvoicesPage />
    },
    {
      path: 'invoices/:id',
      element: <InvoiceDetailPage />
    }
  ]
};
