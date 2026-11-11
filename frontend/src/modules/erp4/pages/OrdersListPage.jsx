import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

// Pre-configured shared contract product options for quick selection in the New Order form
const SAMPLE_PRODUCTS = [
  { sku: 'SKU-0001', name: '55-inch 4K Smart TV', price: 42990 },
  { sku: 'SKU-0002', name: '43-inch Full HD TV', price: 24990 },
  { sku: 'SKU-0003', name: '65-inch OLED TV', price: 94990 },
  { sku: 'SKU-0004', name: 'Soundbar 2.1', price: 8990 },
  { sku: 'SKU-0006', name: 'Wireless Headphones', price: 3499 },
  { sku: 'SKU-0008', name: '20W Fast Charger', price: 899 },
  { sku: 'SKU-0009', name: 'Power Bank 20000mAh', price: 1799 }
];

export default function OrdersListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  // "New Order" form toggle and state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const [formData, setFormData] = useState({
    customer_id: 'CUST-0001',
    customer_name: 'Aarav Mehta',
    customer_gstin: '',
    sales_rep_id: 'EMP-0001',
    quote_id: '',
    items: [
      { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990 }
    ]
  });

  // Fetch sales orders from backend API
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

  // Format currency in INR with ₹ symbol
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

  // Line items management inside the form
  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: value };

    // If SKU changed from sample dropdown, auto-fill name and price
    if (field === 'sku') {
      const match = SAMPLE_PRODUCTS.find(p => p.sku === value);
      if (match) {
        updated[index].product_name = match.name;
        updated[index].unit_price = match.price;
      }
    }
    setFormData({ ...formData, items: updated });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { sku: 'SKU-0004', product_name: 'Soundbar 2.1', quantity: 1, unit_price: 8990 }
      ]
    });
  };

  const removeItemRow = (index) => {
    if (formData.items.length <= 1) return;
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  // Compute live subtotal, GST and grand total for the form
  const formSubtotal = formData.items.reduce((acc, it) => {
    const qty = parseInt(it.quantity, 10) || 0;
    const price = parseFloat(it.unit_price) || 0;
    return acc + (qty * price);
  }, 0);
  const formGST = formSubtotal * 0.18;
  const formGrandTotal = formSubtotal + formGST;

  // Handle order creation submission
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.customer_id.trim()) {
      setFormError('Customer ID is required');
      return;
    }
    if (!formData.sales_rep_id.trim()) {
      setFormError('Sales Rep ID is required');
      return;
    }
    if (formData.items.length === 0) {
      setFormError('At least one item is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customer_id: formData.customer_id.trim(),
        customer_name: formData.customer_name.trim() || `Customer ${formData.customer_id.trim()}`,
        customer_gstin: formData.customer_gstin.trim() || null,
        sales_rep_id: formData.sales_rep_id.trim(),
        quote_id: formData.quote_id.trim() || null,
        items: formData.items.map(it => ({
          sku: it.sku.trim(),
          product_name: it.product_name.trim(),
          quantity: parseInt(it.quantity, 10) || 1,
          unit_price: parseFloat(it.unit_price) || 0
        }))
      };

      const res = await api('erp4', '/api/sales-orders', {
        method: 'POST',
        body: payload
      });

      const created = res?.data || res;
      setFormSuccess(`Sales order ${created.id} created successfully! Total: ${formatINR(created.total_amount)}`);
      
      // Reset form
      setFormData({
        customer_id: 'CUST-0001',
        customer_name: 'Aarav Mehta',
        customer_gstin: '',
        sales_rep_id: 'EMP-0001',
        quote_id: '',
        items: [
          { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990 }
        ]
      });

      // Refresh list
      fetchOrders();
    } catch (err) {
      setFormError(err.message || 'Failed to create sales order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Sales Orders</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage customer sales orders and stock fulfillment for Team ERP-4
          </p>
        </div>
        <button
          className="btn"
          onClick={() => {
            setShowForm(!showForm);
            setFormError(null);
            setFormSuccess(null);
          }}
          style={{ padding: '0.6rem 1.25rem', fontWeight: 600 }}
        >
          {showForm ? '✕ Close Form' : '+ New Order'}
        </button>
      </div>

      {/* Global Success Banner */}
      {formSuccess && (
        <div style={{ background: '#dcfce7', border: '1px solid #22c55e', color: '#15803d', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {formSuccess}</span>
          <button
            onClick={() => setFormSuccess(null)}
            style={{ background: 'transparent', border: 'none', color: '#15803d', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ========================================================= */}
      {/* "NEW ORDER" FORM (ERP4-A2)                                */}
      {/* ========================================================= */}
      {showForm && (
        <div
          id="new-order-panel"
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Create New Sales Order</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fill in customer details and line items</span>
          </div>

          {formError && (
            <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              <strong>Failed:</strong> {formError}
            </div>
          )}

          <form onSubmit={handleCreateOrder}>
            {/* Customer & Rep Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  CUSTOMER ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CUST-0001"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  CUSTOMER NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aarav Mehta"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  CUSTOMER GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="15-character GSTIN"
                  value={formData.customer_gstin}
                  onChange={(e) => setFormData({ ...formData, customer_gstin: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  SALES REP ID *
                </label>
                <select
                  value={formData.sales_rep_id}
                  onChange={(e) => setFormData({ ...formData, sales_rep_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="EMP-0001">EMP-0001 (Rohan Kulkarni)</option>
                  <option value="EMP-0002">EMP-0002 (Neha Sharma)</option>
                  <option value="EMP-0003">EMP-0003 (Vikram Singh)</option>
                  <option value="EMP-0004">EMP-0004 (Anjali Rao)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  QUOTE ID (CRM-1 Reference)
                </label>
                <input
                  type="text"
                  placeholder="e.g. QUO-0010"
                  value={formData.quote_id}
                  onChange={(e) => setFormData({ ...formData, quote_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            {/* Line Items Table in Form */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>ORDER LINE ITEMS</span>
                <button
                  type="button"
                  onClick={addItemRow}
                  style={{ background: '#f1f5f9', color: '#2563eb', border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '4px' }}
                >
                  + Add Item Row
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <table style={{ margin: 0, width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>SKU</th>
                      <th style={{ width: '35%' }}>Product Name</th>
                      <th style={{ width: '15%' }}>Quantity</th>
                      <th style={{ width: '18%' }}>Unit Price (₹)</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            value={item.sku}
                            onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          >
                            {SAMPLE_PRODUCTS.map(p => (
                              <option key={p.sku} value={p.sku}>{p.sku} - {p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            required
                            value={item.product_name}
                            onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            disabled={formData.items.length <= 1}
                            onClick={() => removeItemRow(idx)}
                            style={{
                              background: formData.items.length <= 1 ? '#e2e8f0' : '#fee2e2',
                              color: formData.items.length <= 1 ? '#94a3b8' : '#b91c1c',
                              border: 'none',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '4px',
                              cursor: formData.items.length <= 1 ? 'not-allowed' : 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Price Preview & Submit Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
                <span>Subtotal: <strong>{formatINR(formSubtotal)}</strong></span>
                <span>GST (18%): <strong>{formatINR(formGST)}</strong></span>
                <span>Grand Total: <strong style={{ color: '#2563eb' }}>{formatINR(formGrandTotal)}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn"
                  style={{ padding: '0.5rem 1.25rem', fontWeight: 600 }}
                >
                  {submitting ? 'Creating Order...' : 'Create Sales Order'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

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
                    <div style={{ fontWeight: 500 }}>{order.customer_name}</div>
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
