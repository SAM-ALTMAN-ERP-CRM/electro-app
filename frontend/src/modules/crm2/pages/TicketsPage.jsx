// [CRM2-A2] Ticket screens: ticket list with filters and a "New ticket" form.
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

// ---------- Shared helpers (also used by TicketDetailPage) ----------

export const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
export const PRIORITIES = ['low', 'medium', 'high'];

// Fallback until ERP6-A1 merges: the 3 service engineers from the shared seed IDs
const FALLBACK_ENGINEERS = [
  { id: 'EMP-0005', name: 'Imran Qureshi' },
  { id: 'EMP-0006', name: 'Deepa Menon' },
  { id: 'EMP-0007', name: 'Suresh Kumar' }
];

// Fallback if the CRM-3 customers API is down: the 8 shared customers
const FALLBACK_CUSTOMERS = [
  { id: 'CUST-0001', name: 'Aarav Mehta' },
  { id: 'CUST-0002', name: 'Sunrise Electronics Pvt Ltd' },
  { id: 'CUST-0003', name: 'Priya Nair' },
  { id: 'CUST-0004', name: 'BrightHome Retail LLP' },
  { id: 'CUST-0005', name: 'Kiran Patel' },
  { id: 'CUST-0006', name: 'Metro Offices Ltd' },
  { id: 'CUST-0007', name: 'Sneha Iyer' },
  { id: 'CUST-0008', name: 'Gadget Hub' }
];

// Load service engineers from ERP-6; use the fallback list if ERP-6 is not reachable
export async function loadEngineers() {
  try {
    const rows = await api('erp6', '/api/employees?role_title=Service Engineer');
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map(e => ({
        id: e.id,
        name: e.name || e.full_name || [e.first_name, e.last_name].filter(Boolean).join(' ') || e.id
      }));
    }
  } catch (err) {
    // ERP-6 not merged yet: fall through to the hard-coded list
  }
  return FALLBACK_ENGINEERS;
}

// Load customers from CRM-3; use the fallback list if CRM-3 is not reachable
async function loadCustomers() {
  try {
    const rows = await api('crm3', '/api/customers');
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map(c => ({ id: c.id, name: c.name }));
    }
  } catch (err) {
    // CRM-3 down: fall through to the shared list
  }
  return FALLBACK_CUSTOMERS;
}

