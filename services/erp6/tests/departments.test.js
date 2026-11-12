const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Disable auth enforcement for test environment
process.env.AUTH_REQUIRED = 'false';

const departmentsRouter = require('../routes/departments');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', departmentsRouter);
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

describe('ERP6 Departments API Test Suite', () => {
  const app = createTestApp();
  let createdDeptId = null;

  it('GET /api/departments returns seeded departments (DEP-01 to DEP-05)', async () => {
    const res = await request(app, 'GET', '/api/departments');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);

    const ids = res.body.data.map(d => d.id);
    assert.ok(ids.includes('DEP-01'));
    assert.ok(ids.includes('DEP-02'));
    assert.ok(ids.includes('DEP-03'));
    assert.ok(ids.includes('DEP-04'));
    assert.ok(ids.includes('DEP-05'));
  });

  it('GET /api/departments?q=Sales filters by name', async () => {
    const res = await request(app, 'GET', '/api/departments?q=Sales');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some(d => d.id === 'DEP-01' && d.name === 'Sales'));
  });

  it('GET /api/departments/:id returns single department', async () => {
    const res = await request(app, 'GET', '/api/departments/DEP-01');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'DEP-01');
    assert.equal(res.body.data.name, 'Sales');
  });

  it('GET /api/departments/:id returns 404 for nonexistent id', async () => {
    const res = await request(app, 'GET', '/api/departments/DEP-999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('POST /api/departments creates a new department', async () => {
    const res = await request(app, 'POST', '/api/departments', {
      name: 'Legal & Compliance'
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.name, 'Legal & Compliance');
    createdDeptId = res.body.data.id;
  });

  it('POST /api/departments returns 400 when name is missing', async () => {
    const res = await request(app, 'POST', '/api/departments', {});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('PUT /api/departments/:id updates the department name', async () => {
    const res = await request(app, 'PUT', `/api/departments/${createdDeptId}`, {
      name: 'Legal & Risk Management'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Legal & Risk Management');
  });

  it('DELETE /api/departments/:id fails with 400 if employees exist in department', async () => {
    const res = await request(app, 'DELETE', '/api/departments/DEP-01');
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('assigned employees'));
  });

  it('DELETE /api/departments/:id deletes empty department', async () => {
    const res = await request(app, 'DELETE', `/api/departments/${createdDeptId}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.message);
  });

  after(async () => {
    if (departmentsRouter.pool) {
      await departmentsRouter.pool.end();
    }
  });
});
