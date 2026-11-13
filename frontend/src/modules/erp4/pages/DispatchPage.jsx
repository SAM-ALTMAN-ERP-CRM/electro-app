import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

// Allowed couriers according to the cross-team contract
const COURIERS = ['BlueDart', 'Delhivery', 'DTDC'];

// Realistic sample delivery addresses in India for convenient auto-filling
const SAMPLE_ADDRESSES = {
  'CUST-0001': '1201 Marina Bay, Bandra West, Mumbai 400050',
  'CUST-0002': 'Plot 45, MIDC Industrial Area, Andheri East, Mumbai 400093',
  'CUST-0003': '8B Palm Meadows, Panampilly Nagar, Kochi 682036',
  'CUST-0004': 'Shop 12-14, Phoenix Market City, Viman Nagar, Pune 411014',
  'CUST-0005': '504 Sunrise Heights, Bodakdev, Ahmedabad 380054',
  'CUST-0006': '72 Connaught Place, Central Delhi, New Delhi 110001',
  'CUST-0007': '88 Brigade Road, Ashok Nagar, Bengaluru 560025',
  'CUST-0008': '14 Anna Salai, Thousand Lights, Chennai 600002'
};

export default function DispatchPage() {
  const [orders, setOrders] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status and search filter for dispatches table
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dispatch Form state
  const [formData, setFormData] = useState({
    so_id: '',
    courier: 'BlueDart',
    tracking_no: '',
    address: '',
    ship_date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Track button action loading per dispatch ID e.g. { 'DSP-0001': 'shipped' }
  const [actionLoading, setActionLoading] = useState({});

  // Format currency in Indian Rupees
  const formatINR = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to generate a realistic tracking number based on courier
  const generateTrackingNo = (courierName) => {
    const prefix = courierName === 'BlueDart' ? 'BD' : (courierName === 'Delhivery' ? 'DL' : 'DT');
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    return `${prefix}-${randomDigits}`;
  };

  // Load both sales orders and dispatches from the backend
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all sales orders
      const ordersRes = await api('erp4', '/api/sales-orders');
      const ordersList = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data || []);
      setOrders(ordersList);

      // Fetch all dispatches (uses grouped format with fallback to flat CRM2 rows)
      const dispatchesRes = await api('erp4', '/api/dispatches?format=grouped');
      const rawDispatches = Array.isArray(dispatchesRes) ? dispatchesRes : (dispatchesRes?.data || []);

      // If flat rows were returned, group them by dispatch_id
      const groupedMap = {};
      rawDispatches.forEach((row) => {
        const dId = row.dispatch_id || row.id;
        if (!groupedMap[dId]) {
          groupedMap[dId] = {
            id: dId,
            so_id: row.so_id,
            customer_id: row.customer_id,
            customer_name: row.customer_name,
            courier: row.courier,
            tracking_no: row.tracking_no,
            status: row.status,
            address: row.address,
            ship_date: row.ship_date,
            delivered_date: row.delivered_date,
            created_at: row.created_at,
            serials: []
          };
        }
        if (Array.isArray(row.serials) && row.serials.length > 0) {
          groupedMap[dId].serials = row.serials;
        } else if (row.serial_number) {
          const exists = groupedMap[dId].serials.some(s => s.serial_number === row.serial_number);
          if (!exists) {
            groupedMap[dId].serials.push({
              sku: row.sku,
              serial_number: row.serial_number
            });
          }
        }
      });

      const processedDispatches = Object.values(groupedMap);
      setDispatches(processedDispatches);

      // Pre-select first eligible ready-to-dispatch order if form is empty
      const readyOrders = ordersList.filter(o => o.status !== 'dispatched' && o.status !== 'delivered' && o.status !== 'cancelled');
      if (readyOrders.length > 0 && !formData.so_id) {
        selectOrderForDispatch(readyOrders[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dispatch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When an order is selected, populate form fields with defaults
  const selectOrderForDispatch = (order) => {
    if (!order) return;
    const defaultAddr = SAMPLE_ADDRESSES[order.customer_id] || `${order.customer_name || 'Customer'}, India`;
    setFormData(prev => ({
      ...prev,
      so_id: order.id,
      address: defaultAddr,
      tracking_no: prev.tracking_no || generateTrackingNo(prev.courier)
    }));
    setFormError(null);
    setFormSuccess(null);
  };

  // Handle courier change and update tracking number prefix
  const handleCourierChange = (e) => {
    const courier = e.target.value;
    setFormData(prev => ({
      ...prev,
      courier,
      tracking_no: generateTrackingNo(courier)
    }));
  };

  // Submit dispatch form
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!formData.so_id) {
      setFormError('Please select a sales order to dispatch.');
      return;
    }
    if (!formData.tracking_no.trim()) {
      setFormError('Tracking number is required.');
      return;
    }
    if (!formData.address.trim()) {
      setFormError('Delivery address is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      setFormSuccess(null);

      const res = await api('erp4', '/api/dispatches', {
        method: 'POST',
        body: formData
      });

      const serialCount = res?.serials?.length || 0;
      const serialListStr = (res?.serials || []).map(s => s.serial_number).join(', ');

      setFormSuccess(
        `Successfully dispatched order ${formData.so_id} as ${res?.id || 'DSP'} via ${formData.courier}! ` +
        `Tracking: ${formData.tracking_no}. ${serialCount} serial unit(s) allocated: ${serialListStr}`
      );

      // Refresh orders and dispatches
      await loadData();

      // Reset tracking number for next dispatch
      setFormData(prev => ({
        ...prev,
        tracking_no: generateTrackingNo(prev.courier),
        so_id: ''
      }));
    } catch (err) {
      setFormError(err.message || 'Failed to dispatch order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update dispatch status (Shipped or Delivered buttons)
  const handleUpdateStatus = async (dispatchId, targetStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [dispatchId]: targetStatus }));
      setError(null);

      await api('erp4', `/api/dispatches/${dispatchId}/status`, {
        method: 'PATCH',
        body: { status: targetStatus }
      });

      // Update local state directly for responsive UI
      setDispatches(prev => prev.map(d => {
        if (d.id === dispatchId) {
          const today = new Date().toISOString().split('T')[0];
          return {
            ...d,
            status: targetStatus,
            ship_date: targetStatus === 'shipped' ? (d.ship_date || today) : d.ship_date,
            delivered_date: targetStatus === 'delivered' ? today : d.delivered_date
          };
        }
        return d;
      }));

      // Also reload data to sync corresponding sales order status change
      await loadData();
    } catch (err) {
      setError(`Failed to update ${dispatchId} to ${targetStatus}: ${err.message}`);
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[dispatchId];
        return next;
      });
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'picked':
        return <span className="badge badge-blue">Picked</span>;
      case 'shipped':
        return <span className="badge badge-amber">Shipped</span>;
      case 'delivered':
        return <span className="badge badge-green">Delivered</span>;
      case 'confirmed':
        return <span className="badge badge-blue">Confirmed</span>;
      case 'created':
        return <span className="badge badge-blue">Created</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Filter eligible orders awaiting dispatch
  const readyOrders = orders.filter(
    o => o.status !== 'dispatched' && o.status !== 'delivered' && o.status !== 'cancelled'
  );

  // Filter dispatches based on status and search
  const filteredDispatches = dispatches.filter(d => {
    if (statusFilter !== 'all' && (d.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (d.id || '').toLowerCase().includes(q);
      const matchSo = (d.so_id || '').toLowerCase().includes(q);
      const matchTrack = (d.tracking_no || '').toLowerCase().includes(q);
      const matchCourier = (d.courier || '').toLowerCase().includes(q);
      const matchSerial = (d.serials || []).some(s => (s.serial_number || '').toLowerCase().includes(q));
      return matchId || matchSo || matchTrack || matchCourier || matchSerial;
    }
    return true;
  });

  // KPI Metrics
  const pickedCount = dispatches.filter(d => d.status === 'picked').length;
  const shippedCount = dispatches.filter(d => d.status === 'shipped').length;
  const deliveredCount = dispatches.filter(d => d.status === 'delivered').length;

  return (
    <div className="dispatch-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
            📦 Courier Dispatch Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Order-to-Cash Workflow: Step 5 of 9 · Fulfill reserved sales orders, generate courier consignments, and track live deliveries.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Ready to Dispatch</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>{readyOrders.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Confirmed sales orders</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Warehouse Picked</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.25rem' }}>{pickedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Ready for courier pickup</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>In Transit (Shipped)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#b45309', marginTop: '0.25rem' }}>{shippedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>With delivery partners</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Delivered to Customer</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}>{deliveredCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Proof of delivery verified</div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Two Column Section: Ready Orders on Left, Dispatch Form on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Left Column: Orders Ready to Dispatch */}
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
              📋 Orders Ready to Dispatch
            </h2>
            <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
              {readyOrders.length} Pending
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              Loading sales orders...
            </div>
          ) : readyOrders.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎉</div>
              <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>All orders have been dispatched!</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                New accepted orders from CRM-1 or Orders screen will appear here once reserved.
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {readyOrders.map((order) => {
                    const isSelected = formData.so_id === order.id;
                    const itemsCount = (order.items || []).reduce((acc, item) => acc + (parseInt(item.quantity, 10) || 1), 0);
                    return (
                      <tr key={order.id} style={{ background: isSelected ? '#eff6ff' : 'transparent', transition: 'background 0.15s' }}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.id}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{itemsCount} item(s)</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{order.customer_name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{order.customer_id}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                          {formatINR(order.total_amount)}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => selectOrderForDispatch(order)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.75rem',
                              background: isSelected ? '#2563eb' : '#f1f5f9',
                              color: isSelected ? '#ffffff' : '#1e293b',
                              border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1'
                            }}
                          >
                            {isSelected ? '✓ Selected' : 'Dispatch'}
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

        {/* Right Column: Dispatch Form */}
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
            🚚 New Dispatch Consignment
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
            Allocates serialized inventory from ERP-1 and books a shipping consignment.
          </p>

          {/* Form Success / Error feedback */}
          {formSuccess && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8rem' }}>
              ✓ {formSuccess}
            </div>
          )}
          {formError && (
            <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8rem' }}>
              ⚠️ {formError}
            </div>
          )}

          <form onSubmit={handleDispatchSubmit}>
            {/* Sales Order Dropdown */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Sales Order to Dispatch <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={formData.so_id}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const targetOrder = orders.find(o => o.id === selectedId);
                  if (targetOrder) {
                    selectOrderForDispatch(targetOrder);
                  } else {
                    setFormData(prev => ({ ...prev, so_id: selectedId }));
                  }
                }}
                required
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="">-- Choose Sales Order --</option>
                {readyOrders.map(order => (
                  <option key={order.id} value={order.id}>
                    {order.id} · {order.customer_name} ({formatINR(order.total_amount)})
                  </option>
                ))}
                {/* Fallback to show any other order if user needs it */}
                {formData.so_id && !readyOrders.some(o => o.id === formData.so_id) && (
                  <option value={formData.so_id}>{formData.so_id} (Selected Order)</option>
                )}
              </select>
            </div>

            {/* Courier Dropdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Courier Partner <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.courier}
                  onChange={handleCourierChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  {COURIERS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Ship Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.ship_date}
                  onChange={(e) => setFormData({ ...formData, ship_date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            {/* Tracking Number */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                  Tracking Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tracking_no: generateTrackingNo(prev.courier) }))}
                  style={{ background: 'none', color: '#2563eb', padding: 0, fontSize: '0.75rem', textDecoration: 'underline', border: 'none', cursor: 'pointer' }}
                >
                  Generate New
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. BD-98210341"
                value={formData.tracking_no}
                onChange={(e) => setFormData({ ...formData, tracking_no: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>

            {/* Delivery Address */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Delivery Destination Address <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Full delivery street address, city, and pincode"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !formData.so_id}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: (!formData.so_id || submitting) ? '#94a3b8' : '#2563eb',
                cursor: (!formData.so_id || submitting) ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Allocating Serials & Dispatching...' : '🚀 Dispatch Order'}
            </button>
          </form>
        </div>
      </div>

      {/* Table of Dispatches */}
      <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a' }}>
              📜 All Courier Dispatches & Shipments
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Live consignments list. Click "Shipped" or "Delivered" to progress dispatch status.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search ID, Order, Serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="all">All Statuses ({dispatches.length})</option>
              <option value="picked">Picked ({pickedCount})</option>
              <option value="shipped">Shipped ({shippedCount})</option>
              <option value="delivered">Delivered ({deliveredCount})</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading dispatches...
          </div>
        ) : filteredDispatches.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '6px' }}>
            No dispatch records match your selected filter criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Dispatch ID</th>
                  <th>Order & Customer</th>
                  <th>Courier & Tracking</th>
                  <th>Status</th>
                  <th>Ship Date</th>
                  <th>Allocated Serials</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispatches.map((disp) => {
                  const isCurrentAction = actionLoading[disp.id];
                  const isPicked = disp.status === 'picked';
                  const isShipped = disp.status === 'shipped';
                  const isDelivered = disp.status === 'delivered';

                  return (
                    <tr key={disp.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{disp.id}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {disp.created_at ? new Date(disp.created_at).toLocaleDateString('en-IN') : ''}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#2563eb' }}>{disp.so_id}</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                          {disp.customer_name || disp.customer_id}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 500 }}>{disp.courier}</div>
                        <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', color: '#334155' }}>
                          {disp.tracking_no}
                        </code>
                      </td>

                      <td>
                        {renderStatusBadge(disp.status)}
                      </td>

                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{disp.ship_date || '—'}</div>
                        {disp.delivered_date && (
                          <div style={{ fontSize: '0.7rem', color: '#15803d' }}>
                            Delivered: {disp.delivered_date}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '240px' }}>
                          {(disp.serials || []).map((s, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.7rem',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                color: '#1e293b',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                fontFamily: 'monospace'
                              }}
                              title={s.sku}
                            >
                              {s.serial_number}
                            </span>
                          ))}
                          {(!disp.serials || disp.serials.length === 0) && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None allocated</span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          {/* "Print Dispatch Note" link */}
                          <Link
                            to={`/erp4/dispatch/${disp.id}/note`}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                            title="View printable dispatch note and delivery challan"
                          >
                            📄 Note
                          </Link>

                          {/* "Shipped" button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(disp.id, 'shipped')}
                            disabled={!isPicked || Boolean(isCurrentAction)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              background: isPicked ? '#f59e0b' : '#f1f5f9',
                              color: isPicked ? '#ffffff' : '#94a3b8',
                              border: '1px solid transparent',
                              cursor: isPicked ? 'pointer' : 'not-allowed'
                            }}
                            title={isPicked ? 'Mark as picked up by courier' : 'Order already shipped'}
                          >
                            {isCurrentAction === 'shipped' ? 'Updating...' : 'Shipped'}
                          </button>

                          {/* "Delivered" button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(disp.id, 'delivered')}
                            disabled={isDelivered || Boolean(isCurrentAction)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              background: !isDelivered ? '#16a34a' : '#f1f5f9',
                              color: !isDelivered ? '#ffffff' : '#94a3b8',
                              border: '1px solid transparent',
                              cursor: !isDelivered ? 'pointer' : 'not-allowed'
                            }}
                            title={!isDelivered ? 'Mark consignment as successfully delivered' : 'Already delivered'}
                          >
                            {isCurrentAction === 'delivered' ? 'Updating...' : 'Delivered'}
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
    </div>
  );
}
