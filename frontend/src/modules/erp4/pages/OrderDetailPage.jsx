import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';

export default function OrderDetailPage() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [summary, setSummary] = useState({ total: 0, reserved: 0, shortage: 0, released: 0 });
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Load order and existing reservations
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch sales order details
      const orderRes = await api('erp4', `/api/sales-orders/${id}`);
      const orderData = orderRes?.data || orderRes;
      setOrder(orderData);

      // 2. Fetch current reservations
      try {
        const resRes = await api('erp4', `/api/sales-orders/${id}/reservations`);
        const resData = resRes?.data || resRes;
        if (resData && Array.isArray(resData.reservations)) {
          setReservations(resData.reservations);
          if (resData.summary) setSummary(resData.summary);
        } else if (Array.isArray(resData)) {
          setReservations(resData);
        }
      } catch (resErr) {
        // No reservations yet
        setReservations([]);
      }
    } catch (err) {
      setError(err.message || `Failed to load order ${id}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  // Handle clicking "Reserve stock" button
  const handleReserveStock = async () => {
    try {
      setReserving(true);
      setError(null);
      setSuccessMsg(null);

      const res = await api('erp4', `/api/sales-orders/${id}/reserve`, {
        method: 'POST'
      });

      const data = res?.data || res;
      if (data) {
        setReservations(data.reservations || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        setSuccessMsg('Stock reservation processed successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to reserve stock');
    } finally {
      setReserving(false);
    }
  };

  // Handle manual reservation release
  const handleReleaseReservations = async () => {
    try {
      setReserving(true);
      setError(null);
      setSuccessMsg(null);

      await api('erp4', `/api/sales-orders/${id}/reservations`, {
        method: 'DELETE'
      });

      setSuccessMsg(`Reservations for order ${id} released.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to release reservations');
    } finally {
      setReserving(false);
    }
  };

  // Handle order cancellation (automatically releases reservations)
  const handleCancelOrder = async () => {
    if (!window.confirm(`Are you sure you want to cancel order ${id}? This will automatically release all stock reservations.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      await api('erp4', `/api/sales-orders/${id}/cancel`, {
        method: 'PATCH'
      });

      setSuccessMsg(`Order ${id} has been cancelled and reservations were released.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
      setLoading(false);
    }
  };

  // Format money in INR
  const formatINR = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to find reservation status for a given SKU
  const getReservationForSku = (sku) => {
    return reservations.find(r => r.sku === sku);
  };

  // Render status chips
  const renderStatusChip = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'reserved':
        return <span className="badge badge-green">Reserved</span>;
      case 'shortage':
        return <span className="badge badge-red">Shortage</span>;
      case 'released':
        return <span className="badge badge-amber">Released</span>;
      default:
        return <span className="badge badge-blue">Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading sales order details...
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="page-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
          <h3>Order Not Found</h3>
          <p>{error}</p>
          <Link to="/erp4" className="btn" style={{ marginTop: '1rem', textDecoration: 'none' }}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const items = order?.items || [];
  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0);
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  // Check if any reservation has a shortage
  const hasShortage = reservations.some(r => r.status === 'shortage');
  const isCancellable = order?.status !== 'dispatched' && order?.status !== 'delivered' && order?.status !== 'cancelled';
  const hasActiveReservations = reservations.some(r => r.status === 'reserved' || r.status === 'shortage');

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      {/* Navigation & Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/erp4" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to Orders
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
              Order {order?.id}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Created on {order?.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span
              className={
                order?.status === 'cancelled'
                  ? 'badge badge-red'
                  : order?.status === 'delivered'
                  ? 'badge badge-green'
                  : 'badge badge-blue'
              }
              style={{ fontSize: '0.875rem', padding: '0.35rem 0.75rem' }}
            >
              {(order?.status || 'created').toUpperCase()}
            </span>
            {isCancellable && (
              <button
                type="button"
                onClick={handleCancelOrder}
                style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.85rem'
                }}
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #22c55e', color: '#15803d', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <strong>Success:</strong> {successMsg}
        </div>
      )}

      {/* Order Meta Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem', background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Customer</span>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{order?.customer_name}</div>
          <small style={{ color: '#64748b' }}>{order?.customer_id}</small>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Customer GSTIN</span>
          <div style={{ fontWeight: 500, color: '#0f172a' }}>{order?.customer_gstin || 'None (Retail)'}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Sales Rep</span>
          <div style={{ fontWeight: 500, color: '#0f172a' }}>{order?.sales_rep_id}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Amount</span>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>
            {formatINR(order?.total_amount || grandTotal)}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>Order Line Items</h3>
        <table style={{ width: '100%', margin: 0 }}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit Price (₹)</th>
              <th style={{ textAlign: 'right' }}>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ fontWeight: 600 }}>{item.sku}</td>
                <td>{item.product_name}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatINR(item.unit_price)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#64748b' }}>
              <span>Subtotal:</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#64748b' }}>
              <span>GST (18%):</span>
              <span>{formatINR(gst)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '2px solid #e2e8f0', fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>
              <span>Grand Total:</span>
              <span>{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RESERVATION PANEL (ERP4-B2 & ERP4-B3)                     */}
      {/* ========================================================= */}
      <div
        id="reservation-panel"
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Reservation Panel</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>
              Check inventory across warehouses, reserve stock, and automatically trigger work orders for shortages
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {hasActiveReservations && (
              <button
                type="button"
                onClick={handleReleaseReservations}
                disabled={reserving}
                style={{
                  background: '#fff7ed',
                  color: '#c2410c',
                  border: '1px solid #fed7aa',
                  padding: '0.6rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Release Reservations
              </button>
            )}
            <button
              id="reserve-stock-btn"
              type="button"
              className="btn"
              onClick={handleReserveStock}
              disabled={reserving || order?.status === 'cancelled'}
              style={{
                padding: '0.6rem 1.25rem',
                fontWeight: 600,
                backgroundColor: (reserving || order?.status === 'cancelled') ? '#94a3b8' : '#2563eb'
              }}
            >
              {reserving ? 'Reserving...' : 'Reserve stock'}
            </button>
          </div>
        </div>

        {/* Shortage Warning Banner */}
        {hasShortage && (
          <div
            id="shortage-warning-banner"
            style={{
              background: '#fee2e2',
              border: '1px solid #ef4444',
              color: '#b91c1c',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <strong>Stock Shortage Warning:</strong> One or more items in this order have insufficient stock in ERP-1. Production work order has been requested from ERP-3.
            </div>
          </div>
        )}

        {/* Reservations Table */}
        <table style={{ width: '100%', margin: 0 }}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th style={{ textAlign: 'right' }}>Requested Qty</th>
              <th style={{ textAlign: 'center' }}>Reservation Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const resv = getReservationForSku(item.sku);
              const status = resv ? resv.status : 'pending';
              return (
                <tr key={item.sku || idx}>
                  <td style={{ fontWeight: 600 }}>{item.sku}</td>
                  <td>{item.product_name}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {renderStatusChip(status)}
                      {status === 'shortage' && (
                        <span className="badge badge-amber" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                          Production requested
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary Footer */}
        {reservations.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#475569', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px' }}>
            <span><strong>Total Items:</strong> {items.length}</span>
            <span><strong>Reserved:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>{summary.reserved || reservations.filter(r => r.status === 'reserved').length}</span></span>
            <span><strong>Shortage:</strong> <span style={{ color: '#b91c1c', fontWeight: 600 }}>{summary.shortage || reservations.filter(r => r.status === 'shortage').length}</span></span>
            <span><strong>Released:</strong> <span style={{ color: '#b45309', fontWeight: 600 }}>{summary.released || reservations.filter(r => r.status === 'released').length}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
