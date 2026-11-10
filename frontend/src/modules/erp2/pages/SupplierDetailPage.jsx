import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  // Rating form state (ERP2-A3)
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [deliveryScore, setDeliveryScore] = useState(5);
  const [qualityScore, setQualityScore] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    async function loadSupplier() {
      setLoading(true);
      setError('');
      try {
        const data = await api('erp2', `/api/suppliers/${id}`);
        setSupplier(data);
      } catch (err) {
        setError(err.message || `Failed to load details for supplier ${id}`);
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadSupplier();
    }
  }, [id]);

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    setSubmittingRating(true);
    try {
      await api('erp2', `/api/suppliers/${id}/ratings`, {
        method: 'POST',
        body: {
          delivery_score: Number(deliveryScore),
          quality_score: Number(qualityScore),
          comment
        }
      });
      setNotification('Supplier evaluation recorded and average score updated.');
      setShowRatingForm(false);
      // Reload updated supplier
      const updated = await api('erp2', `/api/suppliers/${id}`);
      setSupplier(updated);
      setTimeout(() => setNotification(''), 5000);
    } catch (err) {
      setError(err.message || 'Error submitting supplier rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading supplier profile for {id}...
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem' }}>
          ⚠ {error || `Supplier ${id} not found.`}
        </div>
        <Link to="/erp2/suppliers" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Suppliers List
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/erp2/suppliers" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
          ← Back to Suppliers Directory
        </Link>
      </div>

      {notification && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '1rem', fontWeight: 500 }}>
          ✓ {notification}
        </div>
      )}

      {/* Profile Header Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>{supplier.name}</h2>
              <span className="badge badge-blue">{supplier.id}</span>
              {supplier.active !== false ? (
                <span className="badge badge-green">Active Vendor</span>
              ) : (
                <span className="badge badge-red">Inactive</span>
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Location: <strong>{supplier.city || 'Not Specified'}</strong> | Payment Terms: <strong>{supplier.payment_terms || 'net30'}</strong>
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>
              ★ {Number(supplier.rating || 0).toFixed(1)} / 5.0
            </div>
            <button
              onClick={() => setShowRatingForm(!showRatingForm)}
              style={{
                marginTop: '0.5rem',
                padding: '0.4rem 0.8rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              {showRatingForm ? 'Cancel Rating' : '★ Rate Supplier'}
            </button>
          </div>
        </div>

        {/* Supplier Attribute Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              Primary Contact
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#1e293b' }}>
              {supplier.contact_person || '—'}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              Phone Number
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#1e293b' }}>
              {supplier.phone || '—'}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              Email Address
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#1e293b' }}>
              {supplier.email || '—'}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              GSTIN
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#1e293b', fontFamily: 'monospace' }}>
              {supplier.gstin || 'Unregistered'}
            </span>
          </div>
        </div>
      </div>

      {/* Rate Supplier Form Card (ERP2-A3 Integration) */}
      {showRatingForm && (
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #fde68a',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ marginBottom: '1rem', color: '#92400e', fontSize: '1.1rem' }}>
            Submit Vendor Performance Rating
          </h4>
          <form onSubmit={handleRatingSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Delivery Reliability Score (1 to 5)
                </label>
                <select
                  value={deliveryScore}
                  onChange={(e) => setDeliveryScore(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="5">5 - Excellent (Always on time)</option>
                  <option value="4">4 - Good (Minor delays)</option>
                  <option value="3">3 - Satisfactory</option>
                  <option value="2">2 - Needs Improvement</option>
                  <option value="1">1 - Unsatisfactory</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Component Quality Score (1 to 5)
                </label>
                <select
                  value={qualityScore}
                  onChange={(e) => setQualityScore(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="5">5 - Excellent (Zero defects)</option>
                  <option value="4">4 - Good (&lt;1% defect rate)</option>
                  <option value="3">3 - Acceptable</option>
                  <option value="2">2 - Frequent rejection</option>
                  <option value="1">1 - Rejected batch</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                Evaluation Notes / Comments
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Notes on recent shipments, packaging quality, or lead times..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowRatingForm(false)}
                style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRating}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: submittingRating ? 'not-allowed' : 'pointer'
                }}
              >
                {submittingRating ? 'Recording...' : 'Submit Rating'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
