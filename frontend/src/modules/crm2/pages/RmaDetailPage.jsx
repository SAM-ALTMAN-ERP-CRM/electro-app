// [CRM2-C2] RMA detail page: shows full RMA info, Approve/Reject buttons, outcome dropdown.
// CRM2-C3 (Ashutosh) will add a status timeline below the detail card — space is left for it.
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';

// Valid status values and their badge classes
const STATUS_BADGE = {
  requested: 'badge badge-blue',
  approved:  'badge badge-green',
  rejected:  'badge badge-red',
  received:  'badge badge-amber',
  closed:    'badge',
};

// Outcome options as defined in the C1 schema
const OUTCOMES = [
  { value: '',            label: '— select outcome —' },
  { value: 'restock',    label: 'Restock' },
  { value: 'repair',     label: 'Repair' },
  { value: 'credit_note', label: 'Credit Note' },
];

// Single mock row used as fallback when C1 API isn't reachable yet
const MOCK_BY_ID = {
  'RMA-0001': {
    id: 'RMA-0001', ticket_id: 'TKT-0001', serial_number: 'TV55-2611-0001',
    reason: 'Screen flickers after warm-up. Customer wants a full unit replacement.',
    status: 'requested', outcome: null,
    requested_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), decided_at: null,
  },
  'RMA-0002': {
    id: 'RMA-0002', ticket_id: 'TKT-0002', serial_number: 'TV55-2611-0002',
    reason: 'No audio on HDMI input. Part repair is not feasible per engineer report.',
    status: 'approved', outcome: 'repair',
    requested_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    decided_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
  },
  'RMA-0003': {
    id: 'RMA-0003', ticket_id: 'TKT-0003', serial_number: 'TV55-2611-0003',
    reason: 'Remote not pairing. Customer insists on a replacement remote.',
    status: 'rejected', outcome: null,
    requested_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    decided_at: new Date(Date.now() - 68 * 3600 * 1000).toISOString(),
  },
};

export default function RmaDetailPage() {
  const { id } = useParams();

  const [rma, setRma]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');

  // Decision form state
  const [outcome, setOutcome]       = useState('');
  const [deciding, setDeciding]     = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [decisionMsg, setDecisionMsg]     = useState('');

  // Load single RMA; fall back to mock if C1 not up yet
  const loadRma = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api('crm2', `/api/rmas/${id}`);
      setRma(data);
      // Pre-fill the outcome dropdown if already decided
      setOutcome(data.outcome || '');
    } catch (err) {
      const mock = MOCK_BY_ID[id];
      if (mock) {
        console.warn('[mock] used for rma:', err.message);
        setRma(mock);
        setOutcome(mock.outcome || '');
      } else {
        setLoadError(`RMA "${id}" not found. It may not exist or the API is temporarily down.`);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadRma(); }, [loadRma]);

  // Send a decision (approve or reject) to the PATCH /api/rmas/:id/decision endpoint
  async function handleDecision(newStatus) {
    setDecisionError('');
    setDecisionMsg('');

    // Approval requires an outcome
    if (newStatus === 'approved' && !outcome) {
      setDecisionError('Please select an outcome before approving.');
      return;
    }

    setDeciding(true);
    try {
      const body = { status: newStatus };
      if (newStatus === 'approved') body.outcome = outcome;

      const updated = await api('crm2', `/api/rmas/${id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      setRma(updated);
      setDecisionMsg(`RMA ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully.`);
    } catch (err) {
      // Show the server's error message (e.g. "Out of warranty" or "outcome is required")
      setDecisionError(err.message || 'Decision failed. Please try again.');
    } finally {
      setDeciding(false);
    }
  }

  // Format an ISO date string for display
  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  if (loading) return <p>Loading RMA details…</p>;
  if (loadError) return (
    <div>
      <Link to="../rmas">← Back to Returns</Link>
      <p style={{ color: 'red', marginTop: '1rem' }}>{loadError}</p>
    </div>
  );
  if (!rma) return null;

  const isPending = rma.status === 'requested';

  return (
    <div>
      {/* Back link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to="../rmas">← Back to Returns</Link>
      </div>

      {/* ---- RMA detail card ---- */}
      <div style={{ background: 'var(--surface, #f8f8f8)', border: '1px solid #ddd', borderRadius: '6px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{rma.id}</h2>
          <span className={STATUS_BADGE[rma.status] || 'badge'}>{rma.status}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Ticket ID',      rma.ticket_id],
              ['Serial Number',  rma.serial_number],
              ['Reason',         rma.reason],
              ['Outcome',        rma.outcome || '—'],
              ['Requested At',   fmt(rma.requested_at)],
              ['Decided At',     fmt(rma.decided_at)],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem 0.4rem 0', width: '140px', fontWeight: 600 }}>{label}</th>
                <td style={{ padding: '0.4rem 0' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Approve / Reject controls (only when status is 'requested') ---- */}
      {isPending && (
        <div style={{ background: 'var(--surface, #f8f8f8)', border: '1px solid #ddd', borderRadius: '6px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Make a Decision</h3>

          <label htmlFor="rma-outcome">Outcome (required to approve)</label>
          <select
            id="rma-outcome"
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
            style={{ display: 'block', width: '100%', maxWidth: '300px', margin: '0.5rem 0 1rem', padding: '0.4rem' }}
          >
            {OUTCOMES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {decisionError && (
            <p style={{ color: 'red', marginBottom: '0.75rem' }}>{decisionError}</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn"
              style={{ background: '#16a34a', color: '#fff', border: 'none' }}
              onClick={() => handleDecision('approved')}
              disabled={deciding}
            >
              {deciding ? 'Processing…' : '✓ Approve'}
            </button>
            <button
              className="btn"
              style={{ background: '#dc2626', color: '#fff', border: 'none' }}
              onClick={() => handleDecision('rejected')}
              disabled={deciding}
            >
              {deciding ? 'Processing…' : '✗ Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Success message after decision */}
      {decisionMsg && (
        <p style={{ color: 'green', fontWeight: 500 }}>{decisionMsg}</p>
      )}

      {/* ---- Placeholder for CRM2-C3 status timeline (Ashutosh will add this) ---- */}
      {/* STATUS TIMELINE — CRM2-C3 will render a timeline component here */}
    </div>
  );
}

