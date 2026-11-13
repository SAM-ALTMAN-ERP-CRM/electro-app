import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

// Seed dealers contract (DLR-0001 to DLR-0005)
const SEED_DEALERS = [
  { id: 'DLR-0001', name: 'Apex Electronics', contact_person: 'Rajesh Gupta', phone: '9820011223', email: 'rajesh@apexelectronics.in', city: 'Mumbai', tier: 'gold', credit_limit: 500000.00, status: 'active' },
  { id: 'DLR-0002', name: 'Bharat Sound & Vision', contact_person: 'Priya Nair', phone: '9820022334', email: 'priya@bharatsound.in', city: 'Pune', tier: 'silver', credit_limit: 300000.00, status: 'active' },
  { id: 'DLR-0003', name: 'Crompton Retailers', contact_person: 'Amit Desai', phone: '9820033445', email: 'amit@cromptonretail.in', city: 'Ahmedabad', tier: 'bronze', credit_limit: 150000.00, status: 'active' },
  { id: 'DLR-0004', name: 'Deccan Digital', contact_person: 'Suresh Rao', phone: '9820044556', email: 'suresh@deccandigital.in', city: 'Bengaluru', tier: 'gold', credit_limit: 600000.00, status: 'active' },
  { id: 'DLR-0005', name: 'Eastern Appliances', contact_person: 'Ananya Sen', phone: '9820055667', email: 'ananya@easternappliances.in', city: 'Kolkata', tier: 'silver', credit_limit: 250000.00, status: 'active' }
];

