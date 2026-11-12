import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../../api';

// Fallback customers list adhering to Section 5 shared IDs
const FALLBACK_CUSTOMERS = [
  { id: 'CUST-0001', name: 'Rajesh Kumar', company_name: 'Apex Electronics Ltd', email: 'rajesh.k@apexelectronics.in', phone: '+91 98201 12345', gstin: '27AABCA1234A1Z5', city: 'Mumbai', state: 'Maharashtra' },
  { id: 'CUST-0002', name: 'Anita Desai', company_name: 'Desai Retail Innovations', email: 'anita@desairetail.com', phone: '+91 98202 23456', gstin: '27BDEPA5678B2Z1', city: 'Pune', state: 'Maharashtra' },
  { id: 'CUST-0003', name: 'Vikram Sethi', company_name: 'TechCorp Systems Pvt Ltd', email: 'vikram@techcorp.in', phone: '+91 98203 34567', gstin: '29AAACT9876C1Z9', city: 'Bengaluru', state: 'Karnataka' },
  { id: 'CUST-0004', name: 'Sunita Rao', company_name: 'Metro MegaStore Enterprises', email: 'sunita@metromegastore.in', phone: '+91 98204 45678', gstin: '36AABCM4321D1Z8', city: 'Hyderabad', state: 'Telangana' },
  { id: 'CUST-0005', name: 'Karan Singhal', company_name: 'Singhal Audio Visuals', email: 'karan@singhalaudio.com', phone: '+91 98205 56789', gstin: '07AABCS8765E1Z3', city: 'Delhi', state: 'Delhi' }
];

// Fallback orders
const FALLBACK_ORDERS = [
  { id: 'SO-0001', customer_id: 'CUST-0001', quote_id: 'QUO-0001', total_amount: 61336.40, status: 'delivered', sales_rep_id: 'EMP-0001', created_at: '2026-11-04T10:30:00.000Z', items_count: 2 },
  { id: 'SO-0002', customer_id: 'CUST-0004', quote_id: 'QUO-0002', total_amount: 76183.16, status: 'dispatched', sales_rep_id: 'EMP-0002', created_at: '2026-11-05T14:15:00.000Z', items_count: 4 },
  { id: 'SO-0003', customer_id: 'CUST-0003', quote_id: 'QUO-0003', total_amount: 133316.40, status: 'confirmed', sales_rep_id: 'EMP-0003', created_at: '2026-11-07T11:00:00.000Z', items_count: 2 },
  { id: 'SO-0004', customer_id: 'CUST-0002', quote_id: 'QUO-0004', total_amount: 53100.00, status: 'delivered', sales_rep_id: 'EMP-0001', created_at: '2026-11-08T09:45:00.000Z', items_count: 3 },
  { id: 'SO-0005', customer_id: 'CUST-0001', quote_id: 'QUO-0005', total_amount: 42990.00, status: 'confirmed', sales_rep_id: 'EMP-0002', created_at: '2026-11-09T16:20:00.000Z', items_count: 1 }
];

// Fallback tickets
const FALLBACK_TICKETS = [
  { id: 'TKT-0001', customer_id: 'CUST-0001', subject: 'Display panel flickering on OLED 65', priority: 'high', status: 'in-progress', assigned_engineer: 'EMP-0005', created_at: '2026-11-06T11:00:00.000Z' },
  { id: 'TKT-0002', customer_id: 'CUST-0003', subject: 'Audio sync delay via HDMI eARC', priority: 'medium', status: 'resolved', assigned_engineer: 'EMP-0006', created_at: '2026-11-07T13:30:00.000Z' },
  { id: 'TKT-0003', customer_id: 'CUST-0004', subject: 'In-warranty speaker replacement', priority: 'urgent', status: 'open', assigned_engineer: 'EMP-0005', created_at: '2026-11-08T15:00:00.000Z' },
  { id: 'TKT-0004', customer_id: 'CUST-0002', subject: 'Remote control Bluetooth pairing issue', priority: 'low', status: 'resolved', assigned_engineer: 'EMP-0007', created_at: '2026-11-09T10:15:00.000Z' },
  { id: 'TKT-0005', customer_id: 'CUST-0001', subject: 'Firmware update support for Soundbar 2.1', priority: 'low', status: 'resolved', assigned_engineer: 'EMP-0006', created_at: '2026-11-10T14:00:00.000Z' }
];

