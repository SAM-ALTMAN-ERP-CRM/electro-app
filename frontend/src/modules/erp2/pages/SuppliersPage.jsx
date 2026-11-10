import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [notification, setNotification] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    city: '',
    gstin: '',
    payment_terms: 'net30',
    active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.append('q', searchQuery.trim());
      if (cityFilter.trim()) queryParams.append('city', cityFilter.trim());

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const data = await api('erp2', `/api/suppliers${qs}`);
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load suppliers from ERP-2 service');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, cityFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      city: '',
      gstin: '',
      payment_terms: 'net30',
      active: true
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name || '',
      contact_person: sup.contact_person || '',
      phone: sup.phone || '',
      email: sup.email || '',
      city: sup.city || '',
      gstin: sup.gstin || '',
      payment_terms: sup.payment_terms || 'net30',
      active: sup.active !== false
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Supplier name is required';
    if (formData.gstin && formData.gstin.trim().length !== 15) {
      errs.gstin = 'GSTIN must be exactly 15 characters';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setError('');
    try {
      if (editingSupplier) {
        await api('erp2', `/api/suppliers/${editingSupplier.id}`, {
          method: 'PATCH',
          body: formData
        });
        setNotification(`Supplier ${editingSupplier.id} updated successfully.`);
      } else {
        const created = await api('erp2', '/api/suppliers', {
          method: 'POST',
          body: formData
        });
        setNotification(`Supplier ${created.id} created successfully.`);
      }
      setShowForm(false);
      setEditingSupplier(null);
      fetchSuppliers();
      setTimeout(() => setNotification(''), 5000);
    } catch (err) {
      setError(err.message || 'Error saving supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const getTermsBadge = (terms) => {
    switch (terms) {
      case 'advance':
        return <span className="badge badge-amber">Advance</span>;
      case 'net15':
        return <span className="badge badge-blue">Net 15</span>;
      case 'net30':
      default:
        return <span className="badge badge-green">Net 30</span>;
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Suppliers Directory</h2>
            <span className="badge badge-blue">ERP-2</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Manage component vendors, payment terms, GSTIN compliance, and performance ratings.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn btn-primary"
          style={{
            background: '#2563eb',
            color: '#ffffff',
            padding: '0.6rem 1.2rem',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Add Supplier
        </button>
      </div>

      {/* Notifications and Errors */}
      {notification && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '1rem', fontWeight: 500 }}>
          ✓ {notification}
        </div>
      )}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontWeight: 500 }}>
          ⚠ {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search by name, contact, GSTIN, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: '1 1 250px',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem'
          }}
        />
        <input
          type="text"
          placeholder="Filter by city (e.g. Pune, Bengaluru)..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{
            flex: '0 1 200px',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem'
          }}
        />
        {(searchQuery || cityFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setCityFilter(''); }}
            style={{
              padding: '0.5rem 1rem',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Modal / Inline Add & Edit Form */}
      {showForm && (
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #93c5fd',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: '#1e3a8a' }}>
            {editingSupplier ? `Edit Supplier: ${editingSupplier.name} (${editingSupplier.id})` : 'Register New Component Supplier'}
          </h3>

          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Supplier Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Precision Display Panels Ltd"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: formErrors.name ? '1px solid #ef4444' : '1px solid #cbd5e1' }}
                />
                {formErrors.name && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{formErrors.name}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleFormChange}
                  placeholder="e.g. Vikram Malhotra"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="+91 98201 12345"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="orders@supplier.co.in"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  City / Location
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleFormChange}
                  placeholder="e.g. Pune, Bengaluru"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  GSTIN (15 chars)
                </label>
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleFormChange}
                  placeholder="27AAACP1234A1Z5"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: formErrors.gstin ? '1px solid #ef4444' : '1px solid #cbd5e1' }}
                />
                {formErrors.gstin && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{formErrors.gstin}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Payment Terms
                </label>
                <select
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleFormChange}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="net30">Net 30 (Standard 30 Days)</option>
                  <option value="net15">Net 15 (15 Days)</option>
                  <option value="advance">Advance Payment</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                <input
                  type="checkbox"
                  id="activeCheck"
                  name="active"
                  checked={formData.active}
                  onChange={handleFormChange}
                />
                <label htmlFor="activeCheck" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  Active Supplier Status
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingSupplier(null); }}
                style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Saving...' : (editingSupplier ? 'Update Supplier' : 'Save Supplier')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suppliers Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading supplier catalog...
          </div>
        ) : suppliers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No suppliers found matching your query.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Supplier Name</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Contact Person</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>City</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Terms</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Rating</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, idx) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: idx === suppliers.length - 1 ? 'none' : '1px solid #f1f5f9',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#2563eb' }}>
                    <Link to={`/erp2/suppliers/${s.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {s.id}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                    <Link to={`/erp2/suppliers/${s.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                      {s.name}
                    </Link>
                    {s.gstin && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>GSTIN: {s.gstin}</div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                    {s.contact_person || '—'}
                    {s.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.phone}</div>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{s.city || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{getTermsBadge(s.payment_terms)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#d97706' }}>
                    ★ {Number(s.rating || 0).toFixed(1)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {s.active !== false ? (
                      <span className="badge badge-green">Active</span>
                    ) : (
                      <span className="badge badge-red">Inactive</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => handleOpenEdit(s)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        marginRight: '0.5rem',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Edit
                    </button>
                    <Link
                      to={`/erp2/suppliers/${s.id}`}
                      style={{
                        padding: '0.3rem 0.6rem',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '0.8rem'
                      }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
