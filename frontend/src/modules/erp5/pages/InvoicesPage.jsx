import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Manual Invoice Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualCustomer, setManualCustomer] = useState('CUST-0002');
  const [manualCustomerName, setManualCustomerName] = useState('Sunrise Electronics Pvt Ltd');
  const [manualGstin, setManualGstin] = useState('27AABCS1234F1Z5');
  const [manualSalesRep, setManualSalesRep] = useState('EMP-0001');
  const [manualInvoiceDate, setManualInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualItems, setManualItems] = useState([
    { sku: 'SKU-0001', description: 'Wireless Noise-Canceling Headphones', quantity: 1, unit_price: 4999 }
  ]);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [modalError, setModalError] = useState(null);

  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      const data = await api('erp5', '/api/invoices/summary');
      setSummary(data);
    } catch (err) {
      console.warn('Failed to load invoice summary:', err);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (customerFilter) params.append('customer_id', customerFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

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
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, fromDate, toDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const formatCurrency = (amount) => {
    const val = parseFloat(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
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

  // Manual items helpers
  const handleItemChange = (index, field, value) => {
    const updated = [...manualItems];
    updated[index][field] = value;
    setManualItems(updated);
  };

  const handleAddItem = () => {
    setManualItems([...manualItems, { sku: 'SKU-0002', description: 'Smart Fitness Watch', quantity: 1, unit_price: 2999 }]);
  };

  const handleRemoveItem = (index) => {
    if (manualItems.length <= 1) return;
    setManualItems(manualItems.filter((_, i) => i !== index));
  };

  // Calculated modal totals
  const modalSubtotal = manualItems.reduce((acc, itm) => acc + (parseInt(itm.quantity, 10) || 0) * (parseFloat(itm.unit_price) || 0), 0);
  const modalCgst = Math.round(modalSubtotal * 0.09 * 100) / 100;
  const modalSgst = Math.round(modalSubtotal * 0.09 * 100) / 100;
  const modalTotal = Math.round((modalSubtotal + modalCgst + modalSgst) * 100) / 100;

  const handleCreateManualInvoice = async (e) => {
    e.preventDefault();
    setSubmittingManual(true);
    setModalError(null);
    try {
      const payload = {
        so_id: '', // Empty indicates non-order manual invoice
        customer_id: manualCustomer,
        customer_name: manualCustomerName,
        customer_gstin: manualGstin,
        sales_rep_id: manualSalesRep,
        invoice_date: manualInvoiceDate,
        items: manualItems.map(itm => ({
          sku: itm.sku,
          description: itm.description,
          quantity: parseInt(itm.quantity, 10) || 1,
          unit_price: parseFloat(itm.unit_price) || 0,
          tax_rate: 18.0
        }))
      };

      const res = await api('erp5', '/api/invoices', {
        method: 'POST',
        body: payload
      });

      setIsModalOpen(false);
      fetchSummary();
      fetchInvoices();
      if (res && res.id) {
        navigate(`/erp5/invoices/${res.id}`);
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create manual invoice');
    } finally {
      setSubmittingManual(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>GST Tax Invoices</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Commercial tax invoices, amount in words, payment status, and manual bill creation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn"
          style={{ background: '#2563eb', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
        >
          <span>+</span>
          <span>Create Manual Invoice</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Billed</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {formatCurrency(summary.total_billed)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              Across {summary.total_invoices} total invoices
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Outstanding</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.25rem' }}>
              {formatCurrency(summary.total_outstanding)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.2rem' }}>
              {summary.unpaid_count} unpaid / partially paid
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Paid Invoices</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}>
              {summary.paid_count}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.2rem' }}>
              Fully settled commercial invoices
            </div>
          </div>
        </div>
      )}

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
        </form>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>From Date:</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              padding: '0.45rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem'
            }}
          />
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>To Date:</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              padding: '0.45rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem'
            }}
          />
        </div>

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

          {(customerFilter || statusFilter || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setCustomerFilter('');
                setStatusFilter('');
                setFromDate('');
                setToDate('');
              }}
              style={{
                background: 'transparent',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
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

      {/* Manual Invoice Creation Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Create Manual Invoice</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateManualInvoice}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Customer ID:
                  </label>
                  <select
                    value={manualCustomer}
                    onChange={(e) => {
                      const val = e.target.value;
                      setManualCustomer(val);
                      if (val === 'CUST-0002') {
                        setManualCustomerName('Sunrise Electronics Pvt Ltd');
                        setManualGstin('27AABCS1234F1Z5');
                      } else if (val === 'CUST-0004') {
                        setManualCustomerName('BrightHome Retail LLP');
                        setManualGstin('27AAACB5678G1Z2');
                      } else if (val === 'CUST-0001') {
                        setManualCustomerName('Aarav Mehta');
                        setManualGstin('');
                      } else {
                        setManualCustomerName(`Customer ${val}`);
                        setManualGstin('');
                      }
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="CUST-0002">CUST-0002 (Sunrise Electronics Pvt Ltd)</option>
                    <option value="CUST-0004">CUST-0004 (BrightHome Retail LLP)</option>
                    <option value="CUST-0001">CUST-0001 (Aarav Mehta)</option>
                    <option value="CUST-0003">CUST-0003 (Priya Nair)</option>
                    <option value="CUST-0005">CUST-0005 (Kiran Patel)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Customer Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Customer GSTIN (if applicable):
                  </label>
                  <input
                    type="text"
                    value={manualGstin}
                    placeholder="e.g. 27AABCS1234F1Z5"
                    onChange={(e) => setManualGstin(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Invoice Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={manualInvoiceDate}
                    onChange={(e) => setManualInvoiceDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div style={{ marginBottom: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Line Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    + Add Row
                  </button>
                </div>

                {manualItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 120px 40px', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="SKU"
                      required
                      value={item.sku}
                      onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                      style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                      style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={manualItems.length <= 1}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.1rem', cursor: manualItems.length > 1 ? 'pointer' : 'not-allowed' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Calculated Totals Preview */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(modalSubtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>CGST (9%) + SGST (9%):</span>
                  <span>{formatCurrency(modalCgst + modalSgst)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span>Total Amount:</span>
                  <span style={{ color: '#2563eb' }}>{formatCurrency(modalTotal)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'white', border: '1px solid #cbd5e1', color: '#334155', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="btn"
                  style={{ background: '#2563eb' }}
                >
                  {submittingManual ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
