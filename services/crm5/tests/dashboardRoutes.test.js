const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const dashboardRouter = require('../routes/dashboard');

/**
 * Pure in-memory dispatcher for Express router (no network sockets required).
 */
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
      user: { id: 'USR-0001', name: 'Admin', role: 'admin' }
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

describe('CRM-5 Dashboard Routes', () => {
  it('GET /dashboard/sales-summary returns 4 KPI metrics and stages breakdown', async () => {
    const res = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/sales-summary'
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data, 'Expected response to contain data payload');
    const data = res.body.data;

    assert.ok(typeof data.total_leads === 'number', 'total_leads should be a number');
    assert.ok(typeof data.open_opportunities === 'number', 'open_opportunities should be a number');
    assert.ok(typeof data.won_value === 'number', 'won_value should be a number');
    assert.ok(typeof data.quotes_accepted === 'number', 'quotes_accepted should be a number');
    assert.ok(Array.isArray(data.opportunities_by_stage), 'opportunities_by_stage should be an array');
    assert.ok(data.opportunities_by_stage.length >= 5, 'should have all 5 stages represented');
  });

  it('POST /dashboard/snapshot saves a snapshot and returns 201', async () => {
    const snapshotPayload = {
      metrics: {
        total_leads: 15,
        open_opportunities: 8,
        won_value: 250000.0,
        quotes_accepted: 5,
        opportunities_by_stage: { prospect: 4, proposal: 2, negotiation: 2, won: 5, lost: 1 }
      }
    };

    const res = await dispatch(dashboardRouter, {
      method: 'POST',
      url: '/dashboard/snapshot',
      body: snapshotPayload
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data, 'Expected response to contain created snapshot');
    assert.ok(res.body.data.id, 'Snapshot must have an ID');
    assert.ok(res.body.data.taken_at, 'Snapshot must have taken_at timestamp');
  });

  it('GET /dashboard/snapshots returns list of snapshots', async () => {
    const res = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/snapshots'
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'Expected array of snapshots');
    assert.ok(res.body.data.length > 0, 'Should have at least 1 snapshot');
  });
});
