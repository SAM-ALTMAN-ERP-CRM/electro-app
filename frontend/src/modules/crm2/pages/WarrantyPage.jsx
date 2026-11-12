// [CRM2-B2] Warranty check screen
// Allows lookup of warranty status by serial number, shows result card with badge,
// and lists all registered warranties below.
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Status badge helper: green for "In warranty", red for "Expired"
export function WarrantyBadge({ status }) {
  const isMatch = String(status || '').toLowerCase() === 'active';
  const className = isMatch ? 'badge badge-green' : 'badge badge-red';
  const label = isMatch ? 'In warranty' : 'Expired';
  return <span className={className}>{label}</span>;
}

// Format YYYY-MM-DD date into Indian local date presentation
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = String(dateStr).split('T')[0].split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

const styles = {
  container: { maxWidth: '1100px', margin: '0 auto', paddingBottom: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  titleGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' },
  searchRow: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' },
  input: { flex: '1', minWidth: '260px', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem' },
  resultCard: { background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem', marginTop: '1rem' },
  resultGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.75rem' },
  fieldLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  fieldVal: { fontSize: '1rem', fontWeight: 500, color: '#0f172a', marginTop: '0.2rem' },
  errorBanner: { background: '#fee2e2', color: '#991b1b', padding: '0.85rem 1rem', borderRadius: '6px', marginTop: '1rem' },
  emptyState: { padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' },
  th: { padding: '0.75rem 1rem', background: '#f1f5f9', color: '#475569', fontWeight: 600, borderBottom: '1px solid #cbd5e1' },
  td: { padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', color: '#1e293b' }
};

export default function WarrantyPage() {
  // Search state
  const [serialQuery, setSerialQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchedSerial, setSearchedSerial] = useState('');

  // Warranties list state
  const [warranties, setWarranties] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  // Load all warranties
  const loadWarranties = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const data = await api('crm2', '/api/warranties');
      setWarranties(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(`Could not load warranties: ${err.message}`);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadWarranties();
  }, [loadWarranties]);

  // Handle single serial lookup
  async function handleSearch(e, customSerial) {
    if (e && e.preventDefault) e.preventDefault();
    const query = (customSerial !== undefined ? customSerial : serialQuery).trim();
    if (!query) return;

    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    setSearchedSerial(query);

    try {
      const result = await api('crm2', `/api/warranty/${encodeURIComponent(query)}`);
      setSearchResult(result);
    } catch (err) {
      // 404 error from lookup
      if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
        setSearchError('Serial not found');
      } else {
        setSearchError(err.message || 'Failed to check warranty');
      }
    } finally {
      setSearching(false);
    }
  }

  // Quick lookup helper when clicking a serial in the list
  function checkFromList(serial) {
    setSerialQuery(serial);
    handleSearch(null, serial);
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <h2 style={{ margin: 0 }}>Warranty Check</h2>
          <span className="badge badge-blue">CRM2</span>
        </div>
        {/* Placeholder spot reserved for CRM2-B3 Sync button */}
        <div id="warranty-actions-area"></div>
      </div>

      {/* Search Box Card */}
      <div style={styles.card}>
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem' }}>Check Serial Number</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 0, marginBottom: '1rem' }}>
          Enter a product serial number (e.g. <code>TV55-2611-0001</code>) to verify warranty coverage.
        </p>

        <form onSubmit={handleSearch} style={styles.searchRow}>
          <input
            type="text"
            placeholder="Enter serial number (e.g. TV55-2611-0001)..."
            value={serialQuery}
            onChange={(e) => setSerialQuery(e.target.value)}
            style={styles.input}
          />
          <button type="submit" className="btn" disabled={searching || !serialQuery.trim()}>
            {searching ? 'Checking...' : 'Check Warranty'}
          </button>
          {searchResult || searchError ? (
            <button
              type="button"
              className="btn"
              style={{ background: '#f1f5f9', color: '#475569' }}
              onClick={() => {
                setSearchResult(null);
                setSearchError('');
                setSerialQuery('');
                setSearchedSerial('');
              }}
            >
              Clear
            </button>
          ) : null}
        </form>

        {/* Not Found Error Banner */}
        {searchError && (
          <div style={styles.errorBanner}>
            <strong>{searchError}</strong>
            {searchError === 'Serial not found' && searchedSerial && (
              <span style={{ marginLeft: '0.5rem' }}>
                — No warranty registration exists for <code>{searchedSerial}</code>.
              </span>
            )}
          </div>
        )}

        {/* Found Result Card */}
        {searchResult && (
          <div style={styles.resultCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Serial Number</span>
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{searchResult.serial_number}</h4>
              </div>
              <div>
                <WarrantyBadge status={searchResult.status} />
              </div>
            </div>

            <div style={styles.resultGrid}>
              <div>
                <div style={styles.fieldLabel}>Product Name</div>
                <div style={styles.fieldVal}>{searchResult.product_name || searchResult.sku}</div>
              </div>
              <div>
                <div style={styles.fieldLabel}>SKU</div>
                <div style={styles.fieldVal}>{searchResult.sku}</div>
              </div>
              <div>
                <div style={styles.fieldLabel}>Customer ID</div>
                <div style={styles.fieldVal}>{searchResult.customer_id}</div>
              </div>
              <div>
                <div style={styles.fieldLabel}>Purchase Date</div>
                <div style={styles.fieldVal}>{formatDate(searchResult.purchase_date)}</div>
              </div>
              <div>
                <div style={styles.fieldLabel}>Coverage Period</div>
                <div style={styles.fieldVal}>{searchResult.warranty_months} months</div>
              </div>
              <div>
                <div style={styles.fieldLabel}>Expires On</div>
                <div style={styles.fieldVal}>{formatDate(searchResult.expires_on)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Registered Serial Numbers Section */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Registered Warranties</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {warranties.length} serial {warranties.length === 1 ? 'number' : 'numbers'} registered
            </span>
          </div>
          <button
            type="button"
            className="btn"
            style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            onClick={loadWarranties}
            disabled={loadingList}
          >
            {loadingList ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {listError && (
          <div style={styles.errorBanner}>{listError}</div>
        )}

        {loadingList ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Loading warranties...
          </div>
        ) : warranties.length === 0 ? (
          <div style={styles.emptyState}>
            No registered warranties found. Use the sync feature or register new units.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Serial Number</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Purchase Date</th>
                  <th style={styles.th}>Expires On</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map((w) => (
                  <tr key={w.serial_number}>
                    <td style={styles.td}>
                      <strong>{w.serial_number}</strong>
                    </td>
                    <td style={styles.td}>
                      <div>{w.product_name}</div>
                      <small style={{ color: '#64748b' }}>{w.sku}</small>
                    </td>
                    <td style={styles.td}>{w.customer_id}</td>
                    <td style={styles.td}>{formatDate(w.purchase_date)}</td>
                    <td style={styles.td}>{formatDate(w.expires_on)}</td>
                    <td style={styles.td}>
                      <WarrantyBadge status={w.status} />
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#f1f5f9', color: '#0f172a' }}
                        onClick={() => checkFromList(w.serial_number)}
                      >
                        Check
                      </button>
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
