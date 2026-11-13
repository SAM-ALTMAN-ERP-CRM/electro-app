import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';

export default function DispatchNotePage() {
  const { id } = useParams();
  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load dispatch note details from backend
  useEffect(() => {
    let isMounted = true;

    async function fetchDispatch() {
      try {
        setLoading(true);
        setError(null);
        const res = await api('erp4', `/api/dispatches/${id}`);
        const data = res?.data || res;
        if (isMounted) {
          setDispatch(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || `Failed to load dispatch note for ${id}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchDispatch();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Status badge styling helper
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    let badgeClass = 'badge-gray';
    let label = 'Picked';
    if (s === 'shipped') {
      badgeClass = 'badge-amber';
      label = 'Shipped';
    } else if (s === 'delivered') {
      badgeClass = 'badge-green';
      label = 'Delivered';
    }
    return <span className={`badge ${badgeClass}`}>{label}</span>;
  };

  // Format currency in Indian Rupees
  const formatINR = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📦</div>
        Loading dispatch note details...
      </div>
    );
  }

  if (error || !dispatch) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          ⚠️ {error || 'Dispatch note not found.'}
        </div>
        <Link to="/erp4/dispatch" style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '0.9rem' }}>
          ← Return to Dispatches
        </Link>
      </div>
    );
  }

  const items = dispatch.items || [];
  const serials = dispatch.serials || [];
  const totalQty = items.reduce((sum, itm) => sum + (parseInt(itm.quantity, 10) || 1), 0);

  return (
    <div className="dispatch-note-wrapper" style={{ padding: '1.5rem', maxWidth: '860px', margin: '0 auto' }}>
      {/* Print CSS Rules */}
      <style>{`
        @media print {
          /* Hide non-printable UI shells and navigation */
          .no-print,
          .sidebar,
          .top-bar,
          button,
          a {
            display: none !important;
          }

          body, .main-content, .page-container, .dispatch-note-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
          }

          .dispatch-note-sheet {
            border: 1px solid #000000 !important;
            padding: 15mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }

          th, td {
            border: 1px solid #333333 !important;
            color: #000000 !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Top action toolbar (Screen Only) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <Link
          to="/erp4/dispatch"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#475569',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          ← Back to Dispatches
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🖨️ Print Dispatch Note
          </button>
        </div>
      </div>

      {/* Printable Dispatch Document Sheet */}
      <div
        className="dispatch-note-sheet"
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Document Header */}
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⚡ Electro App Enterprises
              </h1>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
                Central Distribution Center · Warehouse WH-01, Mumbai, Maharashtra 400093
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                GSTIN: <strong>27AAACE1234F1Z8</strong> · Tel: +91 22 4900 8800
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', letterSpacing: '0.5px' }}>
                DISPATCH NOTE
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Delivery Challan & Packing Slip
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                {renderStatusBadge(dispatch.status)}
              </div>
            </div>
          </div>
        </div>

        {/* Metadata Grid: Dispatch Details + Customer Delivery Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {/* Dispatch & Courier Info */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem' }}>
              Consignment & Logistics
            </div>
            <table style={{ width: '100%', margin: 0, fontSize: '0.85rem' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#64748b', width: '40%', padding: '0.25rem 0' }}>Dispatch ID:</td>
                  <td style={{ fontWeight: 700, color: '#0f172a', padding: '0.25rem 0' }}>{dispatch.id}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.25rem 0' }}>Sales Order:</td>
                  <td style={{ fontWeight: 600, color: '#2563eb', padding: '0.25rem 0' }}>{dispatch.so_id}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.25rem 0' }}>Ship Date:</td>
                  <td style={{ padding: '0.25rem 0' }}>{dispatch.ship_date || '—'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.25rem 0' }}>Courier Partner:</td>
                  <td style={{ fontWeight: 600, padding: '0.25rem 0' }}>{dispatch.courier}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.25rem 0' }}>Tracking / AWB No:</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, padding: '0.25rem 0' }}>{dispatch.tracking_no}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Customer & Delivery Address */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem' }}>
              Consignee & Shipping Destination
            </div>
            <table style={{ width: '100%', margin: 0, fontSize: '0.85rem' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#64748b', width: '35%', padding: '0.25rem 0' }}>Customer Name:</td>
                  <td style={{ fontWeight: 700, color: '#0f172a', padding: '0.25rem 0' }}>
                    {dispatch.customer_name || 'Customer'}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.25rem 0' }}>Customer ID:</td>
                  <td style={{ padding: '0.25rem 0' }}>{dispatch.customer_id || 'CUST-0001'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.25rem 0' }}>GSTIN:</td>
                  <td style={{ padding: '0.25rem 0', fontFamily: 'monospace' }}>
                    {dispatch.customer_gstin || 'Consumer / Unregistered'}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '0.25rem 0', verticalAlign: 'top' }}>Delivery Address:</td>
                  <td style={{ padding: '0.25rem 0', color: '#1e293b', fontWeight: 500 }}>
                    {dispatch.address}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Line Items & Serial Numbers */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Dispatched Line Items
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left', width: '5%' }}>#</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', width: '20%' }}>SKU Code</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', width: '40%' }}>Product Description</th>
                <th style={{ padding: '0.5rem', textAlign: 'right', width: '15%' }}>Qty Dispatched</th>
                <th style={{ padding: '0.5rem', textAlign: 'right', width: '20%' }}>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                    Standard consignment items under {dispatch.so_id}
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{item.sku}</td>
                    <td style={{ padding: '0.5rem' }}>{item.product_name || item.description || item.sku}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#475569' }}>
                      {item.unit_price ? formatINR(item.unit_price) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                <td colSpan="3" style={{ padding: '0.5rem', textAlign: 'right' }}>Total Units Dispatched:</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>{totalQty || serials.length || 1}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Serial Numbers Box */}
        <div style={{ background: '#fafafa', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '1rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Assigned Serial Numbers ({serials.length} units)
          </div>
          {serials.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No serialized units linked to this consignment.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {serials.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: '#0f172a'
                  }}
                >
                  <span style={{ color: '#64748b', fontSize: '0.7rem', marginRight: '0.35rem' }}>{s.sku}:</span>
                  {s.serial_number}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification and Signatures Footer */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '1.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', textAlign: 'center' }}>
            {/* Dispatcher Signature */}
            <div>
              <div style={{ height: '50px', borderBottom: '1px solid #94a3b8', marginBottom: '0.5rem' }}></div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Dispatch Officer</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Warehouse WH-01 (Mumbai)</div>
            </div>

            {/* Courier Pickup Signature */}
            <div>
              <div style={{ height: '50px', borderBottom: '1px solid #94a3b8', marginBottom: '0.5rem' }}></div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Courier Carrier Representative</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{dispatch.courier} Pickup Agent</div>
            </div>

            {/* Customer Receiving Signature */}
            <div>
              <div style={{ height: '50px', borderBottom: '1px solid #94a3b8', marginBottom: '0.5rem' }}></div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Receiver's Signature & Stamp</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Goods Received in Good Condition</div>
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginTop: '1.5rem' }}>
            This is a computer-generated dispatch document and delivery challan under Section 31 of CGST Act.
          </div>
        </div>
      </div>
    </div>
  );
}
