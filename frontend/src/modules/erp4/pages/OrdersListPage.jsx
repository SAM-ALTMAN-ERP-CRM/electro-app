import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

export default function OrdersListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  // Fetch sales orders from backend
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      let query = '';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (customerFilter) params.append('customer_id', customerFilter);
      if (params.toString()) query = `?${params.toString()}`;

      const res = await api('erp4', `/api/sales-orders${query}`);
      setOrders(Array.isArray(res) ? res : (res?.data || []));
    } catch (err) {
      setError(err.message || 'Failed to load sales orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, customerFilter]);

  // Format currency in INR
  const formatINR = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Status badge styling
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

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Sales Orders</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage customer sales orders and stock reservations for Team ERP-4
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
            FILTER BY STATUS
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          >
            <option value="">All Statuses</option>
            <option value="created">Created</option>
            <option value="confirmed">Confirmed</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
            FILTER BY CUSTOMER ID
          </label>
          <input
            type="text"
            placeholder="e.g. CUST-0001"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>
        {(statusFilter || customerFilter) && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => { setStatusFilter(''); setCustomerFilter(''); }}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.5rem 1rem' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '1rem' }}>
          Loading sales orders...
        </div>
      ) : orders.length === 0 ? (
        /* Empty state */
        <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>No sales orders found.</p>
        </div>
      ) : (
        /* Orders Table */
        <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Sales Rep</th>
                <th>Total (INR)</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>
                    <Link to={`/erp4/orders/${order.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {order.id}
                    </Link>
                  </td>
                  <td>
                    <div>{order.customer_name}</div>
                    <small style={{ color: '#64748b' }}>{order.customer_id}</small>
                  </td>
                  <td>{order.sales_rep_id}</td>
                  <td style={{ fontWeight: 600 }}>{formatINR(order.total_amount)}</td>
                  <td>{renderStatusBadge(order.status)}</td>
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={`/erp4/orders/${order.id}`}
                      className="btn"
                      style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
