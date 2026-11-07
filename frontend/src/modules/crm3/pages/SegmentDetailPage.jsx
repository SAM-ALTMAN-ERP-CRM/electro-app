import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';

export default function SegmentDetailPage() {
  const { id } = useParams();

  const [segment, setSegment] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchSegmentData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');

    try {
      // 1. Fetch segment info
      const segData = await api('crm3', `/api/segments/${id}`);
      setSegment(segData);

      // 2. Fetch matching customers for this segment
      try {
        const matchingData = await api('crm3', `/api/segments/${id}/customers`);
        const list = Array.isArray(matchingData)
          ? matchingData
          : (matchingData && matchingData.data ? matchingData.data : []);
        setCustomers(list);
      } catch (cErr) {
        console.warn('Could not load segment customers:', cErr.message);
        setCustomers([]);
      }
    } catch (err) {
      setError(err.message || `Segment with ID '${id}' could not be loaded.`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSegmentData();
  }, [fetchSegmentData]);

  // Handle Download CSV (CRM3-C3 requirement)
  const handleDownloadCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const csvText = await api('crm3', `/api/segments/${id}/export.csv`);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.setAttribute('download', `segment-${id}-export.csv`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(blobUrl);

      setNotification(`✓ CSV exported successfully! File "segment-${id}-export.csv" is ready for Excel.`);
      setTimeout(() => setNotification(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to download segment CSV export');
    } finally {
      setExporting(false);
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

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <p style={{ fontSize: '1.1rem' }}>Loading segment details for {id}...</p>
      </div>
    );
  }

  if (error && !segment) {
    return (
      <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Unable to Load Segment</h3>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>{error || 'Segment not found.'}</p>
          <Link to="/crm3/segments" className="btn" style={{ background: '#dc2626' }}>
            ← Back to Customer Segments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Navigation Breadcrumb / Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/crm3/segments"
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
            ← Back to Segments
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{segment?.id || id}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
            👥 All Customers
          </Link>

          {/* CRM3-C3: Prominent "Download CSV" Button */}
          <button
            onClick={handleDownloadCsv}
            disabled={exporting}
            className="btn"
            style={{
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.7 : 1
            }}
          >
            📥 {exporting ? 'Preparing CSV...' : 'Download CSV'}
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

      {/* Segment Header Card */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🎯</span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                {segment?.name}
              </h1>
            </div>
            <p style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Segment ID: {segment?.id}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matched Customers</span>
            <p style={{ fontWeight: 700, color: '#059669', fontSize: '1.4rem' }}>{customers.length}</p>
          </div>
        </div>

        {/* Filter Criteria Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Type Filter</span>
            <p style={{ marginTop: '0.3rem' }}>
              {segment?.customer_type ? (
                <span className={getTypeBadgeClass(segment.customer_type)}>
                  {segment.customer_type}
                </span>
              ) : (
                <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>Any / All Customer Types</span>
              )}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target City Filter</span>
            <p style={{ color: '#0f172a', fontWeight: 500, marginTop: '0.3rem', fontSize: '0.95rem' }}>
              {segment?.city ? `📍 ${segment.city}` : <span style={{ color: '#64748b', fontStyle: 'italic' }}>Any / All Cities</span>}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Export Columns</span>
            <p style={{ color: '#475569', fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '0.3rem' }}>
              name, email, phone, city
            </p>
          </div>
        </div>
      </div>

      {/* Matching Customers Table Card */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a' }}>
              Matching Customers ({customers.length})
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Customers meeting the filter criteria for "{segment?.name}".
            </p>
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={exporting || customers.length === 0}
            className="btn btn-sm"
            style={{
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.85rem'
            }}
          >
            📥 Download CSV
          </button>
        </div>

        {customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: '6px', color: '#64748b' }}>
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No customers match this segment's criteria.</p>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Try adjusting the customer type or city criteria.
            </span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>City</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => (
                  <tr
                    key={c.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b' }}>
                      {c.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      <Link to={`/crm3/customers/${c.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={getTypeBadgeClass(c.type)}>
                        {c.type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>
                      {c.email}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>
                      {c.phone}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.875rem' }}>
                      {c.city || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Link
                        to={`/crm3/customers/${c.id}`}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          background: '#f1f5f9',
                          color: '#334155',
                          textDecoration: 'none',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        View Profile
                      </Link>
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
