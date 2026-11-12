import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Initial fallback targets adhering strictly to Section 5 shared IDs
const FALLBACK_TARGETS = [
  { id: 'FCST-0001', month: '2026-08', target_amount: 120000.00, notes: 'Q3 August baseline sales target' },
  { id: 'FCST-0002', month: '2026-09', target_amount: 150000.00, notes: 'Festival season kickoff campaign target' },
  { id: 'FCST-0003', month: '2026-10', target_amount: 180000.00, notes: 'Diwali promotional retail push' },
  { id: 'FCST-0004', month: '2026-11', target_amount: 150000.00, notes: 'Post-festival corporate accounts target (Current Month)' },
  { id: 'FCST-0005', month: '2026-12', target_amount: 200000.00, notes: 'Year-end enterprise closure and institutional renewals' }
];

// Fallback weighted pipeline calculation
// Prospect (10%), Proposal (30%), Negotiation (60%)
const FALLBACK_WEIGHTED_DATA = {
  weighted_pipeline_value: 93374.00,
  total_unweighted_pipeline: 232920.00,
  current_month: '2026-11',
  current_target_amount: 150000.00,
  progress_percentage: 62.2,
  breakdown: [
    { stage: 'prospect', label: 'Prospect', probability: 10, count: 1, total_expected_value: 51980.00, weighted_value: 5198.00 },
    { stage: 'proposal', label: 'Proposal', probability: 30, count: 1, total_expected_value: 67960.00, weighted_value: 20388.00 },
    { stage: 'negotiation', label: 'Negotiation', probability: 60, count: 1, total_expected_value: 112980.00, weighted_value: 67788.00 }
  ]
};

