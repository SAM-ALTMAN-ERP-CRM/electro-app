// [CRM2-D2] Service centres management screen
// Allows viewing existing service centres and registering new regional repair centres.
import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

export default function CentresPage() {
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // New centre form state
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [capacity, setCapacity] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  // Fetch service centres
  async function fetchCentres() {
    try {
      setLoading(true);
      setError(null);
      const data = await api('crm2', '/api/centres');
      setCentres(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load service centres');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCentres();
  }, []);

  // Handle creating a new service centre
  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      setError('Name and city are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      const payload = {
        name: name.trim(),
        city: city.trim(),
        phone: phone.trim() || null,
        capacity: capacity ? parseInt(capacity, 10) : 0,
        active: true
      };

      await api('crm2', '/api/centres', {
        method: 'POST',
        body: payload
      });

      setSuccessMsg(`Service centre "${name.trim()}" added successfully!`);
      setName('');
      setCity('');
      setPhone('');
      setCapacity('30');
      await fetchCentres();
    } catch (err) {
      setError(err.message || 'Failed to create service centre');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
            Service Centres
          </h2>
          <span className="badge badge-blue">CRM-2</span>
        </div>
      </div>

      <p style={{ color: '#64748b', marginTop: 0, marginBottom: '1.5rem' }}>
        Manage regional service and repair centres, repair throughput capacity, and active status.
      </p>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '1.25rem' }}>
          {successMsg}
        </div>
      )}

      {/* Add New Centre Form Card */}
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
          Add New Service Centre
        </h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              Centre Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Pune Deccan Hub"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              City *
            </label>
            <input
              type="text"
              placeholder="e.g. Pune"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              Phone Number
            </label>
            <input
              type="text"
              placeholder="e.g. +91 20 2553 2200"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: '0 1 100px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              Capacity
            </label>
            <input
              type="number"
              min="0"
              placeholder="30"
              value={capacity}
              onChange={e => setCapacity(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: '0 0 auto' }}>
            <button
              type="submit"
              className="btn"
              disabled={submitting}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              {submitting ? 'Adding...' : '+ Add Centre'}
            </button>
          </div>
        </form>
      </div>

      {/* Service Centres Table */}
      <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
        Registered Service Centres ({centres.length})
      </h3>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading service centres...</p>
      ) : centres.length === 0 ? (
        <p style={{ color: '#64748b', fontStyle: 'italic' }}>No service centres registered yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>
              <th style={{ padding: '0.75rem 1rem' }}>CENTRE ID</th>
              <th style={{ padding: '0.75rem 1rem' }}>NAME</th>
              <th style={{ padding: '0.75rem 1rem' }}>CITY</th>
              <th style={{ padding: '0.75rem 1rem' }}>PHONE</th>
              <th style={{ padding: '0.75rem 1rem' }}>CAPACITY</th>
              <th style={{ padding: '0.75rem 1rem' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {centres.map((c, idx) => (
              <tr key={c.id} style={{ borderBottom: idx < centres.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '0.9rem' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{c.id}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>{c.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{c.city}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{c.phone || '—'}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>{c.capacity} units</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span className={c.active ? 'badge badge-green' : 'badge'}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
