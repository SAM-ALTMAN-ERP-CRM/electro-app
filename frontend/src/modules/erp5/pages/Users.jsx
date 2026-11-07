import React, { useEffect, useState } from 'react';
import { api } from '../../../api';

/*
 * Users page — admin only.
 * Shows a table of all system users and an "Add user" form.
 * The backend /api/users already enforces requireRole('admin'),
 * so a non-admin will get a 403 and see the error message below.
 */
export default function Users() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [msg, setMsg]       = useState('');

  /* Form state for adding a new user */
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'sales', employee_id: '',
  });
  const [adding, setAdding] = useState(false);

  /* Fetch user list from the backend */
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('erp5', '/api/users');
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* Submit new user */
  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setAdding(true);
    try {
      await api('erp5', '/api/users', { method: 'POST', body: form });
      setMsg('User added successfully.');
      setForm({ name: '', email: '', password: '', role: 'sales', employee_id: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const field = (key, value) =>
    setForm(f => ({ ...f, [key]: value }));

  if (loading) return <p style={{ padding: '2rem' }}>Loading users…</p>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Users</h2>
        <span className="badge badge-red">Admin only</span>
      </div>

      {/* Error / success banners */}
      {error && <p style={styles.error}>{error}</p>}
      {msg   && <p style={styles.success}>{msg}</p>}

      {/* Users table */}
      {users.length === 0 ? (
        <p style={styles.empty}>No users found.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Employee ID</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}><code>{u.id}</code></td>
                  <td style={styles.td}>{u.name}</td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    <span className={`badge badge-${roleBadge(u.role)}`}>{u.role}</span>
                  </td>
                  <td style={styles.td}>{u.employee_id || '—'}</td>
                  <td style={styles.td}>
                    <span className={`badge badge-${u.active ? 'green' : 'red'}`}>
                      {u.active ? 'active' : 'inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add user form */}
      <div style={styles.formCard}>
        <h3 style={styles.formTitle}>Add User</h3>
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Name *</label>
              <input
                required
                style={styles.input}
                placeholder="Rohan Kulkarni"
                value={form.name}
                onChange={e => field('name', e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email *</label>
              <input
                required
                type="email"
                style={styles.input}
                placeholder="rohan@example.com"
                value={form.email}
                onChange={e => field('email', e.target.value)}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Password *</label>
              <input
                required
                type="password"
                style={styles.input}
                placeholder="••••••••"
                value={form.password}
                onChange={e => field('password', e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Role *</label>
              <select
                style={styles.input}
                value={form.role}
                onChange={e => field('role', e.target.value)}
              >
                {['admin','sales','support','warehouse','finance','hr'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Employee ID (optional)</label>
            <input
              style={styles.input}
              placeholder="EMP-0001"
              value={form.employee_id}
              onChange={e => field('employee_id', e.target.value)}
            />
          </div>

          <button type="submit" style={styles.button} disabled={adding}>
            {adding ? 'Adding…' : 'Add User'}
          </button>
        </form>
      </div>
    </div>
  );
}

function roleBadge(role) {
  const map = { admin:'red', sales:'blue', finance:'green', support:'yellow', warehouse:'blue', hr:'green' };
  return map[role] || 'blue';
}

const styles = {
  page: { padding: '2rem', maxWidth: '900px' },
  header: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' },
  error: {
    color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '6px', padding: '0.6rem 1rem', marginBottom: '1rem',
  },
  success: {
    color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: '6px', padding: '0.6rem 1rem', marginBottom: '1rem',
  },
  empty: { color: '#64748b', fontStyle: 'italic' },
  tableWrap: { overflowX: 'auto', marginBottom: '2rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  thead: { background: '#f8fafc' },
  th: { padding: '0.65rem 0.9rem', textAlign: 'left', fontWeight: 600, color: '#374151',
        borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.6rem 0.9rem', color: '#1e293b', verticalAlign: 'middle' },
  formCard: {
    background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: '8px', padding: '1.5rem', marginTop: '1rem',
  },
  formTitle: { margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  row: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '180px' },
  label: { fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  input: {
    padding: '0.55rem 0.75rem', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: '0.9rem', background: '#fff',
    width: '100%', boxSizing: 'border-box',
  },
  button: {
    padding: '0.6rem 1.5rem', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '0.95rem',
    fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start',
  },
};
