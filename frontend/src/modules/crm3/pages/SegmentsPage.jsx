import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api';

export default function SegmentsPage() {
  const navigate = useNavigate();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form toggle and inputs
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [city, setCity] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch all segments on mount
  useEffect(() => {
    loadSegments();
  }, []);

  async function loadSegments() {
    setLoading(true);
    setError(null);
    try {
      const res = await api('crm3', '/api/segments');
      if (res && res.data) {
        setSegments(res.data);
      } else if (Array.isArray(res)) {
        setSegments(res);
      } else {
        setSegments([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load customer segments.');
    } finally {
      setLoading(false);
    }
  }

  // Handle segment creation
  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Segment name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        customer_type: customerType || null,
        city: city.trim() || null
      };

      const res = await api('crm3', '/api/segments', {
        method: 'POST',
        body: payload
      });

      // Reset form
      setName('');
      setCustomerType('');
      setCity('');
      setShowForm(false);

      // Reload list
      await loadSegments();

      // Navigate to detail page if ID returned
      const createdId = res?.data?.id || res?.id;
      if (createdId) {
        navigate(`/crm3/segments/${createdId}`);
      }
    } catch (err) {
      setFormError(err.message || 'Error creating segment.');
    } finally {
      setSubmitting(false);
    }
  }

  // Helper for type badges
  function renderTypeBadge(type) {
    if (!type) return <span style={styles.badgeMuted}>All Types</span>;
    const badgeStyles = {
      retail: styles.badgeBlue,
      corporate: styles.badgePurple,
      dealer: styles.badgeGreen
    };
    return (
      <span style={badgeStyles[type.toLowerCase()] || styles.badgeMuted}>
        {type.toUpperCase()}
      </span>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header with action button */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Customer Segments</h1>
          <p style={styles.subtitle}>Define dynamic customer cohorts based on type and city criteria</p>
        </div>
        <button
          style={styles.primaryBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Segment'}
        </button>
      </div>

      {/* Inline Create Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>Create New Customer Segment</h3>
          {formError && <div style={styles.errorBox}>{formError}</div>}
          <form onSubmit={handleCreate} style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Segment Name *</label>
              <input
                type="text"
                placeholder="e.g. Retail in Mumbai, Corporate VIPs"
                value={name}
                onChange={e => setName(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Target Customer Type</label>
              <select
                value={customerType}
                onChange={e => setCustomerType(e.target.value)}
                style={styles.select}
              >
                <option value="">Any Type (All Customers)</option>
                <option value="retail">Retail</option>
                <option value="corporate">Corporate</option>
                <option value="dealer">Dealer</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Target City</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                style={styles.select}
              >
                <option value="">Any City</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Pune">Pune</option>
                <option value="Delhi">Delhi</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Kochi">Kochi</option>
                <option value="Ahmedabad">Ahmedabad</option>
                <option value="Chennai">Chennai</option>
              </select>
            </div>

            <div style={{ ...styles.formGroup, justifyContent: 'flex-end', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={styles.secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={styles.primaryBtn}
              >
                {submitting ? 'Saving...' : 'Save Segment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Message */}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Loading Indicator */}
      {loading ? (
        <div style={styles.loadingBox}>Loading customer segments...</div>
      ) : segments.length === 0 ? (
        /* Empty State */
        <div style={styles.emptyBox}>
          <p>No customer segments defined yet.</p>
          <button style={styles.primaryBtn} onClick={() => setShowForm(true)}>Create the first segment</button>
        </div>
      ) : (
        /* Segments Table */
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Segment ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Target Type</th>
                <th style={styles.th}>Target City</th>
                <th style={styles.th}>Created Date</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {segments.map(seg => (
                <tr key={seg.id} style={styles.tableRow}>
                  <td style={styles.tdId}>{seg.id}</td>
                  <td style={styles.tdBold}>{seg.name}</td>
                  <td style={styles.td}>{renderTypeBadge(seg.customer_type)}</td>
                  <td style={styles.td}>
                    {seg.city ? <span style={styles.cityBadge}>{seg.city}</span> : <span style={styles.textMuted}>Any</span>}
                  </td>
                  <td style={styles.tdMuted}>
                    {seg.created_at ? new Date(seg.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <button
                      onClick={() => navigate(`/crm3/segments/${seg.id}`)}
                      style={styles.viewBtn}
                    >
                      View Customers &rarr;
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

const styles = {
  container: { padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#111827' },
  subtitle: { fontSize: '14px', color: '#6b7280', margin: 0 },
  primaryBtn: { backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 16px', fontWeight: '500', cursor: 'pointer' },
  secondaryBtn: { backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', padding: '10px 16px', fontWeight: '500', cursor: 'pointer' },
  viewBtn: { backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
  formCard: { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '24px' },
  formTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '16px', marginTop: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' },
  select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#fff' },
  tableCard: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  tableHeaderRow: { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  th: { padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#374151' },
  tdId: { padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 'bold' },
  tdBold: { padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' },
  tdMuted: { padding: '14px 16px', fontSize: '13px', color: '#9ca3af' },
  textMuted: { color: '#9ca3af', fontStyle: 'italic' },
  badgeBlue: { backgroundColor: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgePurple: { backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeGreen: { backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badgeMuted: { backgroundColor: '#f3f4f6', color: '#4b5563', padding: '3px 8px', borderRadius: '12px', fontSize: '11px' },
  cityBadge: { backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' },
  errorBox: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  loadingBox: { padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '15px' },
  emptyBox: { padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', color: '#6b7280' }
};
