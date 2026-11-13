// [CRM2-C2] RMA list page: table of all RMAs + "Request RMA" form
// Path: rmas  Label: Returns (RMA)  Roles: admin, support
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

// Valid status values and their badge classes (see CRM-2 shared CSS)
const STATUS_BADGE = {
  requested: 'badge badge-blue',
  approved:  'badge badge-green',
  rejected:  'badge badge-red',
  received:  'badge badge-amber',
  closed:    'badge',
};

// Mock RMA rows used when the C1 API is not reachable yet
const MOCK_RMAS = [
  {
    id: 'RMA-0001',
    ticket_id: 'TKT-0001',
    serial_number: 'TV55-2611-0001',
    reason: 'Screen flickers after warm-up. Customer wants a full unit replacement.',
    status: 'requested',
    outcome: null,
    requested_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    decided_at: null,
  },
  {
    id: 'RMA-0002',
    ticket_id: 'TKT-0002',
    serial_number: 'TV55-2611-0002',
    reason: 'No audio on HDMI input. Part repair is not feasible per engineer report.',
    status: 'approved',
    outcome: 'repair',
    requested_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    decided_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
  },
  {
    id: 'RMA-0003',
    ticket_id: 'TKT-0003',
    serial_number: 'TV55-2611-0003',
    reason: 'Remote not pairing. Customer insists on a replacement remote.',
    status: 'rejected',
    outcome: null,
    requested_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    decided_at: new Date(Date.now() - 68 * 3600 * 1000).toISOString(),
  },
];

// Try loading tickets from C1 API for the dropdown; fall back to plain IDs TKT-0001..0006
const FALLBACK_TICKETS = [
  'TKT-0001', 'TKT-0002', 'TKT-0003',
  'TKT-0004', 'TKT-0005', 'TKT-0006',
];

export default function RmasPage() {
  const [rmas, setRmas]           = useState([]);
  const [tickets, setTickets]     = useState(FALLBACK_TICKETS);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showForm, setShowForm]   = useState(false);

  // Form state
  const [ticketId, setTicketId]       = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [reason, setReason]           = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState('');

  // Load all RMAs from our own C1 API; fall back to mock rows if the API isn't up yet
  const loadRmas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('crm2', '/api/rmas');
      setRmas(Array.isArray(data) ? data : []);
    } catch (err) {
      // C1 not merged yet — show mock data so the page still works
      console.warn('[mock] used for rmas:', err.message);
      setRmas(MOCK_RMAS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Try loading ticket IDs from the tickets API for the dropdown
  const loadTickets = useCallback(async () => {
    try {
      const data = await api('crm2', '/api/tickets');
      if (Array.isArray(data) && data.length > 0) {
        setTickets(data.map(t => t.id));
      }
    } catch {
      // Keep the fallback list
    }
  }, []);

  useEffect(() => {
    loadRmas();
    loadTickets();
  }, [loadRmas, loadTickets]);

  // Submit "Request RMA" form
  async function handleSubmit(e) {
    e.preventDefault();
    if (!ticketId.trim() || !serialNumber.trim() || !reason.trim()) {
      setFormError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await api('crm2', '/api/rmas', {
        method: 'POST',
        body: JSON.stringify({ ticket_id: ticketId.trim(), serial_number: serialNumber.trim(), reason: reason.trim() }),
        headers: { 'Content-Type': 'application/json' },
      });
      // Reset form and reload table
      setTicketId('');
      setSerialNumber('');
      setReason('');
      setShowForm(false);
      await loadRmas();
    } catch (err) {
      setFormError(err.message || 'Failed to request RMA. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Format an ISO date string as a readable local date+time
  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2>Returns (RMA)</h2>
        <button className="btn" onClick={() => { setShowForm(f => !f); setFormError(''); }}>
          {showForm ? 'Cancel' : '+ Request RMA'}
        </button>
      </div>

      {/* ---- Request RMA form ---- */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--surface, #f8f8f8)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0 }}>Request RMA</h3>

          <label htmlFor="rma-ticket">Ticket ID *</label>
          {/* Show a dropdown if we have ticket data, else a text box */}
          {tickets.length > 0 ? (
            <select
              id="rma-ticket"
              value={ticketId}
              onChange={e => setTicketId(e.target.value)}
              style={{ display: 'block', width: '100%', marginBottom: '0.75rem', padding: '0.4rem' }}
            >
              <option value="">— select a ticket —</option>
              {tickets.map(tid => (
                <option key={tid} value={tid}>{tid}</option>
              ))}
            </select>
          ) : (
            <input
              id="rma-ticket"
              type="text"
              placeholder="e.g. TKT-0001"
              value={ticketId}
              onChange={e => setTicketId(e.target.value)}
              style={{ display: 'block', width: '100%', marginBottom: '0.75rem', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          )}

          <label htmlFor="rma-serial">Serial Number *</label>
          <input
            id="rma-serial"
            type="text"
            placeholder="e.g. TV55-2611-0001"
            value={serialNumber}
            onChange={e => setSerialNumber(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: '0.75rem', padding: '0.4rem', boxSizing: 'border-box' }}
          />

          <label htmlFor="rma-reason">Reason *</label>
          <textarea
            id="rma-reason"
            rows={3}
            placeholder="Describe why the return is needed…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: '0.75rem', padding: '0.4rem', boxSizing: 'border-box' }}
          />

          {formError && <p style={{ color: 'red', marginBottom: '0.5rem' }}>{formError}</p>}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit RMA Request'}
          </button>
        </form>
      )}

      {/* ---- RMA table ---- */}
      {loading && <p>Loading RMAs…</p>}
      {!loading && error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && rmas.length === 0 && !error && (
        <p>No RMA requests yet. Click <strong>+ Request RMA</strong> to create one.</p>
      )}

      {!loading && rmas.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['RMA ID', 'Ticket', 'Serial', 'Reason', 'Status', 'Requested At'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #ccc' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rmas.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>
                  <Link to={r.id}>{r.id}</Link>
                </td>
                <td style={{ padding: '0.5rem' }}>{r.ticket_id}</td>
                <td style={{ padding: '0.5rem' }}>{r.serial_number}</td>
                <td style={{ padding: '0.5rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={r.reason}>{r.reason}</td>
                <td style={{ padding: '0.5rem' }}>
                  <span className={STATUS_BADGE[r.status] || 'badge'}>{r.status}</span>
                </td>
                <td style={{ padding: '0.5rem' }}>{fmt(r.requested_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

