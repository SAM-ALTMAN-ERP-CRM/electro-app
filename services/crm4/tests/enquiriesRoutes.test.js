const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const enquiriesRouter = require('../routes/enquiries');

/**
 * In-memory HTTP request dispatcher for Express router
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

describe('CRM-4 Enquiries Routes & CRM-1 Lead Creation Tests ([CRM4-B4])', () => {

  it('GET /enquiries returns 200 and list of seed enquiries (ENQ-0001 to ENQ-0005)', async () => {
    const res = await dispatch(enquiriesRouter, {
      method: 'GET',
      url: '/enquiries'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);

    const enq1 = res.body.data.find(e => e.id === 'ENQ-0001');
    assert.ok(enq1, 'ENQ-0001 must exist');
    assert.equal(enq1.name, 'Rajiv Verma');
    assert.equal(enq1.source, 'web');
    assert.equal(enq1.product_interest, 'SKU-0001');
    assert.equal(enq1.lead_id, 'LEAD-0001');
    assert.equal(enq1.sales_rep_id, 'EMP-0001');
  });

  it('GET /enquiries filters by source correctly', async () => {
    const res = await dispatch(enquiriesRouter, {
      method: 'GET',
      url: '/enquiries?source=dealer',
      query: { source: 'dealer' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    for (const e of res.body.data) {
      assert.equal(e.source, 'dealer');
    }
  });

  it('GET /enquiries/:id returns single enquiry details or 404', async () => {
    const successRes = await dispatch(enquiriesRouter, {
      method: 'GET',
      url: '/enquiries/ENQ-0002'
    });
    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.data.id, 'ENQ-0002');
    assert.equal(successRes.body.data.source, 'dealer');

    const notFoundRes = await dispatch(enquiriesRouter, {
      method: 'GET',
      url: '/enquiries/ENQ-9999'
    });
    assert.equal(notFoundRes.status, 404);
  });

  it('POST /enquiries validates required fields and returns 400', async () => {
    // Missing name
    const resNoName = await dispatch(enquiriesRouter, {
      method: 'POST',
      url: '/enquiries',
      body: { phone: '9820199999', email: 'test@example.com', source: 'web', product_interest: 'SKU-0001' }
    });
    assert.equal(resNoName.status, 400);

    // Invalid email
    const resBadEmail = await dispatch(enquiriesRouter, {
      method: 'POST',
      url: '/enquiries',
      body: { name: 'Test User', phone: '9820199999', email: 'notanemail', source: 'web', product_interest: 'SKU-0001' }
    });
    assert.equal(resBadEmail.status, 400);

    // Invalid source
    const resBadSource = await dispatch(enquiriesRouter, {
      method: 'POST',
      url: '/enquiries',
      body: { name: 'Test User', phone: '9820199999', email: 'test@example.com', source: 'satellite', product_interest: 'SKU-0001' }
    });
    assert.equal(resBadSource.status, 400);
  });

  it('POST /enquiries captures enquiry and saves lead_id from CRM-1 (when USE_MOCKS=true)', async () => {
    process.env.USE_MOCKS = 'true';

    const res = await dispatch(enquiriesRouter, {
      method: 'POST',
      url: '/enquiries',
      body: {
        name: 'Sunita Joshi',
        phone: '9820099999',
        email: 'sunita.joshi@example.com',
        source: 'dealer',
        product_interest: 'SKU-0003',
        notes: 'Requested bulk dealership discount for corporate gifting'
      }
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.match(res.body.data.id, /^ENQ-\d{4}$/);
    assert.equal(res.body.data.name, 'Sunita Joshi');
    assert.equal(res.body.data.source, 'dealer');
    assert.equal(res.body.data.sales_rep_id, 'EMP-0001');
    assert.ok(res.body.data.lead_id, 'lead_id must be assigned');
  });

  it('POST /enquiries returns 502 Bad Gateway when USE_MOCKS=false and CRM-1 is unreachable', async () => {
    process.env.USE_MOCKS = 'false';
    // Point CRM-1 URL to an unreachable port to guarantee connection rejection
    process.env.CRM1_URL = 'http://127.0.0.1:59999';

    const res = await dispatch(enquiriesRouter, {
      method: 'POST',
      url: '/enquiries',
      body: {
        name: 'Vikram Seth',
        phone: '9820011111',
        email: 'vikram.seth@example.com',
        source: 'walk-in',
        product_interest: 'SKU-0001'
      }
    });

    assert.equal(res.status, 502);
    assert.ok(res.body.error);
    assert.match(res.body.error, /502 Bad Gateway|CRM-1 is unreachable|unreachable/i);

    // Reset environment
    delete process.env.CRM1_URL;
    process.env.USE_MOCKS = 'true';
  });
});
