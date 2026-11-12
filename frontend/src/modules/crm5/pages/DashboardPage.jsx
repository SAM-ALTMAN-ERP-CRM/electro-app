import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Realistic fallback seed data adhering strictly to Section 5 shared IDs
// Used when backend service is offline or initializing
const FALLBACK_SUMMARY = {
  total_leads: 12,
  open_opportunities: 7,
  won_value: 209970.0,
  quotes_accepted: 4,
  opportunities_by_stage: [
    { stage: 'prospect', label: 'Prospect', count: 3, value: 156940.0, color: '#3b82f6' },
    { stage: 'proposal', label: 'Proposal', count: 2, value: 135920.0, color: '#8b5cf6' },
    { stage: 'negotiation', label: 'Negotiation', count: 2, value: 225960.0, color: '#f59e0b' },
    { stage: 'won', label: 'Won', count: 4, value: 209970.0, color: '#10b981' },
    { stage: 'lost', label: 'Lost', count: 1, value: 24000.0, color: '#ef4444' }
  ],
  recent_opportunities: [
    { id: 'OPP-0001', title: 'Smart TV Corporate Setup', customer_id: 'CUST-0001', sales_rep_id: 'EMP-0001', stage: 'prospect', expected_value: 51980.0 },
    { id: 'OPP-0002', title: 'Dealer Bulk Appliances', customer_id: 'CUST-0004', sales_rep_id: 'EMP-0002', stage: 'proposal', expected_value: 67960.0 },
    { id: 'OPP-0003', title: 'Premium Home Theatre OLED', customer_id: 'CUST-0003', sales_rep_id: 'EMP-0003', stage: 'negotiation', expected_value: 112980.0 },
    { id: 'OPP-0004', title: 'Office Soundbar Integration', customer_id: 'CUST-0002', sales_rep_id: 'EMP-0001', stage: 'won', expected_value: 45000.0 },
    { id: 'OPP-0005', title: 'Audio Accessories Inquiries', customer_id: 'CUST-0005', sales_rep_id: 'EMP-0004', stage: 'lost', expected_value: 12000.0 },
    { id: 'OPP-0006', title: 'Retail Display Units 4K', customer_id: 'CUST-0006', sales_rep_id: 'EMP-0002', stage: 'won', expected_value: 85990.0 },
    { id: 'OPP-0007', title: 'Executive Boardroom Video Wall', customer_id: 'CUST-0007', sales_rep_id: 'EMP-0003', stage: 'won', expected_value: 78980.0 }
  ]
};

