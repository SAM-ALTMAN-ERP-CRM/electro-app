import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../../api';

// Four ordered delivery steps required by CRM5-A3
export const ORDER_STEPS = [
  {
    key: 'created',
    label: 'Created',
    description: 'Order placed & registered in ERP system'
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    description: 'Payment verified & inventory allocated'
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    description: 'Package handed over to logistics courier'
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Consignment safely delivered to customer'
  }
];

/**
 * Maps upstream ERP-4 status to the 4 ordered display steps.
 * Returns 'completed', 'current', or 'pending' for a given step.
 * Unknown or unsupported statuses safely return 'pending' (never marked delivered).
 */
export function getStepStatus(orderStatus, stepKey) {
  const normalized = (orderStatus || '').toLowerCase().trim();
  const sequence = ['created', 'confirmed', 'dispatched', 'delivered'];
  const currentIndex = sequence.indexOf(normalized);

  // Unknown, unsupported, or cancelled status: safe fallback
  if (currentIndex === -1) {
    return 'pending';
  }

  const stepIndex = sequence.indexOf(stepKey);
  if (stepIndex < currentIndex) {
    return 'completed';
  } else if (stepIndex === currentIndex) {
    return 'current';
  } else {
    return 'pending';
  }
}

export default function OrderTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrderDetails = async (orderId) => {
    if (!orderId) {
      setError('No Order ID specified in URL.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call CRM-5 backend endpoint which proxies ERP-4
      const res = await api('crm5', `/api/portal/orders/${encodeURIComponent(orderId)}`);
      const orderData = res?.data || res;
      if (orderData && orderData.id) {
        setOrder(orderData);
      } else {
        throw new Error(`Order '${orderId}' was not found in tracking records.`);
      }
    } catch (err) {
      console.error('Failed to load order tracking details:', err);
      setError(err.message || `Unable to locate order '${orderId}'. Please verify the order reference number.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails(id);
  }, [id]);

  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const currentStatus = order?.status?.toLowerCase() || '';
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Navigation bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          onClick={() => navigate('/crm5/portal')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#374151',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          ← Back to Customer Portal
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: '#e0e7ff',
            color: '#4338ca'
          }}>
            ERP-4 Dispatch Integration
          </span>
          <button
            type="button"
            onClick={() => fetchOrderDetails(id)}
            disabled={loading}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            ↻ Refresh Status
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📦 ⏳</div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Querying Order Tracking Details...
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>
            Fetching consignment status and fulfillment milestones from ERP-4 for <code>{id}</code>.
          </p>
        </div>
      )}

      {/* Error / Not-Found State */}
      {!loading && error && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '36px 24px',
          textAlign: 'center',
          border: '1px solid #fecaca',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍 ⚠️</div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#991b1b', margin: '0 0 8px 0' }}>
            Order Not Found
          </h2>
          <p style={{ color: '#4b5563', fontSize: '14px', maxWidth: '500px', margin: '0 auto 20px auto' }}>
            {error}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => fetchOrderDetails(id)}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Retry Tracking
            </button>
            <button
              type="button"
              onClick={() => navigate('/crm5/portal')}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Return to Portal
            </button>
          </div>
        </div>
      )}

      {/* Order Tracking Dashboard */}
      {!loading && order && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: 0 }}>
                  Order {order.id}
                </h1>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  backgroundColor: currentStatus === 'delivered' ? '#ecfdf5' : currentStatus === 'dispatched' ? '#eff6ff' : currentStatus === 'confirmed' ? '#f5f3ff' : '#fef3c7',
                  color: currentStatus === 'delivered' ? '#047857' : currentStatus === 'dispatched' ? '#1d4ed8' : currentStatus === 'confirmed' ? '#6d28d9' : '#b45309',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  {order.status}
                </span>
              </div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                Placed on <strong>{formatDate(order.created_at)}</strong> · Reference: <strong style={{ fontFamily: 'monospace' }}>{order.quote_id || 'Direct'}</strong>
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Order Value
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#111827', marginTop: '2px' }}>
                {formatMoney(order.total_amount)}
              </div>
            </div>
          </div>

          {/* Cancelled Banner if applicable */}
          {isCancelled && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#991b1b',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <div>
                <strong>Order Cancelled:</strong> This sales order was cancelled. Milestone fulfillment has ceased.
              </div>
            </div>
          )}

          {/* FOUR-STAGE ORDER PROGRESS INDICATOR [CRM5-A3] */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '28px 24px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 24px 0' }}>
              Fulfillment &amp; Delivery Progress
            </h2>

            {/* Stepper Timeline */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              position: 'relative',
              gap: '8px'
            }}>
              {ORDER_STEPS.map((step, idx) => {
                const stepState = getStepStatus(order.status, step.key);
                const isCompleted = stepState === 'completed';
                const isCurrent = stepState === 'current';
                const isPending = stepState === 'pending';

                // Stepper circle styles
                let circleBg = '#e5e7eb';
                let circleColor = '#6b7280';
                let circleBorder = '2px solid #d1d5db';
                let titleColor = '#9ca3af';

                if (isCompleted) {
                  circleBg = '#10b981';
                  circleColor = '#ffffff';
                  circleBorder = '2px solid #059669';
                  titleColor = '#111827';
                } else if (isCurrent) {
                  circleBg = '#2563eb';
                  circleColor = '#ffffff';
                  circleBorder = '3px solid #bfdbfe';
                  titleColor = '#1e40af';
                }

                return (
                  <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                    {/* Connecting Bar to next step */}
                    {idx < ORDER_STEPS.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        top: '18px',
                        left: '50%',
                        width: '100%',
                        height: '4px',
                        backgroundColor: (isCompleted && (getStepStatus(order.status, ORDER_STEPS[idx + 1].key) === 'completed' || getStepStatus(order.status, ORDER_STEPS[idx + 1].key) === 'current'))
                          ? '#10b981'
                          : '#e5e7eb',
                        zIndex: 1
                      }} />
                    )}

                    {/* Step Circle */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: circleBg,
                      color: circleColor,
                      border: circleBorder,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '14px',
                      position: 'relative',
                      zIndex: 2,
                      boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}>
                      {isCompleted ? '✓' : (idx + 1)}
                    </div>

                    {/* Step Labels */}
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '14px', fontWeight: (isCurrent || isCompleted) ? '700' : '500', color: titleColor }}>
                        {step.label}
                      </div>

                      {isCurrent && (
                        <span style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '10px',
                          fontWeight: '700',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          letterSpacing: '0.03em'
                        }}>
                          ACTIVE STEP
                        </span>
                      )}

                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', lineHeight: '1.3' }}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consignment & Customer Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Customer & Address Details */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Customer Account
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Customer Name:</span>
                  <strong style={{ color: '#111827' }}>{order.customer_name || 'Valued Customer'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Customer ID:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#111827' }}>{order.customer_id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Customer GSTIN:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#111827' }}>{order.customer_gstin || 'Not Applicable'}</strong>
                </div>
              </div>
            </div>

            {/* Logistics & Sales Fulfillment Details */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dispatch Reference
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Assigned Sales Rep:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#111827' }}>{order.sales_rep_id || 'EMP-0001'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Origin Warehouse:</span>
                  <strong style={{ color: '#111827' }}>Central Depot WH-01</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Fulfillment State:</span>
                  <strong style={{ color: '#111827', textTransform: 'capitalize' }}>{order.status}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Line Items Breakdown */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>
                Order Line Items ({order.items.length})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px 12px' }}>SKU</th>
                      <th style={{ padding: '8px 12px' }}>Product Description</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Quantity</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => {
                      const qty = Number(item.quantity) || 1;
                      const price = Number(item.unit_price) || 0;
                      return (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600', color: '#2563eb' }}>
                            {item.sku}
                          </td>
                          <td style={{ padding: '12px', color: '#111827', fontWeight: '500' }}>
                            {item.product_name}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#374151' }}>
                            {qty}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#4b5563' }}>
                            {formatMoney(price)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#111827' }}>
                            {formatMoney(qty * price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                      <td colSpan="4" style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#111827' }}>
                        Total Consignment Value:
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', fontSize: '15px', color: '#111827' }}>
                        {formatMoney(order.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

