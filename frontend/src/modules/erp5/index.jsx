import React from 'react';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import CreditNotesPage from './pages/CreditNotesPage';

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
    },
    {
      path: 'credit-notes',
      label: 'Credit Notes',
      element: <CreditNotesPage />
    }
  ]
};
