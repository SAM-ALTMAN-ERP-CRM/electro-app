import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newTag, setNewTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  async function loadCustomerData() {
    setLoading(true);
    setError(null);
    try {
      const [custRes, contactsRes, tagsRes] = await Promise.all([
        api('crm3', `/api/customers/${id}`),
        api('crm3', `/api/customers/${id}/contacts`).catch(() => ({ data: [] })),
        api('crm3', `/api/customers/${id}/tags`).catch(() => ({ data: [] }))
      ]);

      setCustomer(custRes.data || custRes);
      setContacts(contactsRes.data || contactsRes || []);
      setTags(tagsRes.data || tagsRes || []);
    } catch (err) {
      setError(err.message || `Customer with ID '${id}' not found`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTag(e) {
    e.preventDefault();
    if (!newTag.trim()) return;

    setAddingTag(true);
    try {
      const res = await api('crm3', `/api/customers/${id}/tags`, {
        method: 'POST',
        body: { tag: newTag.trim() }
      });

      if (res && res.tags) {
        setTags(res.tags);
      } else {
        const added = newTag.trim();
        if (!tags.includes(added)) setTags([...tags, added]);
      }
      setNewTag('');
    } catch (err) {
      alert('Error adding tag: ' + err.message);
    } finally {
      setAddingTag(false);
    }
  }

  async function handleRemoveTag(tagToRemove) {
    try {
      await api('crm3', `/api/customers/${id}/tags/${encodeURIComponent(tagToRemove)}`, {
        method: 'DELETE'
      });
      setTags(tags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase()));
    } catch (err) {
      alert('Error removing tag: ' + err.message);
    }
  }

  async function handleAddContact(e) {
    e.preventDefault();
    if (!contactName.trim()) return;

    setSavingContact(true);
    try {
      const payload = {
        name: contactName.trim(),
        phone: contactPhone.trim() || null,
        email: contactEmail.trim() || null,
        designation: contactDesignation.trim() || null
      };

      const res = await api('crm3', `/api/customers/${id}/contacts`, {
        method: 'POST',
        body: payload
      });

      const created = res.data || res;
      setContacts([...contacts, created]);
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setContactDesignation('');
      setShowContactForm(false);
    } catch (err) {
      alert('Error adding contact: ' + err.message);
    } finally {
      setSavingContact(false);
    }
  }

  function renderTypeBadge(type) {
    if (!type) return null;
    const stylesMap = {
      retail: { bg: '#dbeafe', color: '#1e40af' },
      corporate: { bg: '#f3e8ff', color: '#6b21a8' },
      dealer: { bg: '#d1fae5', color: '#065f46' }
    };
    const conf = stylesMap[type.toLowerCase()] || { bg: '#f3f4f6', color: '#4b5563' };
    return (
      <span style={{ backgroundColor: conf.bg, color: conf.color, padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
        {type.toUpperCase()}
      </span>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button onClick={() => navigate('/crm3')} style={styles.backBtn}>
          &larr; Back to Customers
        </button>
        {customer && (
          <button
            onClick={() => navigate(`/crm3/customers/${id}/timeline`)}
            style={styles.timelineBtn}
          >
            🕒 View Activity Timeline &rarr;
          </button>
        )}
      </div>

      {loading && <div style={styles.loadingBox}>Loading customer record...</div>}
      {error && <div style={styles.errorBox}>{error}</div>}

      {!loading && customer && (
        <>
          <div style={styles.card}>
            <div style={styles.headerFlex}>
              <div>
                <div style={styles.customerId}>{customer.id}</div>
                <h1 style={styles.title}>{customer.name}</h1>
                <div style={styles.badgeRow}>
                  {renderTypeBadge(customer.type)}
                  {customer.city && <span style={styles.cityBadge}>{customer.city}</span>}
                </div>
              </div>

              <div style={styles.tagsContainer}>
                <div style={styles.tagsLabel}>Tags:</div>
                <div style={styles.chipsWrapper}>
                  {tags.length === 0 ? (
                    <span style={styles.noTags}>No tags yet</span>
                  ) : (
                    tags.map(t => (
                      <span key={t} style={styles.tagChip}>
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          style={styles.removeTagBtn}
                          title="Remove tag"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddTag} style={styles.addTagForm}>
                  <input
                    type="text"
                    placeholder="+ New tag"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    style={styles.tagInput}
                  />
                  <button
                    type="submit"
                    disabled={addingTag || !newTag.trim()}
                    style={styles.addTagBtn}
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            <div style={styles.infoGrid}>
              <div>
                <span style={styles.infoLabel}>Email</span>
                <div style={styles.infoValue}>{customer.email}</div>
              </div>
              <div>
                <span style={styles.infoLabel}>Phone</span>
                <div style={styles.infoValue}>{customer.phone}</div>
              </div>
              <div>
                <span style={styles.infoLabel}>GSTIN</span>
                <div style={styles.infoValue}>{customer.gstin || '—'}</div>
              </div>
              <div>
                <span style={styles.infoLabel}>Billing Address</span>
                <div style={styles.infoValue}>{customer.billing_address || '—'}</div>
              </div>
              <div>
                <span style={styles.infoLabel}>Shipping Address</span>
                <div style={styles.infoValue}>{customer.shipping_address || '—'}</div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Customer Contacts ({contacts.length})</h3>
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                style={styles.smallPrimaryBtn}
              >
                {showContactForm ? 'Cancel' : '+ Add Contact'}
              </button>
            </div>

            {showContactForm && (
              <form onSubmit={handleAddContact} style={styles.contactForm}>
                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.formLabel}>Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Phone</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Procurement Lead"
                      value={contactDesignation}
                      onChange={e => setContactDesignation(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingContact}
                  style={{ ...styles.smallPrimaryBtn, marginTop: '12px' }}
                >
                  {savingContact ? 'Saving...' : 'Save Contact'}
                </button>
              </form>
            )}

            {contacts.length === 0 ? (
              <div style={styles.emptyContacts}>No contacts added for this customer yet.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Designation</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id || c.name} style={styles.tr}>
                      <td style={styles.tdBold}>{c.name}</td>
                      <td style={styles.td}>{c.designation || '—'}</td>
                      <td style={styles.td}>{c.phone || '—'}</td>
                      <td style={styles.td}>{c.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  backBtn: { backgroundColor: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: 0 },
  timelineBtn: { backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  card: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', marginBottom: '24px' },
  headerFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f3f4f6', paddingBottom: '20px', marginBottom: '20px' },
  customerId: { fontSize: '13px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 'bold' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '4px 0 10px 0' },
  badgeRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  cityBadge: { backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' },
  tagsContainer: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  tagsLabel: { fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' },
  chipsWrapper: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end', maxWidth: '400px' },
  noTags: { fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' },
  tagChip: { display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '16px', fontSize: '12px', fontWeight: '500' },
  removeTagBtn: { backgroundColor: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0, fontWeight: 'bold' },
  addTagForm: { display: 'flex', gap: '6px', marginTop: '4px' },
  tagInput: { padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px', width: '110px' },
  addTagBtn: { backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  infoLabel: { fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px' },
  infoValue: { fontSize: '14px', color: '#111827', fontWeight: '500' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  sectionTitle: { margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' },
  smallPrimaryBtn: { backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
  contactForm: { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '16px', marginBottom: '16px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  formLabel: { fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' },
  input: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', width: '100%', boxSizing: 'border-box' },
  emptyContacts: { padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  th: { padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '12px', fontSize: '13px', color: '#374151' },
  tdBold: { padding: '12px', fontSize: '13px', fontWeight: '600', color: '#111827' },
  errorBox: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  loadingBox: { padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '15px' }
};
