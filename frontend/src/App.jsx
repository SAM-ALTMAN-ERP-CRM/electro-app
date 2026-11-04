import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';

// Eagerly discover all team modules using Vite's import.meta.glob
const moduleFiles = import.meta.glob('./modules/*/index.jsx', { eager: true });

// Extract and sort module definitions
const modules = Object.values(moduleFiles)
  .map(mod => mod.default)
  .filter(Boolean)
  .sort((a, b) => {
    // Sort crm1..crm5 then erp1..erp6
    const order = ['crm1', 'crm2', 'crm3', 'crm4', 'crm5', 'erp1', 'erp2', 'erp3', 'erp4', 'erp5', 'erp6'];
    const idxA = order.indexOf(a.id);
    const idxB = order.indexOf(b.id);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

export default function App() {
  const location = useLocation();

  // Find first available route to use as redirect target for '/'
  const firstModule = modules[0];
  const firstRoute = firstModule && firstModule.routes && firstModule.routes[0];
  const homeRedirect = firstModule ? `/${firstModule.id}/${firstRoute ? firstRoute.path : ''}`.replace(/\/+$/, '') : '/';

  return (
    <div className="app-container">
      {/* Sidebar with 11 Team Groups */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>⚡ Electro App</h1>
          <p>CRM + ERP Integrated Suite</p>
        </div>

        <nav className="sidebar-nav">
          {modules.map(mod => (
            <div key={mod.id} className="nav-group">
              <div className="nav-group-title">
                <span>{mod.title}</span>
                <span className="team-tag">{mod.id.toUpperCase()}</span>
              </div>
              {mod.routes && mod.routes
                .filter(r => r.label) // Only show items with a label in the sidebar menu
                .map((r, rIdx) => {
                  const targetPath = `/${mod.id}/${r.path}`.replace(/\/+$/, '');
                  const isCurrent = location.pathname === targetPath || (targetPath === `/${mod.id}` && location.pathname === `/${mod.id}/`);
                  return (
                    <NavLink
                      key={rIdx}
                      to={targetPath || `/${mod.id}`}
                      className={({ isActive }) => `nav-item ${isActive || isCurrent ? 'active' : ''}`}
                    >
                      {r.label}
                    </NavLink>
                  );
                })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="top-bar">
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Active Workspace: </span>
            <strong style={{ fontSize: '0.9rem' }}>Monorepo Foundation (ERP5-C1)</strong>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span className="badge badge-green">Dev Mode · Admin</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>admin@demo.com</span>
          </div>
        </header>

        <main className="page-container">
          <Routes>
            <Route path="/" element={<Navigate to={homeRedirect} replace />} />
            {modules.flatMap(mod =>
              (mod.routes || []).map((r, rIdx) => {
                const subPath = r.path ? `${mod.id}/${r.path}` : mod.id;
                return (
                  <Route
                    key={`${mod.id}-${rIdx}`}
                    path={subPath}
                    element={r.element}
                  />
                );
              })
            )}
            <Route
              path="*"
              element={
                <div style={{ padding: '2rem' }}>
                  <h2>404 - Page Not Found</h2>
                  <p style={{ marginTop: '0.5rem', color: '#64748b' }}>
                    No route matched <code>{location.pathname}</code>.
                  </p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
