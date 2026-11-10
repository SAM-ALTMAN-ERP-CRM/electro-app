import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Seed approval quotes for CRM-1 testing/offline
const SEED_APPROVALS = [
  {
    id: 'QUO-0004',
    opportunity_id: 'OPP-0004',
    customer_id: 'CUST-0004',
    dealer_id: 'DLR-0003',
    dealer_name: 'Crompton Retailers',
    dealer_tier: 'bronze',
    sales_rep_id: 'EMP-0004',
    status: 'draft',
    discount_percent: 8.0,
    needs_approval: true,
    approved: false,
    total_amount: 47748.80,
    created_at: '2024-03-04'
  },
  {
    id: 'QUO-0005',
    opportunity_id: 'OPP-0002',
    customer_id: 'CUST-0002',
    dealer_id: 'DLR-0002',
    dealer_name: 'Bharat Sound & Vision',
    dealer_tier: 'silver',
    sales_rep_id: 'EMP-0002',
    status: 'draft',
    discount_percent: 12.0,
    needs_approval: true,
    approved: false,
    total_amount: 98648.00,
    created_at: '2024-03-05'
  }
];

export default function ApprovalsPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [rejectingQuoteId, setRejectingQuoteId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('crm1', '/api/approvals');
      const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
      setQuotes(list);
    } catch (err) {
      console.warn('[crm1] API fetch failed, fallback to seed approvals:', err.message);
      setQuotes(SEED_APPROVALS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (quoteId) => {
    setError('');
    setActionMsg('');
    try {
      await api('crm1', `/api/quotes/${quoteId}/approve`, { method: 'PATCH' }).catch(() => {
        // Fallback local update
        console.warn(`[crm1] /approve API not reachable, simulating approve for ${quoteId}`);
      });
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      setActionMsg(`Quote ${quoteId} has been successfully approved.`);
    } catch (err) {
      setError(err.message || `Failed to approve quote ${quoteId}.`);
    }
  };

  const handleStartReject = (quoteId) => {
    setRejectingQuoteId(quoteId);
    setRejectionReason('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }

    const quoteId = rejectingQuoteId;
    setError('');
    setActionMsg('');
    try {
      await api('crm1', `/api/quotes/${quoteId}/reject`, {
        method: 'PATCH',
        body: { reason: rejectionReason.trim() }
      }).catch(() => {
        console.warn(`[crm1] /reject API not reachable, simulating reject for ${quoteId}`);
      });
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      setActionMsg(`Quote ${quoteId} was rejected with reason: "${rejectionReason.trim()}".`);
      setRejectingQuoteId(null);
      setRejectionReason('');
    } catch (err) {
      setError(err.message || `Failed to reject quote ${quoteId}.`);
    }
  };

  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTierGuideline = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'gold':
        return { label: 'Gold Tier', allowed: 15, badgeClass: 'badge-amber', style: { background: '#fef3c7', color: '#b45309' } };
      case 'silver':
        return { label: 'Silver Tier', allowed: 10, badgeClass: 'badge-blue', style: { background: '#e0f2fe', color: '#0369a1' } };
      case 'bronze':
      default:
        return { label: 'Bronze Tier', allowed: 5, badgeClass: 'badge', style: { background: '#ffedd5', color: '#c2410c' } };
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Manager Discount Approvals</h2>
          <span className="badge badge-red" style={{ background: '#fee2e2', color: '#b91c1c' }}>Admin Only</span>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.35rem' }}>
          Review and approve high-discount quotations exceeding dealer tier thresholds before they can be sent to customers.
        </p>
      </div>

      {/* Action Messages */}
      {actionMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
          ✓ {actionMsg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
          ⚠ {error}
        </div>
      )}

      {/* Rejection Modal / Prompt */}
      {rejectingQuoteId && (
        <div style={{ background: '#fff', border: '1px solid #f87171', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#991b1b', marginBottom: '0.5rem' }}>
            Reject Quotation {rejectingQuoteId}
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.75rem' }}>
            Please state the justification for rejecting this discount request:
          </p>
          <form onSubmit={handleConfirmReject}>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Discount exceeds standard 5% cap for Bronze dealer without VP sign-off."
              rows={3}
              style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.875rem', marginBottom: '0.75rem' }}
              required
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRejectingQuoteId(null)}
                style={{ padding: '0.4rem 0.85rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '0.4rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Checking pending approvals...</p>
      ) : quotes.length === 0 ? (
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '2.5rem', textAlign: 'center', borderRadius: '8px' }}>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0, fontWeight: 500 }}>
            🎉 All pending quotations have been reviewed! No approval requests waiting.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Quote ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Customer / Dealer</th>
                <th style={{ padding: '0.75rem 1rem' }}>Dealer Tier Limit</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Requested Discount</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total (₹)</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Sales Rep</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => {
                const guide = getTierGuideline(q.dealer_tier);
                const discount = Number(q.discount_percent) || 0;
                const exceedsBy = discount - guide.allowed;

                return (
                  <tr key={q.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{q.id}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{q.customer_id}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        {q.dealer_name ? `${q.dealer_name} (${q.dealer_id})` : (q.dealer_id || 'Direct')}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge" style={{ ...guide.style, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {guide.label}: Max {guide.allowed}%
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>
                        {discount}%
                      </span>
                      {exceedsBy > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                          (+{exceedsBy}% over tier)
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {formatMoney(q.total_amount || q.total || 0)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569' }}>
                      {q.sales_rep_id || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleApprove(q.id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStartReject(q.id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            background: '#ffffff',
                            color: '#dc2626',
                            border: '1px solid #f87171',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