export default function DealersPage() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [dealerQuotes, setDealerQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New dealer form fields
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    city: '',
    tier: 'silver',
    credit_limit: '250000'
  });

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (cityFilter) params.append('city', cityFilter);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await api('crm1', `/api/dealers${queryStr}`);
      const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
      setDealers(list);
    } catch (err) {
      console.warn('[crm1] API fetch failed, fallback to seed dealers:', err.message);
      let filtered = SEED_DEALERS;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(d => d.name.toLowerCase().includes(q) || d.contact_person.toLowerCase().includes(q));
      }
      if (cityFilter) {
        filtered = filtered.filter(d => d.city.toLowerCase() === cityFilter.toLowerCase());
      }
      setDealers(filtered);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, cityFilter]);

  useEffect(() => {
    fetchDealers();
  }, [fetchDealers]);

  // Load quotes for selected dealer
  const handleSelectDealer = async (dealer) => {
    setSelectedDealer(dealer);
    setQuotesLoading(true);
    try {
      const res = await api('crm1', `/api/quotes?dealer_id=${dealer.id}`);
      const quotes = Array.isArray(res) ? res : (res && res.data ? res.data : []);
      setDealerQuotes(quotes);
    } catch (err) {
      console.warn('[crm1] Could not load dealer quotes:', err.message);
      setDealerQuotes([]);
    } finally {
      setQuotesLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateDealer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.city.trim()) {
      setError('Dealer name and city are required.');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        city: formData.city.trim(),
        tier: formData.tier,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        status: 'active'
      };

      await api('crm1', '/api/dealers', { method: 'POST', body: payload }).catch(() => {
        // Fallback local append if backend route not ready
        const generated = {
          ...payload,
          id: `DLR-000${dealers.length + 1}`
        };
        setDealers(prev => [generated, ...prev]);
      });

      setShowAddModal(false);
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        city: '',
        tier: 'silver',
        credit_limit: '250000'
      });
      fetchDealers();
    } catch (err) {
      setError(err.message || 'Failed to save dealer.');
    }
  };

  const formatMoney = (amount) => {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTierBadge = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'gold':
        return <span className="badge badge-amber" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>★ Gold (15%)</span>;
      case 'silver':
        return <span className="badge badge-blue" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>✦ Silver (10%)</span>;
      case 'bronze':
      default:
        return <span className="badge" style={{ background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }}>● Bronze (5%)</span>;
    }
  };

  const cities = Array.from(new Set(SEED_DEALERS.map(d => d.city)));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Dealer Directory</h2>
            <span className="badge badge-blue">CRM-1 Partner Network</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Manage authorized electronics dealers, credit limits, and tier discounts.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(!showAddModal)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
        >
          {showAddModal ? 'Cancel' : '+ Add New Dealer'}
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Add Dealer Form */}
      {showAddModal && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Register New Dealer</h3>
          <form onSubmit={handleCreateDealer}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Dealer / Business Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Metro Electronics Hub"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Contact Person</label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  placeholder="Full name"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="dealer@domain.com"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Mumbai, Delhi"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Discount Tier</label>
                <select
                  name="tier"
                  value={formData.tier}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff' }}
                >
                  <option value="gold">Gold (up to 15% discount)</option>
                  <option value="silver">Silver (up to 10% discount)</option>
                  <option value="bronze">Bronze (up to 5% discount)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Credit Limit (₹)</label>
                <input
                  type="number"
                  name="credit_limit"
                  value={formData.credit_limit}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '0.5rem 1.25rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                Save Dealer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters bar */}
      <div style={{ display: 'flex', gap: '1rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by dealer name or contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '220px', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
        />
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff' }}
        >
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(searchQuery || cityFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setCityFilter(''); }}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Table */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Loading dealers...</p>
      ) : dealers.length === 0 ? (
        <p style={{ color: '#64748b', fontStyle: 'italic', padding: '2rem', textAlign: 'center' }}>No dealers found matching your search.</p>
      ) : (
        <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Dealer ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Business Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Contact</th>
                <th style={{ padding: '0.75rem 1rem' }}>City</th>
                <th style={{ padding: '0.75rem 1rem' }}>Tier</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Credit Limit</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dealers.map((d) => (
                <tr
                  key={d.id}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: selectedDealer?.id === d.id ? '#eff6ff' : '#ffffff'
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>{d.id}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link to={`/crm1/dealers/${d.id}`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 600 }}>
                      {d.name}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ color: '#1e293b' }}>{d.contact_person || '—'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{d.phone || d.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{d.city}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{getTierBadge(d.tier)}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                    {formatMoney(d.credit_limit)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <span className={`badge ${d.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                      {d.status || 'active'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <Link
                        to={`/crm1/dealers/${d.id}`}
                        style={{
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.75rem',
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontWeight: 500,
                          display: 'inline-block'
                        }}
                      >
                        Details
                      </Link>
                      <button
                        onClick={() => handleSelectDealer(d)}
                        style={{
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.75rem',
                          background: selectedDealer?.id === d.id ? '#1e293b' : '#f1f5f9',
                          color: selectedDealer?.id === d.id ? '#ffffff' : '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        {selectedDealer?.id === d.id ? 'Hide Quotes' : 'Quotes'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Dealer Quotes Panel */}
      {selectedDealer && (
        <div style={{ marginTop: '2rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Quotes History: {selectedDealer.name} ({selectedDealer.id})
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Tier: {selectedDealer.tier?.toUpperCase()} · City: {selectedDealer.city} · Credit Limit: {formatMoney(selectedDealer.credit_limit)}
              </p>
            </div>
            <button
              onClick={() => setSelectedDealer(null)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✕ Close
            </button>
          </div>

          {quotesLoading ? (
            <p style={{ color: '#64748b' }}>Loading quotes for {selectedDealer.name}...</p>
          ) : dealerQuotes.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic', padding: '1rem 0' }}>No quotes generated for this dealer yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Quote ID</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Discount %</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dealerQuotes.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{q.id}</td>
                    <td style={{ padding: '0.5rem' }}>{q.created_at ? q.created_at.slice(0, 10) : '2024-03-01'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{q.discount_percent}%</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{formatMoney(q.total_amount || q.total || 0)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <span className={`badge ${q.status === 'accepted' ? 'badge-green' : q.status === 'rejected' ? 'badge-red' : 'badge-blue'}`}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
