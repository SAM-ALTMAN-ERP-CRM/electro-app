import React from 'react';
import BomsPage from './pages/BomsPage';
import BomDetailPage from './pages/BomDetailPage';

export default {
  id: 'erp3',
  title: 'Production',
  roles: ['admin', 'warehouse'],
  routes: [
    {
      // Default landing: BOM list page
      path: '',
      label: 'Bill of Materials',
      element: <BomsPage />
    },
    {
      // BOM detail — not shown in nav, reached by clicking "View →" in the list
      path: 'boms/:id',
      element: <BomDetailPage />
    }
  ]
};
