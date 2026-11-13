import React from 'react';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import AttendancePage from './pages/AttendancePage';
import LeavesPage from './pages/LeavesPage';
import CommissionsPage from './pages/CommissionsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PayrollPage from './pages/PayrollPage';
import SalarySlipPage from './pages/SalarySlipPage';

/**
 * ERP-6 HR & Workforce Module Registration
 * [ERP6-R3] UI Consistency & Route Registry
 *
 * Rules:
 * - `id`: 'erp6' matches the team slug used in api() calls and the Vite proxy.
 * - `title`: 'HR' displays in the global sidebar group header.
 * - `roles`: ['admin', 'hr'] restricts sidebar visibility to authorized personnel.
 * - Paths are relative to `/erp6/`.
 * - No custom client router, no custom navbar: rendered within the shared App shell.
 * - Print styles hide `.sidebar`, `.top-bar`, `.no-print`, and action buttons.
 */
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
      path: 'attendance',
      label: 'Attendance',
      element: <AttendancePage />
    },
    {
      path: 'leaves',
      label: 'Leaves',
      element: <LeavesPage />
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

