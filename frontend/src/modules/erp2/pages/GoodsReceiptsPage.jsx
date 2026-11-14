import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

export default function GoodsReceiptsPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
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

  // Fetch all POs and existing Goods Receipts
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [posData, grnsData] = await Promise.all([
        api('erp2', '/api/purchase-orders'),
        api('erp2', '/api/goods-receipts')
      ]);
      setPurchaseOrders(Array.isArray(posData) ? posData : []);
      setGoodsReceipts(Array.isArray(grnsData) ? grnsData : []);
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
      const data = await api('erp2', `/api/purchase-orders/${poId}`);
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
            included: remaining > 0
          };
        });
        setReceiptItems(initialItems);
      }
    } catch (err) {
      setError(`Failed to load details for ${poId}: ${err.message}`);
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
        setError(`Cannot receive ${sub.received_qty} for SKU ${sub.sku}. Remaining allowed: ${orig.remaining_qty}`);
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

      setSuccessMessage(
        `Goods Receipt Note ${res.id} created successfully! Purchase Order status is now "${res.po_status}".`
      );

      // Refresh list and reload selected PO
      await fetchData();
      await handleSelectPo(selectedPoId);
      setNotes('');
    } catch (err) {
      setError(err.message || 'Failed to submit Goods Receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'received':
        return <span style={{ padding: '0.25rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Received</span>;
      case 'partially_received':
        return <span style={{ padding: '0.25rem 0.5rem', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Partially Received</span>;
      case 'sent':
        return <span style={{ padding: '0.25rem 0.5rem', background: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Sent</span>;
      case 'draft':
        return <span style={{ padding: '0.25rem 0.5rem', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Draft</span>;
      default:
        return <span style={{ padding: '0.25rem 0.5rem', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{status}</span>;
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: '#0f172a' }}>Goods Receipts (GRN)</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
          Record incoming shipments against Purchase Orders, adjust ERP-1 warehouse stock, and create ERP-5 purchase ledger entries.
        </p>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Goods Receipt Form Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          Record New Goods Receipt
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Select Purchase Order *
              </label>
              <select
                value={selectedPoId}
                onChange={(e) => handleSelectPo(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff' }}
              >
                <option value="">-- Choose Purchase Order --</option>
                {purchaseOrders
                  .filter((po) => po.status === 'sent' || po.status === 'partially_received')
                  .map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.id} ({po.supplier_id} - {po.status} - ₹{Number(po.total_amount).toLocaleString('en-IN')})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Received By (Employee ID) *
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="e.g. EMP-0005"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Received On (Date) *
              </label>
              <input
                type="date"
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Notes / Delivery Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Shipment delivered via BlueDart; packaging verified with zero defects"
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>

          {selectedPo && (
            <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                  Purchase Order: {selectedPo.id} (Supplier: {selectedPo.supplier_id})
                </span>
                <div>
                  <span style={{ marginRight: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>Current Status:</span>
                  {getStatusBadge(selectedPo.status)}
                </div>
              </div>

              {receiptItems.length === 0 ? (
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>No items found for this order.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', backgroundColor: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.6rem 0.75rem', width: '40px' }}>Include</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>SKU</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Product Name</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Ordered</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Received</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Remaining</th>
                      <th style={{ padding: '0.6rem 0.75rem', width: '140px', textAlign: 'right' }}>Receive Now</th>
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

      {/* Past Goods Receipts List */}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