// 'in_progress' -> 'In progress'
export function prettyLabel(value) {
  if (!value) return '';
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function StatusBadge({ status }) {
  const colours = { open: 'badge-blue', in_progress: 'badge-amber', resolved: 'badge-green', closed: '' };
  return <span className={`badge ${colours[status] || ''}`}>{prettyLabel(status)}</span>;
}

export function PriorityBadge({ priority }) {
  const colours = { high: 'badge-red', medium: 'badge-amber', low: '' };
  return <span className={`badge ${colours[priority] || ''}`}>{prettyLabel(priority)}</span>;
}

// [CRM2-A3] SLA badge: red "Overdue" once past due_at, otherwise "x h left".
// Resolved and closed tickets have no running SLA, so nothing is shown.
export function SlaBadge({ ticket }) {
  if (!ticket.due_at || ticket.status === 'resolved' || ticket.status === 'closed') {
    return <span style={{ color: '#94a3b8' }}>—</span>;
  }
  const hoursLeft = (new Date(ticket.due_at).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft <= 0) return <span className="badge badge-red">Overdue</span>;
  const label = hoursLeft < 1 ? '<1 h left' : `${Math.floor(hoursLeft)} h left`;
  return <span className="badge">{label}</span>;
}

// Show an engineer as "Imran Qureshi (EMP-0005)", or "Unassigned"
export function engineerName(engineers, id) {
  if (!id) return 'Unassigned';
  const match = engineers.find(e => e.id === id);
  return match ? `${match.name} (${id})` : id;
}

// Date + time in Indian format, e.g. 12/11/2026, 3:45 pm
export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

// Small shared styles so both pages look the same
export const styles = {
  page: { maxWidth: '1200px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' },
  muted: { color: '#64748b', fontSize: '0.9rem' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' },
  input: { width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' },
  error: { background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' },
  success: { background: '#dcfce7', color: '#15803d', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' },
  secondaryBtn: { background: '#fff', color: '#334155', border: '1px solid #cbd5e1' },
  nowrap: { whiteSpace: 'nowrap' }
};

// ---------- Page ----------

const EMPTY_FORM = {
  customer_id: '',
  serial_number: '',
  subject: '',
  description: '',
  priority: 'medium',
  assigned_to: ''
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false); // [CRM2-A3] show GET /api/tickets/overdue

  const [engineers, setEngineers] = useState(FALLBACK_ENGINEERS);
  const [customers, setCustomers] = useState(FALLBACK_CUSTOMERS);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null); // last ticket created, for the success message

  // Load the ticket list whenever a filter changes (filters are applied by the server)
  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let rows;
      if (overdueOnly) {
        // [CRM2-A3] overdue list comes from its own endpoint; the priority filter still applies
        rows = await api('crm2', '/api/tickets/overdue');
        if (priorityFilter) rows = rows.filter(t => t.priority === priorityFilter);
      } else {
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (priorityFilter) params.append('priority', priorityFilter);
        const qs = params.toString() ? `?${params.toString()}` : '';
        rows = await api('crm2', `/api/tickets${qs}`);
      }
      setTickets(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(`Could not load tickets: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, overdueOnly]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Dropdown data from other teams (with fallbacks), loaded once
  useEffect(() => {
    loadEngineers().then(setEngineers);
    loadCustomers().then(setCustomers);
  }, []);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.customer_id) return setFormError('Please choose a customer.');
    if (!form.subject.trim()) return setFormError('Please enter a subject.');

    const customer = customers.find(c => c.id === form.customer_id);
    setSaving(true);
    try {
      // Send both customer_id and customer_name (the tickets API stores both)
      const ticket = await api('crm2', '/api/tickets', {
        method: 'POST',
        body: { ...form, customer_name: customer ? customer.name : form.customer_id }
      });
      setCreated(ticket);
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadTickets();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2>Support Tickets</h2>
          <p style={styles.muted}>Customer support tickets: filter, create and open a ticket to update it.</p>
        </div>
        <button className="btn" onClick={() => { setShowForm(!showForm); setFormError(''); }}>
          {showForm ? 'Cancel' : '+ New ticket'}
        </button>
      </div>

      {created && (
        <div style={styles.success}>
          Ticket <Link to={`/crm2/tickets/${created.id}`}><strong>{created.id}</strong></Link> created.
        </div>
      )}

      {/* New ticket form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.card}>
          <h3 style={{ marginBottom: '1rem' }}>New ticket</h3>
          {formError && <div style={styles.error}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={styles.label}>Customer *</label>
              <select name="customer_id" value={form.customer_id} onChange={handleChange} style={styles.input}>
                <option value="">Choose a customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Serial number</label>
              <input name="serial_number" value={form.serial_number} onChange={handleChange} placeholder="e.g. TV55-2611-0001" style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} style={styles.input}>
                {PRIORITIES.map(p => <option key={p} value={p}>{prettyLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Assigned to</label>
              <select name="assigned_to" value={form.assigned_to} onChange={handleChange} style={styles.input}>
                <option value="">Unassigned</option>
                {engineers.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={styles.label}>Subject *</label>
            <input name="subject" value={form.subject} onChange={handleChange} placeholder="Short summary of the problem" style={styles.input} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={styles.label}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} style={styles.input} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Create ticket'}</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={styles.label}>Status</label>
          <select value={statusFilter} disabled={overdueOnly} onChange={e => setStatusFilter(e.target.value)} style={styles.input}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{prettyLabel(s)}</option>)}
          </select>
        </div>
        <div>
          <label style={styles.label}>Priority</label>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={styles.input}>
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{prettyLabel(p)}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', paddingBottom: '0.5rem' }}>
          <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
          Overdue only
        </label>
        {(statusFilter || priorityFilter || overdueOnly) && (
          <button className="btn" style={styles.secondaryBtn} onClick={() => { setStatusFilter(''); setPriorityFilter(''); setOverdueOnly(false); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Ticket table */}
      {error && <div style={{ ...styles.error, marginTop: '1rem' }}>{error}</div>}
      {loading ? (
        <p style={{ ...styles.muted, marginTop: '1rem' }}>Loading tickets…</p>
      ) : !error && tickets.length === 0 ? (
        <p style={{ ...styles.muted, marginTop: '1rem' }}>{overdueOnly ? 'No overdue tickets.' : 'No tickets match these filters.'}</p>
      ) : !error && (
        <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Customer</th>
              <th>Subject</th>
              <th>Serial</th>
              <th>Priority</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Assigned to</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id}>
                <td style={styles.nowrap}><Link to={`/crm2/tickets/${t.id}`}><strong>{t.id}</strong></Link></td>
                <td>{t.customer_name}<div style={{ ...styles.muted, fontSize: '0.75rem' }}>{t.customer_id}</div></td>
                <td>{t.subject}</td>
                <td style={styles.nowrap}>{t.serial_number || '—'}</td>
                <td style={styles.nowrap}><PriorityBadge priority={t.priority} /></td>
                <td style={styles.nowrap}><StatusBadge status={t.status} /></td>
                <td style={styles.nowrap}><SlaBadge ticket={t} /></td>
                <td>{engineerName(engineers, t.assigned_to)}</td>
                <td>{formatDateTime(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
