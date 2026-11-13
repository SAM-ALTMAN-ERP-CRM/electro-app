import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../../api';

// Seed dealers contract fallback
const SEED_DEALERS = [
  { id: 'DLR-0001', name: 'BrightHome Retail', contact_person: 'Rahul Deshmukh', phone: '020-25671199', email: 'rahul@brighthome.in', city: 'Pune', tier: 'gold', credit_limit: 1500000.00, status: 'active' },
  { id: 'DLR-0002', name: 'Gadget Hub', contact_person: 'Suresh Rao', phone: '080-22345678', email: 'contact@gadgethub.in', city: 'Bengaluru', tier: 'silver', credit_limit: 800000.00, status: 'active' },
  { id: 'DLR-0003', name: 'Metro Electronics', contact_person: 'Amit Verma', phone: '011-23456789', email: 'amit@metroelec.com', city: 'Delhi', tier: 'gold', credit_limit: 2000000.00, status: 'active' },
  { id: 'DLR-0004', name: 'Western Appliance Mart', contact_person: 'Manoj Joshi', phone: '022-26789012', email: 'manoj@westernmart.com', city: 'Mumbai', tier: 'bronze', credit_limit: 300000.00, status: 'active' },
  { id: 'DLR-0005', name: 'Royal Vision Hub', contact_person: 'Priya S.', phone: '044-24567890', email: 'priya@royalvision.com', city: 'Chennai', tier: 'silver', credit_limit: 600000.00, status: 'active' }
];

export default function DealerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dealer, setDealer] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');

    try {
      // 1. Fetch dealer details
      let dealerData = null;
      try {
        const dealerRes = await api('crm1', `/api/dealers/${id}`);
        dealerData = dealerRes && dealerRes.data ? dealerRes.data : dealerRes;
      } catch (err) {
        console.warn(`[crm1] /api/dealers/${id} failed, using seed fallback:`, err.message);
        dealerData = SEED_DEALERS.find(d => d.id === id) || {
          id,
          name: 'Authorized Dealer',
          contact_person: 'Store Manager',
          phone: '—',
          email: '—',
          city: 'Mumbai',
          tier: 'silver',
          credit_limit: 500000.00,
          status: 'active'
        };
      }
      setDealer(dealerData);

      // 2. Fetch quotes associated with this dealer
      try {
        const quotesRes = await api('crm1', `/api/quotes?dealer_id=${id}`);
        const quotesList = Array.isArray(quotesRes) ? quotesRes : (quotesRes && quotesRes.data ? quotesRes.data : []);
        setQuotes(quotesList);
      } catch (err) {
        console.warn(`[crm1] Could not load quotes for dealer ${id}:`, err.message);
        setQuotes([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dealer details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatMoney = (amount) => {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTierBadge = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'gold':
        return <span className="badge badge-amber" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600 }}>★ Gold (up to 15%)</span>;
      case 'silver':
        return <span className="badge badge-blue" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 600 }}>✦ Silver (up to 10%)</span>;
      case 'bronze':
      default:
        return <span className="badge" style={{ background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', fontWeight: 600 }}>● Bronze (up to 5%)</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return <span className="badge badge-green" style={{ background: '#dcfce7', color: '#15803d' }}>Accepted</span>;
      case 'sent':
        return <span className="badge badge-blue" style={{ background: '#e0f2fe', color: '#0369a1' }}>Sent</span>;
      case 'rejected':
        return <span className="badge badge-red" style={{ background: '#fee2e2', color: '#b91c1c' }}>Rejected</span>;
      case 'draft':
      default:
        return <span className="badge badge-amber" style={{ background: '#fef3c7', color: '#b45309' }}>Draft</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 0' }}>
        <p style={{ color: '#64748b' }}>Loading dealer profile and quotes...</p>
      </div>
    );
  }

  if (error || !dealer) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem 0' }}>
        <button
          onClick={() => navigate('/crm1/dealers')}
          style={{ padding: '0.4rem 0.8rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', marginBottom: '1rem' }}
        >
          ← Back to Dealers
        </button>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '1rem', borderRadius: '6px' }}>
          ⚠ {error || `Dealer with ID '${id}' was not found.`}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Navigation & Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          onClick={() => navigate('/crm1/dealers')}
          style={{
            padding: '0.4rem 0.85rem',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            color: '#334155',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}
        >
          ← Back to Dealers Directory
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {dealer.name}
              </h2>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>({dealer.id})</span>
              {getTierBadge(dealer.tier)}
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.35rem' }}>
              Dealer Profile & Sales Quotation Portfolio
            </p>
          </div>
          <div>
            <Link
              to="/crm1/quotes/new"
              style={{
                padding: '0.5rem 1rem',
                background: '#2563eb',
                color: '#ffffff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'inline-block'
              }}
            >
              + Create Quote for Dealer
            </Link>
          </div>
        </div>
      </div>

      {/* Dealer Profile Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 1rem 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          Business & Commercial Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', fontSize: '0.875rem' }}>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>Contact Person</div>
            <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.2rem' }}>{dealer.contact_person || '—'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>Phone</div>
            <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.2rem' }}>{dealer.phone || '—'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>Email</div>
            <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.2rem' }}>{dealer.email || '—'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>City / Region</div>
            <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.2rem' }}>{dealer.city}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>Credit Limit</div>
            <div style={{ fontWeight: 700, color: '#047857', fontSize: '1.1rem', marginTop: '0.2rem' }}>
              {formatMoney(dealer.credit_limit)}
            </div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>Account Status</div>
            <div style={{ marginTop: '0.25rem' }}>
              <span className={`badge ${dealer.status === 'active' ? 'badge-green' : 'badge-red'}`} style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                {dealer.status?.toUpperCase() || 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Quotes Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Quotation Portfolio ({quotes.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Filtered by dealer: {dealer.id}
          </span>
        </div>

        {quotes.length === 0 ? (
          <div style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '2.5rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>
              No quotes yet for this dealer.
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>
              Quotations created with dealer ID <strong>{dealer.id}</strong> will automatically appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Quote ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Opportunity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Customer ID</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Discount</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Sales Rep</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{q.id}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{q.opportunity_id || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#1e293b' }}>{q.customer_id}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {getStatusBadge(q.status)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>
                      {Number(q.discount_percent) || 0}%
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {formatMoney(q.total || q.total_amount || 0)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      {q.sales_rep_id || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
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
