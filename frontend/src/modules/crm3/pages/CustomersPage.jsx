import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import CustomerForm from './CustomerForm';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [notification, setNotification] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.append('q', searchQuery.trim());
      if (typeFilter) queryParams.append('type', typeFilter);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const data = await api('crm3', `/api/customers${qs}`);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load customers from backend service');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleFormSuccess = (savedCustomer) => {
    setShowForm(false);
    setEditingCustomer(null);
    setNotification(
      `Customer '${savedCustomer.name}' (${savedCustomer.id}) saved successfully with verified validation rules.`
    );
    fetchCustomers();
    setTimeout(() => setNotification(''), 6000);
  };

  const handleEditClick = (cust) => {
    setEditingCustomer(cust);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'corporate':
        return 'badge badge-amber';
      case 'dealer':
        return 'badge badge-green';
      case 'retail':
      default:
        return 'badge badge-blue';
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              Customer Master Directory
            </h2>
            <span className="badge badge-blue">CRM-3</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage customer records with phone (10-digits), email uniqueness (409), and GSTIN validation.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowForm(prev => !prev);
          }}
          className="btn"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {showForm ? 'Close Form' : '+ Add Customer'}
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          ✓ {notification}
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <CustomerForm
          initialData={editingCustomer}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search by name, email, phone, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ width: '180px' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              background: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="">All Types</option>
            <option value="retail">Retail</option>
            <option value="corporate">Corporate</option>
            <option value="dealer">Dealer</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading customers...
        </div>
      ) : customers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <h4 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>No customers found</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {searchQuery || typeFilter
              ? 'No customers match your search criteria.'
              : 'The customer directory is currently empty. Click "+ Add Customer" above to create one.'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Email</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th>City</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((cust) => (
                <tr key={cust.id}>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>{cust.id}</td>
                  <td style={{ fontWeight: 500 }}>{cust.name}</td>
                  <td>
                    <span className={getTypeBadgeClass(cust.type)}>
                      {cust.type}
                    </span>
                  </td>
                  <td style={{ color: '#475569' }}>{cust.email}</td>
                  <td style={{ color: '#475569' }}>{cust.phone}</td>
                  <td style={{ fontFamily: 'monospace', color: cust.gstin ? '#0f172a' : '#94a3b8' }}>
                    {cust.gstin || '—'}
                  </td>
                  <td style={{ color: '#64748b' }}>{cust.city || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleEditClick(cust)}
                      style={{
                        background: 'transparent',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
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
