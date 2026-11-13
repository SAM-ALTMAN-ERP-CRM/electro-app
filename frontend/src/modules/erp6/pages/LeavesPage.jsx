import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

export default function LeavesPage() {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Form State
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState('casual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  // Filter state
  const [filterStatus, setFilterStatus] = useState('all');

  // Load active employees and leave requests
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch active employees for dropdown
      const empRes = await api('erp6', '/api/employees?active=true');
      const empList = Array.isArray(empRes) ? empRes : (empRes?.data || []);
      setEmployees(empList);
      if (empList.length > 0 && !employeeId) {
        setEmployeeId(empList[0].id);
      }

      // 2. Fetch leave requests
      const leaveRes = await api('erp6', '/api/leave-requests');
      const leaveList = Array.isArray(leaveRes) ? leaveRes : (leaveRes?.data || []);
      setLeaves(leaveList);
    } catch (err) {
      setError(err.message || 'Failed to load leaves data.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle leave application
  const handleApply = async (e) => {
    e.preventDefault();
    if (!employeeId || !fromDate || !toDate || !type) {
      setError('Please fill in all required fields.');
      return;
    }

    if (toDate < fromDate) {
      setError('To Date cannot be earlier than From Date.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setFeedback('');

      await api('erp6', '/api/leave-requests', {
        method: 'POST',
        body: {
          employee_id: employeeId,
          type,
          from_date: fromDate,
          to_date: toDate,
          reason: reason.trim() || undefined
        }
      });

      setFeedback('Leave request submitted successfully in pending status.');
      setReason('');
      setFromDate('');
      setToDate('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Approve or Reject
  const handleDecision = async (id, decision) => {
    try {
      setActingId(id);
      setError('');
      setFeedback('');

      await api('erp6', `/api/leave-requests/${id}/decision`, {
        method: 'PATCH',
        body: { status: decision }
      });

      setFeedback(`Leave request ${id} ${decision} successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || `Failed to ${decision} leave request.`);
    } finally {
      setActingId(null);
    }
  };

  // Filtered leaves
  const displayedLeaves = leaves.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
          Leave Requests & Quotas
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          Apply for leave, monitor 12-day annual quota, and manage manager approvals.
        </p>
      </div>

      {/* Feedback & Error banners */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {feedback && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#15803d',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}
        >
          ✓ {feedback}
        </div>
      )}

      {/* Two Column Layout: Apply Form & Requests List */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left Column: Apply Form */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
            Apply for Leave
          </h2>
          <form onSubmit={handleApply}>
            {/* Employee Selection */}
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="leave-emp" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Employee *
              </label>
              <select
                id="leave-emp"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  backgroundColor: '#ffffff'
                }}
                required
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.id} — {emp.name} ({emp.role_title})
                  </option>
                ))}
              </select>
            </div>

            {/* Leave Type */}
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="leave-type" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Leave Type *
              </label>
              <select
                id="leave-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  backgroundColor: '#ffffff'
                }}
                required
              >
                <option value="casual">Casual Leave (12d annual quota)</option>
                <option value="sick">Sick Leave</option>
                <option value="earned">Earned Leave</option>
              </select>
            </div>

            {/* From Date */}
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="leave-from" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                From Date *
              </label>
              <input
                id="leave-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px'
                }}
                required
              />
            </div>

            {/* To Date */}
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="leave-to" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                To Date *
              </label>
              <input
                id="leave-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px'
                }}
                required
              />
            </div>

            {/* Reason */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="leave-reason" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Reason / Justification
              </label>
              <textarea
                id="leave-reason"
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief reason for leave request..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Leave Request'}
            </button>

            <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
              ℹ️ Annual balance: max 12 leave days per calendar year.
            </div>
          </form>
        </div>

        {/* Right Column: Requests Table */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          {/* Table Toolbar */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
              Leave Requests & History
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Only</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
              Loading leave requests...
            </div>
          ) : displayedLeaves.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
              No leave requests found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>REQ ID</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>EMPLOYEE</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>PERIOD & TYPE</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>DECISION ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {displayedLeaves.map((reqItem) => {
                  const isPending = reqItem.status === 'pending';
                  const isApproved = reqItem.status === 'approved';
                  const isRejected = reqItem.status === 'rejected';

                  return (
                    <tr key={reqItem.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>{reqItem.id}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '500', color: '#1e293b' }}>{reqItem.employee_name || reqItem.employee_id}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{reqItem.employee_id}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#1e293b' }}>
                          {reqItem.from_date} to {reqItem.to_date}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>
                          {reqItem.type} leave {reqItem.reason ? `· "${reqItem.reason}"` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isPending && (
                          <span
                            className="badge-amber"
                            style={{
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            PENDING
                          </span>
                        )}
                        {isApproved && (
                          <span
                            className="badge-green"
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            APPROVED
                          </span>
                        )}
                        {isRejected && (
                          <span
                            className="badge-red"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            REJECTED
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              disabled={actingId === reqItem.id}
                              onClick={() => handleDecision(reqItem.id, 'approved')}
                              style={{
                                backgroundColor: '#15803d',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: actingId === reqItem.id ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actingId === reqItem.id}
                              onClick={() => handleDecision(reqItem.id, 'rejected')}
                              style={{
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: actingId === reqItem.id ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Decision finalized</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
