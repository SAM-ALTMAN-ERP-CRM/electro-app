import React from 'react';
import OverviewPage from './pages/OverviewPage';
import BOMsPage from './pages/BOMsPage';
import BOMNewPage from './pages/BOMNewPage';
import BOMDetailPage from './pages/BOMDetailPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import WorkOrderDetailPage from './pages/WorkOrderDetailPage';
import QCPage from './pages/QCPage';

/**
 * ERP-3 Production and Quality module registration.
 *
 * Rules:
 * - Module id: erp3
 * - Title: Production
 * - Roles: admin, warehouse
 * - Routes:
 *   - /erp3 (Overview / Production Dashboard)
 *   - /erp3/boms (Bill of Materials list)
 *   - /erp3/boms/new (Create BOM form)
 *   - /erp3/boms/:id (BOM detail, material requirements & shortage purchase request)
 *   - /erp3/work-orders (Work orders list & status transitions)
 *   - /erp3/work-orders/:id (Work order detail, material issuance & finished goods posting)
 *   - /erp3/qc (Quality control inspections & defect analytics)
 * - No internal BrowserRouter or navbar: handled by shared shell
 */
export default {
  id: 'erp3',
  title: 'Production',
  roles: ['admin', 'warehouse'],
  routes: [
    {
      path: '',
      label: 'Overview',
      element: <OverviewPage />,
      roles: ['admin', 'warehouse']
    },
    {
      path: 'boms',
      label: 'Bill of Materials',
      element: <BOMsPage />,
      roles: ['admin', 'warehouse']
    },
    {
      path: 'boms/new',
      label: 'New BOM',
      element: <BOMNewPage />,
      roles: ['admin', 'warehouse']
    },
    {
      path: 'boms/:id',
      element: <BOMDetailPage />,
      roles: ['admin', 'warehouse']
    },
    {
      path: 'work-orders',
      label: 'Work Orders',
      element: <WorkOrdersPage />,
      roles: ['admin', 'warehouse']
    },
    {
      path: 'work-orders/:id',
      element: <WorkOrderDetailPage />,
      roles: ['admin', 'warehouse']
    },
    {
      path: 'qc',
      label: 'Quality Control',
      element: <QCPage />,
      roles: ['admin', 'warehouse']
    }
  ]
};
