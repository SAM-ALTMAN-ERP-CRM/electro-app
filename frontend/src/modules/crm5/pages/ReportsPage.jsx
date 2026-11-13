import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Fallback reports dataset adhering strictly to Section 5 shared IDs [CRM5-D1]
// Used when backend service is offline
const FALLBACK_REPORTS = [
  {
    id: 'RPT-0001',
    name: 'Leads by Source',
    title: 'Leads by Source',
    source: 'CRM-1',
    category: 'CRM-1 (Sales)',
    allowed_roles: ['sales', 'admin'],
    description: 'Lead generation and pipeline conversion categorized by acquisition channel from CRM-1.',
    columns: [
      { key: 'source', label: 'Lead Source' },
      { key: 'lead_count', label: 'Total Inquiries' },
      { key: 'converted_count', label: 'Converted Deals' },
      { key: 'assigned_rep', label: 'Sales Representative' },
      { key: 'total_pipeline_inr', label: 'Total Pipeline', format: 'currency' }
    ],
    rows: [
      { source: 'Website Direct', lead_count: 8, converted_count: 5, assigned_rep: 'EMP-0001', total_pipeline_inr: 245000.00 },
      { source: 'Dealer Partner Referral', lead_count: 6, converted_count: 4, assigned_rep: 'EMP-0002', total_pipeline_inr: 185000.00 },
      { source: 'Electronics Trade Expo', lead_count: 4, converted_count: 2, assigned_rep: 'EMP-0003', total_pipeline_inr: 115000.00 }
    ]
  },
  {
    id: 'RPT-0002',
    name: 'Tickets by Status',
    title: 'Tickets by Status',
    source: 'CRM-2',
    category: 'CRM-2 (Support)',
    allowed_roles: ['support', 'admin'],
    description: 'Active customer support tickets grouped by resolution status and assigned engineers from CRM-2.',
    columns: [
      { key: 'status', label: 'Ticket Status', format: 'badge' },
      { key: 'ticket_count', label: 'Total Tickets' },
      { key: 'high_priority_count', label: 'High Priority Tickets' },
      { key: 'assigned_engineer', label: 'Assigned Engineer' },
      { key: 'avg_resolution_hrs', label: 'Avg Resolution (Hrs)' }
    ],
    rows: [
      { status: 'open', ticket_count: 5, high_priority_count: 2, assigned_engineer: 'EMP-0005', avg_resolution_hrs: 14.50 },
      { status: 'in-progress', ticket_count: 4, high_priority_count: 1, assigned_engineer: 'EMP-0006', avg_resolution_hrs: 22.00 },
      { status: 'resolved', ticket_count: 12, high_priority_count: 0, assigned_engineer: 'EMP-0007', avg_resolution_hrs: 18.20 }
    ]
  },
  {
    id: 'RPT-0003',
    name: 'Customers by Type',
    title: 'Customers by Type',
    source: 'CRM-3',
    category: 'CRM-3 (Customers)',
    allowed_roles: ['sales', 'support', 'admin'],
    description: 'Customer segmentation breakdown by enterprise, retail, and individual accounts from CRM-3.',
    columns: [
      { key: 'customer_type', label: 'Customer Segment' },
      { key: 'customer_count', label: 'Total Customers' },
      { key: 'sample_customer_id', label: 'Customer Reference' },
      { key: 'active_orders', label: 'Active Orders' },
      { key: 'total_spend_inr', label: 'Total Spend', format: 'currency' }
    ],
    rows: [
      { customer_type: 'Enterprise Corporate', customer_count: 3, sample_customer_id: 'CUST-0001', active_orders: 6, total_spend_inr: 485000.00 },
      { customer_type: 'Retail Commercial', customer_count: 3, sample_customer_id: 'CUST-0002', active_orders: 4, total_spend_inr: 230000.00 },
      { customer_type: 'Individual Consumer', customer_count: 2, sample_customer_id: 'CUST-0003', active_orders: 2, total_spend_inr: 95000.00 }
    ]
  }
];

