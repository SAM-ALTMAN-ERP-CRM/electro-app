import React from 'react';
import WorkOrdersPage from './pages/WorkOrdersPage';

/**
 * ERP-3 Production and Quality module registration.
 *
 * Rules:
 * - Module id: erp3
 * - Title: Production
 * - Roles: admin, warehouse
 * - Routes:
 *   - /erp3 (Default view: Work Orders)
 *   - /erp3/work-orders (Work Orders Tracker screen)
 * - No internal BrowserRouter or navbar: handled by shared shell
 */
export default {
  id: 'erp3',
  title: 'Production',
  roles: ['admin', 'warehouse'],
  routes: [
    {
      path: '',
      element: <WorkOrdersPage />,
      roles: ['admin', 'warehouse']
    },
    {
      path: 'work-orders',
      label: 'Work Orders',
      element: <WorkOrdersPage />,
      roles: ['admin', 'warehouse']
    }
  ]
};
