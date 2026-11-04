import React from 'react';

function Placeholder() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2>Portal and Dashboards</h2>
        <span className="badge badge-blue">CRM5</span>
      </div>
      <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.6' }}>
        Module registered. Pages built by Team CRM5 will automatically appear here once their pull requests merge.
      </p>
      <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#0f172a' }}>Backend Service Integration:</h4>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Status Check: <code>/svc/crm5/api/health</code>
        </p>
      </div>
    </div>
  );
}

export default {
  id: 'crm5',
  title: 'Portal and Dashboards',
  roles: ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr'],
  routes: [
    {
      path: '',
      label: 'Coming soon',
      element: <Placeholder />
    }
  ]
};
