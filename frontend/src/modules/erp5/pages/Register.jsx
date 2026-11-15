import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../api';

/*
 * Self-registration page for Electro App.
 * Calls public POST /api/auth/register on erp5.
 * On success, informs the user that an administrator must approve it.
 */
export default function Register() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    try {
      await api('erp5', '/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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

        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.hint}>
          Register for an account. An administrator will review and activate it.
        </p>

        {success ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={styles.successTitle}>Registration Submitted</h3>
            <p style={styles.successMsg}>
              Account created. An administrator must approve it before you can sign in.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={styles.button}
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Rohan Kulkarni"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="rohan@example.com"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password (minimum 8 characters)</label>
              <input
                type="password"
                required
                minLength={8}
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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            <div style={styles.loginWrap}>
              <span style={styles.loginText}>Already have an account? </span>
              <Link to="/login" style={styles.loginLink}>
                Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
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
    marginBottom: '1.25rem',
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
  loginWrap: {
    textAlign: 'center',
    marginTop: '0.5rem',
    fontSize: '0.875rem',
  },
  loginText: {
    color: '#64748b',
  },
  loginLink: {
    color: '#2563eb',
    fontWeight: 600,
    textDecoration: 'none',
  },
  successBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '1.5rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
  successIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#22c55e',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  successTitle: {
    margin: 0,
    color: '#15803d',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  successMsg: {
    margin: 0,
    color: '#166534',
    fontSize: '0.9rem',
    lineHeight: 1.4,
  },
};

