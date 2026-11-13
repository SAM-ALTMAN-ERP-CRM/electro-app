import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../api';

const emptyForm = { sku: '', product_name: '', quantity: '', requested_by: '', reason: '' };
const badgeColors = {
  pending: ['#fef3c7', '#92400e'],
  approved: ['#dcfce7', '#166534'],
  rejected: ['#fee2e2', '#991b1b'],
  converted: ['#dbeafe', '#1e40af']
};

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Ignore old responses when the status filter changes quickly.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    api('erp2', `/api/purchase-requests${query}`)
      .then(data => { if (active) setRequests(Array.isArray(data) ? data : []); })
      .catch(err => { if (active) setError(err.message || 'Could not load requests.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status]);

  const refresh = useCallback(async () => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const data = await api('erp2', `/api/purchase-requests${query}`);
    setRequests(Array.isArray(data) ? data : []);
  }, [status]);

  const submit = async event => {
    event.preventDefault();
    if (!form.sku.trim() || !form.product_name.trim() || !form.requested_by.trim() || !form.reason.trim() || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1) {
      setError('Complete all fields and enter a whole quantity greater than zero.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('erp2', '/api/purchase-requests', {
        method: 'POST',
        body: { ...form, sku: form.sku.trim(), product_name: form.product_name.trim(), requested_by: form.requested_by.trim(), reason: form.reason.trim(), quantity: Number(form.quantity) }
      });
      setForm(emptyForm);
      setShowForm(false);
      setMessage('Purchase request created.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not save the request.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (id, decision) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('erp2', `/api/purchase-requests/${encodeURIComponent(id)}/decision`, {
        method: 'PATCH', body: { status: decision }
      });
      setMessage(`Request ${id} ${decision}.`);
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not update the request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Purchase requests</h2>
      <button type="button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close form' : 'New request'}</button>
      {error && <p role="alert" style={{ color: '#991b1b' }}>{error}</p>}
      {message && <p role="status" style={{ color: '#166534' }}>{message}</p>}

      {showForm && (
        <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem', maxWidth: '420px', margin: '1rem 0' }}>
          <h3>New request</h3>
          <label>SKU <input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU-0001" /></label>
          <label>Product name <input required value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} /></label>
          <label>Quantity <input required type="number" min="1" step="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>
          <label>Requested by <input required value={form.requested_by} onChange={e => setForm({ ...form, requested_by: e.target.value })} /></label>
          <label>Reason <textarea required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
          <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Create request'}</button>
        </form>
      )}

      <p><label>Status{' '}
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="converted">Converted</option>
        </select>
      </label></p>
      {loading ? <p>Loading requests...</p> : !error && requests.length === 0 ? <p>No purchase requests found.</p> : requests.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead><tr><th>ID</th><th>SKU</th><th>Product</th><th>Quantity</th><th>Requested by</th><th>Reason</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>{requests.map(request => {
              const colors = badgeColors[request.status] || ['#f1f5f9', '#334155'];
              return <tr key={request.id}>
                <td>{request.id}</td><td>{request.sku}</td><td>{request.product_name}</td><td>{request.quantity}</td>
                <td>{request.requested_by}</td><td>{request.reason}</td>
                <td><span style={{ background: colors[0], color: colors[1], padding: '0.2rem 0.5rem', borderRadius: '1rem' }}>{request.status}</span></td>
                <td>{request.created_at ? String(request.created_at).slice(0, 10) : '—'}</td>
                <td>{request.status === 'pending' && <><button type="button" disabled={busy} onClick={() => decide(request.id, 'approved')}>Approve</button>{' '}<button type="button" disabled={busy} onClick={() => decide(request.id, 'rejected')}>Reject</button></>}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
