import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

// Allowed account types in the ERP-5 General Ledger
const ACCOUNTS = [
  { value: 'sales', label: 'Sales (Revenue)', badge: 'badge-blue' },
  { value: 'receivables', label: 'Receivables (Asset)', badge: 'badge-amber' },
  { value: 'cash', label: 'Cash & Bank (Asset)', badge: 'badge-green' },
  { value: 'purchases', label: 'Purchases (Expense)', badge: 'badge-amber' },
  { value: 'salary_expense', label: 'Salary Expense (Expense)', badge: 'badge-red' }
];

export default function LedgerPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter States
  const [accountFilter, setAccountFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Manual Entry Form State
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    account: 'receivables',
    debit: '',
    credit: '',
    reference: '',
    description: ''
  });

  // Fetch ledger entries from backend
  const fetchLedger = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (accountFilter) params.append('account', accountFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const data = await api('erp5', `/api/ledger${queryString}`);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load ledger records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [accountFilter, fromDate, toDate]);

  // Handle Manual Form Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const debitVal = parseFloat(formData.debit || 0);
    const creditVal = parseFloat(formData.credit || 0);

    if (debitVal === 0 && creditVal === 0) {
      setError('Please provide either a Debit or Credit amount greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      await api('erp5', '/api/ledger', {
        method: 'POST',
        body: {
          entry_date: formData.entry_date,
          account: formData.account,
          debit: debitVal,
          credit: creditVal,
          reference: formData.reference.trim() || undefined,
          description: formData.description.trim() || undefined
        }
      });

      setSuccessMsg('Ledger entry recorded successfully.');
      setFormData({
        entry_date: new Date().toISOString().split('T')[0],
        account: 'receivables',
        debit: '',
        credit: '',
        reference: '',
        description: ''
      });
      setShowForm(false);
      fetchLedger();
    } catch (err) {
      setError(err.message || 'Failed to submit entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format currency in INR with 2 decimals
  const formatINR = (val) => {
    const num = parseFloat(val) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate live totals for the bottom summary
  const totalDebit = entries.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0);
  const totalCredit = entries.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="page-container">
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a' }}>General Ledger</h1>
            <span className="badge badge-blue">ERP-5 Finance</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Double-entry bookkeeping, account balances, and automated financial transaction tracking.
          </p>
        </div>
        <button
          className="btn"
          onClick={() => setShowForm(!showForm)}
          style={{ background: showForm ? '#64748b' : '#2563eb' }}
        >
          {showForm ? 'Close Form' : '+ New Manual Entry'}
        </button>
      </div>

      {/* Friendly Notifications */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem' }}>
          <strong>Error: </strong> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', border: '1px solid #22c55e', color: '#15803d', borderRadius: '6px', marginBottom: '1rem' }}>
          {successMsg}
        </div>
      )}

      {/* Collapsible Manual Entry Form */}
      {showForm && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
            Record Manual Ledger Entry
          </h3>
          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>
                  Account *
                </label>
                <select
                  value={formData.account}
                  onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff' }}
                >
                  {ACCOUNTS.map((acc) => (
                    <option key={acc.value} value={acc.value}>
                      {acc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>
                  Debit (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.debit}
                  onChange={(e) => setFormData({ ...formData, debit: e.target.value, credit: e.target.value ? '' : formData.credit })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>
                  Credit (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.credit}
                  onChange={(e) => setFormData({ ...formData, credit: e.target.value, debit: e.target.value ? '' : formData.debit })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>
                  Reference No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. MAN-001 or INV-0001"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Purpose of transaction"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: '#e2e8f0', color: '#334155' }}
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: '1', minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.25rem' }}>
            Account Filter
          </label>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', fontSize: '0.875rem' }}
          >
            <option value="">All Accounts</option>
            {ACCOUNTS.map((acc) => (
              <option key={acc.value} value={acc.value}>
                {acc.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.25rem' }}>
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.25rem' }}>
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              setAccountFilter('');
              setFromDate('');
              setToDate('');
            }}
            style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading ledger entries...
        </div>
      ) : entries.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: '500', color: '#334155' }}>No ledger entries found</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Try adjusting your account/date filters or click <strong>+ New Manual Entry</strong> above.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>ID</th>
                <th style={{ width: '120px' }}>Date</th>
                <th>Account</th>
                <th>Reference</th>
                <th>Description</th>
                <th style={{ textAlign: 'right', width: '140px' }}>Debit</th>
                <th style={{ textAlign: 'right', width: '140px' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((item) => {
                const accObj = ACCOUNTS.find((a) => a.value === item.account);
                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '600', color: '#2563eb' }}>
                      {item.id}
                    </td>
                    <td style={{ color: '#475569' }}>
                      {item.entry_date ? item.entry_date.split('T')[0] : '-'}
                    </td>
                    <td>
                      <span className={`badge ${accObj ? accObj.badge : 'badge-blue'}`}>
                        {item.account}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500', color: '#0f172a' }}>
                      {item.reference || '-'}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.875rem' }}>
                      {item.description || '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: parseFloat(item.debit) > 0 ? '#0f172a' : '#94a3b8' }}>
                      {parseFloat(item.debit) > 0 ? formatINR(item.debit) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: parseFloat(item.credit) > 0 ? '#0f172a' : '#94a3b8' }}>
                      {parseFloat(item.credit) > 0 ? formatINR(item.credit) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Summary Row */}
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: '700', borderTop: '2px solid #cbd5e1' }}>
                <td colSpan={5} style={{ textAlign: 'right', paddingRight: '1rem', color: '#334155' }}>
                  Totals:
                </td>
                <td style={{ textAlign: 'right', color: '#0f172a', fontSize: '0.95rem' }}>
                  {formatINR(totalDebit)}
                </td>
                <td style={{ textAlign: 'right', color: '#0f172a', fontSize: '0.95rem' }}>
                  {formatINR(totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Balance Verification Footer Badge */}
      {!loading && entries.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Accounting Audit Status:</span>
          {isBalanced ? (
            <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
              ✓ Balanced: Debits ({formatINR(totalDebit)}) = Credits ({formatINR(totalCredit)})
            </span>
          ) : (
            <span className="badge badge-red" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
              ⚠ Out of Balance: Difference of {formatINR(Math.abs(totalDebit - totalCredit))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

