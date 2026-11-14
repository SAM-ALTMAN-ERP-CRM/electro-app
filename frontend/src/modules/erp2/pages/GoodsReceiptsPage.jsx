import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

export default function GoodsReceiptsPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPo, setSelectedPo] = useState(null);

  // Form fields
  const [receivedBy, setReceivedBy] = useState('EMP-0005');
  const [receivedOn, setReceivedOn] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptItems, setReceiptItems] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [printingGrn, setPrintingGrn] = useState(null);

  // Fetch all POs, existing Goods Receipts, and Pending POs
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [posData, grnsData, pendingData] = await Promise.all([
        api('erp2', '/api/purchase-orders').catch(() => []),
        api('erp2', '/api/goods-receipts').catch(() => []),
        api('erp2', '/api/receipts/pending').catch(() => [])
      ]);
      setPurchaseOrders(Array.isArray(posData) ? posData : (posData?.data || []));
      setGoodsReceipts(Array.isArray(grnsData) ? grnsData : (grnsData?.data || []));
      setPendingOrders(Array.isArray(pendingData) ? pendingData : (pendingData?.data || []));
    } catch (err) {
      setError(err.message || 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load details when a PO is selected
  const handleSelectPo = async (poId) => {
    setSelectedPoId(poId);
    setSelectedPo(null);
    setReceiptItems([]);
    setError('');
    setSuccessMessage('');

    if (!poId) return;

    try {
      const res = await api('erp2', `/api/purchase-orders/${poId}`);
      const data = res?.data || res;
      setSelectedPo(data);

      // Initialize receipt items from PO items
      if (Array.isArray(data.items)) {
        const initialItems = data.items.map((item) => {
          const remaining = Math.max(0, item.quantity - (item.received_qty || 0));
          return {
            sku: item.sku,
            product_name: item.product_name,
            ordered_qty: item.quantity,
            received_qty: item.received_qty || 0,
            remaining_qty: remaining,
            receive_now: remaining > 0 ? remaining : 0,
            included: remaining > 0,
            unit_cost: item.unit_cost || 0
          };
        });
        setReceiptItems(initialItems);
      }
    } catch (err) {
      setError(`Failed to load details for ${poId}: ${err.message}`);
    }
  };

  const handleQuickReceivePending = (poId) => {
    handleSelectPo(poId);
    const formEl = document.getElementById('record-receipt-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleItemQtyChange = (sku, val) => {
    const num = parseInt(val, 10);
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.sku === sku) {
          return {
            ...item,
            receive_now: isNaN(num) ? 0 : Math.max(0, num)
          };
        }
        return item;
      })
    );
  };

  const handleToggleInclude = (sku) => {
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.sku === sku) {
          return { ...item, included: !item.included };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!selectedPoId) {
      setError('Please select a Purchase Order.');
      return;
    }
    if (!receivedBy.trim()) {
      setError('Received By is required.');
      return;
    }

    const itemsToSubmit = receiptItems
      .filter((item) => item.included && item.receive_now > 0)
      .map((item) => ({
        sku: item.sku,
        received_qty: item.receive_now
      }));

    if (itemsToSubmit.length === 0) {
      setError('Please specify at least one item with a received quantity greater than 0.');
      return;
    }

    // Over-receipt validation check
    for (const sub of itemsToSubmit) {
      const orig = receiptItems.find((i) => i.sku === sub.sku);
      if (orig && sub.received_qty > orig.remaining_qty) {
        setError(`Refused: Received quantity (${sub.received_qty}) exceeds remaining ordered quantity (${orig.remaining_qty}) for SKU ${sub.sku}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        po_id: selectedPoId,
        received_by: receivedBy.trim(),
        received_on: receivedOn,
        notes: notes.trim(),
        items: itemsToSubmit
      };

      const res = await api('erp2', '/api/goods-receipts', {
        method: 'POST',
        body: payload
      });

      const resData = res?.data || res;
      setSuccessMessage(
        `Goods Receipt Note ${resData.id} created successfully! Purchase Order status is now "${resData.po_status}".`
      );
      setNotes('');

      // Refresh list and reload selected PO
      await fetchData();
      if (selectedPoId) {
        await handleSelectPo(selectedPoId);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit goods receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    let bg = '#e2e8f0';
    let color = '#475569';
    let label = status || 'Unknown';

    if (s === 'received') {
      bg = '#dcfce7';
      color = '#15803d';
      label = 'Received';
    } else if (s === 'partially_received') {
      bg = '#fef3c7';
      color = '#b45309';
      label = 'Partially Received';
    } else if (s === 'sent') {
      bg = '#dbeafe';
      color = '#1d4ed8';
      label = 'Sent / Open';
    } else if (s === 'draft') {
      bg = '#f1f5f9';
      color = '#64748b';
      label = 'Draft';
    } else if (s === 'cancelled') {
      bg = '#fee2e2';
      color = '#b91c1c';
      label = 'Cancelled';
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 600,
          backgroundColor: bg,
          color: color,
          textTransform: 'capitalize'
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Print Style Injector */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-grn-container, #printable-grn-container * {
              visibility: visible;
            }
            #printable-grn-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 24px;
              background: #ffffff !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: '#0f172a' }}>
          Goods Receipts & Warehouse Inward
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
          Record goods receipt notes (GRN), track delivery tolerance checks, monitor late purchase orders, and print receiving documents.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#dcfce7',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          <strong>Success:</strong> {successMessage}
        </div>
      )}

      {/* SECTION 1: Pending Purchase Orders & Late Orders Alert [ERP2-D3] */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>
              Pending Purchase Orders (Awaiting Delivery)
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Orders currently sent to suppliers not yet fully received. Overdue deliveries highlighted in red.
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
            {pendingOrders.length} Pending
          </span>
        </div>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading pending deliveries...</p>
        ) : pendingOrders.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '6px', color: '#64748b' }}>
            ✓ All sent purchase orders have been fully received! No pending orders.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>PO Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Supplier</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Expected Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Delivery Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Pending Items</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Order ₹</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((po, idx) => {
                  const isLate = po.is_late || (po.expected_date && new Date(po.expected_date) < new Date());
                  return (
                    <tr
                      key={po.id}
                      style={{
                        borderBottom: idx === pendingOrders.length - 1 ? 'none' : '1px solid #f1f5f9',
                        backgroundColor: isLate ? '#fff5f5' : (idx % 2 === 0 ? '#ffffff' : '#fafafa')
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#2563eb' }}>{po.id}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#1e293b' }}>
                        <div><strong>{po.supplier_name || po.supplier_id}</strong></div>
                        {po.supplier_phone && <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{po.supplier_phone}</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{getStatusBadge(po.status)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: isLate ? 700 : 400, color: isLate ? '#dc2626' : '#334155' }}>
                        {po.expected_date || 'Not specified'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isLate ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5'
                            }}
                          >
                            ⚠️ LATE ({po.days_late || 'Past Due'} days overdue)
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                            ✓ On Time
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {Array.isArray(po.items) && po.items.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#475569' }}>
                            {po.items.map((it) => (
                              <li key={it.id || it.sku}>
                                <strong>{it.sku}</strong> ({it.product_name}): remaining {it.remaining_qty} / {it.ordered_qty}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        ₹{Number(po.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleQuickReceivePending(po.id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          Receive Goods ➔
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

      {/* SECTION 2: Record Goods Receipt Note Form */}
      <div
        id="record-receipt-form"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          Record New Goods Receipt Note (GRN)
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Purchase Order Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Select Purchase Order *
              </label>
              <select
                value={selectedPoId}
                onChange={(e) => handleSelectPo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">-- Choose a Purchase Order --</option>
                {purchaseOrders
                  .filter((po) => po.status === 'sent' || po.status === 'partially_received')
                  .map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.id} ({po.supplier_id}) — {po.status} (Expected: {po.expected_date || 'N/A'})
                    </option>
                  ))}
              </select>
            </div>

            {/* Received On Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Received On (Date) *
              </label>
              <input
                type="date"
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Received By */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Received By (Employee ID) *
              </label>
              <input
                type="text"
                placeholder="e.g. EMP-0005"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Delivery Notes / Courier Details
              </label>
              <input
                type="text"
                placeholder="e.g. Courier airway bill, package condition"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {/* Items Receipt Table */}
          {selectedPo && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>
                  Items to Receive from {selectedPo.id}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  * System strictly refuses receiving quantities exceeding remaining ordered balance.
                </span>
              </div>

              {receiptItems.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No items found on this Purchase Order.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', border: '1px solid #e2e8f0' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.6rem 0.75rem', width: '40px', textAlign: 'center' }}>Inc.</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>SKU</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Product Name</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Ordered</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Prev. Received</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Remaining Allowed</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '110px' }}>Receive Now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptItems.map((item) => (
                      <tr key={item.sku} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={item.included}
                            disabled={item.remaining_qty === 0}
                            onChange={() => handleToggleInclude(item.sku)}
                          />
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#2563eb' }}>{item.sku}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: '#1e293b' }}>{item.product_name}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#475569' }}>{item.ordered_qty}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#475569' }}>{item.received_qty}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600, color: item.remaining_qty > 0 ? '#d97706' : '#166534' }}>
                          {item.remaining_qty}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            max={item.remaining_qty}
                            value={item.receive_now}
                            disabled={!item.included || item.remaining_qty === 0}
                            onChange={(e) => handleItemQtyChange(item.sku, e.target.value)}
                            style={{
                              width: '80px',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              textAlign: 'right',
                              fontSize: '0.9rem',
                              backgroundColor: !item.included ? '#f1f5f9' : '#fff'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedPoId}
            style={{
              padding: '0.6rem 1.25rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: submitting || !selectedPoId ? 'not-allowed' : 'pointer',
              opacity: submitting || !selectedPoId ? 0.6 : 1
            }}
          >
            {submitting ? 'Submitting Receipt...' : 'Submit Goods Receipt'}
          </button>
        </form>
      </div>

      {/* SECTION 3: Past Goods Receipts List & Printable GRN View */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          Goods Receipt History
        </h2>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading goods receipts...</p>
        ) : goodsReceipts.length === 0 ? (
          <p style={{ color: '#64748b' }}>No goods receipts recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>GRN ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>PO Reference</th>
                  <th style={{ padding: '0.75rem 1rem' }}>PO Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Received Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Received By</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Received Items</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Notes</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Print Action</th>
                </tr>
              </thead>
              <tbody>
                {goodsReceipts.map((grn, idx) => (
                  <tr
                    key={grn.id}
                    style={{
                      borderBottom: idx === goodsReceipts.length - 1 ? 'none' : '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#2563eb' }}>{grn.id}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>{grn.po_id}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{getStatusBadge(grn.po_status)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{grn.received_on}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{grn.received_by}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {Array.isArray(grn.items) && grn.items.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#334155' }}>
                          {grn.items.map((it) => (
                            <li key={it.id || it.sku}>
                              <strong>{it.sku}</strong> ({it.product_name || 'Item'}): {it.received_qty} units
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{grn.notes || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setPrintingGrn(grn)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          background: '#f8fafc',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🖨️ View & Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 4: Printable Goods Receipt Note Modal [ERP2-D3] */}
      {printingGrn && (
        <div
          className="no-print-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            id="printable-grn-container"
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              maxWidth: '800px',
              width: '100%',
              padding: '2.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Controls (Hidden in print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                🖨️ Print Document
              </button>
              <button
                type="button"
                onClick={() => setPrintingGrn(null)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            {/* Document Header */}
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    ELECTRO APP ENTERPRISES
                  </h1>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Warehouse & Inward Goods Department · GSTIN: 27AABCS1234F1Z5
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', padding: '0.25rem 0.6rem', background: '#0f172a', color: '#fff', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px' }}>
                    OFFICIAL VOUCHER
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '0.35rem' }}>
                    {printingGrn.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div style={{ textAlign: 'center', margin: '1rem 0 1.5rem 0' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Goods Receipt Note (GRN)
              </h2>
            </div>

            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>Purchase Order Reference:</p>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{printingGrn.po_id}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>Received On (Date):</p>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>{printingGrn.received_on}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>Supplier Reference:</p>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>{printingGrn.supplier_id || 'N/A'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>Received By Employee:</p>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>{printingGrn.received_by}</p>
              </div>
              {printingGrn.notes && (
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>Receiving Notes / Airway Bill:</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>{printingGrn.notes}</p>
                </div>
              )}
            </div>

            {/* Received Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #0f172a', borderTop: '2px solid #0f172a', textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: '0.5rem' }}>#</th>
                  <th style={{ padding: '0.5rem' }}>SKU Code</th>
                  <th style={{ padding: '0.5rem' }}>Item Description</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Received Qty</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Unit Price (₹)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(printingGrn.items) && printingGrn.items.length > 0 ? (
                  printingGrn.items.map((it, i) => {
                    const cost = Number(it.unit_cost || 0);
                    const qty = Number(it.received_qty || 0);
                    return (
                      <tr key={it.id || it.sku} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.5rem', color: '#64748b' }}>{i + 1}</td>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{it.sku}</td>
                        <td style={{ padding: '0.5rem' }}>{it.product_name || 'Component / Product'}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>{qty}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>₹{(qty * cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No items recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Signatures Block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem', marginTop: '3.5rem', paddingTop: '1rem' }}>
              <div style={{ borderTop: '1px solid #94a3b8', textAlign: 'center', paddingTop: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                  Inspected & Received By
                </p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  {printingGrn.received_by}
                </p>
              </div>
              <div style={{ borderTop: '1px solid #94a3b8', textAlign: 'center', paddingTop: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                  Warehouse In-Charge / QC Signature
                </p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
