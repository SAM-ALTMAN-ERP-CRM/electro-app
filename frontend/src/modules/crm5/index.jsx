import React from 'react';
import DashboardPage from './pages/DashboardPage';

/**
 * CRM-5 Portal and Dashboards module registration.
 *
 * Rules:
 * - Module accessible to roles: admin, sales, support, warehouse, finance, hr
 * - Route '' renders the executive Dashboard for default module access (/crm5)
 * - Route 'dashboard' renders the executive Dashboard with sidebar menu entry (/crm5/dashboard)
 */
export default {
  id: 'crm5',
  title: 'Portal and Dashboards',
  roles: ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr'],
  routes: [
    {
      path: '',
      element: <DashboardPage />,
      roles: ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr']
    },
    {
      path: 'dashboard',
      label: 'Dashboard',
      element: <DashboardPage />,
      roles: ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr']
    }
  ]
};
