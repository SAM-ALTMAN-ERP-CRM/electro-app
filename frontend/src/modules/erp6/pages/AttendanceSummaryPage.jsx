import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../../api';

export default function AttendanceSummaryPage() {
  const getCurrentMonthStr = () => new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState([]);

  // Fetch departments for filter dropdown
  const loadDepartments = useCallback(async () => {
    try {
      const res = await api('erp6', '/api/departments');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setDepartments(list);
    } catch (err) {
      console.warn('[erp6] Could not load departments:', err.message);
    }
  }, []);

  // Fetch attendance summary for selected month
  const loadSummary = useCallback(async (month) => {
    try {
      setLoading(true);
      setError('');
      const targetMonth = month || getCurrentMonthStr();
      const res = await api('erp6', `/api/attendance/summary?month=${encodeURIComponent(targetMonth)}`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setSummaryData(list);
    } catch (err) {
      setError(err.message || 'Failed to load attendance summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadSummary(selectedMonth);
  }, [selectedMonth, loadSummary]);

  // Quick month change handlers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1));
    setSelectedMonth(prev.toISOString().substring(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(Date.UTC(y, m, 1));
    setSelectedMonth(next.toISOString().substring(0, 7));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(getCurrentMonthStr());
  };

  // Filtered rows
  const filteredData = useMemo(() => {
    return summaryData.filter((row) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (row.employee_id && row.employee_id.toLowerCase().includes(q)) ||
        (row.name && row.name.toLowerCase().includes(q)) ||
        (row.department_name && row.department_name.toLowerCase().includes(q));

      const matchesDept = !departmentFilter ||
        row.department_id === departmentFilter ||
        row.department_name === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [summaryData, searchQuery, departmentFilter]);

  // Aggregate stats across all employees
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, r) => ({
        present: acc.present + (Number(r.present_days) || 0),
        half: acc.half + (Number(r.half_days) || 0),
        absent: acc.absent + (Number(r.absent_days) || 0),
        leave: acc.leave + (Number(r.leave_days) || 0),
        totalMarked: acc.totalMarked + (Number(r.total_days) || (
          (Number(r.present_days) || 0) +
          (Number(r.half_days) || 0) +
          (Number(r.absent_days) || 0) +
          (Number(r.leave_days) || 0)
        ))
      }),
      { present: 0, half: 0, absent: 0, leave: 0, totalMarked: 0 }
    );
  }, [filteredData]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            Monthly Attendance & Leave Summary
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            Aggregated employee attendance logs, absenteeism count for payroll calculation, and leave utilization for {selectedMonth}.
          </p>
        </div>
        <button
          onClick={() => loadSummary(selectedMonth)}
          disabled={loading}
          style={{
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {/* Month Selector Bar & Quick Jump */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="summary-month-input" style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>
            📅 Month:
          </label>
          <input
            id="summary-month-input"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              backgroundColor: '#ffffff'
            }}
          />
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer'
            }}
            title="Previous Month"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={handleCurrentMonth}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Current Month
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer'
            }}
            title="Next Month"
          >
            ▶
          </button>
        </div>

        {/* Search & Department Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search employee or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              width: '180px'
            }}
          />
          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Active Employees</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
            {filteredData.length}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>Total Present Days</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#15803d', marginTop: '4px' }}>
            {totals.present}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', color: '#d97706', fontWeight: '600' }}>Total Half Days</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#b45309', marginTop: '4px' }}>
            {totals.half}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>Total Absent Days</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#b91c1c', marginTop: '4px' }}>
            {totals.absent}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Deducted in Payroll (ERP6-C1)</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', color: '#4f46e5', fontWeight: '600' }}>Total Leave Days</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#4338ca', marginTop: '4px' }}>
            {totals.leave}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Max 12 days / yr quota</div>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}
        >
          {error}
        </div>
      )}

      {/* Summary Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
            Employee Attendance Breakdown ({selectedMonth})
          </h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {filteredData.length} active employee{filteredData.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            Loading monthly attendance summary...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            No attendance logs found for {selectedMonth}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Employee ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Department</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#16a34a', textAlign: 'center' }}>
                    Present
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#d97706', textAlign: 'center' }}>
                    Half Day
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#dc2626', textAlign: 'center' }}>
                    Absent
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#4f46e5', textAlign: 'center' }}>
                    Leave
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#334155', textAlign: 'center' }}>
                    Total Marked
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#334155', textAlign: 'right' }}>
                    Attendance Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => {
                  const pres = Number(row.present_days) || 0;
                  const half = Number(row.half_days) || 0;
                  const abs = Number(row.absent_days) || 0;
                  const leave = Number(row.leave_days) || 0;
                  const total = Number(row.total_days) || (pres + half + abs + leave);
                  const effectivePresent = pres + (half * 0.5);
                  const rate = total > 0 ? Math.round((effectivePresent / total) * 100) : 0;

                  return (
                    <tr
                      key={row.employee_id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '600', color: '#1e293b' }}>
                        {row.employee_id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>
                        {row.name}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>
                        {row.department_name || row.department_id || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          className="badge-green"
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}
                        >
                          {pres}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          className="badge-amber"
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}
                        >
                          {half}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          className="badge-red"
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}
                        >
                          {abs}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#ede9fe',
                            color: '#5b21b6',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}
                        >
                          {leave}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#334155' }}>
                        {total}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontWeight: '600',
                            color: rate >= 80 ? '#15803d' : rate >= 50 ? '#b45309' : '#b91c1c'
                          }}
                        >
                          {total > 0 ? `${rate}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: '700' }}>
                  <td colSpan={3} style={{ padding: '14px 16px', color: '#1e293b' }}>
                    Total ({filteredData.length} Employees)
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#15803d' }}>
                    {totals.present}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#b45309' }}>
                    {totals.half}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#b91c1c' }}>
                    {totals.absent}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#5b21b6' }}>
                    {totals.leave}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#1e293b' }}>
                    {totals.totalMarked}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#1e293b' }}>
                    {totals.totalMarked > 0
                      ? `${Math.round(((totals.present + totals.half * 0.5) / totals.totalMarked) * 100)}%`
                      : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
