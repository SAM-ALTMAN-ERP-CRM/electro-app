import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

/**
 * Format numeric currency amount in Indian Rupees (₹) with 2 decimals.
 * Example: 45000 -> ₹45,000.00
 */
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Modal / Form state
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department_id: '',
    role_title: 'Sales Rep',
    manager_id: '',
    join_date: new Date().toISOString().split('T')[0],
    base_salary: '45000',
    active: true
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Fetch departments for dropdown filters and forms.
   */
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api('erp6', '/api/departments');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setDepartments(list);
    } catch (err) {
      console.error('[erp6] Failed to load departments:', err.message);
    }
  }, []);

  /**
   * Fetch employees with search and department filtering.
   */
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      if (departmentFilter.trim()) {
        params.append('department', departmentFilter.trim());
      }
      params.append('active', 'all'); // Show all employees in management directory

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api('erp6', `/api/employees${queryString}`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setEmployees(list);
    } catch (err) {
      setError(err.message || 'Failed to load employees from ERP-6');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, departmentFilter]);

  // Initial load
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Load employees when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  /**
   * Open the modal to add a new employee.
   */
  function handleOpenAdd() {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      department_id: departments[0]?.id || 'DEP-01',
      role_title: 'Sales Rep',
      manager_id: '',
      join_date: new Date().toISOString().split('T')[0],
      base_salary: '45000',
      active: true
    });
    setFormError('');
    setShowForm(true);
  }

  /**
   * Open the modal to edit an existing employee.
   */
  function handleOpenEdit(emp) {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      department_id: emp.department_id || '',
      role_title: emp.role_title || '',
      manager_id: emp.manager_id || '',
      join_date: emp.join_date || new Date().toISOString().split('T')[0],
      base_salary: emp.base_salary ? String(emp.base_salary) : '0',
      active: emp.active !== undefined ? emp.active : true
    });
    setFormError('');
    setShowForm(true);
  }

  /**
   * Submit Add or Edit employee form.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

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
      setSubmitting(true);
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

      if (editingEmployee) {
        await api('erp6', `/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          body: payload
        });
        setFeedback(`Employee ${editingEmployee.id} (${payload.name}) updated successfully.`);
      } else {
        const created = await api('erp6', '/api/employees', {
          method: 'POST',
          body: payload
        });
        const newId = created?.id || 'New employee';
        setFeedback(`Employee ${newId} (${payload.name}) created successfully.`);
      }

      setShowForm(false);
      fetchEmployees();
    } catch (err) {
      setFormError(err.message || 'Operation failed. Please verify input data.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Employee Directory</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage staff profiles, department assignments, reporting lines, and compensation.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            backgroundColor: '#2563eb',
            color: '#fff',
            padding: '0.6rem 1.2rem',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          + Add Employee
        </button>
      </div>

      {/* Feedback & Error Alerts */}
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

      {/* Filter Toolbar */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center'
      }}>
        {/* Search input */}
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
            Search Employees
          </label>
          <input
            type="text"
            placeholder="Search by name, email, phone, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Department filter */}
        <div style={{ flex: '0 1 220px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
            Department
          </label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: '#fff'
            }}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.id})
              </option>
            ))}
          </select>
        </div>

        {/* Total count badge */}
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', paddingBottom: '0.3rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Showing <strong>{employees.length}</strong> {employees.length === 1 ? 'employee' : 'employees'}
          </span>
        </div>
      </div>

      {/* Employees Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>Loading employees...</p>
        </div>
      ) : employees.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>No employees found</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Try adjusting your search query or department filter, or click "+ Add Employee" to create one.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ margin: 0, boxShadow: 'none' }}>
            <thead>
              <tr>
                <th style={{ width: '95px' }}>ID</th>
                <th>Name</th>
                <th>Role / Title</th>
                <th>Department</th>
                <th>Contact</th>
                <th>Manager</th>
                <th style={{ textAlign: 'right' }}>Base Salary</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                      {emp.id}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{emp.name}</strong>
                  </td>
                  <td>
                    <span style={{ color: '#334155', fontWeight: 500 }}>{emp.role_title}</span>
                  </td>
                  <td>
                    {emp.department_name ? (
                      <span className="badge badge-blue">
                        {emp.department_name}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>None</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: '#334155' }}>{emp.email}</div>
                    {emp.phone && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.phone}</div>
                    )}
                  </td>
                  <td>
                    {emp.manager_name ? (
                      <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                        {emp.manager_name}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>None</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                    {formatINR(emp.base_salary)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {emp.active ? (
                      <span className="badge badge-green">Active</span>
                    ) : (
                      <span className="badge badge-red">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(emp)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                {editingEmployee ? `Edit Employee (${editingEmployee.id})` : 'Add New Employee'}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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

            <form onSubmit={handleSubmit}>
              {/* Full Name */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Kulkarni"
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
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@electro.com"
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
                    placeholder="9820011101"
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
                    list="role-options"
                    placeholder="e.g. Sales Rep"
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
                  <datalist id="role-options">
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
                    Reporting Manager
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
                    {employees
                      .filter(m => !editingEmployee || m.id !== editingEmployee.id)
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
                    placeholder="45000"
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
                  onClick={() => setShowForm(false)}
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
                  disabled={submitting}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : editingEmployee ? 'Save Changes' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
