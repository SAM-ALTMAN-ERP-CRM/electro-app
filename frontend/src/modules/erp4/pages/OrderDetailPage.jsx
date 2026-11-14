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
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch sales order details and any existing stock reservations
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch sales order details
      const orderRes = await api('erp4', `/api/sales-orders/${id}`);
      const orderData = orderRes?.data || orderRes;
      setOrder(orderData);

      // 2. Fetch current reservations if available
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
        // Reservations might not be initiated yet
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

  // Handle confirming order (ERP4-A3: PATCH /api/sales-orders/:id/confirm)
  const handleConfirmOrder = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg(null);

      const res = await api('erp4', `/api/sales-orders/${id}/confirm`, {
        method: 'PATCH'
      });

      const updated = res?.data || res;
      setOrder(updated);
      setSuccessMsg(`Sales order ${id} has been confirmed successfully!`);
    } catch (err) {
      setError(err.message || 'Failed to confirm order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancelling order (ERP4-A3 & ERP4-B3: PATCH /api/sales-orders/:id/cancel)
  const handleCancelOrder = async () => {
    if (!window.confirm(`Are you sure you want to cancel sales order ${id}? This will automatically release all stock reservations.`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg(null);

      const res = await api('erp4', `/api/sales-orders/${id}/cancel`, {
        method: 'PATCH'
      });

      const updated = res?.data || res;
      setOrder(updated);
      setSuccessMsg(`Sales order ${id} has been cancelled and reservations released.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle manual reservation release (ERP4-B3: DELETE /api/sales-orders/:id/reservations)
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

  // Handle clicking "Reserve stock" button (calls ERP4-B1/B2/B3)
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
        setSuccessMsg('Stock reservation completed successfully.');
      }
    } catch (err) {
      setError(err.message || 'Failed to reserve stock');
    } finally {
      setReserving(false);
    }
  };

  // Currency formatter in INR
  const formatINR = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Status badge helper
  const renderStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'confirmed':
        return <span className="badge badge-blue">Confirmed</span>;
      case 'dispatched':
        return <span className="badge badge-amber">Dispatched</span>;
      case 'delivered':
        return <span className="badge badge-green">Delivered</span>;
      case 'cancelled':
        return <span className="badge badge-red">Cancelled</span>;
      case 'created':
      default:
        return <span className="badge badge-blue">Created</span>;
    }
  };

  // Reservation chip helper
  const renderStatusChip = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'reserved':
        return <span className="badge badge-green">Reserved</span>;
      case 'shortage':
        return <span className="badge badge-red">Shortage</span>;
      case 'released':
        return <span className="badge badge-amber">Released</span>;
      case 'pending':
      default:
        return <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Pending</span>;
    }
  };

  const getReservationForSku = (sku) => {
    return reservations.find(r => r.sku === sku);
  };

  const hasShortage = reservations.some(r => r.status === 'shortage');
  const hasActiveReservations = reservations.some(r => r.status === 'reserved' || r.status === 'shortage');

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Loading order details...
      </div>
    );
  }

  if (error && !order) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/orders" style={{ display: 'inline-block', marginBottom: '1rem', color: '#2563eb' }}>
          ← Back to Orders
        </Link>
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '8px' }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Sales order not found.
      </div>
    );
  }

  const items = order.items || [];
  const subtotal = parseFloat(order.total_amount) || 0;
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;
  const isCreated = (order.status || '').toLowerCase() === 'created';
  const isCancelled = (order.status || '').toLowerCase() === 'cancelled';
  const isDispatched = (order.status || '').toLowerCase() === 'dispatched';
  const isDelivered = (order.status || '').toLowerCase() === 'delivered';
  const canCancel = isCreated || (order.status || '').toLowerCase() === 'confirmed';

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link to="/orders" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          ← Back to Orders
        </Link>

        {/* Action Buttons for Lifecycle (ERP4-A3) */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isCreated && (
            <button
              id="confirm-order-btn"
              type="button"
              className="btn"
              onClick={handleConfirmOrder}
              disabled={actionLoading}
              style={{
                backgroundColor: '#16a34a',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              {actionLoading ? 'Processing...' : 'Confirm Order'}
            </button>
          )}

          {canCancel && (
            <button
              id="cancel-order-btn"
              type="button"
              onClick={handleCancelOrder}
              disabled={actionLoading}
              style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #f87171',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {actionLoading ? 'Processing...' : 'Cancel Order'}
            </button>
          )}

          {(isDispatched || isDelivered) && (
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
              Order is already {order.status}
            </span>
          )}
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

      {/* Header Info Card */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>{order.id}</h2>
              {renderStatusBadge(order.status)}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Created on {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Grand Total (incl. GST)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
              {formatINR(grandTotal)}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Customer</span>
            <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '0.25rem' }}>{order.customer_name}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>ID: {order.customer_id}</div>
            {order.customer_gstin && (
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>GSTIN: {order.customer_gstin}</div>
            )}
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Sales Representative</span>
            <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '0.25rem' }}>{order.sales_rep_id || 'Unassigned'}</div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Accepted Quote</span>
            <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '0.25rem' }}>
              {order.quote_id ? (
                <span style={{ color: '#2563eb' }}>{order.quote_id}</span>
              ) : (
                <span style={{ color: '#94a3b8' }}>Direct Order (No Quote)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Order Line Items</h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>SKU</th>
              <th style={{ textAlign: 'left' }}>Product Name</th>
              <th style={{ textAlign: 'right' }}>Quantity</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
              return (
                <tr key={item.id || idx}>
                  <td style={{ fontWeight: 600 }}>{item.sku}</td>
                  <td>{item.product_name}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{formatINR(item.unit_price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pricing Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '320px', background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#475569', fontSize: '0.9rem' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>{formatINR(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#475569', fontSize: '0.9rem' }}>
              <span>GST (18%):</span>
              <span style={{ fontWeight: 600 }}>{formatINR(gst)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderTop: '2px solid #cbd5e1', fontWeight: 700, color: '#0f172a', fontSize: '1.15rem' }}>
              <span>Grand Total:</span>
              <span style={{ color: '#2563eb' }}>{formatINR(grandTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Order Status:</span>
              <span>{renderStatusBadge(order.status)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RESERVATION PANEL INTEGRATION (ERP4-B2 / ERP4-B3)         */}
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Stock Reservation Panel</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>
              Reserve warehouse inventory for order fulfillment and request work orders for shortages
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
                  fontWeight: 500,
                  borderRadius: '6px',
                  cursor: reserving ? 'not-allowed' : 'pointer'
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
              disabled={reserving || isCancelled}
              style={{
                padding: '0.6rem 1.25rem',
                fontWeight: 600,
                backgroundColor: isCancelled ? '#cbd5e1' : reserving ? '#94a3b8' : '#2563eb',
                cursor: isCancelled ? 'not-allowed' : 'pointer'
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
