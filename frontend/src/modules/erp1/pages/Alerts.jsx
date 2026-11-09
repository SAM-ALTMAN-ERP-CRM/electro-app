import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [lowStockMap, setLowStockMap] = useState({});
  const [summary, setSummary] = useState({ total_skus: 0, low_stock_count: 0, out_of_stock_count: 0 });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [ackingId, setAckingId] = useState(null);
  const [requestingSku, setRequestingSku] = useState(null);
  const [requestedMap, setRequestedMap] = useState({});
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchAlertsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch open alerts, low-stock details, and inventory KPI summary in parallel
      const [alertsRes, lowStockRes, summaryRes] = await Promise.all([
        api('erp1', '/api/alerts?acknowledged=false'),
        api('erp1', '/api/alerts/low-stock'),
        api('erp1', '/api/inventory/summary')
      ]);

      const alertsList = Array.isArray(alertsRes) ? alertsRes : (alertsRes?.data || []);
      const lowStockList = Array.isArray(lowStockRes) ? lowStockRes : (lowStockRes?.data || []);
      const summaryData = summaryRes?.data || summaryRes || { total_skus: 0, low_stock_count: 0, out_of_stock_count: 0 };

      const map = {};
      lowStockList.forEach(item => {
        map[item.sku] = item;
      });

      setAlerts(alertsList);
      setLowStockMap(map);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || 'Failed to load inventory alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsData();
  }, []);

  const handleRunScan = async () => {
    try {
      setScanning(true);
      setError(null);
      setFeedback(null);

      const scanRes = await api('erp1', '/api/alerts/scan', { method: 'POST' });
      const createdCount = scanRes?.created?.length ?? scanRes?.count ?? 0;

      if (createdCount > 0) {
        setFeedback(`Scan complete: Generated ${createdCount} new stock alert(s).`);
      } else {
        setFeedback('Scan complete: No new low-stock items detected (duplicate prevention active).');
      }

      await fetchAlertsData();
    } catch (err) {
      setError(err.message || 'Failed to execute stock scan');
    } finally {
      setScanning(false);
    }
  };

  const handleAcknowledge = async (id, sku) => {
    try {
      setAckingId(id);
      setError(null);
      await api('erp1', `/api/alerts/${id}/ack`, { method: 'PATCH' });

      // Optimistically remove from open alerts
      setAlerts(prev => prev.filter(a => a.id !== id));
      setFeedback(`Alert ${id} (${sku}) acknowledged and archived.`);
    } catch (err) {
      setError(err.message || `Failed to acknowledge alert ${id}`);
    } finally {
      setAckingId(null);
    }
  };

  const handleCreatePurchaseRequest = async (sku, productName, suggestedQty) => {
    try {
      setRequestingSku(sku);
      setError(null);

      const res = await api('erp1', '/api/alerts/purchase-request', {
        method: 'POST',
        body: {
          sku,
          product_name: productName,
          quantity: suggestedQty,
          reason: `Low-stock replenishment trigger for ${sku}`
        }
      });

      const reqId = res?.id || res?.data?.id || 'PR-SUCCESS';
      setRequestedMap(prev => ({ ...prev, [sku]: reqId }));
      setFeedback(`Purchase Request created in ERP-2 for ${sku} (Order Qty: ${suggestedQty} units). Request ID: ${reqId}`);
    } catch (err) {
      setError(err.message || `Failed to create purchase request for ${sku}`);
    } finally {
      setRequestingSku(null);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Low-Stock Inventory Alerts</h2>
          <span
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: alerts.length > 0 ? '#fee2e2' : '#dcfce7',
              color: alerts.length > 0 ? '#b91c1c' : '#15803d',
              border: `1px solid ${alerts.length > 0 ? '#fca5a5' : '#86efac'}`
            }}
          >
            {alerts.length} Open {alerts.length === 1 ? 'Alert' : 'Alerts'}
          </span>
        </div>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          style={{
            padding: '0.5rem 1.1rem',
            backgroundColor: scanning ? '#94a3b8' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 500,
            cursor: scanning ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {scanning ? 'Scanning...' : '⚡ Run Scan'}
        </button>
      </div>

      {/* 3 KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total SKUs</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
            {summary.total_skus ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Active catalog products</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8125rem', color: '#b45309', textTransform: 'uppercase', fontWeight: 600 }}>Low-Stock Items</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#d97706', marginTop: '0.25rem' }}>
            {summary.low_stock_count ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Stock ≤ Reorder level</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8125rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: 600 }}>Out of Stock</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626', marginTop: '0.25rem' }}>
            {summary.out_of_stock_count ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Zero warehouse inventory</div>
        </div>
      </div>

      {/* Red Alert Banner when open alerts exist */}
      {alerts.length > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '0.875rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#991b1b'
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong style={{ display: 'block', fontSize: '0.9375rem' }}>
              Action Required: {alerts.length} product(s) have reached or fallen below reorder levels!
            </strong>
            <span style={{ fontSize: '0.8125rem', color: '#b91c1c' }}>
              Review the shortfall quantities below, order suggested reorder stock via ERP-2, or acknowledge alerts.
            </span>
          </div>
        </div>
      )}

      {/* Success / Feedback Notification */}
      {feedback && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            color: '#166534',
            fontSize: '0.875rem'
          }}
        >
          {feedback}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fda4af',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            color: '#be123c',
            fontSize: '0.875rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Content Table or Empty / Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
          Loading inventory alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>No Open Alerts</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            All inventory items are currently stocked above their defined reorder thresholds.
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Alert ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>SKU</th>
                <th style={{ padding: '0.75rem 1rem' }}>Product Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Stock</th>
                <th style={{ padding: '0.75rem 1rem' }}>Reorder Lvl</th>
                <th style={{ padding: '0.75rem 1rem' }}>Shortfall</th>
                <th style={{ padding: '0.75rem 1rem' }}>Suggested Order</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => {
                const item = lowStockMap[alert.sku] || {};
                const stock = item.current_stock ?? 0;
                const reorder = item.reorder_level ?? 10;
                const shortfall = item.shortfall ?? Math.max(0, reorder - stock);
                // Suggested order quantity = (reorder_level * 2) - current_stock
                const suggestedQty = item.suggested_order_qty ?? Math.max(1, (reorder * 2) - stock);
                const name = item.name || alert.message || alert.sku;
                const isAcking = ackingId === alert.id;
                const isRequesting = requestingSku === alert.sku;
                const hasRequested = requestedMap[alert.sku];

                return (
                  <tr key={alert.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}>
                      {alert.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#0f172a' }}>
                      {alert.sku}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#1e293b' }}>
                      {name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 600,
                          backgroundColor: stock <= 0 ? '#fee2e2' : '#fef3c7',
                          color: stock <= 0 ? '#991b1b' : '#92400e'
                        }}
                      >
                        {stock} units
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {reorder} units
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#dc2626', fontWeight: 600 }}>
                      -{shortfall} units
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#15803d', fontWeight: 600 }}>
                      {suggestedQty} units
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleCreatePurchaseRequest(alert.sku, name, suggestedQty)}
                          disabled={isRequesting || !!hasRequested}
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: hasRequested ? '#dcfce7' : isRequesting ? '#94a3b8' : '#2563eb',
                            color: hasRequested ? '#15803d' : '#ffffff',
                            border: `1px solid ${hasRequested ? '#86efac' : '#2563eb'}`,
                            borderRadius: '4px',
                            cursor: (isRequesting || hasRequested) ? 'default' : 'pointer',
                            fontSize: '0.8125rem',
                            fontWeight: 500
                          }}
                        >
                          {hasRequested ? `Requested (${hasRequested}) ✓` : isRequesting ? 'Ordering...' : `Reorder (${suggestedQty})`}
                        </button>

                        <button
                          onClick={() => handleAcknowledge(alert.id, alert.sku)}
                          disabled={isAcking}
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: isAcking ? '#94a3b8' : '#f1f5f9',
                            color: isAcking ? '#ffffff' : '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            cursor: isAcking ? 'not-allowed' : 'pointer',
                            fontSize: '0.8125rem',
                            fontWeight: 500
                          }}
                        >
                          {isAcking ? 'Saving...' : 'Acknowledge'}
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
