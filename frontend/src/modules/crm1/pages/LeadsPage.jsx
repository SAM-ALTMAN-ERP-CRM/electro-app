import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../api';

const STATUSES = ['new', 'contacted', 'qualified', 'lost'];
const SOURCES = ['dealer', 'web', 'walk-in'];
const FALLBACK_REPS = [
  { id: 'EMP-0001', name: 'Rohan Kulkarni' },
  { id: 'EMP-0002', name: 'Neha Sharma' },
  { id: 'EMP-0003', name: 'Vikram Singh' },
  { id: 'EMP-0004', name: 'Anjali Rao' }
];

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  source: 'dealer',
  product_interest: '',
  sales_rep_id: 'EMP-0001',
  status: 'new'
};

const styles = {
  page: { maxWidth: '1200px', margin: '0 auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1.25rem'
  },
  muted: { color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '1.25rem',
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '0.3rem'
  },
  input: {
    width: '100%',
    minHeight: '40px',
    padding: '0.5rem 0.65rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '0.9rem',
    background: '#fff'
  },
  alert: {
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  secondaryButton: {
    background: '#fff',
    color: '#334155',
    border: '1px solid #cbd5e1'
  },
  actionButton: {
    padding: '0.35rem 0.65rem',
    fontSize: '0.8rem'
  }
};

function getEmployeeName(employee) {
  return employee.name
    || employee.full_name
    || [employee.first_name, employee.last_name].filter(Boolean).join(' ')
    || employee.id;
}

function statusBadgeClass(status) {
  return {
    new: 'badge badge-blue',
    contacted: 'badge badge-amber',
    qualified: 'badge badge-green',
    lost: 'badge badge-red'
  }[status] || 'badge';
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [salesReps, setSalesReps] = useState(FALLBACK_REPS);
  const [usingFallbackReps, setUsingFallbackReps] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingReps, setLoadingReps] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const loadLeads = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const query = statusFilter
        ? `?status=${encodeURIComponent(statusFilter)}`
        : '';
      const data = await api('crm1', `/api/leads${query}`);
      setLeads(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(`Could not load leads: ${loadError.message || 'Please try again.'}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    let active = true;

    async function loadSalesReps() {
      try {
        const employees = await api('erp6', '/api/employees?role_title=Sales Rep');
        const reps = Array.isArray(employees)
          ? employees
            .filter(employee => employee && employee.id)
            .map(employee => ({ id: employee.id, name: getEmployeeName(employee) }))
          : [];

        if (active && reps.length > 0) {
          setSalesReps(reps);
          setUsingFallbackReps(false);
        }
      } catch (employeeError) {
        console.warn('[crm1] Could not load sales reps from ERP-6; using approved fallback list.', employeeError.message);
      } finally {
        if (active) setLoadingReps(false);
      }
    }

    loadSalesReps();
    return () => { active = false; };
  }, []);

  function openCreateForm() {
    setEditingLead(null);
    setForm({ ...EMPTY_FORM, sales_rep_id: salesReps[0]?.id || '' });
    setFormError('');
    setNotice('');
    setShowForm(true);
  }

  function openEditForm(lead) {
    setEditingLead(lead);
    setForm({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source || 'dealer',
      product_interest: lead.product_interest || '',
      sales_rep_id: lead.sales_rep_id || '',
      status: lead.status || 'new'
    });
    setFormError('');
    setNotice('');
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingLead(null);
    setFormError('');
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setFormError('');
    setNotice('');

    if (!form.name.trim()) {
      setFormError('Please enter a lead name.');
      return;
    }
    if (!SOURCES.includes(form.source)) {
      setFormError('Please choose a valid lead source.');
      return;
    }
    if (editingLead && !STATUSES.includes(form.status)) {
      setFormError('Please choose a valid lead status.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: form.source,
      product_interest: form.product_interest.trim(),
      sales_rep_id: form.sales_rep_id || null
    };
    if (editingLead) payload.status = form.status;

    setSaving(true);
    try {
      if (editingLead) {
        await api('crm1', `/api/leads/${encodeURIComponent(editingLead.id)}`, {
          method: 'PUT',
          body: payload
        });
      } else {
        await api('crm1', '/api/leads', { method: 'POST', body: payload });
      }

      setShowForm(false);
      setEditingLead(null);
      setForm(EMPTY_FORM);
      await loadLeads(false);
      setNotice(editingLead ? 'Lead updated successfully.' : 'Lead created successfully.');
    } catch (saveError) {
      setFormError(saveError.message || 'Could not save this lead. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(lead) {
    if (!window.confirm(`Delete the lead "${lead.name}"? This cannot be undone.`)) return;
    if (deletingId) return;

    setDeletingId(lead.id);
    setError('');
    setNotice('');
    try {
      await api('crm1', `/api/leads/${encodeURIComponent(lead.id)}`, { method: 'DELETE' });
      await loadLeads(false);
      setNotice(`Lead "${lead.name}" deleted successfully.`);
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete this lead. Please try again.');
    } finally {
      setDeletingId('');
    }
  }

  function assignedRepName(repId) {
    if (!repId) return 'Unassigned';
    const rep = salesReps.find(employee => employee.id === repId);
    return rep ? `${rep.name} (${rep.id})` : repId;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2>Sales Leads</h2>
          <p style={styles.muted}>Capture and manage inquiries from dealers, web and walk-ins.</p>
        </div>
        <button type="button" onClick={openCreateForm}>
          + Add Lead
        </button>
      </header>

      {usingFallbackReps && !loadingReps && (
        <div
          role="status"
          style={{
            ...styles.alert,
            background: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fde68a'
          }}
        >
          ERP-6 sales reps are unavailable. Using the approved local representative list.
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{ ...styles.alert, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
        >
          {error}
          <button type="button" onClick={() => loadLeads()} style={{ marginLeft: '0.75rem' }}>
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{ ...styles.alert, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}
        >
          {notice}
        </div>
      )}

      {showForm && (
        <section style={styles.card} aria-labelledby="lead-form-heading">
          <h3 id="lead-form-heading" style={{ marginBottom: '1rem' }}>
            {editingLead ? `Edit lead — ${editingLead.id}` : 'Add a lead'}
          </h3>
          {formError && (
            <div
              role="alert"
              style={{ ...styles.alert, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
            >
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
              <div>
                <label htmlFor="lead-name" style={styles.label}>Name *</label>
                <input
                  id="lead-name"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  maxLength={100}
                  autoComplete="name"
                  required
                  style={styles.input}
                />
              </div>
              <div>
                <label htmlFor="lead-phone" style={styles.label}>Phone</label>
                <input
                  id="lead-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleFormChange}
                  maxLength={20}
                  autoComplete="tel"
                  style={styles.input}
                />
              </div>
              <div>
                <label htmlFor="lead-email" style={styles.label}>Email</label>
                <input
                  id="lead-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  maxLength={100}
                  autoComplete="email"
                  style={styles.input}
                />
              </div>
              <div>
                <label htmlFor="lead-source" style={styles.label}>Source *</label>
                <select
                  id="lead-source"
                  name="source"
                  value={form.source}
                  onChange={handleFormChange}
                  required
                  style={styles.input}
                >
                  {SOURCES.map(source => (
                    <option key={source} value={source}>{source === 'walk-in' ? 'Walk-in' : source[0].toUpperCase() + source.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lead-product-interest" style={styles.label}>Product Interest</label>
                <input
                  id="lead-product-interest"
                  name="product_interest"
                  value={form.product_interest}
                  onChange={handleFormChange}
                  maxLength={100}
                  style={styles.input}
                />
              </div>
              <div>
                <label htmlFor="lead-sales-rep" style={styles.label}>Sales Representative</label>
                <select
                  id="lead-sales-rep"
                  name="sales_rep_id"
                  value={form.sales_rep_id}
                  onChange={handleFormChange}
                  style={styles.input}
                >
                  <option value="">Unassigned</option>
                  {editingLead?.sales_rep_id && !salesReps.some(rep => rep.id === editingLead.sales_rep_id) && (
                    <option value={editingLead.sales_rep_id}>{editingLead.sales_rep_id}</option>
                  )}
                  {salesReps.map(rep => (
                    <option key={rep.id} value={rep.id}>{rep.name} ({rep.id})</option>
                  ))}
                </select>
              </div>
              {editingLead && (
                <div>
                  <label htmlFor="lead-status" style={styles.label}>Status *</label>
                  <select
                    id="lead-status"
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    required
                    style={styles.input}
                  >
                    {STATUSES.map(status => (
                      <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                style={styles.secondaryButton}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingLead ? 'Save Changes' : 'Save Lead'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="lead-status-filter" style={styles.label}>Filter by status</label>
          <select
            id="lead-status-filter"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            style={{ ...styles.input, minWidth: '180px' }}
          >
            <option value="">All</option>
            {STATUSES.map(status => (
              <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
        </div>
        <p style={{ ...styles.muted, marginLeft: 'auto' }}>
          {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
        </p>
      </section>

      {loading ? (
        <div role="status" style={{ ...styles.card, textAlign: 'center', color: '#64748b', padding: '2.5rem' }}>
          Loading leads…
        </div>
      ) : leads.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: '2.5rem' }}>
          <h3 style={{ marginBottom: '0.4rem' }}>No leads found</h3>
          <p style={styles.muted}>
            {statusFilter ? `There are no leads with status "${statusFilter}".` : 'Add a lead to start building your sales pipeline.'}
          </p>
        </div>
      ) : (
        <div style={{ ...styles.card, padding: 0, overflowX: 'auto' }}>
          <table style={{ minWidth: '900px', margin: 0 }}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Phone</th>
                <th scope="col">Email</th>
                <th scope="col">Source</th>
                <th scope="col">Status</th>
                <th scope="col">Score</th>
                <th scope="col">Assigned Sales Representative</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600 }}>{lead.name}</td>
                  <td>{lead.phone || '—'}</td>
                  <td>{lead.email || '—'}</td>
                  <td>{lead.source}</td>
                  <td><span className={statusBadgeClass(lead.status)}>{lead.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>{lead.score ?? 0}</span>
                      {lead.score >= 60 && (
                        <span
                          className="badge"
                          aria-label={`Hot lead, score ${lead.score}`}
                          style={{
                            background: '#ffedd5',
                            border: '1px solid #fdba74',
                            color: '#c2410c',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🔥 Hot (Score: {lead.score})
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{assignedRepName(lead.sales_rep_id)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => openEditForm(lead)}
                        disabled={saving || Boolean(deletingId)}
                        style={styles.actionButton}
                        aria-label={`Edit ${lead.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(lead)}
                        disabled={saving || Boolean(deletingId)}
                        style={{ ...styles.actionButton, background: '#fff', color: '#b91c1c', border: '1px solid #fecaca' }}
                        aria-label={`Delete ${lead.name}`}
                      >
                        {deletingId === lead.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
