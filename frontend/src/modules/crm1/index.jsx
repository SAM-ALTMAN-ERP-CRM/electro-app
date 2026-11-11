import React from 'react';
import LeadsPage from './pages/LeadsPage';
import PipelinePage from './pages/PipelinePage';
import QuotesListPage from './pages/QuotesListPage';
import QuoteBuilderPage from './pages/QuoteBuilderPage';
import DealersPage from './pages/DealersPage';
import ApprovalsPage from './pages/ApprovalsPage';

/**
 * CRM-1 Sales Pipeline module registration.
 *
 * Rules:
 * - Module accessible to roles: admin, sales
 * - All standard routes accessible to: admin, sales
 * - Manager approvals route restricted to: admin
 * - No internal BrowserRouter or navbar: handled by shared shell
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
      path: 'leads',
      label: 'Leads',
      element: <LeadsPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'pipeline',
      label: 'Pipeline',
      element: <PipelinePage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'quotes',
      label: 'Quotes',
      element: <QuotesListPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'quotes/new',
      label: 'New Quote',
      element: <QuoteBuilderPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'dealers',
      label: 'Dealers',
      element: <DealersPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'approvals',
      label: 'Approvals',
      element: <ApprovalsPage />,
      roles: ['admin']
    }
  ]
};
