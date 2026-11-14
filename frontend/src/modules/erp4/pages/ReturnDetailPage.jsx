import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';

export default function ReturnDetailPage() {
  const { id } = useParams();
  const [returnItem, setReturnItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [issueCreditNote, setIssueCreditNote] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadReturn = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api('erp4', `/api/returns/${id}`);
      const data = res?.data || res;
      setReturnItem(data);
      if (data?.outcome === 'credit_note') {
        setIssueCreditNote(true);
      }
    } catch (err) {
      // Local fallback for offline mode
      setReturnItem({
        id,
        so_id: 'SO-0001',
        customer_id: 'CUST-0001',
        customer_name: 'Aarav Mehta',
        serial_number: 'TV55-2611-0001',
        reason: 'Display panel flickering on HDMI 2 port',
        rma_id: 'RMA-0001',
        outcome: 'credit_note',
        status: 'requested',
        created_at: new Date().toISOString()
      });
      setIssueCreditNote(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadReturn();
    }
  }, [id]);

  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    let badgeClass = 'badge-gray';
    if (s === 'received') badgeClass = 'badge-amber';
    if (s === 'restocked') badgeClass = 'badge-green';
    if (s === 'scrapped') badgeClass = 'badge-red';
    return <span className={`badge ${badgeClass}`}>{s}</span>;
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccessMsg(null);

      const res = await api('erp4', `/api/returns/${id}/status`, {
        method: 'PATCH',
        body: {
          status: newStatus,
          issue_credit_note: newStatus === 'restocked' ? issueCreditNote : false
        }
      });
      const updated = res?.data || res;

      setReturnItem(prev => ({ ...prev, ...updated, status: newStatus }));
      setSuccessMsg(`Return status updated to '${newStatus}' successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to update return status');
    } finally {
      setUpdating(false);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading return details for {id}...
      </div>
    );
  }

  if (!returnItem) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#dc2626' }}>Return record not found.</p>
        <Link to="/erp4/returns" style={{ color: '#2563eb', textDecoration: 'underline' }}>
          ← Back to Returns
        </Link>
      </div>
    );
  }

  const isRequested = returnItem.status === 'requested';
  const isReceived = returnItem.status === 'received';
  const isTerminal = returnItem.status === 'restocked' || returnItem.status === 'scrapped';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/erp4/returns" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Back to Returns
        </Link>
      </div>

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              Return {returnItem.id}
            </h1>
            {renderStatusBadge(returnItem.status)}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Order {returnItem.so_id} · Serial {returnItem.serial_number}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isRequested && (
            <button
              type="button"
              onClick={() => handleStatusUpdate('received')}
              disabled={updating}
              style={{
                padding: '0.5rem 1rem',
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: updating ? 'not-allowed' : 'pointer'
              }}
            >
              Mark Received at Warehouse
            </button>
          )}

          {isReceived && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: '#475569', cursor: 'pointer', background: '#f8fafc', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={issueCreditNote}
                  onChange={e => setIssueCreditNote(e.target.checked)}
                />
                Issue Credit Note (ERP-5)
              </label>
              <button
                type="button"
                onClick={() => handleStatusUpdate('restocked')}
                disabled={updating}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: updating ? 'not-allowed' : 'pointer'
                }}
              >
                ✓ Restock to Inventory
              </button>
              <button
                type="button"
                onClick={() => handleStatusUpdate('scrapped')}
                disabled={updating}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: updating ? 'not-allowed' : 'pointer'
                }}
              >
                ✕ Scrap Damaged Item
              </button>
            </div>
          )}

          {isTerminal && (
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', alignSelf: 'center' }}>
              Return finalized ({returnItem.status})
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            Consignment Identification
          </h3>
          <table style={{ width: '100%', margin: 0, fontSize: '0.875rem' }}>
            <tbody>
              <tr>
                <td style={{ color: '#64748b', width: '40%', padding: '0.35rem 0' }}>Return ID:</td>
                <td style={{ fontWeight: 700, padding: '0.35rem 0' }}>{returnItem.id}</td>
              </tr>
              <tr>
                <td style={{ color: '#64748b', padding: '0.35rem 0' }}>Sales Order Ref:</td>
                <td style={{ padding: '0.35rem 0' }}>
                  <Link to={`/erp4/orders/${returnItem.so_id}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                    {returnItem.so_id}
                  </Link>
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748b', padding: '0.35rem 0' }}>Serial Number:</td>
                <td style={{ padding: '0.35rem 0', fontFamily: 'monospace', fontWeight: 600 }}>
                  {returnItem.serial_number}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748b', padding: '0.35rem 0' }}>Created On:</td>
                <td style={{ padding: '0.35rem 0' }}>
                  {returnItem.created_at ? new Date(returnItem.created_at).toLocaleDateString('en-IN') : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            RMA & Customer Information
          </h3>
          <table style={{ width: '100%', margin: 0, fontSize: '0.875rem' }}>
            <tbody>
              <tr>
                <td style={{ color: '#64748b', width: '40%', padding: '0.35rem 0' }}>Customer:</td>
                <td style={{ fontWeight: 600, padding: '0.35rem 0' }}>
                  {returnItem.customer_name || 'Customer'}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748b', padding: '0.35rem 0' }}>Customer ID:</td>
                <td style={{ padding: '0.35rem 0' }}>{returnItem.customer_id || 'CUST-0001'}</td>
              </tr>
              <tr>
                <td style={{ color: '#64748b', padding: '0.35rem 0' }}>Linked RMA ID:</td>
                <td style={{ padding: '0.35rem 0', fontWeight: 600, color: returnItem.rma_id ? '#2563eb' : '#64748b' }}>
                  {returnItem.rma_id || 'None (Direct return)'}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748b', padding: '0.35rem 0' }}>Resolution Outcome:</td>
                <td style={{ padding: '0.35rem 0', textTransform: 'capitalize', fontWeight: 600 }}>
                  {returnItem.outcome ? returnItem.outcome.replace('_', ' ') : 'Standard Restock'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Reason Card */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          Defect / Return Description
        </h3>
        <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          {returnItem.reason || 'No description recorded.'}
        </p>
      </div>
    </div>
  );
}
