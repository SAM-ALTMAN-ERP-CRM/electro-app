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
    const rawUrl = options.url || '/';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    const query = { ...Object.fromEntries(parsedUrl.searchParams), ...(options.query || {}) };
    const req = {
      method: options.method || 'GET',
      url: parsedUrl.pathname,
      originalUrl: rawUrl,
      body: options.body || {},
      query,
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
  it('GET /dashboard/sales-summary returns 4 KPI metrics and stages breakdown (all_time)', async () => {
    const res = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/sales-summary?range=all_time'
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data, 'Expected response to contain data payload');
    const data = res.body.data;

    assert.equal(data.range, 'all_time');
    assert.ok(typeof data.total_leads === 'number', 'total_leads should be a number');
    assert.ok(typeof data.open_opportunities === 'number', 'open_opportunities should be a number');
    assert.ok(typeof data.won_value === 'number', 'won_value should be a number');
    assert.ok(typeof data.quotes_accepted === 'number', 'quotes_accepted should be a number');
    assert.ok(typeof data.quotes_sent === 'number', 'quotes_sent should be a number');
    assert.ok(Array.isArray(data.opportunities_by_stage), 'opportunities_by_stage should be an array');
    assert.ok(data.opportunities_by_stage.length >= 5, 'should have all 5 stages represented');
  });

  it('GET /dashboard/sales-summary?range=this_month returns filtered monthly metrics', async () => {
    const res = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/sales-summary?range=this_month&date=2026-11-12'
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.range, 'this_month');
    assert.ok(typeof res.body.data.total_leads === 'number');
    assert.ok(typeof res.body.data.won_value === 'number');
  });

  it('GET /dashboard/sales-summary?range=this_week returns filtered weekly metrics', async () => {
    const res = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/sales-summary?range=this_week&date=2026-11-12'
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.range, 'this_week');
    assert.ok(typeof res.body.data.total_leads === 'number');
  });

  it('Date filter actually changes the underlying analytics results', async () => {
    // When queried with fixed date 2026-11-12:
    // this_week contains only records from Nov 9 - Nov 15
    // this_month contains records from Nov 1 - Nov 30
    // all_time contains all records (including October records)
    const resWeek = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/sales-summary?range=this_week&date=2026-11-12'
    });
    const resMonth = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/sales-summary?range=this_month&date=2026-11-12'
    });
    const resAll = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/sales-summary?range=all_time'
    });

    assert.equal(resWeek.status, 200);
    assert.equal(resMonth.status, 200);
    assert.equal(resAll.status, 200);

    const weekData = resWeek.body.data;
    const monthData = resMonth.body.data;
    const allData = resAll.body.data;

    // Verify numbers actually change based on range filter
    assert.ok(
      weekData.total_leads !== allData.total_leads ||
      weekData.won_value !== allData.won_value ||
      weekData.open_opportunities !== allData.open_opportunities,
      'Date filter must actually change the returned analytics numbers'
    );
  });

  it('GET /dashboard/sales-summary returns 400 for unsupported range values', async () => {
    const res = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/sales-summary?range=invalid_range'
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.error.includes('Invalid range parameter'));
  });

  it('Date boundary helper enforces inclusive start and exclusive end', () => {
    const ref = new Date('2026-11-12T10:00:00Z');
    const { startDate, endDate } = dashboardRouter.getDateRangeBoundaries('this_week', ref);

    // Monday 2026-11-09 00:00:00.000Z
    assert.equal(startDate.toISOString(), '2026-11-09T00:00:00.000Z');
    // Next Monday 2026-11-16 00:00:00.000Z
    assert.equal(endDate.toISOString(), '2026-11-16T00:00:00.000Z');

    const testRecords = [
      { id: '1', created_at: '2026-11-09T00:00:00.000Z' }, // Exactly on start boundary -> INCLUDED
      { id: '2', created_at: '2026-11-12T12:00:00.000Z' }, // Inside -> INCLUDED
      { id: '3', created_at: '2026-11-16T00:00:00.000Z' }, // Exactly on end boundary -> EXCLUDED
      { id: '4', created_at: '2026-11-08T23:59:59.999Z' }  // Before start -> EXCLUDED
    ];

    const filtered = dashboardRouter.filterByCreatedAt(testRecords, startDate, endDate);
    assert.equal(filtered.length, 2);
    assert.deepEqual(filtered.map(r => r.id), ['1', '2']);
  });

  it('POST /dashboard/snapshot saves a snapshot with range and returns 201', async () => {
    const snapshotPayload = {
      range: 'this_week',
      metrics: {
        total_leads: 4,
        open_opportunities: 2,
        won_value: 85990.0,
        quotes_accepted: 1,
        opportunities_by_stage: [
          { stage: 'prospect', label: 'Prospect', count: 1, value: 51980.0 },
          { stage: 'won', label: 'Won', count: 1, value: 85990.0 }
        ]
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
    assert.equal(res.body.data.range, 'this_week', 'Snapshot must record the selected date range');
    assert.ok(res.body.data.taken_at, 'Snapshot must have taken_at timestamp');
    assert.equal(res.body.data.metrics.won_value, 85990.0);
  });

  it('POST /dashboard/snapshot rejects invalid date range with 400', async () => {
    const res = await dispatch(dashboardRouter, {
      method: 'POST',
      url: '/dashboard/snapshot',
      body: {
        range: 'yesterday',
        metrics: { total_leads: 5 }
      }
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('GET /dashboard/snapshots returns list of snapshots in descending order with range', async () => {
    const res = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/snapshots'
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'Expected array of snapshots');
    assert.ok(res.body.data.length > 0, 'Should have at least 1 snapshot');

    // Verify snapshots have range field and are sorted in descending order
    const list = res.body.data;
    assert.ok(list[0].range, 'Snapshot should contain range field');
    for (let i = 0; i < list.length - 1; i++) {
      const t1 = new Date(list[i].taken_at).getTime();
      const t2 = new Date(list[i + 1].taken_at).getTime();
      assert.ok(t1 >= t2, 'Snapshots must be ordered descending by taken_at');
    }
  });

  it('GET /dashboard/snapshot singular alias returns same list as plural', async () => {
    const res = await dispatch(dashboardRouter, {
      method: 'GET',
      url: '/dashboard/snapshot'
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });
});
