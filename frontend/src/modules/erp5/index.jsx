import React from 'react';
import Login from './pages/Login';
import Users from './pages/Users';
import Payments from './pages/Payments';

export default {
  id: 'erp5',
  title: 'Finance & Auth',
  roles: ['admin', 'finance', 'sales', 'support', 'warehouse', 'hr'],
  routes: [
    { path: 'login', element: <Login /> },
    { path: 'users', label: 'Users', element: <Users />, roles: ['admin'] },
    { path: 'payments', label: 'Payments', element: <Payments />, roles: ['admin', 'finance'] },
  ],
};
