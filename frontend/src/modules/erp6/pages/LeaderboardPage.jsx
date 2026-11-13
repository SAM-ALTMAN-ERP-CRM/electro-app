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

/**
 * Generates and downloads a clean UTF-8 CSV with Byte Order Mark (\uFEFF)
 * ensuring it opens seamlessly in Microsoft Excel on Windows and Mac.
 */
function exportLeaderboardToCSV(data, monthFilter) {
  if (!data || data.length === 0) return;

  const headers = [
    'Rank',
    'Sales Rep ID',
    'Representative Name',
    'Email',
    'Deals Closed',
    'Total Sales (INR)',
    'Commission (INR)',
    'Average Deal Size (INR)',
    'Period'
  ];

  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = data.map((item) => {
    const avgDeal = item.deals > 0 ? (item.total_sales / item.deals).toFixed(2) : '0.00';
    return [
      item.rank,
      escapeCSV(item.sales_rep_id),
      escapeCSV(item.name),
      escapeCSV(item.email || ''),
      item.deals,
      Number(item.total_sales).toFixed(2),
      Number(item.commission).toFixed(2),
      avgDeal,
      escapeCSV(monthFilter || 'All Time')
    ];
  });

  // Prepend UTF-8 BOM (\uFEFF) and use CRLF (\r\n) for complete Excel compatibility
  const csvString = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `sales-leaderboard-${monthFilter || 'all-time'}.csv`;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  /**
   * Fetch ranked sales performance data from ERP-6 backend.
   */
  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const param = selectedMonth ? `?month=${encodeURIComponent(selectedMonth)}` : '';
      const res = await api('erp6', `/api/performance/sales${param}`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setLeaderboard(list);
    } catch (err) {
      console.error('[erp6] Failed to fetch sales leaderboard:', err.message);
      setError(err.message || 'Failed to load sales performance leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  // Overall totals across leaderboard
  const totals = useMemo(() => {
    let totalDeals = 0;
    let totalSales = 0;
    let totalCommission = 0;

    leaderboard.forEach(r => {
      totalDeals += Number(r.deals || 0);
      totalSales += Number(r.total_sales || 0);
      totalCommission += Number(r.commission || 0);
    });

    return { totalDeals, totalSales, totalCommission };
  }, [leaderboard]);

  // Top performer (Rank #1)
  const topPerformer = leaderboard.length > 0 && leaderboard[0].total_sales > 0 ? leaderboard[0] : null;

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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Sales Performance Leaderboard
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Representative sales achievements, deal volumes, and commission earnings ranked by total sales.
          </p>
        </div>

        {/* CSV Export Action Button */}
        <button
          type="button"
          onClick={() => exportLeaderboardToCSV(leaderboard, selectedMonth)}
          disabled={loading || leaderboard.length === 0}
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: loading || leaderboard.length === 0 ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            opacity: loading || leaderboard.length === 0 ? 0.6 : 1
          }}
        >
          📥 Download CSV
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
            Filter by Month:
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

        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setSelectedMonth('2026-11')}
            style={{
              backgroundColor: selectedMonth === '2026-11' ? '#2563eb' : '#f1f5f9',
              color: selectedMonth === '2026-11' ? '#ffffff' : '#475569',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            November 2026
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth('2026-10')}
            style={{
              backgroundColor: selectedMonth === '2026-10' ? '#2563eb' : '#f1f5f9',
              color: selectedMonth === '2026-10' ? '#ffffff' : '#475569',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            October 2026
          </button>
        </div>

        {selectedMonth && (
          <button
            type="button"
            onClick={() => setSelectedMonth('')}
            style={{
              backgroundColor: '#f8fafc',
              color: '#64748b',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Reset (All Months)
          </button>
        )}
      </div>

      {/* Top Performer Feature Spotlight */}
      {topPerformer && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              fontSize: '2.25rem',
              lineHeight: 1,
              backgroundColor: '#fef3c7',
              borderRadius: '50%',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #f59e0b'
            }}>
              🏆
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{ backgroundColor: '#f59e0b', color: '#ffffff', fontWeight: 700 }}>
                  TOP PERFORMER · RANK #1
                </span>
                <span className="badge badge-blue">{topPerformer.sales_rep_id}</span>
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#78350f', marginTop: '0.35rem' }}>
                {topPerformer.name}
              </h3>
              {topPerformer.email && (
                <span style={{ fontSize: '0.8rem', color: '#92400e' }}>
                  {topPerformer.email}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
                Total Sales
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f' }}>
                {formatINR(topPerformer.total_sales)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
                Commission
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>
                {formatINR(topPerformer.commission)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
                Deals Closed
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f' }}>
                {topPerformer.deals}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table Container */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Sales Rankings {selectedMonth ? `(${selectedMonth})` : '(All Time)'}
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Ranked strictly by Total Sales volume descending
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
            {leaderboard.length} Sales Representative{leaderboard.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading sales leaderboard rankings...
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No sales performance data found for the selected period.
          </div>
        ) : (
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                <th>Sales Representative</th>
                <th style={{ textAlign: 'center' }}>Deals Closed</th>
                <th>Total Sales Volume</th>
                <th>Commission Earned</th>
                <th>Avg Deal Size</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((rep) => {
                const isTop = rep.rank === 1 && rep.total_sales > 0;
                const avgDeal = rep.deals > 0 ? rep.total_sales / rep.deals : 0;

                return (
                  <tr
                    key={rep.sales_rep_id}
                    style={{
                      backgroundColor: isTop ? '#fffdf5' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Rank Badge */}
                    <td style={{ textAlign: 'center' }}>
                      {rep.rank === 1 && rep.total_sales > 0 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: '1px solid #fde68a'
                        }}>
                          🥇 1
                        </span>
                      ) : rep.rank === 2 && rep.total_sales > 0 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: '1px solid #cbd5e1'
                        }}>
                          🥈 2
                        </span>
                      ) : rep.rank === 3 && rep.total_sales > 0 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#ffedd5',
                          color: '#c2410c',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: '1px solid #fed7aa'
                        }}>
                          🥉 3
                        </span>
                      ) : (
                        <span style={{
                          color: '#64748b',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}>
                          #{rep.rank}
                        </span>
                      )}
                    </td>

                    {/* Sales Rep Profile */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          {rep.name}
                        </span>
                        {isTop && (
                          <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.7rem' }}>
                            Top Seller
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {rep.sales_rep_id} {rep.email ? `· ${rep.email}` : ''}
                      </div>
                    </td>

                    {/* Deals Closed */}
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {rep.deals}
                    </td>

                    {/* Total Sales */}
                    <td style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                      {formatINR(rep.total_sales)}
                    </td>

                    {/* Commission */}
                    <td style={{ fontWeight: 700, color: rep.commission > 0 ? '#16a34a' : '#64748b' }}>
                      {formatINR(rep.commission)}
                    </td>

                    {/* Average Deal Size */}
                    <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                      {formatINR(avgDeal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Grand Total Footer */}
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                <td colSpan={2} style={{ textAlign: 'right', paddingRight: '1rem', color: '#0f172a' }}>
                  Grand Total:
                </td>
                <td style={{ textAlign: 'center' }}>{totals.totalDeals}</td>
                <td style={{ color: '#0f172a', fontSize: '0.95rem' }}>{formatINR(totals.totalSales)}</td>
                <td style={{ color: '#16a34a' }}>{formatINR(totals.totalCommission)}</td>
                <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                  {formatINR(totals.totalDeals > 0 ? totals.totalSales / totals.totalDeals : 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
