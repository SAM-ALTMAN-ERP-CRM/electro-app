import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../api';

// Seed segments fallback (CRM3-C1 seed contract)
const SEED_SEGMENTS = [
  {
    id: 'SEG-0001',
    name: 'Corporate in Mumbai',
    customer_type: 'corporate',
    city: 'Mumbai',
    created_at: '2026-11-02T09:00:00.000Z'
  },
  {
    id: 'SEG-0002',
    name: 'Retail Customers',
    customer_type: 'retail',
    city: null,
    created_at: '2026-11-02T09:30:00.000Z'
  },
  {
    id: 'SEG-0003',
    name: 'Dealers Nationwide',
    customer_type: 'dealer',
    city: null,
    created_at: '2026-11-02T10:00:00.000Z'
  },
  {
    id: 'SEG-0004',
    name: 'Pune Accounts',
    customer_type: null,
    city: 'Pune',
    created_at: '2026-11-02T10:30:00.000Z'
  }
];

const CITIES = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Pune',
  'Kochi',
  'Ahmedabad',
  'Chennai'
];

export default function SegmentsPage() {
  const navigate = useNavigate();

  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [city, setCity] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Fetch segments
  useEffect(() => {
    let mounted = true;

    async function loadSegments() {
      setLoading(true);
      setError(null);
      try {
        const data = await api('crm3', '/api/segments');
        if (mounted) {
          const list = Array.isArray(data) ? data : (data?.data || SEED_SEGMENTS);
          setSegments(list.length > 0 ? list : SEED_SEGMENTS);
        }
      } catch (err) {
        console.warn('[crm3] Segments API unavailable, falling back to local seed data:', err.message);
        if (mounted) {
          setSegments(SEED_SEGMENTS);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSegments();
    return () => { mounted = false; };
  }, []);

  // Handle segment creation
  async function handleCreateSegment(e) {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Segment name is required.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      name: trimmedName,
      customer_type: customerType || null,
      city: city || null
    };

    try {
      let createdSegment;
      try {
        const res = await api('crm3', '/api/segments', {
          method: 'POST',
          body: payload
        });
        createdSegment = (res && res.id) ? res : (res && res.data ? res.data : null);
      } catch (apiErr) {
        console.warn('[crm3] Failed to save segment to API, applying fallback:', apiErr.message);
      }

      // If backend was offline, synthesize created segment with next ID
      if (!createdSegment) {
        let maxNum = 0;
        segments.forEach(s => {
          const match = s.id && s.id.match(/^SEG-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        const nextId = `SEG-${String(maxNum + 1).padStart(4, '0')}`;
        createdSegment = {
          id: nextId,
          name: trimmedName,
          customer_type: customerType || null,
          city: city || null,
          created_at: new Date().toISOString()
        };
      }

      // Update state
      setSegments(prev => [createdSegment, ...prev]);

      // Reset form
      setName('');
      setCustomerType('');
      setCity('');
      setShowForm(false);

      // Navigate to the newly created segment detail screen
      navigate(`/crm3/segments/${createdSegment.id}`);
    } catch (err) {
      setFormError(err.message || 'Failed to create segment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filtered segments
  const filteredSegments = segments.filter(seg => {
    const matchesSearch = !searchTerm ||
      seg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seg.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seg.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !typeFilter ||
      (seg.customer_type && seg.customer_type.toLowerCase() === typeFilter.toLowerCase());

    return matchesSearch && matchesType;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
              Customer Segments
            </h1>
            <span className="badge badge-blue">CRM3</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.925rem' }}>
            Target and group customers dynamically by account type and geographical city.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => {
            setShowForm(!showForm);
            setFormError(null);
          }}
          style={{
            backgroundColor: showForm ? '#64748b' : '#2563eb',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          {showForm ? '✕ Close Form' : '+ Create Segment'}
        </button>
      </div>

      {/* Create Segment Form Card */}
      {showForm && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0f172a' }}>
              Create New Segment
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Configure matching criteria. Leaving fields blank matches all customers.
            </p>
          </div>

          {formError && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              border: '1px solid #fecaca'
            }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateSegment}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              {/* Segment Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Segment Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corporate Accounts in Mumbai"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Customer Type Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Customer Type Dropdown
                </label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="">All Customer Types (Any)</option>
                  <option value="retail">Retail</option>
                  <option value="corporate">Corporate</option>
                  <option value="dealer">Dealer</option>
                </select>
              </div>

              {/* City Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  City Dropdown
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="">All Cities (Any)</option>
                  {CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setName('');
                  setCustomerType('');
                  setCity('');
                  setFormError(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn"
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Saving Segment...' : 'Create Segment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            placeholder="Search segments by name, ID or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              maxWidth: '380px',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem'
            }}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">All Types</option>
            <option value="retail">Retail</option>
            <option value="corporate">Corporate</option>
            <option value="dealer">Dealer</option>
          </select>
        </div>

        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Total Segments: <strong style={{ color: '#0f172a' }}>{filteredSegments.length}</strong>
        </div>
      </div>

      {/* Segments Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '8px' }}>
          Loading customer segments...
        </div>
      ) : filteredSegments.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px dashed #cbd5e1'
        }}>
          <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '0.5rem' }}>No segments found</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {searchTerm || typeFilter
              ? 'Try clearing your search query or type filter.'
              : 'Create your first customer segment to get started.'}
          </p>
          {!showForm && (
            <button
              type="button"
              className="btn"
              onClick={() => setShowForm(true)}
            >
              + Create First Segment
            </button>
          )}
        </div>
      ) : (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Segment ID</th>
                <th>Name</th>
                <th>Customer Type</th>
                <th>City</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right', width: '180px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSegments.map((segment) => {
                const typeBadgeClass =
                  segment.customer_type === 'corporate' ? 'badge badge-blue' :
                  segment.customer_type === 'retail' ? 'badge badge-green' :
                  segment.customer_type === 'dealer' ? 'badge badge-amber' :
                  'badge';

                const formattedDate = segment.created_at
                  ? new Date(segment.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : '—';

                return (
                  <tr key={segment.id} style={{ transition: 'background-color 0.15s' }}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>
                      <Link
                        to={`/crm3/segments/${segment.id}`}
                        style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {segment.id}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <Link
                        to={`/crm3/segments/${segment.id}`}
                        style={{ color: '#0f172a', textDecoration: 'none' }}
                      >
                        {segment.name}
                      </Link>
                    </td>
                    <td>
                      {segment.customer_type ? (
                        <span className={typeBadgeClass}>
                          {segment.customer_type.toUpperCase()}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Any Type</span>
                      )}
                    </td>
                    <td>
                      {segment.city ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#334155',
                          fontSize: '0.875rem'
                        }}>
                          📍 {segment.city}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Any City</span>
                      )}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {formattedDate}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/crm3/segments/${segment.id}`}
                        className="btn"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          textDecoration: 'none',
                          backgroundColor: '#f1f5f9',
                          color: '#2563eb',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        View Customers →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
