import React from 'react';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import ForecastPage from './pages/ForecastPage';
import PortalPage from './pages/PortalPage';

/**
 * CRM-5 Portal and Dashboards module registration.
 *
 * Rules:
 * - Module accessible to roles: admin, sales, support, warehouse, finance, hr
 * - Route '' renders the executive Dashboard for default module access (/crm5)
 * - Route 'dashboard' renders the executive Dashboard with sidebar menu entry (/crm5/dashboard)
 * - Route 'portal' renders the Customer Portal entry screen (/crm5/portal)
 * - Route 'portal/home' renders the Customer Portal overview screen (/crm5/portal/home)
 * - Route 'reports' renders the role-based Reports screen (/crm5/reports)
 * - Route 'forecast' renders the Forecast and Target tracking screen (/crm5/forecast)
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
    },
    {
      path: 'portal',
      label: 'Customer Portal',
      element: <PortalPage />,
      roles: ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr']
    },
    {
      path: 'portal/home',
      element: <PortalPage />,
      roles: ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr']
    },
    {
      path: 'reports',
      label: 'Reports',
      element: <ReportsPage />,
      roles: ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr']
    },
    {
      path: 'forecast',
      label: 'Forecast',
      element: <ForecastPage />,
      roles: ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr']
    }
  ]
};