// Fallback invoices
const FALLBACK_INVOICES = [
  { id: 'INV-0001', customer_id: 'CUST-0001', order_id: 'SO-0001', subtotal: 51980.00, gst_amount: 9356.40, total_amount: 61336.40, status: 'paid', due_date: '2026-11-20', created_at: '2026-11-04T12:00:00.000Z' },
  { id: 'INV-0002', customer_id: 'CUST-0004', order_id: 'SO-0002', subtotal: 64562.00, gst_amount: 11621.16, total_amount: 76183.16, status: 'issued', due_date: '2026-11-25', created_at: '2026-11-05T15:00:00.000Z' },
  { id: 'INV-0003', customer_id: 'CUST-0003', order_id: 'SO-0003', subtotal: 112980.00, gst_amount: 20336.40, total_amount: 133316.40, status: 'issued', due_date: '2026-11-28', created_at: '2026-11-07T12:30:00.000Z' },
  { id: 'INV-0004', customer_id: 'CUST-0002', order_id: 'SO-0004', subtotal: 45000.00, gst_amount: 8100.00, total_amount: 53100.00, status: 'paid', due_date: '2026-11-22', created_at: '2026-11-08T11:00:00.000Z' },
  { id: 'INV-0005', customer_id: 'CUST-0001', order_id: 'SO-0005', subtotal: 36432.20, gst_amount: 6557.80, total_amount: 42990.00, status: 'issued', due_date: '2026-11-30', created_at: '2026-11-09T17:00:00.000Z' }
];

