import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../../api';

/**
 * Format numeric currency amount in Indian Rupees (₹) with 2 decimals.
 * Example: 45000 -> ₹45,000.00
 */
function formatINR(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedRep, setSelectedRep] = useState('');

  /**
   * Fetch list of Sales Rep employees from ERP-6 employees API.
   * This provides the full directory of reps for the rep summary table.
   */
  const fetchSalesReps = useCallback(async () => {
    try {
      const res = await api('erp6', '/api/employees?role_title=Sales%20Rep');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setSalesReps(list);
    } catch (err) {
      console.warn('[erp6] Could not fetch sales reps directory:', err.message);
    }
  }, []);

  /**
   * Fetch commissions with optional month and sales_rep_id query filters.
   */
  const fetchCommissions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (selectedMonth.trim()) {
        params.append('month', selectedMonth.trim());
      }
      if (selectedRep.trim()) {
        params.append('sales_rep_id', selectedRep.trim());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api('erp6', `/api/commissions${queryString}`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setCommissions(list);
    } catch (err) {
      console.error('[erp6] Failed to fetch commissions:', err.message);
      setError(err.message || 'Failed to load commissions data.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedRep]);

  // Initial load
  useEffect(() => {
    fetchSalesReps();
  }, [fetchSalesReps]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  /**
   * Trigger commission sync with ERP-5 paid invoices.
   */
  async function handleSyncNow() {
    try {
      setSyncing(true);
      setFeedback('');
      setError('');

      const result = await api('erp6', '/api/commissions/sync', { method: 'POST' });
      const added = result?.added !== undefined ? result.added : (result?.count || 0);

      if (added > 0) {
        setFeedback(`Sync successful! ${added} new commission record${added === 1 ? '' : 's'} added from paid invoices.`);
      } else {
        setFeedback('Sync complete. All paid invoices are already up to date (0 new records added).');
      }

      // Refresh commission table
      await fetchCommissions();
    } catch (err) {
      console.error('[erp6] Commission sync failed:', err.message);
      setError(err.message || 'Failed to synchronize commissions with ERP-5.');
    } finally {
      setSyncing(false);
    }
  }

  /**
   * Calculate aggregated totals per sales representative.
   * Merges data from the sales reps directory with the current commissions.
   */
  const repSummaries = useMemo(() => {
    // Map of sales_rep_id -> aggregate stats
    const map = {};

    // Initialize with known sales reps from directory
    salesReps.forEach(rep => {
      map[rep.id] = {
        id: rep.id,
        name: rep.name,
        email: rep.email,
        dealCount: 0,
        totalInvoiced: 0,
        totalCommission: 0
      };
    });

    // Aggregate commissions
    commissions.forEach(c => {
      const repId = c.sales_rep_id;
      if (!map[repId]) {
        map[repId] = {
          id: repId,
          name: c.sales_rep_name || repId,
          email: '',
          dealCount: 0,
          totalInvoiced: 0,
          totalCommission: 0
        };
      }
      map[repId].dealCount += 1;
      map[repId].totalInvoiced += Number(c.invoice_amount || 0);
      map[repId].totalCommission += Number(c.commission_amount || 0);
    });

    // If a specific rep is selected, filter the summary as well
    let list = Object.values(map);
    if (selectedRep) {
      list = list.filter(r => r.id === selectedRep);
    }

    // Sort by total commission descending
    return list.sort((a, b) => b.totalCommission - a.totalCommission);
  }, [commissions, salesReps, selectedRep]);

  // Overall totals across currently filtered commissions
  const overallTotals = useMemo(() => {
    let totalInvoiced = 0;
    let totalCommission = 0;
    commissions.forEach(c => {
      totalInvoiced += Number(c.invoice_amount || 0);
      totalCommission += Number(c.commission_amount || 0);
    });
    return {
      count: commissions.length,
      totalInvoiced,
      totalCommission
    };
  }, [commissions]);

  // List of unique months from commissions for quick filtering
  const availableMonths = useMemo(() => {
    const set = new Set();
    commissions.forEach(c => {
      if (c.month) set.add(c.month);
    });
    return Array.from(set).sort().reverse();
  }, [commissions]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Sales Commissions</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Synchronize and calculate sales representative commissions from paid ERP-5 customer invoices.
          </p>
        </div>

        {/* Sync Now Button */}
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing}
          style={{
            backgroundColor: syncing ? '#94a3b8' : '#2563eb',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          {syncing ? '⏳ Syncing with ERP-5...' : '⚡ Sync Now'}
        </button>
      </div>

      {/* Feedback & Error Alerts */}
      {feedback && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          borderRadius: '6px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.9rem'
        }}>
          <span>✔ {feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#065f46',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
              padding: 0
            }}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.9rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Commissions
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#16a34a', marginTop: '0.35rem' }}>
            {formatINR(overallTotals.totalCommission)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Across {overallTotals.count} paid invoice{overallTotals.count === 1 ? '' : 's'}
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Invoiced Amount
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
            {formatINR(overallTotals.totalInvoiced)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Eligible customer billing volume
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Commission Rules
          </div>
          <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '0.5rem', lineHeight: '1.4' }}>
            <div>• Standard Rate: <span className="badge badge-blue">2.0%</span> (≤ ₹1,00,000)</div>
            <div style={{ marginTop: '0.25rem' }}>• High-Value Rate: <span className="badge badge-green">3.0%</span> (&gt; ₹1,00,000)</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Month Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
            Month:
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              backgroundColor: '#fff'
            }}
          />
        </div>

        {/* Quick Month Dropdown (if months exist) */}
        {availableMonths.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
              Quick Select:
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sales Rep Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
            Sales Rep:
          </label>
          <select
            value={selectedRep}
            onChange={e => setSelectedRep(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              backgroundColor: '#fff',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="">All Sales Representatives</option>
            {salesReps.map(rep => (
              <option key={rep.id} value={rep.id}>
                {rep.name} ({rep.id})
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(selectedMonth || selectedRep) && (
          <button
            type="button"
            onClick={() => {
              setSelectedMonth('');
              setSelectedRep('');
            }}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Section 1: Total Per Sales Rep Summary */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
          Commission Total Per Sales Representative
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Aggregated commission totals by representative {selectedMonth ? `for period ${selectedMonth}` : 'across all periods'}.
        </p>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Sales Rep ID</th>
                <th>Employee Name</th>
                <th>Invoices Synced</th>
                <th>Total Invoiced Amount</th>
                <th>Total Commission Earned</th>
              </tr>
            </thead>
            <tbody>
              {repSummaries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>
                    No sales representative summary data available.
                  </td>
                </tr>
              ) : (
                repSummaries.map(rep => (
                  <tr key={rep.id}>
                    <td>
                      <span className="badge badge-blue">{rep.id}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      {rep.name}
                      {rep.email && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 400 }}>
                          {rep.email}
                        </span>
                      )}
                    </td>
                    <td>{rep.dealCount}</td>
                    <td>{formatINR(rep.totalInvoiced)}</td>
                    <td style={{ fontWeight: 700, color: rep.totalCommission > 0 ? '#16a34a' : '#64748b' }}>
                      {formatINR(rep.totalCommission)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {repSummaries.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={2} style={{ textAlign: 'right', paddingRight: '1rem', color: '#0f172a' }}>
                    Grand Total:
                  </td>
                  <td>{overallTotals.count}</td>
                  <td>{formatINR(overallTotals.totalInvoiced)}</td>
                  <td style={{ color: '#16a34a' }}>{formatINR(overallTotals.totalCommission)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Section 2: Individual Commission Records Table */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Commission Records
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Individual invoices and commission calculations {selectedMonth && `(${selectedMonth})`}.
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Showing {commissions.length} record{commissions.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '3rem',
            textAlign: 'center',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            color: '#64748b'
          }}>
            Loading commissions data...
          </div>
        ) : commissions.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '3rem',
            textAlign: 'center',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '1rem' }}>
              No commission records found matching the current filters.
            </p>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              style={{
                backgroundColor: '#2563eb',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Now with ERP-5'}
            </button>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Commission ID</th>
                  <th>Sales Representative</th>
                  <th>Invoice ID</th>
                  <th>Invoice Amount</th>
                  <th>Rate</th>
                  <th>Commission Amount</th>
                  <th>Month</th>
                  <th>Synced Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map(c => {
                  const isHighTier = Number(c.rate_percent) >= 3;
                  return (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{c.id}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {c.sales_rep_name || c.sales_rep_id}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {c.sales_rep_id}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-amber">{c.invoice_id}</span>
                      </td>
                      <td>{formatINR(c.invoice_amount)}</td>
                      <td>
                        <span className={`badge ${isHighTier ? 'badge-green' : 'badge-blue'}`}>
                          {Number(c.rate_percent).toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>
                        {formatINR(c.commission_amount)}
                      </td>
                      <td>
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#334155'
                        }}>
                          {c.month}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {c.created_at ? String(c.created_at).slice(0, 10) : '-'}
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
