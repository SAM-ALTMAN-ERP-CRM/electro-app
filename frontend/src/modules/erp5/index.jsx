import React from 'react';
import Login from './pages/Login';
import Users from './pages/Users';

/*
 * ERP-5 module registration.
 * The global App.jsx reads this file automatically.
 *
 * Rules:
 * - `id`    must match the team slug used in api() calls and the Vite proxy.
 * - `roles` lists which roles may see this module group in the sidebar.
 * - Each route's optional `roles` array limits it further (e.g. admin only).
 * - No BrowserRouter, no navbar, no App.jsx edits — the shell handles all that.
 *
 * Pages registered here:
 *   /erp5/login  — public login form for the whole app (all roles, no sidebar label)
 *   /erp5/users  — user management, admin role only
 */
export default {
  id: 'erp5',
  title: 'Finance & Auth',
  roles: ['admin', 'finance', 'sales', 'support', 'warehouse', 'hr'],
  routes: [
    // Login page: visible to everyone (no roles restriction),
    // but hidden from the sidebar (no label) so it doesn't clutter the nav.
    { path: 'login', element: <Login /> },

    // Users page: admin only — the backend also enforces this with requireRole('admin').
    { path: 'users', label: 'Users', element: <Users />, roles: ['admin'] },
  ],
};
