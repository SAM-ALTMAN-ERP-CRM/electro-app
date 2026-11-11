import React from 'react';
// [CRM2-A2] ticket screens
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';

export default {
  id: 'crm2',
  title: 'Support',
  roles: ['admin', 'support'],
  routes: [
    // [CRM2-A2] ticket screens
    { path: 'tickets', label: 'Tickets', element: <TicketsPage /> },
    { path: 'tickets/:id', element: <TicketDetailPage /> } // no label: detail page stays out of the sidebar
  ]
};
