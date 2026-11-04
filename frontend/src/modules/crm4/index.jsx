import React from 'react';

function Placeholder() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2>Marketing</h2>
        <span className="badge badge-blue">CRM4</span>
      </div>
      <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.6' }}>
        Module registered. Pages built by Team CRM4 will automatically appear here once their pull requests merge.
      </p>
      <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#0f172a' }}>Backend Service Integration:</h4>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Status Check: <code>/svc/crm4/api/health</code>
        </p>
      </div>
    </div>
  );
}

export default {
  id: 'crm4',
  title: 'Marketing',
  roles: ['admin', 'sales'],
  routes: [
    {
      path: '',
      label: 'Coming soon',
      element: <Placeholder />
    }
  ]
};
