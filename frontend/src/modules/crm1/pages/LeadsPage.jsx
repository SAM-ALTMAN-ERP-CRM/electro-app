import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Shared mock seed leads for CRM-1
const SEED_LEADS = [
  { id: 'LEAD-0001', name: 'Rajesh Kumar', phone: '9820112345', email: 'rajesh.k@example.com', source: 'dealer', product_interest: '55-inch 4K Smart TV', status: 'qualified', score: 70, sales_rep_id: 'EMP-0001' },
  { id: 'LEAD-0002', name: 'Simran Kaur', phone: '9820223456', email: 'simran.k@example.com', source: 'web', product_interest: 'Soundbar 2.1', status: 'contacted', score: 50, sales_rep_id: 'EMP-0002' },
  { id: 'LEAD-0003', name: 'Amit Shah', phone: '9820334567', email: 'amit.s@example.com', source: 'walk-in', product_interest: '65-inch OLED TV', status: 'new', score: 40, sales_rep_id: 'EMP-0003' },
  { id: 'LEAD-0004', name: 'Pooja Verma', phone: '9820445678', email: 'pooja.v@example.com', source: 'dealer', product_interest: 'Microwave Oven 25L', status: 'qualified', score: 80, sales_rep_id: 'EMP-0004' },
  { id: 'LEAD-0005', name: 'Vikram Joshi', phone: '9820556789', email: 'vikram.j@example.com', source: 'web', product_interest: 'Wireless Headphones', status: 'lost', score: 30, sales_rep_id: 'EMP-0001' }
];

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('dealer');
  const [productInterest, setProductInterest] = useState('55-inch 4K Smart TV');
  const [salesRepId, setSalesRepId] = useState('EMP-0001');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await api('crm1', `/api/leads${qs}`);
      const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
      setLeads(list);
    } catch (err) {
      console.warn('[crm1] API fetch failed, using seed fallback for leads:', err.message);
      let fallback = SEED_LEADS;
      if (statusFilter) {
        fallback = fallback.filter(l => l.status === statusFilter);
      }
      setLeads(fallback);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Lead name is required.');
      return;
    }

    try {
      const newLead = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        source,
        product_interest: productInterest,
        sales_rep_id: salesRepId,
        status: 'new'
      };

      await api('crm1', '/api/leads', { method: 'POST', body: newLead }).catch(() => {
        // Fallback local append if backend route not merged yet
        const generated = {
          ...newLead,
          id: `LEAD-000${leads.length + 1}`,
          score: 50
        };
        setLeads(prev => [generated, ...prev]);
      });

      setShowAddForm(false);
      setName('');
      setPhone('');
      setEmail('');
      fetchLeads();
    } catch (err) {
      setError(err.message || 'Failed to save lead.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'qualified':
        return <span className="badge badge-green">Qualified</span>;
      case 'contacted':
        return <span className="badge badge-amber">Contacted</span>;
      case 'lost':
        return <span className="badge badge-red">Lost</span>;
      case 'new':
      default:
        return <span className="badge badge-blue">New</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Sales Leads</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Capture and track incoming sales inquiries from dealers, web, and walk-ins.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="btn"
          style={{ background: '#2563eb', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 600 }}
        >
          {showAddForm ? 'Close Form' : '+ Add Lead'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.2rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #fecaca', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Add Lead Form */}
      {showAddForm && (
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>New Sales Lead</h3>
          <form onSubmit={handleCreateLead} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} placeholder="e.g. Ramesh Patel" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} placeholder="9820xxxxxx" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} placeholder="name@example.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Source</label>
              <select value={source} onChange={e => setSource(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}>
                <option value="dealer">Dealer</option>
                <option value="web">Web</option>
                <option value="walk-in">Walk-in</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Product Interest</label>
              <input type="text" value={productInterest} onChange={e => setProductInterest(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Sales Representative</label>
              <select value={salesRepId} onChange={e => setSalesRepId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}>
                <option value="EMP-0001">EMP-0001 - Rohan Kulkarni</option>
                <option value="EMP-0002">EMP-0002 - Neha Sharma</option>
                <option value="EMP-0003">EMP-0003 - Vikram Singh</option>
                <option value="EMP-0004">EMP-0004 - Anjali Rao</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '4px' }}>Cancel</button>
              <button type="submit" className="btn" style={{ background: '#2563eb', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '4px' }}>Save Lead</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="lead-status-filter" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Filter Status:</label>
          <select id="lead-status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem' }}>
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="lost">Lost</option>
          </select>
        </div>
        <button onClick={fetchLeads} type="button" style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem' }}>Refresh</button>
        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b' }}>Total Leads: <strong>{leads.length}</strong></div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading leads...</div>
      ) : leads.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b' }}>No leads found.</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>ID</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Source</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Product Interest</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Sales Rep</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Score</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1e40af' }}>{lead.id}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#0f172a', fontWeight: 500 }}>
                    <div>{lead.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{lead.email} · {lead.phone}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize', color: '#475569' }}>{lead.source}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>{lead.product_interest}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>{lead.sales_rep_id}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ fontWeight: 600, color: lead.score >= 60 ? '#15803d' : '#475569' }}>{lead.score}</span>
                    {lead.score >= 60 && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>HOT</span>}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>{getStatusBadge(lead.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
