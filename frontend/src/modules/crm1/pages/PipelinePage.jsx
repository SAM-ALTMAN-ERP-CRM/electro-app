import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Five canonical pipeline stages in strict sequential progression
const STAGES = [
  { key: 'prospect', label: 'Prospect', color: '#3b82f6', headerBg: '#ffffff', borderTop: '#3b82f6', badgeBg: '#dbeafe', badgeText: '#1e40af' },
  { key: 'proposal', label: 'Proposal', color: '#8b5cf6', headerBg: '#ffffff', borderTop: '#8b5cf6', badgeBg: '#ede9fe', badgeText: '#5b21b6' },
  { key: 'negotiation', label: 'Negotiation', color: '#f59e0b', headerBg: '#ffffff', borderTop: '#f59e0b', badgeBg: '#fef3c7', badgeText: '#92400e' },
  { key: 'won', label: 'Won', color: '#10b981', headerBg: '#ecfdf5', borderTop: '#10b981', badgeBg: '#d1fae5', badgeText: '#065f46', isWon: true },
  { key: 'lost', label: 'Lost', color: '#ef4444', headerBg: '#fef2f2', borderTop: '#ef4444', badgeBg: '#fee2e2', badgeText: '#991b1b', isLost: true }
];

// Indian Numbering System currency formatter
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

function formatMoney(val) {
  const num = Number(val);
  return inrFormatter.format(isNaN(num) ? 0 : num);
}

