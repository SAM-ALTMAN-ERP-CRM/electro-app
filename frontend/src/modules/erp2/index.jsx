import React from 'react';
import { Orders, NewOrder, OrderDetails } from './pages/PurchaseOrders';

function Placeholder() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2>Purchasing</h2>
        <span className="badge badge-blue">ERP2</span>
      </div>
      <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.6' }}>
        Module registered. Pages built by Team ERP2 will automatically appear here once their pull requests merge.
      </p>
      <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#0f172a' }}>Backend Service Integration:</h4>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Status Check: <code>/svc/erp2/api/health</code>
        </p>
      </div>
    </div>
  );
}

export default {
  id: 'erp2',
  title: 'Purchasing',
  roles: ['admin', 'warehouse', 'finance'],
  routes: [
    {
      path: '',
      label: 'Coming soon',
      element: <Placeholder />
    },
    { path: 'orders', label: 'Purchase orders', element: <Orders /> },
    { path: 'orders/new', element: <NewOrder /> },
    { path: 'orders/:id', element: <OrderDetails /> }
  ]
};
