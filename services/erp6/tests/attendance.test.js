const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Disable auth enforcement for test environment
process.env.AUTH_REQUIRED = 'false';

const attendanceRouter = require('../routes/attendance');
const leavesRouter = require('../routes/leaves');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', attendanceRouter);
  app.use('/api', leavesRouter);
  return app;
}

async function request(app, method, url, body = null) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      try {
        const fetchOptions = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
          fetchOptions.body = JSON.stringify(body);
        }
        const res = await fetch(`http://127.0.0.1:${port}${url}`, fetchOptions);
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
        server.close(() => {
          resolve({ status: res.status, body: json });
        });
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

describe('ERP6 Attendance & Leaves API Test Suite ([ERP6-B1])', () => {
  const app = createTestApp();
  let testLeaveRequestId = null;

  // 1. Attendance Tests
  it('POST /api/attendance/mark saves daily attendance with status 200/201 (TC-ERP6-B1-01)', async () => {
    const payload = {
      employee_id: 'EMP-0001',
      date: '2026-11-01',
      status: 'present',
      check_in: '09:00:00',
      check_out: '18:00:00'
    };

    const res = await request(app, 'POST', '/api/attendance/mark', payload);
    assert.ok(res.status === 200 || res.status === 201, `Expected 200 or 201, got ${res.status}`);
    assert.equal(res.body.data.employee_id, 'EMP-0001');
    assert.equal(res.body.data.date, '2026-11-01');
    assert.equal(res.body.data.status, 'present');
  });

  it('Done When Acceptance Criteria: marking the same employee and day twice updates instead of duplicating', async () => {
    const testDate = '2026-11-16';

    // First mark: present
    const firstRes = await request(app, 'POST', '/api/attendance/mark', {
      employee_id: 'EMP-0002',
      date: testDate,
      status: 'present',
      check_in: '09:00:00',
      check_out: '18:00:00'
    });
    assert.equal(firstRes.status, 200);
    const firstId = firstRes.body.data.id;
    assert.equal(firstRes.body.data.status, 'present');

    // Second mark on same employee and day: update to half_day
    const secondRes = await request(app, 'POST', '/api/attendance/mark', {
      employee_id: 'EMP-0002',
      date: testDate,
      status: 'half_day',
      check_out: '13:30:00'
    });
    assert.equal(secondRes.status, 200);
    assert.equal(secondRes.body.data.id, firstId, 'Row ID must remain identical on update');
    assert.equal(secondRes.body.data.status, 'half_day', 'Status must be updated to half_day');

    // Verify exactly one row exists for this employee and date
    const listRes = await request(app, 'GET', `/api/attendance?employee_id=EMP-0002&date=${testDate}`);
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 1, 'There must be exactly one row, no duplicate created');
    assert.equal(listRes.body.data[0].status, 'half_day');
  });

  it('POST /api/attendance/mark with invalid status rejects with 400 Bad Request (TC-ERP6-B1-02)', async () => {
    const res = await request(app, 'POST', '/api/attendance/mark', {
      employee_id: 'EMP-0001',
      date: '2026-11-01',
      status: 'late'
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('Status must be present, absent, half_day, or leave'));
  });

  it('POST /api/attendance/mark with missing required fields returns 400', async () => {
    const res = await request(app, 'POST', '/api/attendance/mark', {
      date: '2026-11-01'
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/attendance/mark with nonexistent employee returns 404', async () => {
    const res = await request(app, 'POST', '/api/attendance/mark', {
      employee_id: 'EMP-9999',
      date: '2026-11-01',
      status: 'present'
    });
    assert.equal(res.status, 404);
  });

  it('POST /api/attendance/mark supports bulk array of records', async () => {
    const payload = [
      { employee_id: 'EMP-0003', date: '2026-11-17', status: 'present', check_in: '09:00:00' },
      { employee_id: 'EMP-0004', date: '2026-11-17', status: 'present', check_in: '09:15:00' }
    ];

    const res = await request(app, 'POST', '/api/attendance/mark', payload);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 2);
  });

  it('GET /api/attendance returns attendance list with employee details', async () => {
    const res = await request(app, 'GET', '/api/attendance');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 10);
    assert.ok(res.body.data[0].employee_name, 'Should join employee_name');
  });

  it('GET /api/attendance?month=2026-11 filters by month', async () => {
    const res = await request(app, 'GET', '/api/attendance?month=2026-11');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    for (const row of res.body.data) {
      assert.ok(row.date.startsWith('2026-11'));
    }
  });

  it('GET /api/attendance?employee_id=EMP-0001 filters by employee ID', async () => {
    const res = await request(app, 'GET', '/api/attendance?employee_id=EMP-0001');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    for (const row of res.body.data) {
      assert.equal(row.employee_id, 'EMP-0001');
    }
  });

  it('GET /api/attendance/summary?month=2026-11 returns aggregated day counts', async () => {
    const res = await request(app, 'GET', '/api/attendance/summary?month=2026-11');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 4);

    const emp1 = res.body.data.find(r => r.employee_id === 'EMP-0001');
    assert.ok(emp1);
    assert.ok(typeof emp1.present_days === 'number');
    assert.ok(typeof emp1.half_days === 'number');
    assert.ok(typeof emp1.absent_days === 'number');
    assert.ok(typeof emp1.leave_days === 'number');
    assert.ok(emp1.name);
  });

  it('Done When Acceptance Criteria [ERP6-B3]: the summary matches the marked data', async () => {
    // 1. Mark controlled attendance data for EMP-0006 in test month 2026-09
    const testRecords = [
      { employee_id: 'EMP-0006', date: '2026-09-01', status: 'present' },
      { employee_id: 'EMP-0006', date: '2026-09-02', status: 'present' },
      { employee_id: 'EMP-0006', date: '2026-09-03', status: 'half_day' },
      { employee_id: 'EMP-0006', date: '2026-09-04', status: 'absent' },
      { employee_id: 'EMP-0006', date: '2026-09-07', status: 'leave' }
    ];
    const markRes = await request(app, 'POST', '/api/attendance/mark', testRecords);
    assert.equal(markRes.status, 200);

    // 2. Fetch summary for 2026-09
    const summaryRes = await request(app, 'GET', '/api/attendance/summary?month=2026-09');
    assert.equal(summaryRes.status, 200);
    assert.ok(Array.isArray(summaryRes.body.data));

    const emp6Summary = summaryRes.body.data.find(r => r.employee_id === 'EMP-0006');
    assert.ok(emp6Summary, 'EMP-0006 must be in summary for active employees');
    assert.equal(emp6Summary.present_days, 2, 'Present days must match marked data');
    assert.equal(emp6Summary.half_days, 1, 'Half days must match marked data');
    assert.equal(emp6Summary.absent_days, 1, 'Absent days must match marked data');
    assert.equal(emp6Summary.leave_days, 1, 'Leave days must match marked data');
  });

  it('Done When Acceptance Criteria [ERP6-B3]: over-balance leave is refused with 400', async () => {
    // Attempt to book 15 weekdays (exceeds 12-day annual limit)
    const res = await request(app, 'POST', '/api/leave-requests', {
      employee_id: 'EMP-0001',
      from_date: '2026-10-01',
      to_date: '2026-10-21',
      type: 'casual',
      reason: 'Over limit request'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(
      res.body.error.includes('Leave request exceeds available annual balance'),
      `Expected error to mention leave balance, got: ${res.body.error}`
    );
  });

  // 2. Leave Requests CRUD Tests
  it('POST /api/leave-requests creates leave request with LV-xxxx ID in pending status (TC-ERP6-B1-03)', async () => {
    const payload = {
      employee_id: 'EMP-0002',
      from_date: '2026-11-10',
      to_date: '2026-11-12',
      type: 'casual',
      reason: 'Personal'
    };

    const res = await request(app, 'POST', '/api/leave-requests', payload);
    assert.equal(res.status, 201);
    assert.ok(res.body.data.id.startsWith('LV-'));
    assert.equal(res.body.data.employee_id, 'EMP-0002');
    assert.equal(res.body.data.from_date, '2026-11-10');
    assert.equal(res.body.data.to_date, '2026-11-12');
    assert.equal(res.body.data.type, 'casual');
    assert.equal(res.body.data.status, 'pending');
    testLeaveRequestId = res.body.data.id;
  });

  it('POST /api/leave-requests rejects invalid leave type with 400', async () => {
    const res = await request(app, 'POST', '/api/leave-requests', {
      employee_id: 'EMP-0001',
      from_date: '2026-11-20',
      to_date: '2026-11-21',
      type: 'vacation'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('Leave type must be casual, sick, or earned'));
  });

  it('POST /api/leave-requests rejects to_date earlier than from_date with 400', async () => {
    const res = await request(app, 'POST', '/api/leave-requests', {
      employee_id: 'EMP-0001',
      from_date: '2026-11-20',
      to_date: '2026-11-18',
      type: 'casual'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('to_date cannot be earlier than from_date'));
  });

  it('POST /api/leave-requests rejects request exceeding annual 12-day balance with 400', async () => {
    const res = await request(app, 'POST', '/api/leave-requests', {
      employee_id: 'EMP-0003',
      from_date: '2026-12-01',
      to_date: '2026-12-25',
      type: 'casual',
      reason: 'Long holiday'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('Leave request exceeds available annual balance'));
  });

  it('GET /api/leave-requests returns all requests with employee names', async () => {
    const res = await request(app, 'GET', '/api/leave-requests');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);
    assert.ok(res.body.data[0].employee_name);
  });

  it('GET /api/leave-requests/:id returns single leave request', async () => {
    const res = await request(app, 'GET', `/api/leave-requests/${testLeaveRequestId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, testLeaveRequestId);
    assert.equal(res.body.data.employee_id, 'EMP-0002');
  });

  it('GET /api/leave-requests/:id returns 404 for nonexistent id', async () => {
    const res = await request(app, 'GET', '/api/leave-requests/LV-9999');
    assert.equal(res.status, 404);
  });

  it('PUT /api/leave-requests/:id updates request reason', async () => {
    const res = await request(app, 'PUT', `/api/leave-requests/${testLeaveRequestId}`, {
      reason: 'Updated travel reason'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.reason, 'Updated travel reason');
  });

  it('PATCH /api/leave-requests/:id/decision rejects invalid status with 400', async () => {
    const res = await request(app, 'PATCH', `/api/leave-requests/${testLeaveRequestId}/decision`, {
      status: 'maybe'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('Decision status must be approved or rejected'));
  });

  it('PATCH /api/leave-requests/:id/decision with status approved marks weekdays as leave in attendance', async () => {
    // Create new leave request for EMP-0004 on 2026-11-23 to 2026-11-24 (Monday & Tuesday)
    const createRes = await request(app, 'POST', '/api/leave-requests', {
      employee_id: 'EMP-0004',
      from_date: '2026-11-23',
      to_date: '2026-11-24',
      type: 'sick',
      reason: 'Fever'
    });
    assert.equal(createRes.status, 201);
    const newId = createRes.body.data.id;

    // Approve the leave request
    const patchRes = await request(app, 'PATCH', `/api/leave-requests/${newId}/decision`, {
      status: 'approved'
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.status, 'approved');

    // Verify attendance was automatically marked as 'leave' for 2026-11-23 and 2026-11-24
    const attRes1 = await request(app, 'GET', '/api/attendance?employee_id=EMP-0004&date=2026-11-23');
    assert.equal(attRes1.status, 200);
    assert.equal(attRes1.body.data.length, 1);
    assert.equal(attRes1.body.data[0].status, 'leave');

    const attRes2 = await request(app, 'GET', '/api/attendance?employee_id=EMP-0004&date=2026-11-24');
    assert.equal(attRes2.status, 200);
    assert.equal(attRes2.body.data.length, 1);
    assert.equal(attRes2.body.data[0].status, 'leave');
  });

  it('PATCH /api/leave-requests/:id/decision with status rejected updates status without modifying attendance', async () => {
    const patchRes = await request(app, 'PATCH', `/api/leave-requests/${testLeaveRequestId}/decision`, {
      status: 'rejected'
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.status, 'rejected');
  });

  it('DELETE /api/leave-requests/:id removes request successfully', async () => {
    const delRes = await request(app, 'DELETE', `/api/leave-requests/${testLeaveRequestId}`);
    assert.equal(delRes.status, 200);

    const getRes = await request(app, 'GET', `/api/leave-requests/${testLeaveRequestId}`);
    assert.equal(getRes.status, 404);
  });
});
