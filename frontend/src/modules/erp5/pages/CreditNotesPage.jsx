import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../api';

export default function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchCreditNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('erp5', '/api/creditnotes');
      setCreditNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load credit notes:', err);
      setError(err.message || 'Unable to load credit notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditNotes();
  }, []);

  const formatCurrency = (amount) => {
    const val = parseFloat(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const totalCreditedAmount = creditNotes.reduce((acc, cn) => acc + parseFloat(cn.amount || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Credit Notes</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Warranty returns and credited sales orders (Workflow Step 9). Reduces customer receivable balances.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate('/erp5/invoices')}
            style={{
              background: 'white',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← View Invoices
          </button>
        </div>
      </div>

      {/* Summary Stat */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Credited Amount
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.25rem' }}>
            {formatCurrency(totalCreditedAmount)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Across {creditNotes.length} credit notes
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Credit Notes Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading credit notes...</div>
      ) : creditNotes.length === 0 ? (
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
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No credit notes issued yet.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Credit Note #</th>
                <th>Order Ref</th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Serial Number</th>
                <th>Credited Amount</th>
                <th>Issued Date</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {creditNotes.map((cn) => (
                <tr key={cn.id}>
                  <td>
                    <strong style={{ color: '#b91c1c' }}>{cn.id}</strong>
                  </td>
                  <td>
                    <span className="badge badge-blue">{cn.so_id}</span>
                  </td>
                  <td>
                    {cn.invoice_id ? (
                      <Link
                        to={`/erp5/invoices/${cn.invoice_id}`}
                        style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {cn.invoice_id}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{cn.customer_name || cn.customer_id || '-'}</td>
                  <td>
                    <code>{cn.serial_number}</code>
                  </td>
                  <td>
                    <strong style={{ color: '#b91c1c' }}>{formatCurrency(cn.amount)}</strong>
                  </td>
                  <td>{cn.created_at ? String(cn.created_at).split('T')[0] : '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {cn.invoice_id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/erp5/invoices/${cn.invoice_id}`)}
                        className="btn"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        View Bill
                      </button>
                    )}
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
