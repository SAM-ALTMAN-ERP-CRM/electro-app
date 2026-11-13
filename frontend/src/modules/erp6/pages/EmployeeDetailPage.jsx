import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';

function formatINR(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

const COMMON_ROLES = [
  'Sales Rep',
  'Service Engineer',
  'HR Manager',
  'Warehouse Manager',
  'Finance Manager',
  'Production Supervisor',
  'Admin'
];

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department_id: '',
    role_title: '',
    manager_id: '',
    join_date: '',
    base_salary: '',
    active: true
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  /**
   * Fetch employee details with reporting manager and direct reports.
   */
  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api('erp6', `/api/employees/${id}`);
      const data = res?.data || res;
      setEmployee(data);

      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        department_id: data.department_id || '',
        role_title: data.role_title || '',
        manager_id: data.manager_id || '',
        join_date: data.join_date || '',
        base_salary: data.base_salary ? String(data.base_salary) : '0',
        active: Boolean(data.active)
      });
    } catch (err) {
      setError(err.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * Fetch reference lists (departments and all employees for manager selection).
   */
  useEffect(() => {
    async function loadReferences() {
      try {
        const [deptsRes, empsRes] = await Promise.all([
          api('erp6', '/api/departments'),
          api('erp6', '/api/employees?active=all')
        ]);
        setDepartments(Array.isArray(deptsRes) ? deptsRes : (deptsRes?.data || []));
        setAllEmployees(Array.isArray(empsRes) ? empsRes : (empsRes?.data || []));
      } catch (err) {
        console.error('[erp6] Reference loading error:', err.message);
      }
    }
    loadReferences();
  }, []);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  /**
   * Deactivate or activate employee.
   */
  async function handleToggleActive() {
    if (!employee) return;
    const willDeactivate = employee.active;
    const confirmPrompt = willDeactivate
      ? `Are you sure you want to deactivate ${employee.name} (${employee.id})? They will be hidden from other teams' dropdowns and the default employee list.`
      : `Activate employee ${employee.name} (${employee.id})?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      setTogglingActive(true);
      setError('');
      const endpoint = willDeactivate
        ? `/api/employees/${id}/deactivate`
        : `/api/employees/${id}/activate`;

      await api('erp6', endpoint, { method: 'PATCH' });
      setFeedback(
        willDeactivate
          ? `Employee ${employee.id} has been deactivated.`
          : `Employee ${employee.id} has been reactivated.`
      );
      fetchEmployee();
    } catch (err) {
      setError(err.message || 'Failed to change employee status');
    } finally {
      setTogglingActive(false);
    }
  }

  /**
   * Save edited employee details.
   */
  async function handleSaveEdit(e) {
    e.preventDefault();
    setFormError('');

    // Rule: manager cannot be the employee themself
    if (formData.manager_id && formData.manager_id === id) {
      setFormError('Rule violation: An employee cannot be their own manager.');
      return;
    }

    if (!formData.name.trim()) {
      setFormError('Employee name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }
    if (!formData.role_title.trim()) {
      setFormError('Role title is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        department_id: formData.department_id || null,
        role_title: formData.role_title.trim(),
        manager_id: formData.manager_id || null,
        join_date: formData.join_date,
        base_salary: Number(formData.base_salary) || 0,
        active: Boolean(formData.active)
      };

      await api('erp6', `/api/employees/${id}`, {
        method: 'PUT',
        body: payload
      });

      setFeedback('Employee updated successfully.');
      setShowEditModal(false);
      fetchEmployee();
    } catch (err) {
      setFormError(err.message || 'Failed to update employee.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Loading employee record...</p>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600 }}>Error loading employee {id}:</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{error}</p>
          <div style={{ marginTop: '1rem' }}>
            <Link to="/erp6/employees" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              ← Return to Employee Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const directReports = employee.direct_reports || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to="/erp6/employees"
          style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
        >
          ← Back to Employee Directory
        </Link>
      </div>

      {/* Alerts */}
      {feedback && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          borderRadius: '6px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: '6px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
                {employee.name}
              </h2>
              {employee.active ? (
                <span className="badge badge-green">Active</span>
              ) : (
                <span className="badge badge-red">Inactive</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', color: '#64748b', fontSize: '0.9rem' }}>
              <span>ID: <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{employee.id}</strong></span>
              <span>•</span>
              <span>Role: <strong style={{ color: '#334155' }}>{employee.role_title}</strong></span>
              <span>•</span>
              <span>Department: <strong style={{ color: '#334155' }}>{employee.department_name || 'None'}</strong></span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setShowEditModal(true);
              }}
              style={{
                backgroundColor: '#2563eb',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={togglingActive}
              style={{
                backgroundColor: employee.active ? '#fee2e2' : '#dcfce7',
                color: employee.active ? '#b91c1c' : '#15803d',
                border: `1px solid ${employee.active ? '#fecaca' : '#bbf7d0'}`,
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: togglingActive ? 'not-allowed' : 'pointer'
              }}
            >
              {togglingActive
                ? 'Processing...'
                : employee.active
                  ? 'Deactivate Employee'
                  : 'Activate Employee'}
            </button>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Work Email
            </div>
            <div style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 500, marginTop: '0.2rem' }}>
              {employee.email}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Contact Phone
            </div>
            <div style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 500, marginTop: '0.2rem' }}>
              {employee.phone || 'Not provided'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Date of Joining
            </div>
            <div style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: 500, marginTop: '0.2rem' }}>
              {employee.join_date || 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Monthly Base Salary
            </div>
            <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, marginTop: '0.2rem' }}>
              {formatINR(employee.base_salary)}
            </div>
          </div>
        </div>
      </div>

      {/* Reporting Hierarchy Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Manager Card */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '1.25rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            Reporting Manager
          </h3>

          {employee.manager_id ? (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                  {employee.manager_name || employee.manager_id}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem' }}>
                  Manager ID: <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{employee.manager_id}</span>
                </div>
              </div>
              <Link
                to={`/erp6/employees/${employee.manager_id}`}
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                View Manager Profile →
              </Link>
            </div>
          ) : (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '0.9rem'
            }}>
              Top Level / Executive — No direct reporting manager assigned.
            </div>
          )}
        </div>

        {/* Direct Reports Card */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
              Direct Reports ({directReports.length})
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Staff reporting directly to {employee.name}
            </span>
          </div>

          {directReports.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '0.9rem'
            }}>
              No direct reports are currently assigned to this employee.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ margin: 0, boxShadow: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Email</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {directReports.map(report => (
                    <tr key={report.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                          {report.id}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{report.name}</strong>
                      </td>
                      <td>
                        <span style={{ color: '#334155' }}>{report.role_title}</span>
                      </td>
                      <td>
                        <span className="badge badge-blue">
                          {report.department_name || 'Department'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {report.email}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {report.active ? (
                          <span className="badge badge-green">Active</span>
                        ) : (
                          <span className="badge badge-red">Inactive</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/erp6/employees/${report.id}`}
                          style={{
                            color: '#2563eb',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          View →
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

      {/* Edit Details Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Edit Employee Details ({employee.id})
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              {/* Full Name */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Email & Phone */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.9rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Email Address * (Unique)
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Department & Role */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.9rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="">-- No Department --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    list="role-options-detail"
                    value={formData.role_title}
                    onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                  <datalist id="role-options-detail">
                    {COMMON_ROLES.map(r => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Manager & Join Date */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.9rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Reporting Manager (Rule: Cannot be self)
                  </label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="">-- None (Top Level) --</option>
                    {allEmployees
                      .filter(m => m.id !== id) // Exclude self from manager dropdown
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role_title})
                        </option>
                      ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Join Date
                  </label>
                  <input
                    type="date"
                    value={formData.join_date}
                    onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Base Salary & Active Status */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Base Salary (₹ / month)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1, paddingTop: '1.25rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: 600, color: '#334155' }}>Active Employee</span>
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
