import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadInvoice() {
      setLoading(true);
      setError(null);
      try {
        const data = await api('erp5', `/api/invoices/${id}`);
        setInvoice(data);
      } catch (err) {
        console.error('Failed to load invoice:', err);
        setError(err.message || 'Invoice not found');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadInvoice();
    }
  }, [id]);

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
        return <span className="badge badge-green">PAID</span>;
      case 'partially_paid':
        return <span className="badge badge-amber">PARTIALLY PAID</span>;
      case 'unpaid':
      default:
        return <span className="badge badge-red">UNPAID</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        Loading invoice details...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center' }}>
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Error Loading Invoice</h3>
          <p>{error || 'Invoice record not found'}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/erp5/invoices')}
          className="btn"
          style={{ marginTop: '1.5rem' }}
        >
          ← Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="invoice-detail-wrapper" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Action Header (Hidden on Print) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/erp5/invoices')}
          style={{
            background: 'white',
            color: '#334155',
            border: '1px solid #cbd5e1',
            padding: '0.5rem 1rem',
            borderRadius: '6px'
          }}
        >
          ← Back to Invoices
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn"
            style={{
              background: '#0284c7',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            <span>🖨️</span>
            <span>Print Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* Printable Tax Bill Container */}
      <div
        className="tax-invoice-bill"
        style={{
          background: 'white',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '2.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          color: '#0f172a'
        }}
      >
        {/* Bill Top Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem'
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
              ⚡ ELECTRO APP TECHNOLOGIES INDIA PVT. LTD.
            </h1>
            <p style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.25rem' }}>
              Corporate Office: Plot 45, MIDC Industrial Area, Phase II, Andheri East, Mumbai, Maharashtra 400093
            </p>
            <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.25rem' }}>
              <strong>GSTIN: </strong>27AAACE1234F1Z8 &nbsp;|&nbsp; <strong>PAN: </strong>AAACE1234F &nbsp;|&nbsp; <strong>State: </strong>27 (Maharashtra)
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                background: '#0f172a',
                color: 'white',
                padding: '0.35rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '4px',
                letterSpacing: '0.05em'
              }}
            >
              TAX INVOICE
            </span>
            <div style={{ marginTop: '0.5rem' }}>{getStatusBadge(invoice.status)}</div>
          </div>
        </div>

        {/* Invoice Metadata & Customer Info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            marginBottom: '2rem',
            background: '#f8fafc',
            padding: '1.25rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}
        >
          {/* Left Column: Billed To */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Billed To Customer:
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{invoice.customer_name}</div>
            <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.2rem' }}>
              <strong>Customer ID: </strong>{invoice.customer_id}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: '0.2rem' }}>
              <strong>GSTIN: </strong>
              {invoice.customer_gstin ? (
                <span style={{ fontWeight: 600, color: '#0369a1' }}>{invoice.customer_gstin}</span>
              ) : (
                <span style={{ color: '#64748b', fontStyle: 'italic' }}>Consumer / Unregistered</span>
              )}
            </div>
          </div>

          {/* Right Column: Invoice Reference Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1rem', fontSize: '0.875rem' }}>
            <strong style={{ color: '#475569' }}>Invoice Number:</strong>
            <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{invoice.id}</strong>

            <strong style={{ color: '#475569' }}>Invoice Date:</strong>
            <span>{invoice.invoice_date ? String(invoice.invoice_date).split('T')[0] : '-'}</span>

            <strong style={{ color: '#475569' }}>Due Date:</strong>
            <span>{invoice.due_date ? String(invoice.due_date).split('T')[0] : '-'}</span>

            <strong style={{ color: '#475569' }}>Sales Order Ref:</strong>
            <span>{invoice.so_id || 'Manual Invoice (Non-order)'}</span>

            <strong style={{ color: '#475569' }}>Sales Rep ID:</strong>
            <span>{invoice.sales_rep_id || 'Direct Sale'}</span>
          </div>
        </div>

        {/* Invoice Line Items Table */}
        <table style={{ width: '100%', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ width: '5%', textAlign: 'center' }}>#</th>
              <th style={{ width: '18%' }}>SKU Code</th>
              <th style={{ width: '37%' }}>Item Description</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Unit Price (₹)</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, idx) => {
              const qty = parseInt(item.quantity, 10) || 1;
              const price = parseFloat(item.unit_price) || 0;
              const lineTotal = qty * price;
              return (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                  <td>
                    <strong style={{ color: '#1e293b' }}>{item.sku}</strong>
                  </td>
                  <td>{item.description || '-'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{qty}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Financial Totals & Tax Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <div style={{ width: '340px', background: '#f8fafc', padding: '1.25rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: '#64748b' }}>Subtotal (Taxable Value):</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.subtotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Central GST (CGST @ 9%):</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.cgst)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>State GST (SGST @ 9%):</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.sgst)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: '2px solid #cbd5e1',
                fontSize: '1.15rem'
              }}
            >
              <strong style={{ color: '#0f172a' }}>Grand Total:</strong>
              <strong style={{ color: '#2563eb' }}>{formatCurrency(invoice.total)}</strong>
            </div>
          </div>
        </div>

        {/* Bill Footer & Statutory Notice */}
        <div
          style={{
            marginTop: '3rem',
            paddingTop: '1.5rem',
            borderTop: '1px dashed #cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: '0.8rem',
            color: '#64748b'
          }}
        >
          <div>
            <p><strong>Terms & Conditions:</strong></p>
            <p>1. Payment is strictly due within 15 calendar days of the invoice date.</p>
            <p>2. Goods once sold are subject to manufacturer warranty terms.</p>
            <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
              This is a computer-generated tax invoice issued in accordance with GST Rules.
            </p>
          </div>

          <div style={{ textAlign: 'center', minWidth: '200px' }}>
            <div style={{ height: '40px', borderBottom: '1px solid #475569', marginBottom: '0.35rem' }}></div>
            <strong style={{ color: '#0f172a' }}>Authorized Signatory</strong>
            <div>Electro App Technologies India Pvt. Ltd.</div>
          </div>
        </div>
      </div>

      {/* In-page Print Styling Rule */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print, .sidebar, .top-bar {
            display: none !important;
          }
          .app-container, .main-content, .page-container, .invoice-detail-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          .tax-invoice-bill {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
