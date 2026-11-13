const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Disable auth enforcement for test environment
process.env.AUTH_REQUIRED = 'false';

const employeesRouter = require('../routes/employees');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', employeesRouter);
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

describe('ERP6 Employees API Test Suite ([ERP6-A1])', () => {
  const app = createTestApp();
  let createdEmpId = null;

  it('GET /api/employees returns all 12 seeded employees', async () => {
    const res = await request(app, 'GET', '/api/employees');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 12);
  });

  it('GET /api/employees?role_title=Sales Rep returns exactly 4 rows (EMP-0001..EMP-0004)', async () => {
    const res = await request(app, 'GET', '/api/employees?role_title=Sales%20Rep');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 4);

    const ids = res.body.data.map(e => e.id);
    assert.deepEqual(ids.sort(), ['EMP-0001', 'EMP-0002', 'EMP-0003', 'EMP-0004'].sort());
    res.body.data.forEach(e => {
      assert.equal(e.role_title, 'Sales Rep');
      assert.equal(e.active, true);
    });
  });

  it('GET /api/employees?role_title=Service Engineer returns exactly 3 rows (EMP-0005..EMP-0007)', async () => {
    const res = await request(app, 'GET', '/api/employees?role_title=Service%20Engineer');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 3);

    const ids = res.body.data.map(e => e.id);
    assert.deepEqual(ids.sort(), ['EMP-0005', 'EMP-0006', 'EMP-0007'].sort());
    res.body.data.forEach(e => {
      assert.equal(e.role_title, 'Service Engineer');
      assert.equal(e.active, true);
    });
  });

  it('GET /api/employees?department=DEP-01 filters by department ID', async () => {
    const res = await request(app, 'GET', '/api/employees?department=DEP-01');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 4);
    res.body.data.forEach(e => {
      assert.equal(e.department_id, 'DEP-01');
    });
  });

  it('GET /api/employees?department=Sales filters by department name', async () => {
    const res = await request(app, 'GET', '/api/employees?department=Sales');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 4);
  });

  it('GET /api/employees?q=Rohan searches by text query', async () => {
    const res = await request(app, 'GET', '/api/employees?q=Rohan');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, 'EMP-0001');
    assert.equal(res.body.data[0].name, 'Rohan Kulkarni');
  });

  it('GET /api/employees/:id returns single employee with department and manager names', async () => {
    const res = await request(app, 'GET', '/api/employees/EMP-0001');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'EMP-0001');
    assert.equal(res.body.data.name, 'Rohan Kulkarni');
    assert.equal(res.body.data.role_title, 'Sales Rep');
    assert.equal(res.body.data.department_name, 'Sales');
    assert.equal(res.body.data.manager_id, 'EMP-0012');
    assert.equal(res.body.data.manager_name, 'Rahul Verma');
  });

  it('GET /api/employees/:id returns 404 for unknown employee', async () => {
    const res = await request(app, 'GET', '/api/employees/EMP-9999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('POST /api/employees creates a new employee and returns 201', async () => {
    const res = await request(app, 'POST', '/api/employees', {
      name: 'Aditi Deshpande',
      email: 'aditi.deshpande@electro.com',
      phone: '9820011199',
      department_id: 'DEP-01',
      role_title: 'Junior Sales Rep',
      manager_id: 'EMP-0001',
      join_date: '2026-01-10',
      base_salary: 35000.00,
      active: true
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id.startsWith('EMP-'));
    assert.equal(res.body.data.name, 'Aditi Deshpande');
    assert.equal(res.body.data.department_name, 'Sales');
    assert.equal(res.body.data.manager_name, 'Rohan Kulkarni');
    createdEmpId = res.body.data.id;
  });

  it('POST /api/employees returns 409 on duplicate email', async () => {
    const res = await request(app, 'POST', '/api/employees', {
      name: 'Duplicate Rohan',
      email: 'rohan.kulkarni@electro.com',
      role_title: 'Sales Rep'
    });
    assert.equal(res.status, 409);
    assert.ok(res.body.error.includes('already exists'));
  });

  it('POST /api/employees returns 400 when required fields are missing', async () => {
    const res = await request(app, 'POST', '/api/employees', {
      name: 'Missing Fields'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('PUT /api/employees/:id returns 400 if employee is set as their own manager', async () => {
    const res = await request(app, 'PUT', `/api/employees/${createdEmpId}`, {
      manager_id: createdEmpId
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('cannot be their own manager'));
  });

  it('PUT /api/employees/:id successfully updates details', async () => {
    const res = await request(app, 'PUT', `/api/employees/${createdEmpId}`, {
      role_title: 'Senior Sales Rep',
      base_salary: 48000.00
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.role_title, 'Senior Sales Rep');
    assert.equal(parseFloat(res.body.data.base_salary), 48000.00);
  });

  it('DELETE /api/employees/:id deletes employee successfully', async () => {
    const res = await request(app, 'DELETE', `/api/employees/${createdEmpId}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.message);

    const getRes = await request(app, 'GET', `/api/employees/${createdEmpId}`);
    assert.equal(getRes.status, 404);
  });

  it('GET /api/employees/:id returns direct reports list (ERP6-A3)', async () => {
    // EMP-0012 (Rahul Verma - Admin) is manager of EMP-0001..0010
    const res = await request(app, 'GET', '/api/employees/EMP-0012');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.direct_reports));
    assert.ok(res.body.data.direct_reports.length > 0);
    const reportIds = res.body.data.direct_reports.map(r => r.id);
    assert.ok(reportIds.includes('EMP-0001'));
  });

  it('PATCH /api/employees/:id/deactivate deactivates employee and hides from default list (ERP6-A3)', async () => {
    // Deactivate EMP-0004 (Sales Rep)
    const deactRes = await request(app, 'PATCH', '/api/employees/EMP-0004/deactivate');
    assert.equal(deactRes.status, 200);
    assert.equal(deactRes.body.data.active, false);

    // Default list hides inactive staff
    const listRes = await request(app, 'GET', '/api/employees?role_title=Sales%20Rep');
    assert.equal(listRes.status, 200);
    const repIds = listRes.body.data.map(r => r.id);
    assert.ok(!repIds.includes('EMP-0004'), 'Deactivated employee must not appear in default role_title query');
    assert.equal(listRes.body.data.length, 3); // 3 active Sales Reps remain

    // ?active=all includes deactivated employee
    const allRes = await request(app, 'GET', '/api/employees?role_title=Sales%20Rep&active=all');
    assert.equal(allRes.status, 200);
    assert.equal(allRes.body.data.length, 4);

    // Reactivate EMP-0004 to maintain clean seed state
    const actRes = await request(app, 'PATCH', '/api/employees/EMP-0004/activate');
    assert.equal(actRes.status, 200);
    assert.equal(actRes.body.data.active, true);
  });

  after(async () => {
    if (employeesRouter.pool) {
      await employeesRouter.pool.end();
    }
  });
});
