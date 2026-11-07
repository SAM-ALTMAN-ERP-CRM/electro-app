import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

export default function SegmentsPage() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    customer_type: '',
    city: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('crm3', '/api/segments');
      setSegments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load segments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const handleDownloadCsv = async (segId) => {
    setDownloadingId(segId);
    setError('');
    try {
      const csvText = await api('crm3', `/api/segments/${segId}/export.csv`);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.setAttribute('download', `segment-${segId}-export.csv`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(blobUrl);

      setNotification(`✓ Segment ${segId} exported! File is ready for Excel.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to download CSV');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreateSegment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Segment name is required' });
      return;
    }

    setSubmitting(true);
    setFormErrors({});
    try {
      const payload = {
        name: formData.name.trim(),
        customer_type: formData.customer_type || null,
        city: formData.city.trim() || null
      };

      const newSeg = await api('crm3', '/api/segments', {
        method: 'POST',
        body: payload
      });

      setSegments(prev => [...prev, newSeg]);
      setFormData({ name: '', customer_type: '', city: '' });
      setShowCreateForm(false);
      setNotification(`Segment "${newSeg.name}" created successfully.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      setFormErrors({ general: err.message || 'Failed to create segment' });
    } finally {
      setSubmitting(false);
    }
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
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🎯</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              Customer Segments
            </h1>
            <span className="badge badge-blue">CRM3</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Filter and export targeted groups of customers by business type, location, and criteria.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            to="/crm3/customers"
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
            👥 Customers Directory
          </Link>

          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {showCreateForm ? 'Cancel' : '+ New Segment'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {notification}
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Create Segment Drawer */}
      {showCreateForm && (
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>
            Define New Customer Segment
          </h3>

          {formErrors.general && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              ⚠️ {formErrors.general}
            </div>
          )}

          <form onSubmit={handleCreateSegment}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Segment Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Retail in Bengaluru"
                  className="form-input"
                  style={{ width: '100%', borderColor: formErrors.name ? '#ef4444' : undefined }}
                />
                {formErrors.name && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                    {formErrors.name}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Customer Type Filter
                </label>
                <select
                  value={formData.customer_type}
                  onChange={e => setFormData(p => ({ ...p, customer_type: e.target.value }))}
                  className="form-select"
                  style={{ width: '100%' }}
                >
                  <option value="">Any Type (All Customers)</option>
                  <option value="retail">Retail</option>
                  <option value="corporate">Corporate</option>
                  <option value="dealer">Dealer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  City Filter
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Mumbai, Delhi, Bengaluru (or leave empty)"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn"
                style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn"
                style={{ fontSize: '0.85rem' }}
              >
                {submitting ? 'Creating...' : 'Create Segment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Segments Table */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading customer segments...
          </div>
        ) : segments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No customer segments configured yet.</p>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Click <strong>"+ New Segment"</strong> to define your first segment.
            </span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Segment ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Segment Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Target Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Target City</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((seg, idx) => (
                  <tr
                    key={seg.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b' }}>
                      {seg.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      <Link to={`/crm3/segments/${seg.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {seg.name}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {seg.customer_type ? (
                        <span className={getTypeBadgeClass(seg.customer_type)}>
                          {seg.customer_type}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Any Type</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>
                      {seg.city ? `📍 ${seg.city}` : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Any City</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Link
                          to={`/crm3/segments/${seg.id}`}
                          className="btn btn-sm"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.6rem',
                            background: '#f1f5f9',
                            color: '#334155',
                            textDecoration: 'none',
                            border: '1px solid #cbd5e1'
                          }}
                        >
                          View
                        </Link>

                        {/* CRM3-C3: Direct Download CSV button on segment row */}
                        <button
                          type="button"
                          onClick={() => handleDownloadCsv(seg.id)}
                          disabled={downloadingId === seg.id}
                          className="btn btn-sm"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.6rem',
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          📥 {downloadingId === seg.id ? 'Exporting...' : 'CSV'}
                        </button>
                      </div>
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
