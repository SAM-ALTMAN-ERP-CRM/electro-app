import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';

// Seed customers fallback (Section 5 shared contract)
const SEED_CUSTOMERS = [
  {
    id: 'CUST-0001',
    name: 'Aarav Mehta',
    type: 'retail',
    email: 'aarav.mehta@example.com',
    phone: '9820011111',
    gstin: null,
    billing_address: '12 Linking Road, Bandra West',
    shipping_address: '12 Linking Road, Bandra West',
    city: 'Mumbai',
    created_at: '2026-11-01T10:00:00.000Z'
  },
  {
    id: 'CUST-0002',
    name: 'Sunrise Electronics Pvt Ltd',
    type: 'corporate',
    email: 'contact@sunrise.com',
    phone: '9820022222',
    gstin: '27AABCS1234F1Z5',
    billing_address: '88 Nariman Point, Express Towers',
    shipping_address: 'Plot 42 MIDC Andheri East',
    city: 'Mumbai',
    created_at: '2026-11-01T10:05:00.000Z'
  },
  {
    id: 'CUST-0003',
    name: 'Priya Nair',
    type: 'retail',
    email: 'priya.nair@example.com',
    phone: '9847012345',
    gstin: null,
    billing_address: '5 Marine Drive',
    shipping_address: '5 Marine Drive',
    city: 'Kochi',
    created_at: '2026-11-01T10:10:00.000Z'
  },
  {
    id: 'CUST-0004',
    name: 'BrightHome Retail LLP',
    type: 'dealer',
    email: 'sales@brighthome.com',
    phone: '9822098765',
    gstin: '27AABCB9876E1Z2',
    billing_address: '45 FC Road, Shivajinagar',
    shipping_address: 'Warehouse 3, Hadapsar Industrial Estate',
    city: 'Pune',
    created_at: '2026-11-01T10:15:00.000Z'
  },
  {
    id: 'CUST-0005',
    name: 'Kiran Patel',
    type: 'retail',
    email: 'kiran.patel@example.com',
    phone: '9825012345',
    gstin: null,
    billing_address: '23 Ashram Road',
    shipping_address: '23 Ashram Road',
    city: 'Ahmedabad',
    created_at: '2026-11-01T10:20:00.000Z'
  },
  {
    id: 'CUST-0006',
    name: 'Metro Offices Ltd',
    type: 'corporate',
    email: 'admin@metrooffices.com',
    phone: '9811054321',
    gstin: '07AABCM5432D1Z9',
    billing_address: '10 Barakhamba Road, Connaught Place',
    shipping_address: 'Building 5 DLF Phase 2',
    city: 'Delhi',
    created_at: '2026-11-01T10:25:00.000Z'
  },
  {
    id: 'CUST-0007',
    name: 'Sneha Iyer',
    type: 'retail',
    email: 'sneha.iyer@example.com',
    phone: '9840012345',
    gstin: null,
    billing_address: '77 Anna Salai',
    shipping_address: '77 Anna Salai',
    city: 'Chennai',
    created_at: '2026-11-01T10:30:00.000Z'
  },
  {
    id: 'CUST-0008',
    name: 'Gadget Hub',
    type: 'dealer',
    email: 'info@gadgethub.com',
    phone: '9845012345',
    gstin: '29AABCG1234H1Z1',
    billing_address: '150 Brigade Road',
    shipping_address: 'Electronics City Phase 1',
    city: 'Bengaluru',
    created_at: '2026-11-01T10:35:00.000Z'
  },
  {
    id: 'CUST-0009',
    name: 'Aarav Mehta (Duplicate)',
    type: 'retail',
    email: 'aarav.duplicate@example.com',
    phone: '9820011111',
    gstin: null,
    billing_address: '12 Linking Road, Bandra West',
    shipping_address: '12 Linking Road, Bandra West',
    city: 'Mumbai',
    created_at: '2026-11-01T10:40:00.000Z'
  },
  {
    id: 'CUST-0010',
    name: 'Sunrise Electronics (Branch)',
    type: 'corporate',
    email: 'contact@sunrise.com',
    phone: '9820033333',
    gstin: '27AABCS1234F1Z5',
    billing_address: '18 Senapati Bapat Road',
    shipping_address: 'Hinjewadi Tech Park Phase 2',
    city: 'Pune',
    created_at: '2026-11-01T10:45:00.000Z'
  }
];

// Fallback segments map
const SEED_SEGMENTS_MAP = {
  'SEG-0001': { id: 'SEG-0001', name: 'Corporate in Mumbai', customer_type: 'corporate', city: 'Mumbai' },
  'SEG-0002': { id: 'SEG-0002', name: 'Retail Customers', customer_type: 'retail', city: null },
  'SEG-0003': { id: 'SEG-0003', name: 'Dealers Nationwide', customer_type: 'dealer', city: null },
  'SEG-0004': { id: 'SEG-0004', name: 'Pune Accounts', customer_type: null, city: 'Pune' }
};

