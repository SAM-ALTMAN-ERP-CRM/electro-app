import React from 'react';
import Alerts from './pages/Alerts';
import ProductsPage from './pages/ProductsPage';

function Placeholder() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2>Inventory</h2>
        <span className="badge badge-blue">ERP1</span>
      </div>
      <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.6' }}>
        Welcome to ERP-1 Inventory & Warehouses. Navigate to Products or Stock Alerts to manage catalog, monitor inventory levels, and view shortfalls.
      </p>
      <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#0f172a' }}>Quick Links:</h4>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155', fontSize: '0.875rem', lineHeight: '1.8' }}>
          <li>
            <a href="/erp1/products" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
              Product Catalog & SKU Master →
            </a>
          </li>
          <li>
            <a href="/erp1/alerts" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
              Low-Stock Alerts & Monitor →
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default {
  id: 'erp1',
  title: 'Inventory',
  roles: ['admin', 'warehouse', 'sales'],
  routes: [
    {
      path: '',
      label: 'Overview',
      element: <Placeholder />
    },
    {
      path: 'products',
      label: 'Products',
      element: <ProductsPage />
    },
    {
      path: 'alerts',
      label: 'Stock Alerts',
      element: <Alerts />
    }
  ]
};