// Format date safely for display
function formatDate(dateStr) {
  if (!dateStr) return 'Not specified';
  const clean = String(dateStr).split('T')[0];
  const dateObj = new Date(clean + 'T00:00:00');
  if (isNaN(dateObj.getTime())) return clean;
  return dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Strict forward sequence
function getNextStage(currentStage) {
  const order = ['prospect', 'proposal', 'negotiation', 'won'];
  const idx = order.indexOf(currentStage);
  if (idx !== -1 && idx < order.length - 1) {
    return order[idx + 1];
  }
  return null;
}

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [customerMap, setCustomerMap] = useState({});

  // 1. Fetch live opportunities from real backend API
  const loadOpportunities = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('crm1', '/api/opportunities');
      const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
      setOpportunities(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('[crm1] Failed to load opportunities:', err.message);
      setError(err.message || 'Failed to load opportunities from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  // 2. Fetch customer directory from CRM-3 if available (non-blocking lookup)
  useEffect(() => {
    let isMounted = true;
    async function loadCustomers() {
      try {
        const res = await api('crm3', '/api/customers');
        const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
        if (isMounted && Array.isArray(list)) {
          const map = {};
          for (const c of list) {
            if (c.id && c.name) {
              map[c.id] = c.name;
            }
          }
          setCustomerMap(map);
        }
      } catch (err) {
        // Safe fallback: when CRM-3 is offline, cleanly display customer_id without failing
        console.warn('[crm1] Customer lookup service unavailable:', err.message);
      }
    }
    loadCustomers();
    return () => { isMounted = false; };
  }, []);

  // 3. Real backend API stage advance
  const handleAdvanceStage = async (id, currentStage) => {
    const nextStage = getNextStage(currentStage);
    if (!nextStage || updatingId !== null) return;

    setUpdatingId(id);
    setActionError('');
    setActionSuccess('');

    try {
      const updated = await api('crm1', `/api/opportunities/${id}/stage`, {
        method: 'PATCH',
        body: { stage: nextStage }
      });

      // Update board with confirmed server response
      setOpportunities(prev => prev.map(opp => {
        if (opp.id === id) {
          return updated && updated.id ? updated : { ...opp, stage: nextStage };
        }
        return opp;
      }));

      const nextLabel = nextStage.charAt(0).toUpperCase() + nextStage.slice(1);
      setActionSuccess(`Opportunity ${id} successfully advanced to ${nextLabel}.`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error(`[crm1] Stage transition failed for ${id}:`, err.message);
      setActionError(`Cannot advance opportunity ${id}: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0.5rem' }}>
      {/* Header and Title */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Sales Pipeline Board
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
            Track deal progression across stages and monitor live pipeline values in INR.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOpportunities}
          disabled={loading || updatingId !== null}
          style={{
            padding: '0.45rem 0.9rem',
            fontSize: '0.8125rem',
            background: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh Board'}
        </button>
      </div>

      {/* Global Error Notice */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>Error:</strong> {error}</span>
          <button
            type="button"
            onClick={loadOpportunities}
            style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Action Feedback Banners */}
      {actionError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {actionSuccess}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && opportunities.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.95rem' }}>
          Loading opportunities from database...
        </div>
      )}

      {/* 5-Column Kanban Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(250px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
          overflowX: 'auto',
          paddingBottom: '1rem'
        }}
      >
        {STAGES.map(stg => {
          const cards = opportunities.filter(o => o.stage === stg.key);
          const columnTotal = cards.reduce((sum, c) => sum + (Number(c.expected_value) || 0), 0);

          return (
            <div
              key={stg.key}
              style={{
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  background: stg.headerBg,
                  padding: '1rem',
                  borderBottom: '1px solid #e2e8f0',
                  borderTop: `4px solid ${stg.borderTop}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: stg.isWon ? '#065f46' : stg.isLost ? '#991b1b' : '#1e293b',
                      margin: 0
                    }}
                  >
                    {stg.label}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      background: stg.badgeBg,
                      color: stg.badgeText,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                      fontWeight: 700
                    }}
                  >
                    {cards.length}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: stg.isWon ? '#047857' : stg.isLost ? '#b91c1c' : '#0f172a',
                    marginTop: '0.45rem'
                  }}
                >
                  {formatMoney(columnTotal)}
                </div>
              </div>

              {/* Cards Container */}
              <div
                style={{
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  minHeight: '380px'
                }}
              >
                {cards.length === 0 ? (
                  <div
                    style={{
                      color: '#94a3b8',
                      fontSize: '0.8125rem',
                      textAlign: 'center',
                      margin: 'auto 0',
                      padding: '2rem 1rem'
                    }}
                  >
                    No opportunities in this stage
                  </div>
                ) : (
                  cards.map(card => {
                    const nextStg = getNextStage(card.stage);
                    const canAdvance = card.stage !== 'won' && card.stage !== 'lost' && nextStg !== null;
                    const customerName = card.customer_id ? customerMap[card.customer_id] : null;
                    const isCardUpdating = updatingId === card.id;

                    return (
                      <div
                        key={card.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          padding: '0.85rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          position: 'relative'
                        }}
                      >
                        {/* ID and Customer ID Header */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            marginBottom: '0.35rem'
                          }}
                        >
                          <span style={{ color: '#1d4ed8', fontWeight: 700, letterSpacing: '0.02em' }}>
                            {card.id}
                          </span>
                          {card.sales_rep_id && (
                            <span style={{ color: '#64748b', fontSize: '0.7rem', background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                              {card.sales_rep_id}
                            </span>
                          )}
                        </div>

                        {/* Deal Title */}
                        <h4
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#0f172a',
                            margin: '0 0 0.4rem 0',
                            lineHeight: 1.35
                          }}
                        >
                          {card.title}
                        </h4>

                        {/* Customer Identification */}
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 600 }}>Customer: </span>
                          {card.customer_id ? (
                            customerName ? (
                              <span>
                                {customerName} <span style={{ color: '#94a3b8' }}>({card.customer_id})</span>
                              </span>
                            ) : (
                              <span>{card.customer_id}</span>
                            )
                          ) : (
                            <span style={{ color: '#94a3b8' }}>None</span>
                          )}
                        </div>

                        {/* Expected Value */}
                        <div
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#15803d',
                            marginBottom: '0.35rem'
                          }}
                        >
                          {formatMoney(card.expected_value)}
                        </div>

                        {/* Expected Close Date */}
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: canAdvance ? '0.75rem' : '0.2rem' }}>
                          <span style={{ fontWeight: 600 }}>Close Date: </span>
                          <span>{formatDate(card.expected_close_date)}</span>
                        </div>

                        {/* Advance Button (Hidden on Won and Lost) */}
                        {canAdvance && (
                          <button
                            type="button"
                            disabled={updatingId !== null}
                            onClick={() => handleAdvanceStage(card.id, card.stage)}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              fontSize: '0.8rem',
                              background: isCardUpdating ? '#94a3b8' : '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: 600,
                              cursor: updatingId !== null ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              boxShadow: isCardUpdating ? 'none' : '0 1px 2px rgba(37,99,235,0.2)'
                            }}
                          >
                            {isCardUpdating ? (
                              <span>Advancing...</span>
                            ) : (
                              <span>Advance Stage ➔</span>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
