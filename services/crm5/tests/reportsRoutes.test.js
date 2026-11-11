const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const reportsRouter = require('../routes/reports');

function dispatch(router, options) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const req = {
      method: options.method || 'GET',
      url: options.url || '/',
      originalUrl: options.url || '/',
      body: options.body || {},
      query: options.query || {},
      params: options.params || {},
      headers: options.headers || {},
      user: options.user || { id: 'USR-0001', name: 'Admin', role: 'admin' }
    };

    const res = {
      statusCode: 200,
      status(code) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: statusCode, body: data });
      },
      send(data) {
        resolve({ status: statusCode, body: data });
      }
    };

    router(req, res, () => {
      resolve({ status: 404, body: { error: 'Not Handled' } });
    });
  });
}

describe('CRM-5 Reports Routes', () => {
  it('Admin gets all reports', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports',
      user: { role: 'admin' }
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 6, 'Admin should see all reports');
  });

  it('Sales role gets only sales reports', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports',
      headers: { 'x-user-role': 'sales' }
    });

    assert.equal(res.status, 200);
    const ids = res.body.data.map(r => r.id);
    assert.ok(ids.includes('sales-by-rep'));
    assert.ok(ids.includes('conversion-rate'));
    assert.ok(!ids.includes('tickets-by-priority'), 'Sales must not see support reports');
    assert.ok(!ids.includes('won-revenue-by-month'), 'Sales must not see finance reports');
  });

  it('Support role gets only support reports', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports',
      headers: { 'x-user-role': 'support' }
    });

    assert.equal(res.status, 200);
    const ids = res.body.data.map(r => r.id);
    assert.ok(ids.includes('tickets-by-priority'));
    assert.ok(ids.includes('sla-breaches'));
    assert.ok(!ids.includes('sales-by-rep'));
  });

  it('Running a report returns columns and rows', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/sales-by-rep/run',
      params: { id: 'sales-by-rep' },
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'sales-by-rep');
    assert.ok(Array.isArray(res.body.data.columns));
    assert.ok(Array.isArray(res.body.data.rows));
    assert.ok(res.body.data.rows.length > 0);
  });

  it('Forbidden report access returns 403', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/won-revenue-by-month/run',
      params: { id: 'won-revenue-by-month' },
      headers: { 'x-user-role': 'support' }
    });

    assert.equal(res.status, 403);
    assert.ok(res.body.error);
  });
});