export default function ReportsPage() {
  // Read authenticated user from localStorage (login screen sets this)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse user from localStorage:', e);
    }
    return { name: 'System Administrator', email: 'admin@demo.com', role: 'admin' };
  });

  // Admin-only role preview state (null = show all for admin)
  const [adminPreviewRole, setAdminPreviewRole] = useState('all');

  // Reports state
  const [reportsList, setReportsList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Active running report state
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [activeReportData, setActiveReportData] = useState(null);
  const [runningReport, setRunningReport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [csvNotice, setCsvNotice] = useState('');

  // Check if actual logged-in user is admin (Manager means admin)
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

  // The effective role determining report visibility:
  // For admin: determined by preview dropdown (or 'admin' if 'all')
  // For non-admin: strictly determined by their login role (no dropdown)
  const effectiveRole = isAdmin
    ? (adminPreviewRole === 'all' ? 'admin' : adminPreviewRole)
    : (currentUser.role || 'sales');

  // Format currency with Indian Comma notation and ₹ symbol
  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Badge class by status/priority string
  const getBadgeClass = (val) => {
    const str = String(val).toLowerCase();
    if (['won', 'resolved', 'compliant', 'exceeding'].includes(str)) return 'badge badge-green';
    if (['in-progress', 'medium', 'on-track'].includes(str)) return 'badge badge-blue';
    if (['open', 'high', 'needs-review'].includes(str)) return 'badge badge-amber';
    if (['breached', 'urgent', 'lost'].includes(str)) return 'badge badge-red';
    return 'badge badge-blue';
  };

  // Role badge helper
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'badge badge-green';
      case 'sales': return 'badge badge-blue';
      case 'finance': return 'badge badge-amber';
      case 'support': return 'badge badge-red';
      default: return 'badge badge-blue';
    }
  };

  // Fetch report catalog for the effective role
  const fetchReports = useCallback(async () => {
    setLoadingList(true);
    setErrorMsg('');
    try {
      const qs = effectiveRole ? `?role=${encodeURIComponent(effectiveRole)}` : '';
      const res = await api('crm5', `/api/reports${qs}`);
      const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
      if (list.length > 0) {
        setReportsList(list);
      } else {
        // Fallback filter
        const filtered = effectiveRole === 'admin'
          ? FALLBACK_REPORTS
          : FALLBACK_REPORTS.filter(r => r.allowed_roles.includes(effectiveRole));
        setReportsList(filtered);
      }
    } catch (err) {
      console.warn('[crm5] API reports list fetch note:', err.message);
      const filtered = effectiveRole === 'admin'
        ? FALLBACK_REPORTS
        : FALLBACK_REPORTS.filter(r => r.allowed_roles.includes(effectiveRole));
      setReportsList(filtered);
    } finally {
      setLoadingList(false);
    }
  }, [effectiveRole]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Run a specific report and retrieve its table results
  const handleRunReport = async (reportId) => {
    setSelectedReportId(reportId);
    setRunningReport(true);
    setErrorMsg('');
    try {
      const qs = effectiveRole ? `?role=${encodeURIComponent(effectiveRole)}` : '';
      const res = await api('crm5', `/api/reports/${reportId}/run${qs}`);
      const data = (res && res.data !== undefined) ? res.data : res;
      setActiveReportData(data);
    } catch (err) {
      console.warn('[crm5] API run report failed, using fallback report data:', err.message);
      const fallbackReport = FALLBACK_REPORTS.find(r => r.id === reportId);
      if (fallbackReport) {
        setActiveReportData(fallbackReport);
      } else {
        setErrorMsg(`Failed to execute report: ${err.message}`);
      }
    } finally {
      setRunningReport(false);
    }
  };

  // CSV cell value escaper following RFC 4180
  const escapeCsvCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // If string contains quotation marks, commas, or line breaks, enclose in double quotes and escape internal quotes
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Browser-based CSV generation and instant download
  const handleDownloadCsv = () => {
    if (!activeReportData) return;
    const columns = activeReportData.columns || [];
    const rows = activeReportData.rows || [];

    setDownloadingCsv(true);
    setCsvNotice('');

    try {
      // UTF-8 BOM (\uFEFF) ensures reliable Microsoft Excel compatibility
      const BOM = '\uFEFF';

      // Header row using column labels (or keys) in display order
      const headerRow = columns.map(c => escapeCsvCell(c.label || c.key)).join(',');

      // Data rows mapped in the exact column order
      const dataRows = rows.map(row =>
        columns.map(c => escapeCsvCell(row[c.key])).join(',')
      );

      // Join lines with standard CRLF (\r\n) line endings
      const csvString = BOM + [headerRow, ...dataRows].join('\r\n');

      // Create Blob with text/csv mime type and UTF-8 charset
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      // Construct sensible filename based on report ID or title
      const baseName = activeReportData.id || activeReportData.title || 'report';
      const safeFilename = `${baseName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.csv`;

      // Trigger browser download via anchor element
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', safeFilename);
      document.body.appendChild(link);
      link.click();

      // Clean up link element and revoke temporary object URL to prevent memory leaks
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setCsvNotice(`Downloaded ${safeFilename} (${rows.length} rows)`);
      setTimeout(() => setCsvNotice(''), 4000);
    } catch (err) {
      console.error('[crm5] CSV generation error:', err);
      setErrorMsg(`Failed to generate CSV: ${err.message}`);
    } finally {
      setDownloadingCsv(false);
    }
  };

  // Browser-native print trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em' }}>
              Executive & Operational Reports
            </h2>
            <span className="badge badge-blue">CRM-5</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Access role-authorized analytics, run live queries, and inspect operational metrics tables.
          </p>
        </div>

        {/* User Identity Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Logged in as:</span>
          <strong>{currentUser.name || currentUser.email}</strong>
          <span className={getRoleBadgeClass(currentUser.role)}>
            {(currentUser.role || 'sales').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Admin Role Preview Bar - VISIBLE ONLY FOR ADMIN */}
      {isAdmin ? (
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '0.9rem 1.25rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem' }}>👑</span>
            <div>
              <strong style={{ fontSize: '0.9rem', color: '#1e40af' }}>Admin Role Preview:</strong>
              <p style={{ fontSize: '0.8rem', color: '#3b82f6', margin: 0 }}>
                Select a role to preview exactly which reports that department may access.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="admin-role-select" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>
              Preview Role:
            </label>
            <select
              id="admin-role-select"
              value={adminPreviewRole}
              onChange={(e) => {
                setAdminPreviewRole(e.target.value);
                setActiveReportData(null);
                setSelectedReportId(null);
              }}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #93c5fd',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1e3a8a',
                background: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="all">🌟 All Reports (Admin Full Access - 3 Reports)</option>
              <option value="sales">💼 Sales (Leads by Source, Customers by Type)</option>
              <option value="support">🛠️ Support (Tickets by Status, Customers by Type)</option>
            </select>
          </div>
        </div>
      ) : (
        /* Non-admin notice: no dropdown rendered */
        <div className="no-print" style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', color: '#475569' }}>
          🔒 Showing reports permitted for your assigned role <strong>{currentUser.role}</strong>. Role access is automatically enforced based on your session credentials.
        </div>
      )}

      {/* Notification feedback messages */}
      {errorMsg && (
        <div className="no-print" style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.875rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}
      {csvNotice && (
        <div className="no-print" style={{ padding: '0.75rem 1rem', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontSize: '0.875rem', fontWeight: 500 }}>
          ✅ {csvNotice}
        </div>
      )}

      {/* Section 1: Authorized Reports List */}
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
            Authorized Report Catalog ({reportsList.length})
          </h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Active Perspective: <strong>{effectiveRole.toUpperCase()}</strong>
          </span>
        </div>

        {loadingList ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            ⏳ Loading authorized report catalog...
          </div>
        ) : reportsList.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            No reports authorized for role <strong>{effectiveRole}</strong>.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {reportsList.map((rep) => {
              const isSelected = selectedReportId === rep.id;
              return (
                <div
                  key={rep.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'border-color 0.15s'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {rep.source || rep.category || 'General'}
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {(rep.allowed_roles || []).map(r => (
                          <span key={r} className={getRoleBadgeClass(r)} style={{ fontSize: '0.65rem' }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                      {rep.name || rep.title}
                    </h4>
                    <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5 }}>
                      {rep.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                    <code style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {rep.id}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleRunReport(rep.id)}
                      disabled={runningReport && selectedReportId === rep.id}
                      style={{
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.85rem',
                        backgroundColor: isSelected ? '#1d4ed8' : '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {runningReport && selectedReportId === rep.id ? 'Running...' : '▶ Run Report'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Report Results Table */}
      <div className="report-print-container" style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="report-print-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                {activeReportData ? (activeReportData.name || activeReportData.title) : 'Report Results'}
              </h3>
              {activeReportData && (
                <span className="badge badge-green">Ready</span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
              {activeReportData
                ? activeReportData.description
                : 'Click "Run Report" above on any authorized report to execute and view its live data table.'}
            </p>
            {activeReportData && (
              <div className="print-only" style={{ display: 'none', fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
                <span>Generated from CRM-5 Executive & Operational Reports · {new Date().toLocaleDateString('en-IN')}</span>
              </div>
            )}
          </div>

          {activeReportData && (
            <div className="no-print" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '0.25rem' }}>
                Rows: <strong>{(activeReportData.rows || []).length}</strong>
              </span>

              {/* Download CSV Button */}
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={downloadingCsv || (activeReportData.rows || []).length === 0}
                title={(activeReportData.rows || []).length === 0 ? 'No data rows to export' : 'Download report as CSV'}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  backgroundColor: (activeReportData.rows || []).length === 0 ? '#f1f5f9' : '#16a34a',
                  color: (activeReportData.rows || []).length === 0 ? '#94a3b8' : '#ffffff',
                  border: '1px solid ' + ((activeReportData.rows || []).length === 0 ? '#cbd5e1' : '#15803d'),
                  borderRadius: '6px',
                  cursor: (activeReportData.rows || []).length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                📥 {downloadingCsv ? 'Exporting...' : 'Download CSV'}
              </button>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                title="Print this report"
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: '1px solid #1d4ed8',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                🖨️ Print
              </button>

              <button
                type="button"
                onClick={() => handleRunReport(activeReportData.id)}
                disabled={runningReport}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                🔄 Re-run
              </button>
              <button
                type="button"
                onClick={() => { setActiveReportData(null); setSelectedReportId(null); }}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                ✕ Close
              </button>
            </div>
          )}
        </div>

        {runningReport ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#2563eb' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>⏳ Executing report query and computing results...</p>
          </div>
        ) : !activeReportData ? (
          /* Empty state */
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📊</span>
            <p style={{ fontWeight: 600, color: '#64748b' }}>No Report Executed Yet</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Select a report from the catalog above and click <strong>"Run Report"</strong> to display tabular results.
            </p>
          </div>
        ) : (activeReportData.rows || []).length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Report executed successfully, but no matching rows were returned.
          </div>
        ) : (
          /* Tabular Data Results */
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {(activeReportData.columns || []).map(col => (
                    <th
                      key={col.key}
                      style={{
                        textAlign: col.format === 'currency' || col.format === 'percent' ? 'right' : 'left'
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(activeReportData.rows || []).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {(activeReportData.columns || []).map(col => {
                      const val = row[col.key];
                      const isMoney = col.format === 'currency';
                      const isPercent = col.format === 'percent';
                      const isBadge = col.format === 'badge';

                      return (
                        <td
                          key={col.key}
                          style={{
                            textAlign: isMoney || isPercent ? 'right' : 'left'
                          }}
                        >
                          {isMoney ? (
                            <strong>{formatMoney(val)}</strong>
                          ) : isPercent ? (
                            <span>{val}%</span>
                          ) : isBadge ? (
                            <span className={getBadgeClass(val)}>
                              {String(val).toUpperCase()}
                            </span>
                          ) : (
                            String(val ?? '-')
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CRM-5 Scoped Print Stylesheet */}
      <style>{`
        @media print {
          /* Hide app shell, top-bar, catalog, and action buttons */
          .sidebar,
          .top-bar,
          .no-print,
          button,
          .btn {
            display: none !important;
          }

          /* Ensure print page fills page without sidebar whitespace */
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }

          .app-container,
          .main-content,
          .page-container {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            display: block !important;
          }

          /* Printable report container */
          .report-print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
          }

          .report-print-header {
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 0.75rem !important;
            margin-bottom: 1rem !important;
          }

          .print-only {
            display: block !important;
          }

          /* Table headers repeat across page breaks without clipping */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            box-shadow: none !important;
            margin: 0.5rem 0 !important;
            page-break-inside: auto !important;
          }

          thead {
            display: table-header-group !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 10px !important;
            color: #0f172a !important;
            font-size: 0.85rem !important;
          }

          th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: 700 !important;
          }

          /* Preserve status badges with high contrast in print */
          .badge {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border: 1px solid #94a3b8 !important;
            padding: 2px 6px !important;
            font-size: 0.7rem !important;
          }
        }
      `}</style>
    </div>
  );
}
