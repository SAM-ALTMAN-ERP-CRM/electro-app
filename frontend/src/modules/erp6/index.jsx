import React from 'react';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import CommissionsPage from './pages/CommissionsPage';
import LeaderboardPage from './pages/LeaderboardPage';

export default {
  id: 'erp6',
  title: 'HR',
  roles: ['admin', 'hr'],
  routes: [
    {
      path: '',
      label: 'Employees',
      element: <EmployeesPage />
    },
    {
      path: 'employees',
      element: <EmployeesPage />
    },
    {
      path: 'departments',
      label: 'Departments',
      element: <DepartmentsPage />
    },
    {
      path: 'commissions',
      label: 'Commissions',
      element: <CommissionsPage />
    },
    {
      path: 'leaderboard',
      label: 'Leaderboard',
      element: <LeaderboardPage />
    }
  ]
};


