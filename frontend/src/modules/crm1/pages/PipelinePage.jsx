import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

const STAGES = [
  { key: 'prospect', label: 'Prospect', color: '#3b82f6' },
  { key: 'proposal', label: 'Proposal', color: '#8b5cf6' },
  { key: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
  { key: 'won', label: 'Won', color: '#10b981' },
  { key: 'lost', label: 'Lost', color: '#ef4444' }
];

const SEED_OPPORTUNITIES = [
  { id: 'OPP-0001', lead_id: 'LEAD-0001', customer_id: 'CUST-0001', title: 'Smart TV Corporate Setup', expected_value: 51980.0, stage: 'prospect', sales_rep_id: 'EMP-0001' },
  { id: 'OPP-0002', lead_id: 'LEAD-0004', customer_id: 'CUST-0004', title: 'Dealer Bulk Appliances', expected_value: 67960.0, stage: 'proposal', sales_rep_id: 'EMP-0002' },
  { id: 'OPP-0003', lead_id: 'LEAD-0002', customer_id: 'CUST-0003', title: 'Premium Home Theatre OLED', expected_value: 112980.0, stage: 'negotiation', sales_rep_id: 'EMP-0003' },
  { id: 'OPP-0004', lead_id: 'LEAD-0003', customer_id: 'CUST-0002', title: 'Office Soundbar Integration', expected_value: 45000.0, stage: 'won', sales_rep_id: 'EMP-0001' },
  { id: 'OPP-0005', lead_id: 'LEAD-0005', customer_id: 'CUST-0005', title: 'Audio Accessories Inquiries', expected_value: 12000.0, stage: 'lost', sales_rep_id: 'EMP-0004' }
];

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState(SEED_OPPORTUNITIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOpportunities() {
      setLoading(true);
      try {
        const res = await api('crm1', '/api/opportunities');
        const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
        if (list.length > 0) setOpportunities(list);
      } catch (err) {
        console.warn('[crm1] API fetch failed, using seed opportunities:', err.message);
        setOpportunities(SEED_OPPORTUNITIES);
      } finally {
        setLoading(false);
      }
    }
    loadOpportunities();
  }, []);

  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getNextStage = (current) => {
    const order = ['prospect', 'proposal', 'negotiation', 'won'];
    const idx = order.indexOf(current);
    if (idx !== -1 && idx < order.length - 1) {
      return order[idx + 1];
    }
    return null;
  };

  const handleAdvanceStage = (id, currentStage) => {
    const nextStage = getNextStage(currentStage);
    if (!nextStage) return;

    setOpportunities(prev => prev.map(opp => {
      if (opp.id === id) {
        return { ...opp, stage: nextStage };
      }
      return opp;
    }));
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Opportunity Pipeline Board</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Visualize active opportunities across sales stages and track expected revenues in INR.
        </p>
      </div>

      {loading && <p style={{ color: '#64748b', marginBottom: '1rem' }}>Loading pipeline data...</p>}

      {/* 5 Column Pipeline Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'start' }}>
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
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              {/* Column Header */}
              <div style={{ background: '#ffffff', padding: '1rem', borderBottom: '1px solid #e2e8f0', borderTop: `4px solid ${stg.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{stg.label}</h3>
                  <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600, color: '#475569' }}>
                    {cards.length}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: '0.4rem' }}>
                  Total: {formatMoney(columnTotal)}
                </div>
              </div>

              {/* Cards List */}
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '300px' }}>
                {cards.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', margin: '2rem 0' }}>
                    No opportunities in this stage
                  </p>
                ) : (
                  cards.map(card => {
                    const nextStg = getNextStage(card.stage);

                    return (
                      <div
                        key={card.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          padding: '0.85rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>
                          <span>{card.id}</span>
                          <span style={{ color: '#64748b' }}>{card.customer_id}</span>
                        </div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', margin: '0.4rem 0' }}>
                          {card.title}
                        </h4>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#15803d', marginBottom: '0.6rem' }}>
                          {formatMoney(card.expected_value)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.6rem' }}>
                          Rep: {card.sales_rep_id}
                        </div>

                        {nextStg && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStage(card.id, card.stage)}
                            style={{
                              width: '100%',
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.75rem',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Move to {nextStg.charAt(0).toUpperCase() + nextStg.slice(1)} →
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
