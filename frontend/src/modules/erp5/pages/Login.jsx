import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api';

/*
 * Login page for the whole app.
 * Calls POST /api/auth/login on the erp5 backend.
 * On success, saves the JWT in localStorage and navigates to home.
 * Shows a friendly error message on wrong credentials.
 */
export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // api() returns the `data` portion: { token, user: { id, name, email, role, employee_id } }
      const data = await api('erp5', '/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      // Store JWT and user info so other pages can read the role
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Redirect to the home/dashboard after login
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* App header */}
        <div style={styles.header}>
          <h1 style={styles.appName}>⚡ Electro App</h1>
          <p style={styles.appSub}>CRM + ERP Integrated Suite</p>
        </div>

        <h2 style={styles.title}>Sign In</h2>
        <p style={styles.hint}>
          Use a demo account below, or enter your credentials.
        </p>

        {/* Demo credentials quick-reference */}
        <div style={styles.demoBox}>
          <strong>Demo logins (password: demo123)</strong>
          <table style={styles.demoTable}>
            <tbody>
              {[
                ['admin@demo.com', 'admin'],
                ['sales@demo.com', 'sales'],
                ['finance@demo.com', 'finance'],
                ['support@demo.com', 'support'],
                ['warehouse@demo.com', 'warehouse'],
                ['hr@demo.com', 'hr'],
              ].map(([e, r]) => (
                <tr key={e}>
                  <td style={styles.demoEmail}>{e}</td>
                  <td><span className={`badge badge-${roleBadge(r)}`}>{r}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@demo.com"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              disabled={loading}
            />
          </div>

          {/* Error message */}
          {error && (
            <p style={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* Return badge colour class by role */
function roleBadge(role) {
  const map = {
    admin: 'red',
    sales: 'blue',
    finance: 'green',
    support: 'yellow',
    warehouse: 'blue',
    hr: 'green',
  };
  return map[role] || 'blue';
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '2rem',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  appName: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  appSub: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: '0.25rem 0 0',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '0.25rem',
  },
  hint: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '1rem',
  },
  demoBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
    fontSize: '0.8rem',
    color: '#475569',
  },
  demoTable: {
    width: '100%',
    marginTop: '0.5rem',
    borderCollapse: 'collapse',
  },
  demoEmail: {
    paddingRight: '1rem',
    color: '#1e293b',
    fontFamily: 'monospace',
    fontSize: '0.78rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    color: '#dc2626',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    margin: 0,
  },
  button: {
    padding: '0.65rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
};
