import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './modules/erp5/pages/Login';

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

function canAccessRoute(route, mod, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (mod.roles && !mod.roles.includes(user.role)) return false;
  if (route.roles && !route.roles.includes(user.role)) return false;
  return true;
}

function getRequiredRoles(route, mod) {
  if (route.roles && route.roles.length > 0) return route.roles;
  if (mod.roles && mod.roles.length > 0) return mod.roles;
  return ['admin'];
}

function roleBadge(role) {
  const map = {
    admin: 'red',
    sales: 'blue',
    finance: 'green',
    support: 'amber',
    warehouse: 'blue',
    hr: 'green',
  };
  return map[role] || 'blue';
}

function NotAllowed({ requiredRoles = [], userRole }) {
  const rolesList = requiredRoles.length > 0 ? requiredRoles.join(', ') : 'admin';
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Not allowed</h2>
      <p style={{ marginTop: '0.5rem', color: '#64748b' }}>
        You do not have permission to view this page. Required role: <strong>{rolesList}</strong> (your role: <strong>{userRole || 'none'}</strong>).
      </p>
    </div>
  );
}

function AppShell() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>Loading Electro App…</p>
      </div>
    );
  }

  // If not logged in, render the login page for /login or redirect other paths to /login
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Filter modules and routes visible to the current user
  const visibleModules = modules
    .map(mod => {
      if (user.role !== 'admin' && mod.roles && !mod.roles.includes(user.role)) {
        return null;
      }
      const visibleRoutes = (mod.routes || []).filter(r => r.label && canAccessRoute(r, mod, user));
      if (visibleRoutes.length === 0) {
        return null;
      }
      return {
        ...mod,
        visibleRoutes,
      };
    })
    .filter(Boolean);

  // Find first available route to use as redirect target for '/'
  const firstModule = visibleModules[0];
  const firstRoute = firstModule && firstModule.visibleRoutes && firstModule.visibleRoutes[0];
  const homeRedirect = firstModule ? `/${firstModule.id}/${firstRoute ? firstRoute.path : ''}`.replace(/\/+$/, '') : '/';

  return (
    <div className="app-container">
      {/* Sidebar with Team Groups */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>⚡ Electro App</h1>
          <p>CRM + ERP Integrated Suite</p>
        </div>

        <nav className="sidebar-nav">
          {visibleModules.map(mod => (
            <div key={mod.id} className="nav-group">
              <div className="nav-group-title">
                <span>{mod.title}</span>
                <span className="team-tag">{mod.id.toUpperCase()}</span>
              </div>
              {mod.visibleRoutes.map((r, rIdx) => {
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
            <strong style={{ fontSize: '0.9rem' }}>Electro App Suite</strong>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.name}</span>
            <span className={`badge badge-${roleBadge(user.role)}`}>{user.role}</span>
            <button
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '0.3rem 0.65rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                color: '#475569',
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="page-container">
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={<Navigate to={homeRedirect} replace />} />
            {modules.flatMap(mod =>
              (mod.routes || []).map((r, rIdx) => {
                const subPath = r.path ? `${mod.id}/${r.path}` : mod.id;
                const allowed = canAccessRoute(r, mod, user);
                const element = allowed ? (
                  r.element
                ) : (
                  <NotAllowed
                    requiredRoles={getRequiredRoles(r, mod)}
                    userRole={user.role}
                  />
                );
                return (
                  <Route
                    key={`${mod.id}-${rIdx}`}
                    path={subPath}
                    element={element}
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

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
