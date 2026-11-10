import React from 'react';
import QuotesListPage from './pages/QuotesListPage';
import QuoteBuilderPage from './pages/QuoteBuilderPage';

/**
 * CRM-1 Sales Pipeline module registration.
 * Registered routes for Issue [CRM1-C2]:
 *   - /crm1/quotes: Quotations List page
 *   - /crm1/quotes/new: Quote Builder screen
 */
export default {
  id: 'crm1',
  title: 'Sales',
  roles: ['admin', 'sales'],
  routes: [
    {
      path: '',
      element: <QuotesListPage />
    },
    {
      path: 'quotes',
      label: 'Quotes',
      element: <QuotesListPage />
    },
    {
      path: 'quotes/new',
      label: 'New Quote',
      element: <QuoteBuilderPage />
    }
  ]
};
