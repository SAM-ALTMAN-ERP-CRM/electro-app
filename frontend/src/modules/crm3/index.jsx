import React from 'react';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import CustomerTimeline from './pages/CustomerTimeline';
import SegmentsPage from './pages/SegmentsPage';
import SegmentDetailPage from './pages/SegmentDetailPage';
import DuplicatesPage from './pages/DuplicatesPage';
import CustomerImportPage from './pages/CustomerImportPage';

export default {
  id: 'crm3',
  title: 'Customers',
  roles: ['admin', 'sales', 'support'],
  routes: [
    {
      path: '',
      label: 'Customers',
      element: <CustomersPage />
    },
    {
      path: 'customers',
      element: <CustomersPage />
    },
    {
      path: 'customers/:id',
      element: <CustomerDetailPage />
    },
    {
      path: ':id',
      element: <CustomerDetailPage />
    },
    {
      path: 'customers/:id/timeline',
      element: <CustomerTimeline />
    },
    {
      path: 'segments',
      label: 'Segments',
      element: <SegmentsPage />
    },
    {
      path: 'segments/:id',
      element: <SegmentDetailPage />
    },
    {
      path: 'duplicates',
      label: 'Duplicates',
      element: <DuplicatesPage />
    },
    {
      path: 'import',
      label: 'Import CSV',
      element: <CustomerImportPage />
    }
  ]
};