export default function DashboardPage() {
  // State for analytics metrics and UI controls
  const [summary, setSummary] = useState(FALLBACK_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');

  // Currency formatter in INR with Indian comma numbering
  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper for stage badge styling
  const getStageBadgeClass = (stage) => {
    switch (stage) {
      case 'won': return 'badge badge-green';
      case 'negotiation': return 'badge badge-amber';
      case 'lost': return 'badge badge-red';
      case 'prospect':
      case 'proposal':
      default:
        return 'badge badge-blue';
    }
  };

  // Fetch live metrics from CRM-5 backend
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api('crm5', '/api/dashboard/sales-summary');
      if (data && typeof data === 'object') {
        setSummary(data);
      }
    } catch (err) {
      console.warn('[crm5] API fetch failed, displaying fallback dataset:', err.message);
      setErrorMsg('Notice: Operating with offline seed data. Backend live service is synchronizing.');
      setSummary(FALLBACK_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derive stage metrics and max value for CSS bar chart scaling
  const stages = summary.opportunities_by_stage || [];
  const maxCount = Math.max(...stages.map(s => Number(s.count) || 0), 1);
  const totalPipelineCount = stages.reduce((acc, s) => acc + (Number(s.count) || 0), 0);
  const totalPipelineValue = stages.reduce((acc, s) => acc + (Number(s.value) || 0), 0);

  // Filter recent opportunities by stage if selected
  const allOpps = summary.recent_opportunities || [];
  const filteredOpps = selectedStage === 'all'
    ? allOpps
    : allOpps.filter(o => o.stage === selectedStage);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em' }}>
              Executive Sales & Pipeline Dashboard
            </h2>
            <span className="badge badge-blue">CRM-5</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Live performance summary across leads, pipeline stages, revenue, and quote conversions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div style={{ padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#1d4ed8', fontSize: '0.875rem' }}>
          ⏳ Loading dashboard analytics...
        </div>
      )}

      {/* Friendly error/offline banner */}
      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', color: '#92400e', fontSize: '0.875rem' }}>
          ℹ️ {errorMsg}
        </div>
      )}

      {/* 4 KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Leads */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderTop: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>Total Leads</span>
            <span className="badge badge-blue">CRM-1</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
            {summary.total_leads}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
            Active customer leads captured
          </p>
        </div>

        {/* Card 2: Open Opportunities */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderTop: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>Open Opportunities</span>
            <span className="badge badge-amber">In Pipeline</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
            {summary.open_opportunities}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
            Active deals in progress
          </p>
        </div>

        {/* Card 3: Won Value */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderTop: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>Won Value</span>
            <span className="badge badge-green">Closed Deals</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a' }}>
            {formatMoney(summary.won_value)}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
            Realized closed-won revenue
          </p>
        </div>

        {/* Card 4: Quotes Accepted */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderTop: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>Quotes Accepted</span>
            <span className="badge badge-green">Accepted</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
            {summary.quotes_accepted}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
            Approved sales quotations
          </p>
        </div>
      </div>

      {/* HTML / CSS Bar Chart: Opportunities per Stage (No External Chart Library) */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Opportunities by Pipeline Stage
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Deal count and monetary value scaled dynamically per sales stage (CSS flexbox/width bars).
            </p>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Total Pipeline Volume: <strong style={{ color: '#0f172a' }}>{formatMoney(totalPipelineValue)}</strong> ({totalPipelineCount} deals)
          </div>
        </div>

        {/* Empty state check */}
        {stages.length === 0 ? (
          <p style={{ color: '#64748b', fontStyle: 'italic', padding: '1rem 0' }}>
            No stage distribution data available.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stages.map((stg) => {
              // Calculate percentage width scaled relative to the highest stage count
              const widthPct = maxCount > 0 ? Math.round(((Number(stg.count) || 0) / maxCount) * 100) : 0;
              const sharePct = totalPipelineCount > 0 ? Math.round(((Number(stg.count) || 0) / totalPipelineCount) * 100) : 0;
              const isSelected = selectedStage === stg.stage;

              return (
                <div
                  key={stg.stage}
                  onClick={() => setSelectedStage(isSelected ? 'all' : stg.stage)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '130px 1fr 160px',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer',
                    padding: '0.4rem 0.5rem',
                    borderRadius: '6px',
                    background: isSelected ? '#f8fafc' : 'transparent',
                    border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Click to filter table by ${stg.label}`}
                >
                  {/* Stage Label and Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: stg.color || '#2563eb' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                      {stg.label}
                    </span>
                  </div>

                  {/* HTML / CSS Bar Track & Fill */}
                  <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '28px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(widthPct, 6)}%`,
                        backgroundColor: stg.color || '#2563eb',
                        borderRadius: '6px',
                        transition: 'width 0.4s ease-in-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '0.5rem'
                      }}
                    >
                      <span style={{ color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>
                        {stg.count}
                      </span>
                    </div>
                    <span style={{ position: 'absolute', right: '0.75rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                      {sharePct}% of total
                    </span>
                  </div>

                  {/* Stage Monetary Value */}
                  <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                    {formatMoney(stg.value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stage Drill-down and Opportunity Records */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Contributing Opportunities
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Filtered view of deals powering current KPI calculations.
            </p>
          </div>

          {/* Quick Stage Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedStage('all')}
              style={{
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: selectedStage === 'all' ? '#0f172a' : '#f1f5f9',
                color: selectedStage === 'all' ? '#ffffff' : '#334155',
                border: '1px solid #cbd5e1'
              }}
            >
              All Stages ({allOpps.length})
            </button>
            {stages.map(stg => (
              <button
                key={stg.stage}
                type="button"
                onClick={() => setSelectedStage(stg.stage)}
                style={{
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.8rem',
                  backgroundColor: selectedStage === stg.stage ? stg.color : '#f1f5f9',
                  color: selectedStage === stg.stage ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1'
                }}
              >
                {stg.label} ({stg.count})
              </button>
            ))}
          </div>
        </div>

        {/* Opportunities Table */}
        {filteredOpps.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            No opportunities found for the selected stage.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Opportunity ID</th>
                  <th>Title</th>
                  <th>Customer ID</th>
                  <th>Sales Rep</th>
                  <th>Stage</th>
                  <th style={{ textAlign: 'right' }}>Expected Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpps.map(opp => (
                  <tr key={opp.id}>
                    <td>
                      <strong>{opp.id}</strong>
                    </td>
                    <td>{opp.title}</td>
                    <td>
                      <code>{opp.customer_id}</code>
                    </td>
                    <td>{opp.sales_rep_id}</td>
                    <td>
                      <span className={getStageBadgeClass(opp.stage)}>
                        {opp.stage.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(opp.expected_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
