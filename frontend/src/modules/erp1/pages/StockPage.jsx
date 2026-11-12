import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Warehouse metadata matching Section 5 seed contract
const WAREHOUSE_LIST = [
  { id: 'WH-01', name: 'Mumbai Central Warehouse', city: 'Mumbai' },
  { id: 'WH-02', name: 'Delhi Regional Warehouse', city: 'Delhi' },
  { id: 'WH-03', name: 'Bengaluru Distribution Hub', city: 'Bengaluru' }
];

export default function StockPage() {
  const [stockList, setStockList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [skuFilter, setSkuFilter] = useState('');

  // Adjust stock form state
  const [adjustData, setAdjustData] = useState({
    sku: '',
    warehouse_id: 'WH-01',
    delta: '',
    reason: ''
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Fetch products from existing ERP-1 product API for product names and dropdown
   */
  const fetchProducts = useCallback(async () => {
    try {
      const res = await api('erp1', '/api/products');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setProducts(list);
      return list;
    } catch (err) {
      console.warn('Could not load products catalog for names:', err.message);
      return [];
    }
  }, []);

  /**
   * Fetch stock matrix from ERP-1 /api/stock
   */
  const fetchStock = useCallback(async (prods = products) => {
    try {
      setLoading(true);
      setError(null);

      const query = skuFilter.trim() ? `?sku=${encodeURIComponent(skuFilter.trim())}` : '';
      const res = await api('erp1', `/api/stock${query}`);

      let list = [];
      if (res && res.data) {
        list = Array.isArray(res.data) ? res.data : [res.data];
      } else if (Array.isArray(res)) {
        list = res;
      }

      // Merge product names from products API if not populated
      const prodMap = new Map();
      prods.forEach(p => prodMap.set(p.id, p.name));

      const enriched = list.map(item => ({
        ...item,
        product_name: item.product_name || prodMap.get(item.sku) || item.sku
      }));

      setStockList(enriched);
    } catch (err) {
      setError(err.message || 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, [skuFilter, products]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const prods = await fetchProducts();
      if (isMounted) {
        await fetchStock(prods);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  /**
   * Handle filter changes
   */
  const handleFilterChange = (e) => {
    setSkuFilter(e.target.value);
  };

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchStock();
  };

  const handleResetFilter = () => {
    setSkuFilter('');
  };

  // Re-fetch when filter is cleared
  useEffect(() => {
    if (skuFilter === '') {
      fetchStock();
    }
  }, [skuFilter]);

  /**
   * Handle Adjust Stock form input change
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAdjustData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Submit stock adjustment
   */
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);

    // Validation
    const cleanSku = adjustData.sku.trim();
    if (!cleanSku) {
      setFormError('Please select or enter a SKU');
      return;
    }
    if (!adjustData.warehouse_id) {
      setFormError('Please select a warehouse');
      return;
    }

    const deltaNum = parseInt(adjustData.delta, 10);
    if (isNaN(deltaNum) || deltaNum === 0 || deltaNum !== Number(adjustData.delta)) {
      setFormError('Quantity change (delta) must be a non-zero integer (+ to add, - to deduct)');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        sku: cleanSku,
        warehouse_id: adjustData.warehouse_id,
        delta: deltaNum,
        reason: adjustData.reason.trim() || 'Manual stock adjustment'
      };

      const res = await api('erp1', '/api/stock/adjust', {
        method: 'POST',
        body: payload
      });

      const updatedData = res?.data || res;
      const changeText = deltaNum > 0 ? `+${deltaNum}` : `${deltaNum}`;
      setFeedback(`Successfully adjusted stock for ${cleanSku} at ${adjustData.warehouse_id} by ${changeText} (New qty: ${updatedData.new_quantity ?? 'updated'}).`);

      // Reset delta and reason in form
      setAdjustData(prev => ({
        ...prev,
        delta: '',
        reason: ''
      }));

      // Refresh stock matrix
      await fetchStock();
    } catch (err) {
      setFormError(err.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, color: '#0f172a' }}>Multi-Warehouse Stock</h1>
            <span className="badge badge-blue">ERP-1</span>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Real-time physical inventory across Mumbai (WH-01), Delhi (WH-02), and Bengaluru (WH-03) warehouses.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => fetchStock()}
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
            {loading ? 'Refreshing...' : '↻ Refresh Stock'}
          </button>
        </div>
      </div>

      {/* Global feedback message */}
      {feedback && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          fontSize: '0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>✓ {feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Global error message */}
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

      {/* Search / Filter bar */}
      <div style={{
        background: '#fff',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <form onSubmit={handleApplyFilter} style={{ display: 'flex', gap: '0.75rem', flex: 1, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filter by SKU (e.g. SKU-0001)..."
            value={skuFilter}
            onChange={handleFilterChange}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem'
            }}
          >
            Search
          </button>
          {skuFilter && (
            <button
              type="button"
              onClick={handleResetFilter}
              style={{
                padding: '0.5rem 0.75rem',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Stock Table */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '2rem'
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }}>
          Stock Matrix
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>⏳</div>
            Loading stock matrix...
          </div>
        ) : stockList.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>📦</div>
            No stock data available.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>SKU</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Product Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>WH-01 (Mumbai)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>WH-02 (Delhi)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>WH-03 (Bengaluru)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Stock</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stockList.map(item => {
                  const wh1 = item.warehouses?.find(w => w.warehouse_id === 'WH-01')?.quantity ?? 0;
                  const wh2 = item.warehouses?.find(w => w.warehouse_id === 'WH-02')?.quantity ?? 0;
                  const wh3 = item.warehouses?.find(w => w.warehouse_id === 'WH-03')?.quantity ?? 0;
                  const total = item.total_stock ?? (wh1 + wh2 + wh3);

                  return (
                    <tr key={item.sku} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                        {item.sku}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                        {item.product_name || item.sku}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>
                        {wh1}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>
                        {wh2}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>
                        {wh3}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                        <span style={{
                          color: total === 0 ? '#ef4444' : total <= 10 ? '#f59e0b' : '#10b981'
                        }}>
                          {total}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustData(prev => ({ ...prev, sku: item.sku }));
                            // Scroll to form
                            const formEl = document.getElementById('adjust-stock-card');
                            if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                          }}
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            color: '#2563eb',
                            fontWeight: 500
                          }}
                        >
                          Adjust
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

      {/* Adjust Stock Form Card */}
      <div id="adjust-stock-card" style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Adjust Warehouse Stock</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Record positive adjustments (receipts, found stock) or negative adjustments (damages, scrap).
          </p>
        </div>

        {formError && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.875rem'
          }}>
            ⚠️ {formError}
          </div>
        )}

        <form onSubmit={handleAdjustSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* SKU Input / Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.35rem' }}>
                Product SKU *
              </label>
              {products.length > 0 ? (
                <select
                  name="sku"
                  value={adjustData.sku}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    background: '#fff'
                  }}
                >
                  <option value="">-- Select SKU --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="sku"
                  value={adjustData.sku}
                  onChange={handleInputChange}
                  placeholder="e.g. SKU-0001"
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem'
                  }}
                />
              )}
            </div>

            {/* Warehouse Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.35rem' }}>
                Warehouse *
              </label>
              <select
                name="warehouse_id"
                value={adjustData.warehouse_id}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  background: '#fff'
                }}
              >
                {WAREHOUSE_LIST.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.id} ({w.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Change (Delta) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.35rem' }}>
                Quantity Change (+/-) *
              </label>
              <input
                type="number"
                name="delta"
                value={adjustData.delta}
                onChange={handleInputChange}
                placeholder="e.g. 10 or -5"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Positive to add, negative to deduct
              </span>
            </div>

            {/* Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.35rem' }}>
                Reason
              </label>
              <input
                type="text"
                name="reason"
                value={adjustData.reason}
                onChange={handleInputChange}
                placeholder="e.g. Physical cycle count"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setAdjustData({ sku: '', warehouse_id: 'WH-01', delta: '', reason: '' });
                setFormError(null);
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              {submitting ? 'Applying Adjustment...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
