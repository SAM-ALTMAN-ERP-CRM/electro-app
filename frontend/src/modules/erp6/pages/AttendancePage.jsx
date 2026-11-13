import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

export default function AttendancePage() {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // employee_id -> { status, check_in, check_out }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch employees and current day attendance
  const loadData = useCallback(async (date) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      // 1. Fetch active employees
      const empRes = await api('erp6', '/api/employees?active=true');
      const empList = Array.isArray(empRes) ? empRes : (empRes?.data || []);
      setEmployees(empList);

      // 2. Fetch existing attendance for selected date
      const attRes = await api('erp6', `/api/attendance?date=${date}`);
      const attList = Array.isArray(attRes) ? attRes : (attRes?.data || []);

      const map = {};
      // Initialize with defaults for all employees
      for (const emp of empList) {
        map[emp.id] = { status: 'present', check_in: '09:00:00', check_out: '18:00:00' };
      }
      // Overlay existing records
      for (const rec of attList) {
        map[rec.employee_id] = {
          status: rec.status,
          check_in: rec.check_in || '',
          check_out: rec.check_out || ''
        };
      }
      setAttendanceMap(map);
    } catch (err) {
      setError(err.message || 'Failed to load attendance roster.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  const handleStatusChange = (empId, newStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status: newStatus,
        check_in: newStatus === 'absent' || newStatus === 'leave' ? '' : (prev[empId]?.check_in || '09:00:00')
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');

      const payload = employees.map((emp) => {
        const att = attendanceMap[emp.id] || { status: 'present' };
        return {
          employee_id: emp.id,
          date: selectedDate,
          status: att.status,
          check_in: att.check_in || null,
          check_out: att.check_out || null
        };
      });

      await api('erp6', '/api/attendance/mark', {
        method: 'POST',
        body: payload
      });

      setSuccessMsg(`Attendance for ${selectedDate} saved successfully.`);
      // Reload updated records
      await loadData(selectedDate);
    } catch (err) {
      setError(err.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Summary counts
  const presentCount = Object.values(attendanceMap).filter((v) => v.status === 'present').length;
  const halfDayCount = Object.values(attendanceMap).filter((v) => v.status === 'half_day').length;
  const absentCount = Object.values(attendanceMap).filter((v) => v.status === 'absent').length;
  const leaveCount = Object.values(attendanceMap).filter((v) => v.status === 'leave').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            Daily Attendance Marker
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            Mark daily present, absent, half-day, or leave logs. Synchronized with monthly payroll.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading || employees.length === 0}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saving || loading ? 'not-allowed' : 'pointer',
            opacity: saving || loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {saving ? 'Saving...' : '💾 Save Attendance'}
        </button>
      </div>

      {/* Date Controls & Stat Badges */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label htmlFor="att-date" style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>
            📅 Select Date:
          </label>
          <input
            id="att-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              backgroundColor: '#ffffff'
            }}
          />
          <button
            type="button"
            onClick={() => setSelectedDate(getTodayStr())}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Today
          </button>
        </div>

        {/* Status Counters */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <span
            className="badge-green"
            style={{
              backgroundColor: '#dcfce7',
              color: '#15803d',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            Present: {presentCount}
          </span>
          <span
            className="badge-amber"
            style={{
              backgroundColor: '#fef3c7',
              color: '#b45309',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            Half Day: {halfDayCount}
          </span>
          <span
            className="badge-red"
            style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            Absent: {absentCount}
          </span>
          <span
            style={{
              backgroundColor: '#e0e7ff',
              color: '#4338ca',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            Leave: {leaveCount}
          </span>
        </div>
      </div>

      {/* Feedback & Error Alerts */}
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

      {successMsg && (
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
          ✓ {successMsg}
        </div>
      )}

      {/* Attendance Roster Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
            Loading employee roster...
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
            No active employees found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>EMP ID</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>EMPLOYEE NAME</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>DEPARTMENT / ROLE</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>STATUS SELECTION</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>CURRENT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const currentStatus = attendanceMap[emp.id]?.status || 'present';
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>{emp.id}</td>
                    <td style={{ padding: '14px 16px', color: '#1e293b', fontWeight: '500' }}>{emp.name}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      {emp.department_name || emp.department_id || '—'} · {emp.role_title}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`status-${emp.id}`}
                            value="present"
                            checked={currentStatus === 'present'}
                            onChange={() => handleStatusChange(emp.id, 'present')}
                          />
                          <span style={{ fontSize: '13px', color: '#15803d', fontWeight: '500' }}>Present</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`status-${emp.id}`}
                            value="half_day"
                            checked={currentStatus === 'half_day'}
                            onChange={() => handleStatusChange(emp.id, 'half_day')}
                          />
                          <span style={{ fontSize: '13px', color: '#b45309', fontWeight: '500' }}>Half Day</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`status-${emp.id}`}
                            value="absent"
                            checked={currentStatus === 'absent'}
                            onChange={() => handleStatusChange(emp.id, 'absent')}
                          />
                          <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: '500' }}>Absent</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`status-${emp.id}`}
                            value="leave"
                            checked={currentStatus === 'leave'}
                            onChange={() => handleStatusChange(emp.id, 'leave')}
                          />
                          <span style={{ fontSize: '13px', color: '#4338ca', fontWeight: '500' }}>Leave</span>
                        </label>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {currentStatus === 'present' && (
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
                          PRESENT
                        </span>
                      )}
                      {currentStatus === 'half_day' && (
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
                          HALF DAY
                        </span>
                      )}
                      {currentStatus === 'absent' && (
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
                          ABSENT
                        </span>
                      )}
                      {currentStatus === 'leave' && (
                        <span
                          style={{
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          ON LEAVE
                        </span>
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
  );
}