export default function SegmentDetailPage() {
  const { id } = useParams();

  const [segment, setSegment] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSegmentData() {
      setLoading(true);
      setError(null);

      try {
        const data = await api('crm3', `/api/segments/${id}/customers`);
        if (mounted) {
          const seg = data.segment || { id };
          const custList = Array.isArray(data.customers) ? data.customers : (Array.isArray(data) ? data : []);
          const matchCount = typeof data.count === 'number' ? data.count : custList.length;

          setSegment(seg);
          setCustomers(custList);
          setCount(matchCount);
        }
      } catch (err) {
        console.warn(`[crm3] Could not fetch segment customers for ${id} via API, evaluating fallback:`, err.message);

        if (mounted) {
          // Attempt fallback lookup
          const fallbackSeg = SEED_SEGMENTS_MAP[id] || {
            id,
            name: `Segment ${id}`,
            customer_type: null,
            city: null
          };

          // Filter seed customers according to criteria
          const matching = SEED_CUSTOMERS.filter(c => {
            if (fallbackSeg.customer_type && fallbackSeg.customer_type.trim() !== '') {
              if (!c.type || c.type.toLowerCase() !== fallbackSeg.customer_type.toLowerCase()) {
                return false;
              }
            }
            if (fallbackSeg.city && fallbackSeg.city.trim() !== '') {
              if (!c.city || c.city.toLowerCase() !== fallbackSeg.city.toLowerCase()) {
                return false;
              }
            }
            return true;
          });

          setSegment(fallbackSeg);
          setCustomers(matching);
          setCount(matching.length);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (id) {
      loadSegmentData();
    }

    return () => { mounted = false; };
  }, [id]);

  // Client-side search within matching customers
  const displayedCustomers = customers.filter(c => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      c.id?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  const typeBadgeClass =
    segment?.customer_type === 'corporate' ? 'badge badge-blue' :
    segment?.customer_type === 'retail' ? 'badge badge-green' :
    segment?.customer_type === 'dealer' ? 'badge badge-amber' :
    'badge';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Back button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/crm3/segments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#2563eb',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          ← Back to Segments
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '8px' }}>
          Loading segment criteria and matching customers...
        </div>
      ) : error ? (
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          border: '1px solid #fecaca'
        }}>
          <strong>Error loading segment:</strong> {error}
        </div>
      ) : (
        <>
          {/* Header & Criteria Banner */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            marginBottom: '1.75rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
                    {segment?.name || 'Segment Details'}
                  </h1>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    {segment?.id}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Target criteria:
                  {' '}
                  <strong>Type:</strong>{' '}
                  {segment?.customer_type ? (
                    <span className={typeBadgeClass} style={{ marginRight: '0.75rem' }}>
                      {segment.customer_type.toUpperCase()}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', marginRight: '0.75rem' }}>All Types</span>
                  )}
                  <strong>City:</strong>{' '}
                  {segment?.city ? (
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>📍 {segment.city}</span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>All Cities</span>
                  )}
                </p>
              </div>

              {/* Prominent Count Display */}
              <div style={{
                textAlign: 'right',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '0.75rem 1.25rem'
              }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.1 }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Matching Customers
                </div>
              </div>
            </div>
          </div>

          {/* Table Header and Search */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a' }}>
                Matching Customers Table
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing customers satisfying this segment's demographic and geographic rules.
              </p>
            </div>

            <div style={{ minWidth: '260px' }}>
              <input
                type="text"
                placeholder="Search matching customers..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* Matching Customers Table */}
          {displayedCustomers.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1'
            }}>
              <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '0.5rem' }}>
                No matching customers found
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                {filterQuery
                  ? 'No customers match your search query.'
                  : "No customers in the database currently match this segment's criteria."}
              </p>
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
                    <th style={{ width: '130px' }}>Customer ID</th>
                    <th>Customer Name</th>
                    <th>Type</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>GSTIN</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCustomers.map((cust) => {
                    const rowBadgeClass =
                      cust.type === 'corporate' ? 'badge badge-blue' :
                      cust.type === 'retail' ? 'badge badge-green' :
                      cust.type === 'dealer' ? 'badge badge-amber' :
                      'badge';

                    return (
                      <tr key={cust.id} style={{ transition: 'background-color 0.15s' }}>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>
                          {cust.id}
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          {cust.name}
                        </td>
                        <td>
                          <span className={rowBadgeClass}>
                            {cust.type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.875rem' }}>
                          {cust.email || '—'}
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.875rem' }}>
                          {cust.phone || '—'}
                        </td>
                        <td style={{ color: '#334155', fontSize: '0.875rem' }}>
                          📍 {cust.city || '—'}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.825rem', fontFamily: 'monospace' }}>
                          {cust.gstin || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                color: '#64748b'
              }}>
                <span>Total Matches: <strong>{count}</strong></span>
                {filterQuery && (
                  <span>Filtered: <strong>{displayedCustomers.length}</strong> of {count}</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
