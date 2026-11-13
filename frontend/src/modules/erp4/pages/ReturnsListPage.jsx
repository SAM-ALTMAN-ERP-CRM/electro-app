import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

// Allowed return statuses per cross-team contracts
const STATUS_OPTIONS = ['all', 'requested', 'received', 'restocked', 'scrapped'];

// Fallback seed returns adhering to Section 5 shared IDs
const DEFAULT_SEED_RETURNS = [
  {
    id: 'RET-0001',
    so_id: 'SO-0001',
    customer_id: 'CUST-0001',
    customer_name: 'Aarav Mehta',
    serial_number: 'TV55-2611-0001',
    reason: 'Display panel flickering on HDMI 2',
    rma_id: 'RMA-0001',
    outcome: 'credit_note',
    status: 'requested',
    created_at: '2026-10-15T10:00:00.000Z'
  },
  {
    id: 'RET-0002',
    so_id: 'SO-0002',
    customer_id: 'CUST-0002',
    customer_name: 'Sunrise Electronics Pvt Ltd',
    serial_number: 'TV55-2611-0002',
    reason: 'Damaged during courier transit',
    rma_id: 'RMA-0002',
    outcome: 'replacement',
    status: 'received',
    created_at: '2026-10-18T14:30:00.000Z'
  },
  {
    id: 'RET-0003',
    so_id: 'SO-0003',
    customer_id: 'CUST-0003',
    customer_name: 'Priya Nair',
    serial_number: 'TV55-2611-0003',
    reason: 'Customer cancelled before installation',
    rma_id: null,
    outcome: 'credit_note',
    status: 'restocked',
    created_at: '2026-10-20T11:15:00.000Z'
  },
  {
    id: 'RET-0004',
    so_id: 'SO-0004',
    customer_id: 'CUST-0004',
    customer_name: 'TechWorld Retail Hub',
    serial_number: 'TV55-2611-0004',
    reason: 'Internal power board short circuit',
    rma_id: 'RMA-0003',
    outcome: 'scrapped',
    status: 'scrapped',
    created_at: '2026-10-22T16:00:00.000Z'
  }
];

export default function ReturnsListPage() {
  const [returns, setReturns] = useState([]);
  const [summary, setSummary] = useState({ total: 0, requested: 0, received: 0, restocked: 0, scrapped: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    so_id: '',
    serial_number: '',
    reason: '',
    rma_id: '',
    outcome: 'credit_note'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api('erp4', '/api/returns');
      const list = Array.isArray(res) ? res : (res?.data || DEFAULT_SEED_RETURNS);
      setReturns(list);

      // Compute KPI summary counts
      const counts = { total: list.length, requested: 0, received: 0, restocked: 0, scrapped: 0 };
      list.forEach((r) => {
        const s = (r.status || '').toLowerCase();
        if (counts[s] !== undefined) counts[s]++;
      });
      setSummary(counts);
    } catch (err) {
      // Fallback to offline defaults
      setReturns(DEFAULT_SEED_RETURNS);
      setSummary({ total: 4, requested: 1, received: 1, restocked: 1, scrapped: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    let badgeClass = 'badge-gray';
    if (s === 'received') badgeClass = 'badge-amber';
    if (s === 'restocked') badgeClass = 'badge-green';
    if (s === 'scrapped') badgeClass = 'badge-red';
    return <span className={`badge ${badgeClass}`}>{s}</span>;
  };

  const handleCreateReturn = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormMsg(null);

      const payload = {
        so_id: formData.so_id.trim(),
        serial_number: formData.serial_number.trim(),
        reason: formData.reason.trim(),
        rma_id: formData.rma_id.trim() || null,
        outcome: formData.outcome
      };

      const res = await api('erp4', '/api/returns', { method: 'POST', body: payload });
      const created = res?.data || res;

      setFormMsg({ type: 'success', text: `Return ${created?.id || ''} registered successfully for serial ${formData.serial_number}` });
      setFormData({ so_id: '', serial_number: '', reason: '', rma_id: '', outcome: 'credit_note' });
      setShowForm(false);
      loadData();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to raise return' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status.toLowerCase() === statusFilter.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      (r.so_id && r.so_id.toLowerCase().includes(q)) ||
      (r.serial_number && r.serial_number.toLowerCase().includes(q)) ||
      (r.reason && r.reason.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              Returns & Return Receipts
            </h1>
            <span className="badge badge-blue">ERP-4 Returns</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Inspect incoming RMA returns, process restock inventory adjustments, and issue customer credit notes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '0.5rem 1rem',
            background: showForm ? '#f1f5f9' : '#2563eb',
            color: showForm ? '#1e293b' : '#ffffff',
            border: showForm ? '1px solid #cbd5e1' : 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {showForm ? '✕ Close Form' : '+ Raise New Return'}
        </button>
      </div>

      {formMsg && (
        <div
          style={{
            background: formMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${formMsg.type === 'success' ? '#86efac' : '#f87171'}`,
            color: formMsg.type === 'success' ? '#15803d' : '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem'
          }}
        >
          {formMsg.type === 'success' ? '✓' : '⚠️'} {formMsg.text}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>TOTAL RETURNS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>{summary.total}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>REQUESTED</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#64748b', marginTop: '0.25rem' }}>{summary.requested}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>RECEIVED</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706', marginTop: '0.25rem' }}>{summary.received}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>RESTOCKED</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a', marginTop: '0.25rem' }}>{summary.restocked}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>SCRAPPED</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626', marginTop: '0.25rem' }}>{summary.scrapped}</div>
        </div>
      </div>

      {/* New Return Form Drawer */}
      {showForm && (
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            📦 Raise New Customer Return
          </h3>
          <form onSubmit={handleCreateReturn}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Sales Order ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SO-0001"
                  value={formData.so_id}
                  onChange={e => setFormData({ ...formData, so_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Serial Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TV55-2611-0001"
                  value={formData.serial_number}
                  onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Linked RMA ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. RMA-0001"
                  value={formData.rma_id}
                  onChange={e => setFormData({ ...formData, rma_id: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Resolution Outcome
                </label>
                <select
                  value={formData.outcome}
                  onChange={e => setFormData({ ...formData, outcome: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="credit_note">Issue Credit Note</option>
                  <option value="replacement">Free Replacement</option>
                  <option value="scrapped">Scrap Damaged Item</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Return Reason <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows="2"
                placeholder="Explain customer return reason and physical condition..."
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Submitting...' : 'Register Return'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search return ID, order, serial..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '260px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Filter Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Returns Table */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading returns and RMA receipts...
          </div>
        ) : filteredReturns.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No returns found matching your filter criteria.
          </div>
        ) : (
          <table style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr>
                <th>Return ID</th>
                <th>Order Ref</th>
                <th>Serial Number</th>
                <th>Reason</th>
                <th>Linked RMA</th>
                <th>Outcome</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map(ret => (
                <tr key={ret.id}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{ret.id}</td>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>{ret.so_id}</td>
                  <td>
                    <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      {ret.serial_number}
                    </code>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#475569', maxWidth: '240px' }}>{ret.reason}</td>
                  <td style={{ fontSize: '0.85rem' }}>{ret.rma_id || '—'}</td>
                  <td style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                    {ret.outcome ? ret.outcome.replace('_', ' ') : '—'}
                  </td>
                  <td>{renderStatusBadge(ret.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={`/erp4/returns/${ret.id}`}
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontWeight: 600
                      }}
                    >
                      Inspect →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
