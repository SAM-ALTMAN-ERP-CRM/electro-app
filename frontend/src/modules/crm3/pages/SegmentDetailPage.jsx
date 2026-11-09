import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';

export default function SegmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [segment, setSegment] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadSegmentCustomers();
  }, [id]);

  async function loadSegmentCustomers() {
    setLoading(true);
    setError(null);
    try {
      const res = await api('crm3', `/api/segments/${id}/customers`);

      if (res) {
        setSegment(res.segment || null);
        const list = res.data || res.customers || [];
        setCustomers(list);
        setCount(res.count !== undefined ? res.count : list.length);
      }
    } catch (err) {
      setError(err.message || `Failed to fetch matching customers for segment ${id}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadCsv() {
    setDownloading(true);
    try {
      const csvText = await api('crm3', `/api/segments/${id}/export.csv`);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `segment-${id}-export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download CSV: ' + err.message);
    } finally {
      setDownloading(false);
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
        <button onClick={() => navigate('/crm3/segments')} style={styles.backBtn}>
          &larr; Back to Segments
        </button>
        <button
          onClick={handleDownloadCsv}
          disabled={downloading || loading || customers.length === 0}
          style={styles.csvBtn}
        >
          {downloading ? 'Exporting...' : '📥 Download CSV (Excel)'}
        </button>
      </div>

      {loading && <div style={styles.loadingBox}>Evaluating segment rules and loading matching customers...</div>}
      {error && <div style={styles.errorBox}>{error}</div>}

      {!loading && segment && (
        <>
          <div style={styles.detailHeader}>
            <div>
              <div style={styles.subId}>{segment.id}</div>
              <h1 style={styles.title}>{segment.name}</h1>
              <div style={styles.criteriaRow}>
                <span style={styles.criteriaLabel}>Filter Criteria:</span>
                <span style={styles.criteriaTag}>
                  Type: <strong>{segment.customer_type ? segment.customer_type.toUpperCase() : 'ANY'}</strong>
                </span>
                <span style={styles.criteriaTag}>
                  City: <strong>{segment.city || 'ANY'}</strong>
                </span>
              </div>
            </div>

            <div style={styles.countCard}>
              <div style={styles.countNumber}>{count}</div>
              <div style={styles.countLabel}>Matching Customer{count === 1 ? '' : 's'}</div>
            </div>
          </div>

          <div style={styles.tableCard}>
            <div style={styles.tableCardHeader}>
              <div>
                <h3 style={styles.tableTitle}>Cohort Customer Directory</h3>
                <span style={styles.liveIndicator}>• Live dynamic query</span>
              </div>
              <button
                onClick={handleDownloadCsv}
                disabled={downloading || customers.length === 0}
                style={styles.tableCsvBtn}
              >
                Download CSV
              </button>
            </div>

            {customers.length === 0 ? (
              <div style={styles.emptyBox}>
                No customers currently match this segment's criteria.
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Customer ID</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>City</th>
                    <th style={styles.th}>GSTIN</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(cust => (
                    <tr key={cust.id} style={styles.tableRow}>
                      <td style={styles.tdId}>{cust.id}</td>
                      <td style={styles.tdBold}>{cust.name}</td>
                      <td style={styles.td}>{renderTypeBadge(cust.type)}</td>
                      <td style={styles.td}>{cust.email}</td>
                      <td style={styles.td}>{cust.phone}</td>
                      <td style={styles.td}>{cust.city || '—'}</td>
                      <td style={styles.tdGstin}>{cust.gstin || '—'}</td>
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
  csvBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  tableCsvBtn: { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '24px' },
  subId: { fontSize: '13px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 'bold', marginBottom: '4px' },
  title: { fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 10px 0' },
  criteriaRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  criteriaLabel: { fontSize: '13px', color: '#6b7280' },
  criteriaTag: { backgroundColor: '#f3f4f6', color: '#374151', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' },
  countCard: { backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 24px', textAlign: 'center', minWidth: '130px' },
  countNumber: { fontSize: '28px', fontWeight: 'bold', color: '#1d4ed8' },
  countLabel: { fontSize: '12px', color: '#3b82f6', fontWeight: '500' },
  tableCard: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' },
  tableCardHeader: { padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tableTitle: { margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' },
  liveIndicator: { fontSize: '12px', color: '#059669', fontWeight: '500' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  tableHeaderRow: { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  th: { padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#374151' },
  tdId: { padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 'bold' },
  tdBold: { padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' },
  tdGstin: { padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#4b5563' },
  emptyBox: { padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: '14px' },
  errorBox: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  loadingBox: { padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '15px' }
};
