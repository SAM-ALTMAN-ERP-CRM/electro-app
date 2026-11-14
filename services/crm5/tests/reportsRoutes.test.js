const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Bypass auth enforcement in unit test dispatcher
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

describe('CRM-5 Reports API with Roles [CRM5-D1]', () => {
  it('Admin sees all three seeded reports', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports',
      user: { role: 'admin' }
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 3, 'Admin must see all 3 reports');

    const ids = res.body.data.map(r => r.id);
    const names = res.body.data.map(r => r.name);
    assert.ok(ids.includes('RPT-0001'));
    assert.ok(ids.includes('RPT-0002'));
    assert.ok(ids.includes('RPT-0003'));
    assert.ok(names.includes('Leads by Source'));
    assert.ok(names.includes('Tickets by Status'));
    assert.ok(names.includes('Customers by Type'));
  });

  it('Manager role sees all three reports ("manager means admin")', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports',
      user: { role: 'manager' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 3, 'Manager should be treated as admin');
  });

  it('Sales role sees only leads and customers', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports',
      user: { role: 'sales' },
      headers: { 'x-user-role': 'sales' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2, 'Sales should see exactly 2 reports');

    const names = res.body.data.map(r => r.name);
    assert.ok(names.includes('Leads by Source'), 'Sales must see Leads by Source');
    assert.ok(names.includes('Customers by Type'), 'Sales must see Customers by Type');
    assert.ok(!names.includes('Tickets by Status'), 'Sales must NOT see Tickets by Status');
  });

  it('Support role sees tickets and customers', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports',
      user: { role: 'support' },
      headers: { 'x-user-role': 'support' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2, 'Support should see exactly 2 reports');

    const names = res.body.data.map(r => r.name);
    assert.ok(names.includes('Tickets by Status'), 'Support must see Tickets by Status');
    assert.ok(names.includes('Customers by Type'), 'Support must see Customers by Type');
    assert.ok(!names.includes('Leads by Source'), 'Support must NOT see Leads by Source');
  });

  it('Admin may pass ?role=sales to preview sales role reports', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports',
      query: { role: 'sales' },
      user: { role: 'admin' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    const names = res.body.data.map(r => r.name);
    assert.ok(names.includes('Leads by Source'));
    assert.ok(names.includes('Customers by Type'));
    assert.ok(!names.includes('Tickets by Status'));
  });

  it('Admin may pass ?role=support to preview support role reports', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports',
      query: { role: 'support' },
      user: { role: 'admin' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    const names = res.body.data.map(r => r.name);
    assert.ok(names.includes('Tickets by Status'));
    assert.ok(names.includes('Customers by Type'));
    assert.ok(!names.includes('Leads by Source'));
  });

  it('Running RPT-0001 (Leads by Source) returns rows from CRM-1', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/RPT-0001/run',
      params: { id: 'RPT-0001' },
      user: { role: 'sales' }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'RPT-0001');
    assert.equal(res.body.data.name, 'Leads by Source');
    assert.ok(Array.isArray(res.body.data.columns));
    assert.ok(Array.isArray(res.body.data.rows));
    assert.equal(res.body.data.rows.length, 3, 'Must return 3 mock rows');
    assert.equal(res.body.data.rows[0].assigned_rep, 'EMP-0001');
  });

  it('Running RPT-0002 (Tickets by Status) returns rows from CRM-2', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/RPT-0002/run',
      params: { id: 'RPT-0002' },
      user: { role: 'support' }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'RPT-0002');
    assert.equal(res.body.data.name, 'Tickets by Status');
    assert.ok(Array.isArray(res.body.data.columns));
    assert.ok(Array.isArray(res.body.data.rows));
    assert.equal(res.body.data.rows.length, 3, 'Must return 3 mock rows');
    assert.equal(res.body.data.rows[0].assigned_engineer, 'EMP-0005');
  });

  it('Running RPT-0003 (Customers by Type) returns rows from CRM-3', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/RPT-0003/run',
      params: { id: 'RPT-0003' },
      user: { role: 'sales' }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'RPT-0003');
    assert.equal(res.body.data.name, 'Customers by Type');
    assert.ok(Array.isArray(res.body.data.columns));
    assert.ok(Array.isArray(res.body.data.rows));
    assert.equal(res.body.data.rows.length, 3, 'Must return 3 mock rows');
    assert.equal(res.body.data.rows[0].sample_customer_id, 'CUST-0001');
  });

  it('Running report by slug name (leads-by-source) works', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/leads-by-source/run',
      params: { id: 'leads-by-source' },
      user: { role: 'admin' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Leads by Source');
    assert.ok(res.body.data.rows.length > 0);
  });

  it('Forbidden report access returns 403', async () => {
    // Sales trying to run support-only report (Tickets by Status)
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/RPT-0002/run',
      params: { id: 'RPT-0002' },
      user: { role: 'sales' },
      headers: { 'x-user-role': 'sales' }
    });

    assert.equal(res.status, 403);
    assert.ok(res.body.error);
    assert.match(res.body.error, /Forbidden/i);
  });

  it('Support forbidden from running leads report returns 403', async () => {
    // Support trying to run sales-only report (Leads by Source)
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/RPT-0001/run',
      params: { id: 'RPT-0001' },
      user: { role: 'support' },
      headers: { 'x-user-role': 'support' }
    });

    assert.equal(res.status, 403);
    assert.ok(res.body.error);
    assert.match(res.body.error, /Forbidden/i);
  });

  it('Non-existent report ID returns 404', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/RPT-9999/run',
      params: { id: 'RPT-9999' },
      user: { role: 'admin' }
    });

    assert.equal(res.status, 404);
    assert.ok(res.body.error);
    assert.match(res.body.error, /not found/i);
  });

  it('Backwards compatibility for legacy report IDs', async () => {
    const res = await dispatch(reportsRouter, {
      method: 'GET',
      url: '/reports/sales-by-rep/run',
      params: { id: 'sales-by-rep' },
      user: { role: 'admin' }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'sales-by-rep');
    assert.ok(res.body.data.rows.length > 0);
  });
});
