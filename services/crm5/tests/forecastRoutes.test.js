const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const forecastsRouter = require('../routes/forecasts');

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

describe('CRM-5 Forecasts & Weighted Pipeline Routes', () => {
  it('GET /forecast/weighted calculates correct weighted pipeline', async () => {
    const res = await dispatch(forecastsRouter, {
      method: 'GET',
      url: '/forecast/weighted'
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    const data = res.body.data;

    // From mock opportunities:
    // Prospect: 51980 * 0.10 = 5198
    // Proposal: 67960 * 0.30 = 20388
    // Negotiation: 112980 * 0.60 = 67788
    // Total: 93374.00
    assert.equal(data.weighted_pipeline_value, 93374.00);
    assert.ok(data.progress_percentage > 0, 'Progress percentage should be computed');
    assert.ok(Array.isArray(data.breakdown), 'Breakdown should be an array');
    assert.equal(data.breakdown.length, 3);
  });

  it('GET /forecasts lists monthly targets', async () => {
    const res = await dispatch(forecastsRouter, {
      method: 'GET',
      url: '/forecasts'
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);
  });

  it('POST /forecasts sets a target and returns 201', async () => {
    const res = await dispatch(forecastsRouter, {
      method: 'POST',
      url: '/forecasts',
      body: {
        month: '2027-01',
        target_amount: 220000.00,
        notes: 'New Year corporate expansion'
      }
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.equal(res.body.data.month, '2027-01');
    assert.equal(res.body.data.target_amount, 220000.00);
  });

  it('PUT /forecasts/:id updates an existing target', async () => {
    const res = await dispatch(forecastsRouter, {
      method: 'PUT',
      url: '/forecasts/FCST-0001',
      params: { id: 'FCST-0001' },
      body: {
        target_amount: 135000.00,
        notes: 'Updated August target'
      }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.target_amount, 135000.00);
  });
});
