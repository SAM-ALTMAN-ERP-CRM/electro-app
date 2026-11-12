import React from 'react';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';

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
    }
  ]
};
