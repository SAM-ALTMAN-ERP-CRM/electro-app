import React, { useState, useCallback, useMemo } from 'react';
import api from '../../../api';

// Acceptance test 10-row CSV content (8 valid, 2 invalid rows)
const SAMPLE_ACCEPTANCE_CSV = `name,type,email,phone,gstin,billing_address,shipping_address,city
Rohit Sharma,retail,rohit.sharma@example.com,9820199001,,102 Marine Lines,102 Marine Lines,Mumbai
Alpha Tech Solutions,corporate,procure@alphatech.com,9820199002,27AAACA1234A1Z1,Tech Park Building 4,Tech Park Building 4,Pune
Invalid Phone Customer,retail,badphone@example.com,12345,,12 Park Street,12 Park Street,Kolkata
Devi Enterprises,dealer,orders@devienterprises.com,9820199004,29AABCD5678B1Z2,MG Road Suite 3,MG Road Suite 3,Bengaluru
Anita Roy,retail,anita.roy@example.com,9820199005,,45 Lake View,45 Lake View,Hyderabad
Corporate Missing GSTIN,corporate,missinggstin@corp.com,9820199006,,Tower B Cyber Hub,Tower B Cyber Hub,Gurugram
Vikramaditya Rao,retail,vikram.rao@example.com,9820199007,,77 Anna Salai,77 Anna Salai,Chennai
Apex Retailers,dealer,contact@apexretail.com,9820199008,33AABCA9012C1Z3,Industrial Area Phase 2,Industrial Area Phase 2,Coimbatore
Meera Sen,retail,meera.sen@example.com,9820199009,,18 Salt Lake Sector 1,18 Salt Lake Sector 1,Kolkata
Blue Horizon Ltd,corporate,admin@bluehorizon.com,9820199010,07AABCB3456D1Z4,Barakhamba Road Connaught Place,Barakhamba Road Connaught Place,New Delhi`;

/**
 * Pure browser-native CSV parser (no external library).
 * Splits text by lines and commas, handling quoted values.
 */
function parseCSVText(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  // Split lines (handling CRLF and LF)
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse a single comma-separated line respecting quotation marks
  function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  // Normalize header names to expected schema keys
  function normalizeHeader(h) {
    const raw = String(h || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (raw === 'name' || raw === 'customername' || raw === 'company') return 'name';
    if (raw === 'type' || raw === 'customertype') return 'type';
    if (raw === 'email' || raw === 'emailaddress') return 'email';
    if (raw === 'phone' || raw === 'phonenumber' || raw === 'mobile' || raw === 'contact') return 'phone';
    if (raw === 'gstin' || raw === 'gst' || raw === 'taxid') return 'gstin';
    if (raw === 'billingaddress' || raw === 'address') return 'billing_address';
    if (raw === 'shippingaddress') return 'shipping_address';
    if (raw === 'city') return 'city';
    return raw;
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(normalizeHeader);

  const parsedRows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const rowObj = {
      name: '',
      type: 'retail',
      email: '',
      phone: '',
      gstin: '',
      billing_address: '',
      shipping_address: '',
      city: ''
    };

    headers.forEach((key, colIdx) => {
      if (key) {
        rowObj[key] = cols[colIdx] !== undefined ? cols[colIdx] : '';
      }
    });

    // Provide default shipping address if empty
    if (!rowObj.shipping_address && rowObj.billing_address) {
      rowObj.shipping_address = rowObj.billing_address;
    }

    parsedRows.push(rowObj);
  }

  return parsedRows;
}

/**
 * Client-side validation preview check.
 */
function checkClientValidation(row) {
  const issues = [];
  if (!row.name || !row.name.trim()) issues.push('Missing Name');
  const type = (row.type || '').trim().toLowerCase();
  if (!['retail', 'corporate', 'dealer'].includes(type)) issues.push('Invalid Type');
  const phone = String(row.phone || '').trim();
  if (!/^\d{10}$/.test(phone)) issues.push('Phone != 10 digits');
  const email = (row.email || '').trim();
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) issues.push('Invalid Email');
  const gstin = (row.gstin || '').trim();
  if ((type === 'corporate' || type === 'dealer') && (!gstin || !/^[0-9A-Za-z]{15}$/.test(gstin))) {
    issues.push('Missing/Invalid 15-char GSTIN');
  } else if (gstin && !/^[0-9A-Za-z]{15}$/.test(gstin)) {
    issues.push('GSTIN != 15 alphanumeric');
  }
  return issues;
}

