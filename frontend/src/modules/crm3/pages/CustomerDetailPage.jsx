import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';
import CustomerForm from './CustomerForm';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

export default function CustomerDetailPage() {
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [tagError, setTagError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  // Add Contact Form State
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    designation: '',
    phone: '',
    email: ''
  });
  const [contactErrors, setContactErrors] = useState({});
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactServerError, setContactServerError] = useState('');

  // Edit Customer Modal State
  const [showEditCustomer, setShowEditCustomer] = useState(false);

  const fetchCustomerData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');

    try {
      // 1. Fetch customer details
      const customerData = await api('crm3', `/api/customers/${id}`);
      setCustomer(customerData);

      // Set tags if returned with customer, otherwise fetch tags
      if (Array.isArray(customerData.tags)) {
        setTags(customerData.tags);
      } else {
        try {
          const tagsData = await api('crm3', `/api/customers/${id}/tags`);
          setTags(Array.isArray(tagsData) ? tagsData : []);
        } catch (tErr) {
          console.warn('Could not load tags:', tErr.message);
          setTags([]);
        }
      }

      // 2. Fetch customer contacts
      try {
        const contactsData = await api('crm3', `/api/customers/${id}/contacts`);
        setContacts(Array.isArray(contactsData) ? contactsData : []);
      } catch (cErr) {
        console.warn('Could not load contacts:', cErr.message);
        setContacts([]);
      }
    } catch (err) {
      setError(err.message || `Customer with ID '${id}' could not be loaded.`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  // Handle Tag Addition (CRM3-C3)
  const handleAddTag = async (e) => {
    e.preventDefault();
    setTagError('');
    const trimmed = newTagInput.trim();
    if (!trimmed) return;

    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setTagError(`Tag '${trimmed}' is already added.`);
      setTimeout(() => setTagError(''), 3000);
      return;
    }

    try {
      const res = await api('crm3', `/api/customers/${id}/tags`, {
        method: 'POST',
        body: { tag: trimmed }
      });

      if (res && Array.isArray(res.tags)) {
        setTags(res.tags);
      } else {
        setTags(prev => [...prev, trimmed]);
      }
      setNewTagInput('');
      setNotification(`Tag '${trimmed}' added successfully.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      setTagError(err.message || 'Failed to add tag');
      setTimeout(() => setTagError(''), 4000);
    }
  };

  // Handle Tag Removal (CRM3-C3)
  const handleRemoveTag = async (tagToRemove) => {
    setTagError('');
    try {
      await api('crm3', `/api/customers/${id}/tags/${encodeURIComponent(tagToRemove)}`, {
        method: 'DELETE'
      });
      setTags(prev => prev.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase()));
      setNotification(`Tag '${tagToRemove}' removed.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      setTagError(err.message || 'Failed to remove tag');
      setTimeout(() => setTagError(''), 4000);
    }
  };

  // Handle Contact Form Field Changes
  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
    if (contactErrors[name]) {
      setContactErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate Contact Input
  const validateContact = () => {
    const errs = {};
    if (!contactForm.name.trim()) {
      errs.name = 'Contact name is required';
    }
    if (contactForm.email && !EMAIL_REGEX.test(contactForm.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (contactForm.phone && !PHONE_REGEX.test(contactForm.phone.trim().replace(/\D/g, ''))) {
      errs.phone = 'Phone number must be 10 digits';
    }
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Add Contact
  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    setContactServerError('');

    if (!validateContact()) return;

    setSubmittingContact(true);
    try {
      const payload = {
        name: contactForm.name.trim(),
        designation: contactForm.designation.trim() || null,
        phone: contactForm.phone.trim().replace(/\D/g, '') || null,
        email: contactForm.email.trim().toLowerCase() || null
      };

      const newContact = await api('crm3', `/api/customers/${id}/contacts`, {
        method: 'POST',
        body: payload
      });

      setContacts(prev => [...prev, newContact]);
      setNotification(`Contact '${newContact.name}' added successfully!`);
      setContactForm({ name: '', designation: '', phone: '', email: '' });
      setShowAddContact(false);
      setTimeout(() => setNotification(''), 5000);
    } catch (err) {
      setContactServerError(err.message || 'Failed to save contact');
    } finally {
      setSubmittingContact(false);
    }
  };

  // Handle Customer Edit Success
  const handleCustomerEditSuccess = (updatedCustomer) => {
    setCustomer(updatedCustomer);
    setShowEditCustomer(false);
    setNotification(`Customer '${updatedCustomer.name}' updated successfully.`);
    setTimeout(() => setNotification(''), 5000);
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

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <p style={{ fontSize: '1.1rem' }}>Loading customer details for {id}...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Unable to Load Customer</h3>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>{error || 'Customer not found.'}</p>
          <Link to="/crm3/customers" className="btn" style={{ background: '#dc2626' }}>
            ← Back to Customer Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Navigation Breadcrumb / Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/crm3/customers"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            ← Back to Customers
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{customer.id}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/crm3/segments"
            className="btn"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'none'
            }}
          >
            🎯 Segments
          </Link>
          <button
            onClick={() => setShowEditCustomer(true)}
            className="btn"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            ✏️ Edit Customer
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          ✓ {notification}
        </div>
      )}

      {tagError && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          ⚠️ {tagError}
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditCustomer && (
        <div style={{ marginBottom: '2rem' }}>
          <CustomerForm
            initialData={customer}
            onSuccess={handleCustomerEditSuccess}
            onCancel={() => setShowEditCustomer(false)}
          />
        </div>
      )}

      {/* Customer Header Profile Card */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                {customer.name}
              </h1>
              <span className={getTypeBadgeClass(customer.type)}>
                {customer.type}
              </span>
            </div>
            <p style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Customer ID: {customer.id}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>City</span>
            <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem' }}>{customer.city || '—'}</p>
          </div>
        </div>

        {/* Customer Primary Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
            <p style={{ color: '#0f172a', fontWeight: 500, marginTop: '0.25rem' }}>{customer.email || '—'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</span>
            <p style={{ color: '#0f172a', fontWeight: 500, marginTop: '0.25rem' }}>{customer.phone || '—'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GSTIN</span>
            <p style={{ color: customer.gstin ? '#0f172a' : '#94a3b8', fontFamily: 'monospace', fontWeight: 600, marginTop: '0.25rem' }}>
              {customer.gstin || 'None / Not Registered'}
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created At</span>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        {/* Tags Section (CRM3-C3: Tags as small chips with Add and Remove) */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem' }}>🏷️</span>
              <strong style={{ fontSize: '0.85rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Customer Tags
              </strong>
              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
                {tags.length}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {tags.map((t) => (
              <span
                key={t}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  border: '1px solid #bfdbfe'
                }}
              >
                <span>{t}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  title={`Remove tag "${t}"`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    padding: '0 0.15rem',
                    fontSize: '1.05rem',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.6,
                    fontWeight: 700
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                >
                  ×
                </button>
              </span>
            ))}

            {tags.length === 0 && (
              <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                No tags assigned yet.
              </span>
            )}

            {/* Inline Add Tag Form */}
            <form onSubmit={handleAddTag} style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
              <input
                type="text"
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                placeholder="+ Add tag..."
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  border: '1px dashed #cbd5e1',
                  background: '#f8fafc',
                  outline: 'none',
                  width: '120px'
                }}
              />
              {newTagInput.trim() && (
                <button
                  type="submit"
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Add
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Address Cards (Billing & Shipping) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Billing Address Card */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🏛️</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Billing Address</h3>
          </div>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: '1.6', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
            {customer.billing_address || 'No billing address recorded.'}
          </p>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
            <strong>City:</strong> {customer.city || '—'}
          </div>
        </div>

        {/* Shipping Address Card */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🚚</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Shipping Address</h3>
          </div>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: '1.6', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
            {customer.shipping_address || customer.billing_address || 'Same as billing address.'}
          </p>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
            <strong>City:</strong> {customer.city || '—'}
          </div>
        </div>
      </div>

      {/* Contacts Section */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
                Customer Contacts
              </h2>
              <span className="badge badge-blue">
                {contacts.length}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Direct representatives, procurement heads, and store personnel for {customer.name}.
            </p>
          </div>

          <button
            onClick={() => {
              setShowAddContact(prev => !prev);
              setContactServerError('');
              setContactErrors({});
            }}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            {showAddContact ? 'Cancel' : '+ Add Contact'}
          </button>
        </div>

        {/* Add Contact Inline Form Drawer */}
        {showAddContact && (
          <div style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', color: '#0f172a', fontSize: '0.95rem' }}>
              Add New Contact for {customer.name}
            </h4>

            {contactServerError && (
              <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                ⚠️ {contactServerError}
              </div>
            )}

            <form onSubmit={handleAddContactSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    placeholder="e.g. Rajesh Sharma"
                    className="form-input"
                    style={{ width: '100%', borderColor: contactErrors.name ? '#ef4444' : undefined }}
                  />
                  {contactErrors.name && (
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                      {contactErrors.name}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={contactForm.designation}
                    onChange={handleContactChange}
                    placeholder="e.g. Procurement Lead"
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={contactForm.phone}
                    onChange={handleContactChange}
                    placeholder="10-digit mobile"
                    className="form-input"
                    style={{ width: '100%', borderColor: contactErrors.phone ? '#ef4444' : undefined }}
                  />
                  {contactErrors.phone && (
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                      {contactErrors.phone}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleContactChange}
                    placeholder="e.g. rsharma@company.com"
                    className="form-input"
                    style={{ width: '100%', borderColor: contactErrors.email ? '#ef4444' : undefined }}
                  />
                  {contactErrors.email && (
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                      {contactErrors.email}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="btn"
                  style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingContact}
                  className="btn"
                  style={{ fontSize: '0.85rem' }}
                >
                  {submittingContact ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Contacts Table */}
        {contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '6px', color: '#64748b', fontSize: '0.9rem' }}>
            No contacts recorded for this customer yet. Click <strong>"+ Add Contact"</strong> to add one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Contact ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Designation</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact, idx) => (
                  <tr
                    key={contact.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b' }}>
                      {contact.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>
                      {contact.name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>
                      {contact.designation || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>
                      {contact.phone || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                          {contact.email}
                        </a>
                      ) : '—'}
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
