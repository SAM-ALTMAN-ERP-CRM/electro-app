import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

// Fallback mock quotes if CRM1 service is not yet responding
const FALLBACK_QUOTES = [
  {
    id: 'QUO-0001',
    opportunity_id: 'OPP-0001',
    customer_id: 'CUST-0001',
    dealer_id: null,
    sales_rep_id: 'EMP-0001',
    status: 'draft',
    discount_percent: 0.0,
    needs_approval: false,
    approved: false,
    subtotal: 51980.0,
    discount_amount: 0.0,
    taxable_value: 51980.0,
    gst: 9356.4,
    total: 61336.4,
    created_at: '2026-11-05T09:00:00.000Z',
    items: [
      { id: 'QI-0001', sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990 },
      { id: 'QI-0002', sku: 'SKU-0004', product_name: 'Soundbar 2.1', quantity: 1, unit_price: 8990 }
    ]
  },
  {
    id: 'QUO-0002',
    opportunity_id: 'OPP-0002',
    customer_id: 'CUST-0004',
    dealer_id: 'DLR-0001',
    sales_rep_id: 'EMP-0002',
    status: 'sent',
    discount_percent: 5.0,
    needs_approval: false,
    approved: false,
    subtotal: 67960.0,
    discount_amount: 3398.0,
    taxable_value: 64562.0,
    gst: 11621.16,
    total: 76183.16,
    created_at: '2026-11-06T11:30:00.000Z',
    items: [
      { id: 'QI-0003', sku: 'SKU-0002', product_name: '43-inch Full HD TV', quantity: 2, unit_price: 24990 },
      { id: 'QI-0004', sku: 'SKU-0004', product_name: 'Soundbar 2.1', quantity: 2, unit_price: 8990 }
    ]
  },
  {
    id: 'QUO-0003',
    opportunity_id: 'OPP-0003',
    customer_id: 'CUST-0003',
    dealer_id: null,
    sales_rep_id: 'EMP-0003',
    status: 'accepted',
    discount_percent: 10.0,
    needs_approval: true,
    approved: true,
    subtotal: 112980.0,
    discount_amount: 11298.0,
    taxable_value: 101682.0,
    gst: 18302.76,
    total: 119984.76,
    created_at: '2026-11-07T14:15:00.000Z',
    items: [
      { id: 'QI-0005', sku: 'SKU-0003', product_name: '65-inch OLED TV', quantity: 1, unit_price: 94990 },
      { id: 'QI-0006', sku: 'SKU-0005', product_name: 'Soundbar 5.1', quantity: 1, unit_price: 17990 }
    ]
  }
];

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedQuoteId, setExpandedQuoteId] = useState(null);

  // Fetch quotes list from backend API
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await api('crm1', `/api/quotes${qs}`);
      const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
      setQuotes(list);
    } catch (err) {
      console.warn('[crm1] API fetch failed, using fallback mock quotes:', err.message);
      // Filter fallback quotes locally if backend is unreachable
      let fallback = FALLBACK_QUOTES;
      if (statusFilter) {
        fallback = fallback.filter(q => q.status === statusFilter);
      }
      setQuotes(fallback);
      // Don't show blocking error when mock is working
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Helpers for formatting
  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <span className="badge badge-green">Accepted</span>;
      case 'sent':
        return <span className="badge badge-blue">Sent</span>;
      case 'rejected':
        return <span className="badge badge-red">Rejected</span>;
      case 'draft':
      default:
        return <span className="badge badge-amber">Draft</span>;
    }
  };

  const toggleExpand = (id) => {
    setExpandedQuoteId(prev => (prev === id ? null : id));
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Sales Quotes</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage quotations, track approval statuses, and build customer proposals (CRM-1).
          </p>
        </div>
        <Link
          to="/crm1/quotes/new"
          className="btn"
          style={{ textDecoration: 'none', background: '#2563eb', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>+</span> New Quote
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="status-filter" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
            Status Filter:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <button
          onClick={fetchQuotes}
          type="button"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.875rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px' }}
        >
          Refresh
        </button>

        <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#64748b' }}>
          Total Quotes: <strong>{quotes.length}</strong>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ padding: '0.9rem 1.2rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '1rem' }}>
          Loading quotes from CRM-1 service...
        </div>
      ) : quotes.length === 0 ? (
        /* Empty State */
        <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#334155', marginBottom: '0.5rem' }}>No Quotes Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            {statusFilter ? `No quotes match status '${statusFilter}'.` : 'No quotes have been created yet.'}
          </p>
          <Link
            to="/crm1/quotes/new"
            className="btn"
            style={{ textDecoration: 'none', background: '#2563eb', color: '#fff', padding: '0.55rem 1.1rem', borderRadius: '6px', fontSize: '0.875rem' }}
          >
            Create Your First Quote
          </Link>
        </div>
      ) : (
        /* Quotes Table */
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Quote ID</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Opportunity</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Customer</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Sales Rep</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Discount</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Total (₹)</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const isExpanded = expandedQuoteId === q.id;
                const itemsCount = q.items ? q.items.length : 0;

                return (
                  <React.Fragment key={q.id}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.1s' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1e40af' }}>{q.id}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>{q.opportunity_id || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                        <div>{q.customer_id}</div>
                        {q.dealer_id && (
                          <span style={{ fontSize: '0.7rem', color: '#0284c7', background: '#e0f2fe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            Dealer: {q.dealer_id}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>{q.sales_rep_id}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {getStatusBadge(q.status)}
                        {q.needs_approval && (
                          <div style={{ marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.65rem', color: '#b45309', background: '#fef3c7', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                              Approval Req.
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                        {Number(q.discount_percent || 0).toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                        {formatMoney(q.total)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleExpand(q.id)}
                          style={{
                            background: isExpanded ? '#e2e8f0' : '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px'
                          }}
                        >
                          {isExpanded ? 'Hide Items ▲' : `${itemsCount} Items ▼`}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Line Items Details */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                        <td colSpan={8} style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                                Quote Line Items ({q.id})
                              </h4>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Created: {q.created_at ? new Date(q.created_at).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>

                            {/* Line items table */}
                            {q.items && q.items.length > 0 ? (
                              <table style={{ width: '100%', fontSize: '0.8rem', margin: '0 0 1rem 0' }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: '0.5rem' }}>SKU</th>
                                    <th style={{ padding: '0.5rem' }}>Product Name</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Unit Price (₹)</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Row Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {q.items.map((itm, itmIdx) => (
                                    <tr key={itm.id || itmIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '0.5rem', fontWeight: 600, color: '#1e40af' }}>{itm.sku}</td>
                                      <td style={{ padding: '0.5rem' }}>{itm.product_name}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>{itm.quantity}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatMoney(itm.unit_price)}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>
                                        {formatMoney(Number(itm.quantity) * Number(itm.unit_price))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>No item rows recorded for this quote.</p>
                            )}

                            {/* Tax and Total Breakdown */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                              <div style={{ width: '280px', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                  <span style={{ color: '#64748b' }}>Subtotal:</span>
                                  <strong>{formatMoney(q.subtotal)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                  <span style={{ color: '#64748b' }}>Discount ({q.discount_percent}%):</span>
                                  <strong style={{ color: '#b91c1c' }}>-{formatMoney(q.discount_amount)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                  <span style={{ color: '#64748b' }}>Taxable Amount:</span>
                                  <strong>{formatMoney(q.taxable_value || (Number(q.subtotal) - Number(q.discount_amount)))}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                  <span style={{ color: '#64748b' }}>GST (18%):</span>
                                  <strong>{formatMoney(q.gst)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontSize: '0.9rem', color: '#0f172a' }}>
                                  <span>Grand Total:</span>
                                  <strong style={{ color: '#15803d' }}>{formatMoney(q.total)}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
