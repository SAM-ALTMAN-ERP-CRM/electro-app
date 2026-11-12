const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const opportunitiesRouter = require('../routes/opportunities');

/**
 * In-memory dispatcher for Express router
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
      user: options.user || { id: 'USR-0001', name: 'Admin', role: 'admin' }
    };

    const res = {
      statusCode: 200,
      status(code) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: statusCode, body: payload });
        return this;
      }
    };

    router.handle(req, res, (err) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: 'Not found' } });
      }
    });
  });
}

describe('CRM1 Opportunities Routes Integration Tests ([CRM1-B1])', () => {

  it('GET /opportunities returns all opportunities with all 5 stages in seed data', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'GET',
      url: '/opportunities'
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 6);

    const stages = new Set(res.body.data.map(o => o.stage));
    assert.ok(stages.has('prospect'), 'Missing prospect stage in opportunities');
    assert.ok(stages.has('proposal'), 'Missing proposal stage in opportunities');
    assert.ok(stages.has('negotiation'), 'Missing negotiation stage in opportunities');
    assert.ok(stages.has('won'), 'Missing won stage in opportunities');
    assert.ok(stages.has('lost'), 'Missing lost stage in opportunities');
  });

  it('GET /opportunities/:id returns a single opportunity by ID', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'GET',
      url: '/opportunities/OPP-0001',
      params: { id: 'OPP-0001' }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'OPP-0001');
    assert.equal(res.body.data.stage, 'won');
    assert.equal(res.body.data.expected_value, 128970.00);
  });

  it('GET /opportunities/:id returns 404 for unknown opportunity', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'GET',
      url: '/opportunities/OPP-9999',
      params: { id: 'OPP-9999' }
    });

    assert.equal(res.status, 404);
    assert.match(res.body.error, /not found/i);
  });

  it('POST /opportunities without a required title returns 400', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'POST',
      url: '/opportunities',
      body: {
        lead_id: 'LEAD-0001',
        expected_value: 50000
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /title is required/i);
  });

  it('POST /opportunities with invalid lead_id returns 400', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'POST',
      url: '/opportunities',
      body: {
        title: 'New Deal',
        lead_id: 'LEAD-INVALID',
        expected_value: 50000
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /lead.*does not exist/i);
  });

  it('POST /opportunities with negative expected_value returns 400', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'POST',
      url: '/opportunities',
      body: {
        title: 'Discount Deal',
        lead_id: 'LEAD-0001',
        expected_value: -1500
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /non-negative/i);
  });

  it('POST /opportunities with invalid stage returns 400', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'POST',
      url: '/opportunities',
      body: {
        title: 'Enterprise Pilot',
        stage: 'closed_approved'
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /stage must be one of/i);
  });

  it('POST /opportunities creates opportunity with valid lead successfully', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'POST',
      url: '/opportunities',
      body: {
        lead_id: 'LEAD-0001',
        customer_id: 'CUST-0001',
        title: 'Smart TV Corporate Setup Phase 2',
        expected_value: 85980.00,
        stage: 'proposal',
        sales_rep_id: 'EMP-0001'
      }
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.ok(res.body.data.id.startsWith('OPP-'));
    assert.equal(res.body.data.title, 'Smart TV Corporate Setup Phase 2');
    assert.equal(res.body.data.expected_value, 85980.00);
    assert.equal(res.body.data.stage, 'proposal');
  });

  it('PUT /opportunities/:id updates opportunity details', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'PUT',
      url: '/opportunities/OPP-0002',
      params: { id: 'OPP-0002' },
      body: {
        title: 'Corporate sound system setup (Upgraded)',
        expected_value: 99990.00,
        stage: 'negotiation'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'OPP-0002');
    assert.equal(res.body.data.title, 'Corporate sound system setup (Upgraded)');
    assert.equal(res.body.data.expected_value, 99990.00);
    assert.equal(res.body.data.stage, 'negotiation');
  });

  it('PUT /opportunities/:id returns 404 for unknown opportunity', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'PUT',
      url: '/opportunities/OPP-9999',
      params: { id: 'OPP-9999' },
      body: {
        title: 'Non-existent'
      }
    });

    assert.equal(res.status, 404);
  });

  it('PATCH /opportunities/:id/stage updates stage to allowed value', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'PATCH',
      url: '/opportunities/OPP-0005/stage',
      params: { id: 'OPP-0005' },
      body: { stage: 'proposal' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'OPP-0005');
    assert.equal(res.body.data.stage, 'proposal');
  });

  it('PATCH /opportunities/:id/stage returns 400 for invalid stage', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'PATCH',
      url: '/opportunities/OPP-0005/stage',
      params: { id: 'OPP-0005' },
      body: { stage: 'invalid_stage' }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /stage must be one of/i);
  });

  it('PATCH /opportunities/:id/stage returns 404 for unknown opportunity', async () => {
    const res = await dispatch(opportunitiesRouter, {
      method: 'PATCH',
      url: '/opportunities/OPP-9999/stage',
      params: { id: 'OPP-9999' },
      body: { stage: 'proposal' }
    });

    assert.equal(res.status, 404);
  });

});
