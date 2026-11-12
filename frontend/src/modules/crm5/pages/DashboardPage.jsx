import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Realistic fallback seed data adhering strictly to Section 5 shared IDs
// Used when backend service is offline or initializing
const FALLBACK_SUMMARY = {
  range: 'all_time',
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

const RANGE_OPTIONS = [
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'all_time', label: 'All Time' }
];

export default function DashboardPage() {
  // State for analytics metrics and UI controls
  const [summary, setSummary] = useState(FALLBACK_SUMMARY);
  const [selectedRange, setSelectedRange] = useState('all_time');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');

  // State for snapshots [CRM5-B3]
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [snapshotsError, setSnapshotsError] = useState('');
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const [snapshotError, setSnapshotError] = useState('');

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

  // Fetch live metrics from CRM-5 backend with date filter
  const fetchDashboardData = useCallback(async (rangeToFetch) => {
    const targetRange = rangeToFetch || selectedRange;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api('crm5', `/api/dashboard/sales-summary?range=${targetRange}`);
      const data = res && res.data ? res.data : res;
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
  }, [selectedRange]);

  // Fetch historical saved snapshots from database
  const fetchSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    setSnapshotsError('');
    try {
      const res = await api('crm5', '/api/dashboard/snapshots');
      const list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      setSnapshots(list);
    } catch (err) {
      console.warn('[crm5] Error fetching snapshots:', err.message);
      setSnapshotsError('Failed to load snapshot history from database.');
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedRange);
    fetchSnapshots();
  }, [fetchDashboardData, fetchSnapshots]);

  // Handle date filter tab click
  const handleRangeChange = (newRange) => {
    if (newRange === selectedRange || loading) return;
    setSelectedRange(newRange);
    fetchDashboardData(newRange);
  };

  // Handle Save Snapshot button click
  const handleSaveSnapshot = async () => {
    if (savingSnapshot) return;
    setSavingSnapshot(true);
    setSnapshotMsg('');
    setSnapshotError('');

    try {
      const payload = {
        range: selectedRange,
        metrics: {
          range: selectedRange,
          total_leads: summary.total_leads,
          open_opportunities: summary.open_opportunities,
          won_value: summary.won_value,
          quotes_accepted: summary.quotes_accepted,
          opportunities_by_stage: summary.opportunities_by_stage
        }
      };

      const res = await api('crm5', '/api/dashboard/snapshot', {
        method: 'POST',
        body: payload
      });

      const saved = res?.data || res;
      const rangeLabel = RANGE_OPTIONS.find(r => r.key === selectedRange)?.label || selectedRange;
      setSnapshotMsg(`Snapshot ${saved?.id || 'record'} captured successfully for range "${rangeLabel}"!`);
      // Refresh history list immediately
      fetchSnapshots();
    } catch (err) {
      console.error('[crm5] Error saving snapshot:', err.message);
      setSnapshotError(`Failed to save snapshot: ${err.message}`);
    } finally {
      setSavingSnapshot(false);
    }
  };

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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Date Filter Selector Buttons [CRM5-B3] */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            {RANGE_OPTIONS.map((opt) => {
              const isActive = selectedRange === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleRangeChange(opt.key)}
                  disabled={loading}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    backgroundColor: isActive ? '#0f172a' : 'transparent',
                    color: isActive ? '#ffffff' : '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Save Snapshot Button [CRM5-B3] */}
          <button
            type="button"
            onClick={handleSaveSnapshot}
            disabled={savingSnapshot || loading}
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: '1px solid #059669',
              borderRadius: '6px',
              cursor: savingSnapshot ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title="Capture current analytics metrics and selected date range to database"
          >
            {savingSnapshot ? 'Saving...' : '📸 Save Snapshot'}
          </button>

          {/* Refresh Data Button */}
          <button
            type="button"
            onClick={() => fetchDashboardData(selectedRange)}
            disabled={loading}
            style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>
      </div>

      {/* Snapshot Success Notification */}
      {snapshotMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontSize: '0.875rem' }}>
          ✅ {snapshotMsg}
        </div>
      )}

      {/* Snapshot Error Notification */}
      {snapshotError && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.875rem' }}>
          ⚠️ {snapshotError}
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div style={{ padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#1d4ed8', fontSize: '0.875rem' }}>
          ⏳ Loading dashboard analytics ({RANGE_OPTIONS.find(r => r.key === selectedRange)?.label})...
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

      {/* Snapshot History Table [CRM5-B3] */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Snapshot History
              </h3>
              <span className="badge badge-blue">Audit Log</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Saved point-in-time executive analytics snapshots persisted in PostgreSQL.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSnapshots}
            disabled={snapshotsLoading}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
          >
            {snapshotsLoading ? 'Refreshing...' : '🔄 Refresh History'}
          </button>
        </div>

        {snapshotsLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            ⏳ Loading snapshot history from database...
          </div>
        ) : snapshotsError ? (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem' }}>
            ⚠️ {snapshotsError}
          </div>
        ) : snapshots.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            No snapshots saved yet. Click <strong>"📸 Save Snapshot"</strong> above to capture the current analytics view.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Snapshot ID</th>
                  <th>Date Range</th>
                  <th>Captured At</th>
                  <th style={{ textAlign: 'center' }}>Total Leads</th>
                  <th style={{ textAlign: 'center' }}>Open Opps</th>
                  <th style={{ textAlign: 'right' }}>Won Revenue</th>
                  <th style={{ textAlign: 'center' }}>Accepted Quotes</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snap) => {
                  const m = snap.metrics || {};
                  const rangeKey = snap.range || m.range || 'all_time';
                  const rangeLabel = RANGE_OPTIONS.find(r => r.key === rangeKey)?.label || rangeKey;
                  const rangeBadgeColor = rangeKey === 'this_week' ? 'badge-blue' : rangeKey === 'this_month' ? 'badge-green' : 'badge-amber';
                  const formattedDate = snap.taken_at
                    ? new Date(snap.taken_at).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    : '—';

                  return (
                    <tr key={snap.id}>
                      <td>
                        <strong>{snap.id}</strong>
                      </td>
                      <td>
                        <span className={`badge ${rangeBadgeColor}`}>
                          {rangeLabel}
                        </span>
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.875rem' }}>
                        {formattedDate}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {m.total_leads ?? '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {m.open_opportunities ?? '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {formatMoney(m.won_value)}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {m.quotes_accepted ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
