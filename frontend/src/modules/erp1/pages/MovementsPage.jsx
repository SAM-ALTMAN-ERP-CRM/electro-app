import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

function formatTimestamp(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function MovementsPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skuFilter, setSkuFilter] = useState('');
  const [whFilter, setWhFilter] = useState('');

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (skuFilter.trim()) params.append('sku', skuFilter.trim());
      if (whFilter.trim()) params.append('warehouse_id', whFilter.trim());

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api('erp1', `/api/stock/movements${queryString}`);

      const list = Array.isArray(res) ? res : (res?.data || []);
      setMovements(list);
    } catch (err) {
      setError(err.message || 'Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  }, [skuFilter, whFilter]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, color: '#0f172a' }}>Stock Movement History</h1>
            <span className="badge badge-blue">ERP-1</span>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Immutable audit log of all inventory additions, deductions, cycle counts, and inter-warehouse transfers.
          </p>
        </div>
        <button
          onClick={() => fetchMovements()}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 500
          }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh Log'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: '0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Filter toolbar */}
      <div style={{
        background: '#fff',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>SKU:</label>
          <input
            type="text"
            placeholder="Filter by SKU..."
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>Warehouse:</label>
          <select
            value={whFilter}
            onChange={(e) => setWhFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              background: '#fff'
            }}
          >
            <option value="">All Warehouses</option>
            <option value="WH-01">WH-01 (Mumbai)</option>
            <option value="WH-02">WH-02 (Delhi)</option>
            <option value="WH-03">WH-03 (Bengaluru)</option>
          </select>
        </div>

        {(skuFilter || whFilter) && (
          <button
            onClick={() => { setSkuFilter(''); setWhFilter(''); }}
            style={{
              padding: '0.45rem 0.75rem',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Movements Table Card */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Audit Log</span>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Showing {movements.length} movement{movements.length === 1 ? '' : 's'} (newest first)
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>⏳</div>
            Loading stock movement history...
          </div>
        ) : movements.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>📜</div>
            No stock movements recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Movement ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Product SKU</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Warehouse</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Quantity Change</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Reason / Reference</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => {
                  const isPositive = Number(m.delta) > 0;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                        {m.id}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                        {m.sku}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          fontWeight: 500,
                          fontSize: '0.8125rem'
                        }}>
                          {m.warehouse_id}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span className={`badge ${isPositive ? 'badge-green' : 'badge-red'}`} style={{ fontWeight: 700 }}>
                          {isPositive ? `+${m.delta}` : m.delta}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {m.reason || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8125rem' }}>
                        {formatTimestamp(m.created_at)}
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
