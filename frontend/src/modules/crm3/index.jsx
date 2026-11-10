import React from 'react';
import CustomersPage from './pages/CustomersPage';
import SegmentsPage from './pages/SegmentsPage';
import SegmentDetailPage from './pages/SegmentDetailPage';

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
      path: 'segments',
      label: 'Segments',
      element: <SegmentsPage />
    },
    {
      path: 'segments/:id',
      element: <SegmentDetailPage />
    }
  ]
};
