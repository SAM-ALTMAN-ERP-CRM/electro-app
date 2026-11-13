import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Add department form state
  const [newDeptName, setNewDeptName] = useState('');
  const [adding, setAdding] = useState(false);

  // Rename inline state
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [updating, setUpdating] = useState(false);

  /**
   * Fetch all departments from ERP-6 backend.
   */
  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api('erp6', '/api/departments');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setDepartments(list);
    } catch (err) {
      setError(err.message || 'Failed to load departments from ERP-6');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  /**
   * Handle adding a new department.
   */
  async function handleAdd(e) {
    e.preventDefault();
    if (!newDeptName.trim()) {
      setError('Department name cannot be blank.');
      return;
    }

    try {
      setAdding(true);
      setError('');
      const res = await api('erp6', '/api/departments', {
        method: 'POST',
        body: { name: newDeptName.trim() }
      });
      const createdId = res?.id || res?.data?.id || 'New department';
      setFeedback(`Department ${createdId} ("${newDeptName.trim()}") added successfully.`);
      setNewDeptName('');
      fetchDepartments();
    } catch (err) {
      setError(err.message || 'Failed to add department');
    } finally {
      setAdding(false);
    }
  }

  /**
   * Start renaming a department.
   */
  function startRename(dept) {
    setEditingId(dept.id);
    setEditingName(dept.name);
    setError('');
    setFeedback('');
  }

  /**
   * Cancel renaming.
   */
  function cancelRename() {
    setEditingId(null);
    setEditingName('');
  }

  /**
   * Save renamed department.
   */
  async function handleRename(id) {
    if (!editingName.trim()) {
      setError('Department name cannot be blank.');
      return;
    }

    try {
      setUpdating(true);
      setError('');
      await api('erp6', `/api/departments/${id}`, {
        method: 'PUT',
        body: { name: editingName.trim() }
      });
      setFeedback(`Department ${id} renamed to "${editingName.trim()}" successfully.`);
      setEditingId(null);
      setEditingName('');
      fetchDepartments();
    } catch (err) {
      setError(err.message || 'Failed to rename department');
    } finally {
      setUpdating(false);
    }
  }

  /**
   * Delete a department.
   */
  async function handleDelete(id, name) {
    if (!window.confirm(`Are you sure you want to delete department ${id} ("${name}")?`)) {
      return;
    }

    try {
      setError('');
      await api('erp6', `/api/departments/${id}`, {
        method: 'DELETE'
      });
      setFeedback(`Department ${id} deleted successfully.`);
      fetchDepartments();
    } catch (err) {
      setError(err.message || 'Failed to delete department');
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Departments Master</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Configure organizational departments, administrative units, and functional divisions.
        </p>
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

      {/* Add Department Card */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
          Add New Department
        </h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            required
            placeholder="e.g. Legal & Compliance"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            style={{
              flex: '1 1 280px',
              padding: '0.55rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          />
          <button
            type="submit"
            disabled={adding}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: '0.55rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: adding ? 'not-allowed' : 'pointer'
            }}
          >
            {adding ? 'Adding...' : 'Add Department'}
          </button>
        </form>
      </div>

      {/* Departments Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>Loading departments...</p>
        </div>
      ) : departments.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>No departments found</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Add your first department using the form above.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ margin: 0, boxShadow: 'none' }}>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>ID</th>
                <th>Department Name</th>
                <th style={{ textAlign: 'right', width: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                      {dept.id}
                    </span>
                  </td>
                  <td>
                    {editingId === dept.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          style={{
                            padding: '0.35rem 0.6rem',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            flex: 1
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(dept.id)}
                          disabled={updating}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            backgroundColor: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          style={{
                            padding: '0.35rem 0.6rem',
                            fontSize: '0.8rem',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                        {dept.name}
                      </strong>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {editingId !== dept.id && (
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => startRename(dept)}
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
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(dept.id, dept.name)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.8rem',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
