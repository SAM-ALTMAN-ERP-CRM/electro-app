import React from 'react';
import Login from './pages/Login';
import Users from './pages/Users';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import CreditNotesPage from './pages/CreditNotesPage';
import LedgerPage from './pages/LedgerPage';
import ReportsPage from './pages/ReportsPage';
import Payments from './pages/Payments';
import Receivables from './pages/Receivables';

/*
 * ERP-5 module registration.
 * The global App.jsx reads this file automatically.
 *
 * Rules:
 * - `id`    must match the team slug used in api() calls and the Vite proxy.
 * - `roles` lists which roles may see this module group in the sidebar.
 * - Each route's optional `roles` array limits it further (e.g. admin only).
 * - No BrowserRouter, no navbar, no App.jsx edits — the shell handles all that.
 */
export default {
  id: 'erp5',
  title: 'Finance & Auth',
  roles: ['admin', 'finance', 'sales', 'support', 'warehouse', 'hr'],
  routes: [
    // Login page: visible to everyone (no roles restriction), hidden from sidebar (no label)
    { path: 'login', element: <Login /> },

    // Users page: admin only
    { path: 'users', label: 'Users', element: <Users />, roles: ['admin'] },

    // Invoices pages: admin and finance
    { path: 'invoices', label: 'Invoices', element: <InvoicesPage />, roles: ['admin', 'finance'] },
    { path: 'invoices/:id', element: <InvoiceDetailPage />, roles: ['admin', 'finance'] },

    // Credit notes page: admin and finance
    { path: 'credit-notes', label: 'Credit Notes', element: <CreditNotesPage />, roles: ['admin', 'finance'] },

    // Payments page: admin and finance
    { path: 'payments', label: 'Payments', element: <Payments />, roles: ['admin', 'finance'] },

    // General Ledger page: admin and finance
    { path: 'ledger', label: 'General Ledger', element: <LedgerPage />, roles: ['admin', 'finance'] },

    // Financial Reports page: admin and finance
    { path: 'reports', label: 'Finance Reports', element: <ReportsPage />, roles: ['admin', 'finance'] },

    // Receivables ageing page: admin and finance
    { path: 'receivables', label: 'Receivables', element: <Receivables />, roles: ['admin', 'finance'] }
  ]
};