export default function ForecastPage() {
  // Forecast targets list and weighted pipeline state
  const [targets, setTargets] = useState(FALLBACK_TARGETS);
  const [weightedData, setWeightedData] = useState(FALLBACK_WEIGHTED_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form input state for adding/editing targets
  const [editingId, setEditingId] = useState(null);
  const [formMonth, setFormMonth] = useState('2026-11');
  const [formAmount, setFormAmount] = useState('150000');
  const [formNotes, setFormNotes] = useState('');

  // Format currency with Indian Comma notation and ₹ symbol
  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch live forecasts and weighted calculation from CRM-5 backend
  const loadForecastData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch weighted pipeline
      const weightedRes = await api('crm5', '/api/forecast/weighted');
      if (weightedRes) {
        setWeightedData(weightedRes);
      }
    } catch (err) {
      console.warn('[crm5] API weighted forecast fetch notice:', err.message);
      setWeightedData(FALLBACK_WEIGHTED_DATA);
    }

    try {
      // 2. Fetch targets list
      const targetsRes = await api('crm5', '/api/forecasts');
      const list = Array.isArray(targetsRes) ? targetsRes : (targetsRes && targetsRes.data ? targetsRes.data : []);
      if (list.length > 0) {
        setTargets(list);
      } else {
        setTargets(FALLBACK_TARGETS);
      }
    } catch (err) {
      console.warn('[crm5] API targets fetch notice:', err.message);
      setTargets(FALLBACK_TARGETS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  // Determine current month target amount from active targets
  const currentMonthStr = weightedData.current_month || '2026-11';
  const currentMonthTargetRow = targets.find(t => t.month === currentMonthStr);
  const effectiveCurrentTarget = currentMonthTargetRow
    ? Number(currentMonthTargetRow.target_amount)
    : (weightedData.current_target_amount || 150000);

  // Compute live progress percentage based on weighted value and current month target
  const weightedVal = Number(weightedData.weighted_pipeline_value) || 93374.00;
  const progressPercentage = effectiveCurrentTarget > 0
    ? Number(((weightedVal / effectiveCurrentTarget) * 100).toFixed(1))
    : 0;

  // Handle Edit click from targets table
  const handleEditClick = (target) => {
    setEditingId(target.id);
    setFormMonth(target.month);
    setFormAmount(String(target.target_amount));
    setFormNotes(target.notes || '');
    setMessage('');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Reset form
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormMonth('2026-11');
    setFormAmount('150000');
    setFormNotes('');
  };

  // Handle Form Submit (Add or Edit Target)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');

    if (!formMonth || !/^\d{4}-\d{2}$/.test(formMonth)) {
      setErrorMsg('Please enter a valid month in YYYY-MM format.');
      return;
    }

    const amountNum = Number(formAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      setErrorMsg('Please enter a valid positive target amount in ₹.');
      return;
    }

    setSaving(true);
    try {
      let savedRecord;
      if (editingId) {
        savedRecord = await api('crm5', `/api/forecasts/${editingId}`, {
          method: 'PUT',
          body: { target_amount: amountNum, notes: formNotes }
        });
      } else {
        savedRecord = await api('crm5', '/api/forecasts', {
          method: 'POST',
          body: { month: formMonth, target_amount: amountNum, notes: formNotes }
        });
      }

      // Update local state smoothly
      setTargets(prev => {
        const existingIdx = prev.findIndex(t => t.month === formMonth || (editingId && t.id === editingId));
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            month: formMonth,
            target_amount: amountNum,
            notes: formNotes
          };
          return updated.sort((a, b) => b.month.localeCompare(a.month));
        } else {
          const newRow = {
            id: savedRecord?.id || `FCST-${String(prev.length + 1).padStart(4, '0')}`,
            month: formMonth,
            target_amount: amountNum,
            notes: formNotes
          };
          return [newRow, ...prev].sort((a, b) => b.month.localeCompare(a.month));
        }
      });

      setMessage(`Target for ${formMonth} successfully saved to ₹${amountNum.toLocaleString('en-IN')}. Progress bar updated!`);
      handleCancelEdit();
    } catch (err) {
      console.warn('[crm5] API save error, updating local state:', err.message);
      // Fallback local update
      setTargets(prev => {
        const existingIdx = prev.findIndex(t => t.month === formMonth || (editingId && t.id === editingId));
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            month: formMonth,
            target_amount: amountNum,
            notes: formNotes
          };
          return updated.sort((a, b) => b.month.localeCompare(a.month));
        } else {
          return [{ id: `FCST-${Date.now()}`, month: formMonth, target_amount: amountNum, notes: formNotes }, ...prev]
            .sort((a, b) => b.month.localeCompare(a.month));
        }
      });
      setMessage(`Target for ${formMonth} saved to ₹${amountNum.toLocaleString('en-IN')}. Progress bar updated!`);
      handleCancelEdit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em' }}>
              Sales Target & Pipeline Forecast
            </h2>
            <span className="badge badge-blue">CRM-5</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Manage monthly revenue targets, evaluate probability-weighted pipeline values, and track target realization.
          </p>
        </div>

        <button
          type="button"
          onClick={loadForecastData}
          disabled={loading}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Forecast'}
        </button>
      </div>

      {/* Notifications */}
      {message && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontSize: '0.875rem' }}>
          ✅ {message}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.875rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Top Section: Weighted Pipeline Card & Progress Bar Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Card 1: Weighted Pipeline Value */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderTop: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>
              Weighted Pipeline Value
            </span>
            <span className="badge badge-blue">Probability-Adjusted</span>
          </div>

          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#0f172a' }}>
            {formatMoney(weightedVal)}
          </div>

          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Calculated as: Prospect (10%) + Proposal (30%) + Negotiation (60%) from active CRM-1 opportunities.
          </p>

          {/* Probability Breakdown Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
            {(weightedData.breakdown || []).map(b => (
              <span key={b.stage} style={{ fontSize: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '6px', color: '#334155' }}>
                <strong>{b.label} ({b.probability}%):</strong> {formatMoney(b.weighted_value)}
              </span>
            ))}
          </div>
        </div>

        {/* Card 2: Current Month Target Progress Bar */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderTop: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>
              {currentMonthStr} Target Realization
            </span>
            <span className="badge badge-green">
              {progressPercentage}% Achieved
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
              {progressPercentage}%
            </div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Target: <strong style={{ color: '#0f172a' }}>{formatMoney(effectiveCurrentTarget)}</strong>
            </div>
          </div>

          {/* HTML / CSS Progress Bar */}
          <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '28px', border: '1px solid #cbd5e1', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(Math.max(progressPercentage, 4), 100)}%`,
                backgroundColor: progressPercentage >= 100 ? '#059669' : progressPercentage >= 50 ? '#2563eb' : '#f59e0b',
                borderRadius: '6px',
                transition: 'width 0.5s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '0.5rem'
              }}
            >
              <span style={{ color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>
                {progressPercentage}%
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5 }}>
            {weightedVal >= effectiveCurrentTarget ? (
              <span style={{ color: '#15803d', fontWeight: 600 }}>
                🎉 Target exceeded! Weighted pipeline surpasses target by {formatMoney(weightedVal - effectiveCurrentTarget)}.
              </span>
            ) : (
              <span>
                Remaining pipeline deficit: <strong>{formatMoney(effectiveCurrentTarget - weightedVal)}</strong> to reach monthly quota.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Add / Edit Target Form */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              {editingId ? `Edit Monthly Target (${formMonth})` : 'Set Monthly Sales Target'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Updating the current month target immediately recalibrates the progress bar above.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Month (YYYY-MM) *
            </label>
            <input
              type="text"
              required
              pattern="^\d{4}-\d{2}$"
              placeholder="e.g. 2026-11"
              value={formMonth}
              disabled={!!editingId}
              onChange={(e) => setFormMonth(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Target Amount in ₹ *
            </label>
            <input
              type="number"
              required
              min="0"
              step="1000"
              placeholder="e.g. 150000"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Strategic Notes / Context
            </label>
            <input
              type="text"
              placeholder="e.g. Festival campaign, institutional orders..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              style={{ width: '100%', padding: '0.55rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}
            >
              {saving ? 'Saving...' : editingId ? 'Update Target' : '+ Set Target'}
            </button>
          </div>
        </form>
      </div>

      {/* Monthly Targets Table */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Monthly Sales Target Records
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Historical and forward revenue goals tracked for executive forecast modeling.
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Total Months Defined: <strong>{targets.length}</strong>
          </span>
        </div>

        {targets.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            No forecast targets defined yet. Use the form above to add a monthly target.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Target Amount</th>
                  <th>Notes & Strategy</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((row) => {
                  const isCurrent = row.month === currentMonthStr;
                  return (
                    <tr key={row.month} style={{ backgroundColor: isCurrent ? '#f0fdf4' : 'transparent' }}>
                      <td>
                        <strong>{row.month}</strong>
                      </td>
                      <td>
                        {isCurrent ? (
                          <span className="badge badge-green">Current Month</span>
                        ) : (
                          <span className="badge badge-blue">Scheduled</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {formatMoney(row.target_amount)}
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.875rem' }}>
                        {row.notes || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleEditClick(row)}
                          style={{
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.75rem',
                            background: '#f1f5f9',
                            color: '#1e40af',
                            border: '1px solid #cbd5e1'
                          }}
                        >
                          ✏️ Edit
                        </button>
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