export default function CustomerImportPage() {
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'directory'
  const [directoryCustomers, setDirectoryCustomers] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // Handle file input selection
  const handleFileChange = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const rows = parseCSVText(text);
        if (rows.length === 0) {
          setErrorMsg('The selected CSV file appears to be empty or has no data rows.');
          setParsedRows([]);
        } else {
          setParsedRows(rows);
        }
      } catch (err) {
        setErrorMsg('Failed to parse CSV file: ' + err.message);
        setParsedRows([]);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Error reading file from disk.');
    };
    reader.readAsText(file);
  }, []);

  // Load standard 10-row acceptance sample CSV
  const handleLoadAcceptanceSample = useCallback(() => {
    setFileName('acceptance_test_10rows.csv');
    setImportResult(null);
    setErrorMsg(null);
    const rows = parseCSVText(SAMPLE_ACCEPTANCE_CSV);
    setParsedRows(rows);
  }, []);

  // Download sample CSV template
  const handleDownloadSample = useCallback(() => {
    const blob = new Blob([SAMPLE_ACCEPTANCE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'crm3_customer_import_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Reset import state
  const handleReset = useCallback(() => {
    setFileName('');
    setParsedRows([]);
    setImportResult(null);
    setErrorMsg(null);
  }, []);

  // Post parsed JSON array to backend
  const handleImportSubmit = useCallback(async () => {
    if (!parsedRows || parsedRows.length === 0) return;

    setImporting(true);
    setErrorMsg(null);

    try {
      // POST JSON array to /api/customers/import via shared api() helper
      const res = await api('crm3', '/api/customers/import', {
        method: 'POST',
        body: parsedRows
      });

      // api() returns data or top-level payload
      const resultData = res?.data || res;
      setImportResult(resultData);
    } catch (err) {
      setErrorMsg(err.message || 'Import request failed');
    } finally {
      setImporting(false);
    }
  }, [parsedRows]);

  // Fetch current customer directory to view newly imported records
  const loadDirectory = useCallback(async () => {
    setLoadingDirectory(true);
    try {
      const res = await api('crm3', '/api/customers');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setDirectoryCustomers(list);
    } catch (err) {
      console.warn('Could not load directory customers:', err.message);
    } finally {
      setLoadingDirectory(false);
    }
  }, []);

  // Switch tabs
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'directory') {
      loadDirectory();
    }
  }, [loadDirectory]);

  // Client validation summary
  const validationSummary = useMemo(() => {
    if (!parsedRows.length) return { validCount: 0, issueCount: 0 };
    let validCount = 0;
    let issueCount = 0;
    parsedRows.forEach(row => {
      const issues = checkClientValidation(row);
      if (issues.length === 0) validCount++;
      else issueCount++;
    });
    return { validCount, issueCount };
  }, [parsedRows]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
              Import Customers (CSV)
            </h1>
            <span className="badge badge-blue">CRM-3 Customer 360</span>
            <span className="badge badge-green">Order-to-Cash Step 3</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Bulk import customer master records via CSV. Upload a file or load the 10-row acceptance test suite to preview and commit records to <code>crm3_db</code>.
          </p>
        </div>

        {/* Tab switchers */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => handleTabChange('import')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              background: activeTab === 'import' ? '#ffffff' : 'transparent',
              color: activeTab === 'import' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'import' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer'
            }}
          >
            CSV Importer
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('directory')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              background: activeTab === 'directory' ? '#ffffff' : 'transparent',
              color: activeTab === 'directory' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'directory' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer'
            }}
          >
            Customer Directory
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          background: '#fee2e2',
          border: '1px solid #f87171',
          color: '#991b1b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>Error: </strong> {errorMsg}
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            style={{ background: 'transparent', color: '#991b1b', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {activeTab === 'import' ? (
        <>
          {/* File Upload & Actions Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#1e293b' }}>
              Select CSV File
            </h3>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              {/* File Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.2rem',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#334155',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}>
                  <span>📁 Choose CSV File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>

                {fileName ? (
                  <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>
                    Selected: <strong>{fileName}</strong> ({parsedRows.length} rows detected)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    No file selected yet (.csv supported)
                  </span>
                )}
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleLoadAcceptanceSample}
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    fontWeight: 600
                  }}
                  title="Loads 10-row CSV with 2 bad rows to test acceptance criteria"
                >
                  ⚡ Load 10-Row Acceptance Sample (8 Valid, 2 Bad)
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSample}
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  ⬇ Download Sample Template
                </button>

                {parsedRows.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fca5a5'
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Import Results Banner (when import completed) */}
          {importResult && (
            <div style={{
              background: '#ffffff',
              borderRadius: '10px',
              border: importResult.skipped > 0 ? '1px solid #fbbf24' : '1px solid #86efac',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                    Import Results Summary
                  </h3>
                  <span className={`badge ${importResult.skipped > 0 ? 'badge-amber' : 'badge-green'}`}>
                    {importResult.inserted} of {importResult.total} Imported
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleTabChange('directory')}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                >
                  View in Customer Directory →
                </button>
              </div>

              {/* KPI metrics row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Processed</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>{importResult.total}</div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Successfully Inserted</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#15803d' }}>{importResult.inserted}</div>
                </div>

                <div style={{ background: importResult.skipped > 0 ? '#fffbeb' : '#f8fafc', padding: '1rem', borderRadius: '8px', border: importResult.skipped > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', color: importResult.skipped > 0 ? '#92400e' : '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Skipped / Invalid</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: importResult.skipped > 0 ? '#b45309' : '#0f172a' }}>{importResult.skipped}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Success Rate</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0284c7' }}>
                    {importResult.total > 0 ? Math.round((importResult.inserted / importResult.total) * 100) : 0}%
                  </div>
                </div>
              </div>

              {/* Errors list if any rows were skipped */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#b91c1c', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⚠️ Skipped Rows & Validation Errors ({importResult.errors.length})</span>
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>Row #</th>
                          <th>Customer Name</th>
                          <th>Email Address</th>
                          <th>Error / Rejection Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((err, errIdx) => (
                          <tr key={errIdx} style={{ background: '#fff5f5' }}>
                            <td>
                              <span className="badge badge-red" style={{ fontWeight: 700 }}>
                                Row {err.row}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{err.name || 'Unknown'}</td>
                            <td><code>{err.email || 'N/A'}</code></td>
                            <td style={{ color: '#b91c1c', fontWeight: 500 }}>
                              {err.error || err.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Table & Submit Action */}
          {parsedRows.length > 0 && (
            <div style={{
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                    CSV Data Preview ({parsedRows.length} Rows)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Review the parsed records below before submitting. Pre-check: {validationSummary.validCount} valid, {validationSummary.issueCount} potential issue(s).
                  </p>
                </div>

                {/* Import Submit Button */}
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={importing}
                  style={{
                    padding: '0.65rem 1.5rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    background: importing ? '#94a3b8' : '#2563eb',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                >
                  {importing ? '⏳ Importing to Database...' : `🚀 Import ${parsedRows.length} Customers`}
                </button>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>GSTIN</th>
                      <th>City</th>
                      <th>Address</th>
                      <th>Pre-Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => {
                      const issues = checkClientValidation(row);
                      const isRowValid = issues.length === 0;

                      return (
                        <tr
                          key={idx}
                          style={{
                            backgroundColor: !isRowValid ? '#fffbeb' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')
                          }}
                        >
                          <td style={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{row.name || '—'}</td>
                          <td>
                            <span className={`badge ${
                              row.type === 'corporate' ? 'badge-blue' :
                              row.type === 'dealer' ? 'badge-amber' : 'badge-green'
                            }`}>
                              {row.type || 'retail'}
                            </span>
                          </td>
                          <td><code>{row.email || '—'}</code></td>
                          <td>{row.phone || '—'}</td>
                          <td>
                            {row.gstin ? (
                              <code>{row.gstin}</code>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                            )}
                          </td>
                          <td>{row.city || '—'}</td>
                          <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.billing_address || '—'}
                          </td>
                          <td>
                            {isRowValid ? (
                              <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                                ✓ Ready
                              </span>
                            ) : (
                              <span
                                className="badge badge-amber"
                                style={{ fontSize: '0.7rem', cursor: 'help' }}
                                title={issues.join(', ')}
                              >
                                ⚠ {issues[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Customer Directory Tab */
        <div style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Customer Master Records in Database
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Listing all records currently stored in <code>crm3_db.customers</code> table.
              </p>
            </div>
            <button
              type="button"
              onClick={loadDirectory}
              disabled={loadingDirectory}
              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
            >
              {loadingDirectory ? 'Refreshing...' : '🔄 Refresh List'}
            </button>
          </div>

          {loadingDirectory ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Loading customers from CRM-3 service...
            </p>
          ) : directoryCustomers.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              No customers found. Import CSV above or start backend service.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>GSTIN</th>
                    <th>City</th>
                  </tr>
                </thead>
                <tbody>
                  {directoryCustomers.map((c, i) => (
                    <tr key={c.id || i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td>
                        <strong style={{ color: '#2563eb' }}>{c.id}</strong>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>
                        <span className={`badge ${
                          c.type === 'corporate' ? 'badge-blue' :
                          c.type === 'dealer' ? 'badge-amber' : 'badge-green'
                        }`}>
                          {c.type}
                        </span>
                      </td>
                      <td><code>{c.email}</code></td>
                      <td>{c.phone}</td>
                      <td>{c.gstin ? <code>{c.gstin}</code> : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td>{c.city || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
