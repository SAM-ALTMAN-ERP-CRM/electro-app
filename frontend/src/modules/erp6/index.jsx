import React from 'react';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import CommissionsPage from './pages/CommissionsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PayrollPage from './pages/PayrollPage';
import SalarySlipPage from './pages/SalarySlipPage';

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
      path: 'payroll',
      label: 'Payroll',
      element: <PayrollPage />
    },
    {
      path: 'payroll/:id',
      element: <SalarySlipPage />
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


