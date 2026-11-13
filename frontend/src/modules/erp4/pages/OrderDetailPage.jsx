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

  // Handle cancelling order (ERP4-A3: PATCH /api/sales-orders/:id/cancel)
  const handleCancelOrder = async () => {
    if (!window.confirm(`Are you sure you want to cancel sales order ${id}?`)) {
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
      setSuccessMsg(`Sales order ${id} has been cancelled.`);
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle clicking "Reserve stock" button (calls ERP4-B1/B2)
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
      default:
        return <span className="badge badge-blue">Pending</span>;
    }
  };

  const getReservationForSku = (sku) => {
    return reservations.find(r => r.sku === sku);
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
          <p style={{ marginTop: '0.5rem' }}>{error}</p>
          <Link to="/erp4" className="btn" style={{ marginTop: '1rem', textDecoration: 'none' }}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const items = order?.items || [];
  // Calculate subtotal, 18% GST and grand total
  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0);
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  const hasShortage = reservations.some(r => r.status === 'shortage');

  // Timeline stage mapping
  const stages = ['created', 'confirmed', 'dispatched', 'delivered'];
  const currentStageIndex = stages.indexOf((order.status || '').toLowerCase());
  const isCancelled = (order.status || '').toLowerCase() === 'cancelled';

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      {/* Navigation & Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/erp4" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to Orders
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>{order.id}</h2>
              {renderStatusBadge(order.status)}
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Placed on {order.created_at ? new Date(order.created_at).toLocaleString('en-IN') : '—'}
            </p>
          </div>

          {/* Action Buttons (ERP4-A3) */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {order.status === 'created' && (
              <button
                type="button"
                className="btn"
                onClick={handleConfirmOrder}
                disabled={actionLoading}
                style={{ backgroundColor: '#15803d', padding: '0.55rem 1.15rem', fontWeight: 600 }}
              >
                {actionLoading ? 'Updating...' : '✓ Confirm Order'}
              </button>
            )}

            {(order.status === 'created' || order.status === 'confirmed') && (
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={actionLoading}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #f87171',
                  borderRadius: '6px',
                  padding: '0.55rem 1.15rem',
                  fontWeight: 600,
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Updating...' : '✕ Cancel Order'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #22c55e', color: '#15803d', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ========================================================= */}
      {/* STATUS TIMELINE STEPPER (ERP4-A3)                         */}
      {/* ========================================================= */}
      <div
        id="order-status-timeline"
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>
          ORDER LIFECYCLE TIMELINE
        </div>

        {isCancelled ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem 1.25rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🚫</span>
            <div>
              <strong>Order Cancelled:</strong> This sales order was cancelled before dispatch. Reserved inventory is released.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {stages.map((stageName, idx) => {
              const isPassed = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;

              return (
                <div key={stageName} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                  {/* Connecting Line */}
                  {idx < stages.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '50%',
                        width: '100%',
                        height: '3px',
                        backgroundColor: currentStageIndex > idx ? '#2563eb' : '#e2e8f0',
                        zIndex: 1
                      }}
                    />
                  )}

                  {/* Stage Node */}
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: isPassed ? '#2563eb' : isCurrent ? '#3b82f6' : '#f1f5f9',
                      border: isCurrent ? '3px solid #bfdbfe' : isPassed ? '2px solid #2563eb' : '2px solid #cbd5e1',
                      color: isPassed || isCurrent ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      zIndex: 2,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isPassed ? '✓' : idx + 1}
                  </div>

                  {/* Stage Label */}
                  <span
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#0f172a' : isPassed ? '#2563eb' : '#94a3b8',
                      textTransform: 'capitalize'
                    }}
                  >
                    {stageName}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>CUSTOMER</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>{order.customer_name}</div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{order.customer_id}</div>
          {order.customer_gstin && (
            <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.25rem', fontWeight: 600 }}>GSTIN: {order.customer_gstin}</div>
          )}
        </div>

        <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>SALES REPRESENTATIVE</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>{order.sales_rep_id}</div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Sales Department</div>
        </div>

        <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>QUOTATION SOURCE</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
            {order.quote_id || 'Direct Sales Order'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>CRM-1 Integration</div>
        </div>

        <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>ORDER STATUS</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.25rem' }}>
            {renderStatusBadge(order.status)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>Fulfillment lifecycle</div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ORDER ITEMS & PRICING SUMMARY (ERP4-A2)                   */}
      {/* ========================================================= */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Order Line Items</h3>
        
        {items.length === 0 ? (
          <p style={{ color: '#64748b' }}>No line items in this order.</p>
        ) : (
          <table style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>SKU</th>
                <th>Product Description</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price (₹)</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                return (
                  <tr key={item.id || idx}>
                    <td style={{ color: '#64748b' }}>{idx + 1}</td>
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
        )}

        {/* Financial Calculation Breakdown */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '320px', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', color: '#475569', fontSize: '0.9rem' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>{formatINR(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', color: '#475569', fontSize: '0.9rem' }}>
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
      {/* RESERVATION PANEL INTEGRATION (ERP4-B2)                   */}
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
              Reserve warehouse inventory for order fulfillment
            </p>
          </div>
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
              <strong>Stock Shortage Warning:</strong> One or more items in this order have insufficient stock in ERP-1. Production or reorder request needed.
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
                    {renderStatusChip(status)}
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
          </div>
        )}
      </div>
    </div>
  );
}
