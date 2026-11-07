import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../api';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (customerFilter) params.append('customer_id', customerFilter);

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await api('erp5', `/api/invoices${query}`);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(err.message || 'Unable to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <span className="badge badge-green">Paid</span>;
      case 'partially_paid':
        return <span className="badge badge-amber">Partially Paid</span>;
      case 'unpaid':
      default:
        return <span className="badge badge-red">Unpaid</span>;
    }
  };

  const formatCurrency = (amount) => {
    const val = parseFloat(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>GST Tax Invoices</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Manage commercial tax invoices, check customer GSTIN, track payment status, and print bills.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          background: 'white',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Customer ID:</label>
          <input
            type="text"
            placeholder="e.g. CUST-0002"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem'
            }}
          />
          <button type="submit" className="btn" style={{ padding: '0.45rem 0.85rem' }}>
            Filter
          </button>
          {customerFilter && (
            <button
              type="button"
              onClick={() => {
                setCustomerFilter('');
                setTimeout(fetchInvoices, 50);
              }}
              style={{
                background: 'transparent',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                padding: '0.45rem 0.75rem'
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              background: 'white'
            }}
          >
            <option value="">All Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Invoices Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading invoices...</div>
      ) : invoices.length === 0 ? (
        <div
          style={{
            background: 'white',
            padding: '3rem',
            textAlign: 'center',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            color: '#64748b'
          }}
        >
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No invoices found matching criteria.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Order Ref</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Subtotal</th>
                <th>Tax (18%)</th>
                <th>Total (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <strong style={{ color: '#2563eb' }}>{inv.id}</strong>
                  </td>
                  <td>
                    {inv.so_id ? (
                      <span className="badge badge-blue">{inv.so_id}</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Manual</span>
                    )}
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{inv.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {inv.customer_id}
                        {inv.customer_gstin ? ` · GSTIN: ${inv.customer_gstin}` : ' · No GSTIN'}
                      </div>
                    </div>
                  </td>
                  <td>{inv.invoice_date ? String(inv.invoice_date).split('T')[0] : '-'}</td>
                  <td>{inv.due_date ? String(inv.due_date).split('T')[0] : '-'}</td>
                  <td>{formatCurrency(inv.subtotal)}</td>
                  <td>{formatCurrency(parseFloat(inv.cgst || 0) + parseFloat(inv.sgst || 0))}</td>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{formatCurrency(inv.total)}</strong>
                  </td>
                  <td>{getStatusBadge(inv.status)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/erp5/invoices/${inv.id}`)}
                      className="btn"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      View Bill
                    </button>
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