export default function PortalPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse query string for customer ID (e.g. ?id=CUST-0001)
  const searchParams = new URLSearchParams(location.search);
  const queryCustomerId = searchParams.get('id') || '';

  // Local state
  const [inputCustomerId, setInputCustomerId] = useState(queryCustomerId || 'CUST-0001');
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoNotice, setInfoNotice] = useState('');

  // Currency formatter in INR
  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Date formatter (YYYY-MM-DD)
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toISOString().split('T')[0];
    } catch {
      return isoString;
    }
  };

  // Status badge CSS helpers
  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'delivered': return 'badge badge-green';
      case 'dispatched': return 'badge badge-blue';
      case 'confirmed': return 'badge badge-purple';
      case 'cancelled': return 'badge badge-red';
      default: return 'badge badge-amber';
    }
  };

  const getTicketStatusBadge = (status) => {
    switch (status) {
      case 'resolved': return 'badge badge-green';
      case 'in-progress': return 'badge badge-blue';
      case 'closed': return 'badge badge-gray';
      default: return 'badge badge-amber';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent': return 'badge badge-red';
      case 'high': return 'badge badge-amber';
      case 'medium': return 'badge badge-blue';
      default: return 'badge badge-gray';
    }
  };

  const getInvoiceStatusBadge = (status) => {
    switch (status) {
      case 'paid': return 'badge badge-green';
      case 'issued': return 'badge badge-amber';
      case 'overdue': return 'badge badge-red';
      default: return 'badge badge-gray';
    }
  };

  // Load customer overview by ID
  const loadCustomerOverview = useCallback(async (targetId) => {
    if (!targetId || !targetId.trim()) {
      setErrorMessage('Please enter a Customer ID (e.g. CUST-0001).');
      return;
    }

    const cleanId = targetId.trim().toUpperCase();
    setLoading(true);
    setErrorMessage('');
    setInfoNotice('');

    try {
      const data = await api('crm5', `/api/portal/${cleanId}/overview`);
      if (data && data.customer) {
        setActiveCustomer(data.customer);
        setOrders(data.orders || []);
        setTickets(data.tickets || []);
        setInvoices(data.invoices || []);
        setStats(data.stats || {
          total_orders: (data.orders || []).length,
          total_spent: (data.orders || []).reduce((acc, o) => acc + Number(o.total_amount || 0), 0),
          total_tickets: (data.tickets || []).length,
          total_invoices: (data.invoices || []).length
        });
        sessionStorage.setItem('portal_last_customer_id', cleanId);
      } else {
        throw new Error(`Customer ID '${cleanId}' was not found in our records. Please verify the ID (e.g., CUST-0001 to CUST-0008) and try again.`);
      }
    } catch (err) {
      // Check if known customer in fallback dataset (for offline dev/preview)
      const fallbackCust = FALLBACK_CUSTOMERS.find(c => c.id === cleanId);
      if (fallbackCust) {
        const custOrders = FALLBACK_ORDERS.filter(o => o.customer_id === cleanId);
        const custTickets = FALLBACK_TICKETS.filter(t => t.customer_id === cleanId);
        const custInvoices = FALLBACK_INVOICES.filter(i => i.customer_id === cleanId);
        const totalSpent = custOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);

        setActiveCustomer(fallbackCust);
        setOrders(custOrders);
        setTickets(custTickets);
        setInvoices(custInvoices);
        setStats({
          total_orders: custOrders.length,
          total_spent: totalSpent,
          total_tickets: custTickets.length,
          total_invoices: custInvoices.length
        });
        setInfoNotice('Operating with simulated portal data.');
        sessionStorage.setItem('portal_last_customer_id', cleanId);
      } else {
        // Unknown Customer ID: clear active view and display friendly error
        setActiveCustomer(null);
        setOrders([]);
        setTickets([]);
        setInvoices([]);
        setStats(null);
        setErrorMessage(
          err.message || `Customer ID '${cleanId}' was not found in our records. Please verify your ID (e.g. CUST-0001 to CUST-0008) and try again.`
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle URL navigation and initial load
  useEffect(() => {
    const isHomeRoute = location.pathname.endsWith('/portal/home') || location.pathname.endsWith('/home');
    const storedId = sessionStorage.getItem('portal_last_customer_id');
    const targetId = queryCustomerId || (isHomeRoute ? (storedId || 'CUST-0001') : '');

    if (targetId) {
      setInputCustomerId(targetId);
      loadCustomerOverview(targetId);
    }
  }, [location.pathname, queryCustomerId, loadCustomerOverview]);

  // Handle form submission
  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputCustomerId.trim()) {
      setErrorMessage('Please provide a valid Customer ID (e.g. CUST-0001).');
      return;
    }
    const targetId = inputCustomerId.trim().toUpperCase();
    navigate(`/crm5/portal/home?id=${targetId}`);
    loadCustomerOverview(targetId);
  };

  // Switch customer / sign out of portal
  const handleSwitchCustomer = () => {
    setActiveCustomer(null);
    setOrders([]);
    setTickets([]);
    setInvoices([]);
    setStats(null);
    setErrorMessage('');
    sessionStorage.removeItem('portal_last_customer_id');
    navigate('/crm5/portal');
  };

  return (
    <div className="crm5-portal-page" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
              Customer Self-Service Portal
            </h1>
            <span className="badge badge-purple">CRM-5</span>
          </div>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Track order fulfillment status, monitor active support tickets, and review GST invoices.
          </p>
        </div>

        {activeCustomer && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => loadCustomerOverview(activeCustomer.id)}
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              ↻ Refresh Data
            </button>
            <button
              onClick={handleSwitchCustomer}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', borderColor: '#cbd5e1', color: '#475569' }}
            >
              ← Switch Customer
            </button>
          </div>
        )}
      </div>

      {/* Info notice banner (if fallback data is used) */}
      {infoNotice && (
        <div style={{
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          border: '1px solid #bfdbfe'
        }}>
          ℹ️ {infoNotice}
        </div>
      )}

      {/* Error / Unknown ID friendly banner */}
      {errorMessage && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Customer ID Notice</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* CUSTOMER ID ENTRY BOX (Always shown when not logged in or on /portal) */}
      {(!activeCustomer || location.pathname.endsWith('/portal')) && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
          marginBottom: '2rem',
          maxWidth: '680px',
          margin: '0 auto 2rem auto'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
            Enter Customer Access Portal
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Please input your assigned Customer Identifier (Section 5 format: <code>CUST-0001</code> to <code>CUST-0008</code>) to view your account dashboard.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={inputCustomerId}
              onChange={(e) => setInputCustomerId(e.target.value)}
              placeholder="e.g. CUST-0001"
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '1rem',
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 600 }}
            >
              {loading ? 'Accessing...' : 'View My Account →'}
            </button>
          </form>

          {/* Quick Demo Customer Chips */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Quick Demo Access:
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {FALLBACK_CUSTOMERS.map((cust) => (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => {
                    setInputCustomerId(cust.id);
                    navigate(`/crm5/portal/home?id=${cust.id}`);
                    loadCustomerOverview(cust.id);
                  }}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    color: '#334155',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <strong>{cust.id}</strong> ({cust.company_name})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          <p style={{ margin: 0 }}>Loading customer records and statements...</p>
        </div>
      )}

      {/* CUSTOMER HOME DASHBOARD (/portal/home view) */}
      {!loading && activeCustomer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Customer Profile Banner */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Active Customer</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace' }}>
                  {activeCustomer.id}
                </span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#0f172a' }}>
                {activeCustomer.name}
              </h2>
              <div style={{ fontSize: '1rem', color: '#334155', fontWeight: 500 }}>
                {activeCustomer.company_name}
              </div>
            </div>

            {/* Contact Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem 2rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Email Address</span>
                <strong>{activeCustomer.email || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Phone</span>
                <strong>{activeCustomer.phone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>GSTIN</span>
                <strong style={{ fontFamily: 'monospace' }}>{activeCustomer.gstin || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Location</span>
                <strong>{activeCustomer.city}, {activeCustomer.state}</strong>
              </div>
            </div>
          </div>

          {/* Quick Metrics Summary Cards */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Orders</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginTop: '0.25rem' }}>
                  {stats.total_orders}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.25rem' }}>
                  Total Value: {formatMoney(stats.total_spent)}
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Support Tickets</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginTop: '0.25rem' }}>
                  {stats.total_tickets}
                </div>
                <div style={{ fontSize: '0.8rem', color: stats.open_tickets > 0 ? '#f59e0b' : '#64748b', marginTop: '0.25rem' }}>
                  {stats.open_tickets ? `${stats.open_tickets} pending attention` : 'All issues resolved'}
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Invoices & Billing</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginTop: '0.25rem' }}>
                  {stats.total_invoices}
                </div>
                <div style={{ fontSize: '0.8rem', color: stats.pending_invoices > 0 ? '#3b82f6' : '#10b981', marginTop: '0.25rem' }}>
                  {stats.pending_invoices ? `${stats.pending_invoices} awaiting payment` : 'Accounts fully cleared'}
                </div>
              </div>
            </div>
          )}

          {/* CARD 1: MY ORDERS */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                  📦 My Orders
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Hardware and electronic appliances procurement orders
                </span>
              </div>
              <span className="badge badge-blue">{orders.length} Records</span>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                No orders placed yet for this account.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.75rem' }}>Order ID</th>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                      <th style={{ padding: '0.75rem' }}>Quote Reference</th>
                      <th style={{ padding: '0.75rem' }}>Items</th>
                      <th style={{ padding: '0.75rem' }}>Sales Rep</th>
                      <th style={{ padding: '0.75rem' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>
                          {order.id}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          {formatDate(order.created_at)}
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#3b82f6' }}>
                          {order.quote_id || '—'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {order.items_count || 1} {order.items_count === 1 ? 'unit' : 'units'}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {order.sales_rep_id || 'EMP-0001'}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                          {formatMoney(order.total_amount)}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={getOrderStatusBadge(order.status)}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CARD 2: MY TICKETS */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                  🛠️ My Tickets
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Technical support inquiries and warranty service requests
                </span>
              </div>
              <span className="badge badge-amber">{tickets.length} Inquiries</span>
            </div>

            {tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                No support tickets recorded for this account.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.75rem' }}>Ticket ID</th>
                      <th style={{ padding: '0.75rem' }}>Created</th>
                      <th style={{ padding: '0.75rem' }}>Subject</th>
                      <th style={{ padding: '0.75rem' }}>Priority</th>
                      <th style={{ padding: '0.75rem' }}>Assigned Engineer</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((tkt) => (
                      <tr key={tkt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>
                          {tkt.id}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          {formatDate(tkt.created_at)}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 500, color: '#1e293b' }}>
                          {tkt.subject}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={getPriorityBadge(tkt.priority)}>
                            {tkt.priority}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {tkt.assigned_engineer || 'EMP-0005'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={getTicketStatusBadge(tkt.status)}>
                            {tkt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CARD 3: MY INVOICES */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                  🧾 My Invoices
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  GST compliant tax invoices and settlement status
                </span>
              </div>
              <span className="badge badge-green">{invoices.length} Invoices</span>
            </div>

            {invoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                No invoices found for this customer.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.75rem' }}>Invoice ID</th>
                      <th style={{ padding: '0.75rem' }}>Order Ref</th>
                      <th style={{ padding: '0.75rem' }}>Subtotal</th>
                      <th style={{ padding: '0.75rem' }}>GST (18%)</th>
                      <th style={{ padding: '0.75rem' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem' }}>Due Date</th>
                      <th style={{ padding: '0.75rem' }}>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>
                          {inv.id}
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#3b82f6' }}>
                          {inv.order_id || '—'}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          {formatMoney(inv.subtotal)}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          {formatMoney(inv.gst_amount)}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                          {formatMoney(inv.total_amount)}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          {inv.due_date || '—'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={getInvoiceStatusBadge(inv.status)}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
