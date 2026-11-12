const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const dealersRouter = require('../routes/dealers');

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

describe('CRM1 Dealers Routes & Screens Tests ([CRM1-D1] & [CRM1-D2])', () => {

  it('GET /dealers returns list of dealers including Section 5 seed dealers', async () => {
    const res = await dispatch(dealersRouter, {
      method: 'GET',
      url: '/dealers'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);
    const dlr1 = res.body.data.find(d => d.id === 'DLR-0001');
    assert.ok(dlr1);
    assert.equal(dlr1.name, 'BrightHome Retail');
    assert.equal(dlr1.tier, 'gold');
  });

  it('GET /dealers?city=Pune filters dealers correctly', async () => {
    const res = await dispatch(dealersRouter, {
      method: 'GET',
      url: '/dealers?city=Pune',
      query: { city: 'Pune' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    for (const d of res.body.data) {
      assert.equal(d.city.toLowerCase(), 'pune');
    }
  });

  it('GET /dealers?q=gadget filters dealers by name correctly', async () => {
    const res = await dispatch(dealersRouter, {
      method: 'GET',
      url: '/dealers?q=gadget',
      query: { q: 'gadget' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.some(d => d.name.toLowerCase().includes('gadget')));
  });
  it('GET /dealers/:id returns dealer details or 404 for unknown dealer', async () => {
    const successRes = await dispatch(dealersRouter, {
      method: 'GET',
      url: '/dealers/DLR-0001',
      params: { id: 'DLR-0001' }
    });
    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.data.id, 'DLR-0001');

    const failRes = await dispatch(dealersRouter, {
      method: 'GET',
      url: '/dealers/DLR-9999',
      params: { id: 'DLR-9999' }
    });
    assert.equal(failRes.status, 404);
  });

  it('POST /dealers validates name, city, and tier', async () => {
    // Missing name
    const noNameRes = await dispatch(dealersRouter, {
      method: 'POST',
      url: '/dealers',
      body: { city: 'Mumbai', tier: 'gold', credit_limit: 500000 }
    });
    assert.equal(noNameRes.status, 400);

    // Missing city
    const noCityRes = await dispatch(dealersRouter, {
      method: 'POST',
      url: '/dealers',
      body: { name: 'Alpha Tech', tier: 'gold', credit_limit: 500000 }
    });
    assert.equal(noCityRes.status, 400);

    // Invalid tier
    const badTierRes = await dispatch(dealersRouter, {
      method: 'POST',
      url: '/dealers',
      body: { name: 'Alpha Tech', city: 'Mumbai', tier: 'diamond', credit_limit: 500000 }
    });
    assert.equal(badTierRes.status, 400);
    assert.match(badTierRes.body.error, /tier must be one of/);
  });

  it('POST /dealers creates a new authorized dealer successfully', async () => {
    const res = await dispatch(dealersRouter, {
      method: 'POST',
      url: '/dealers',
      body: {
        name: 'Delta Digital Solutions',
        contact_person: 'Vikram Joshi',
        phone: '020-27891234',
        email: 'vikram@deltadigital.in',
        city: 'Pune',
        tier: 'silver',
        credit_limit: 750000
      }
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id.startsWith('DLR-'));
    assert.equal(res.body.data.name, 'Delta Digital Solutions');
    assert.equal(res.body.data.tier, 'silver');
    assert.equal(res.body.data.status, 'active');
  });

  it('PUT /dealers/:id updates an existing dealer', async () => {
    const res = await dispatch(dealersRouter, {
      method: 'PUT',
      url: '/dealers/DLR-0002',
      params: { id: 'DLR-0002' },
      body: {
        name: 'Gadget Hub Premium',
        contact_person: 'Suresh Rao',
        phone: '080-22345678',
        email: 'contact@gadgethub.in',
        city: 'Bengaluru',
        tier: 'gold',
        credit_limit: 1200000,
        status: 'active'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Gadget Hub Premium');
    assert.equal(res.body.data.tier, 'gold');
    assert.equal(res.body.data.credit_limit, 1200000);
  });

});
