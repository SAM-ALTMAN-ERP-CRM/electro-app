import React from 'react';
// [CRM2-A2] ticket screens
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
// [CRM2-D2] service centres and assign screens
import CentresPage from './pages/CentresPage';
import AssignPage from './pages/AssignPage';
// [CRM2-B2] warranty screen
import WarrantyPage from './pages/WarrantyPage';
// [CRM2-C2] RMA screens
import RmasPage from './pages/RmasPage';
import RmaDetailPage from './pages/RmaDetailPage';

export default {
  id: 'crm2',
  title: 'Support',
  roles: ['admin', 'support'],
  routes: [
    // [CRM2-A2] ticket screens
    { path: 'tickets', label: 'Tickets', element: <TicketsPage /> },
    { path: 'tickets/:id', element: <TicketDetailPage /> }, // no label: detail page stays out of the sidebar
    // [CRM2-D2] service centres and assign screens
    { path: 'centres', label: 'Service Centres', element: <CentresPage /> },
    { path: 'assign', label: 'Assign Tickets', element: <AssignPage /> },
    // [CRM2-B2] warranty screen
    { path: 'warranty', label: 'Warranty', element: <WarrantyPage /> },
    // [CRM2-C2] RMA screens
    { path: 'rmas', label: 'Returns (RMA)', element: <RmasPage /> },
    { path: 'rmas/:id', element: <RmaDetailPage /> }
  ]
};
