const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Bypass auth for isolated unit test
process.env.AUTH_REQUIRED = 'false';

const suppliersRouter = require('../routes/suppliers');

/**
 * In-memory request dispatcher for testing Express routes without binding network ports.
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
      user: { id: 'USR-0001', name: 'Admin User', role: 'admin' }
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

describe('ERP-2 Suppliers HTTP Routes Integration Tests ([ERP2-A1] / #74)', () => {

  it('lists all seed suppliers via GET /suppliers', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'GET',
      url: '/suppliers'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 6);
    assert.equal(res.body.data[0].id, 'SUP-0001');
  });

  it('filters suppliers by city via GET /suppliers?city=Pune', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'GET',
      url: '/suppliers?city=Pune',
      query: { city: 'Pune' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.every(s => s.city.toLowerCase() === 'pune'));
  });

  it('filters suppliers by search query via GET /suppliers?q=Silicon', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'GET',
      url: '/suppliers?q=Silicon',
      query: { q: 'Silicon' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data[0].name.includes('Silicon'));
  });

  it('retrieves single supplier by ID via GET /suppliers/:id', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'GET',
      url: '/suppliers/SUP-0001',
      params: { id: 'SUP-0001' }
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'SUP-0001');
    assert.equal(res.body.data.name, 'Precision Display Panels Ltd');
  });

  it('returns 404 for unknown supplier ID via GET /suppliers/:id', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'GET',
      url: '/suppliers/SUP-9999',
      params: { id: 'SUP-9999' }
    });
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('rejects POST /suppliers without required name', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'POST',
      url: '/suppliers',
      body: {
        city: 'Mumbai',
        payment_terms: 'net30'
      }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('name is required'));
  });

  it('rejects POST /suppliers with invalid payment_terms', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'POST',
      url: '/suppliers',
      body: {
        name: 'Invalid Terms Supplier',
        payment_terms: 'net90'
      }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('payment_terms'));
  });

  it('rejects POST /suppliers with invalid GSTIN length', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'POST',
      url: '/suppliers',
      body: {
        name: 'Bad GSTIN Supplier',
        gstin: 'INVALID_SHORT'
      }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('GSTIN must be exactly 15 characters'));
  });

  it('creates new supplier successfully via POST /suppliers', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'POST',
      url: '/suppliers',
      body: {
        name: 'Delta Semiconductors LLP',
        contact_person: 'Anand Verma',
        phone: '+91 98111 22334',
        email: 'sales@deltasemi.in',
        city: 'Noida',
        gstin: '09AAACD1234E1Z9',
        payment_terms: 'net15',
        rating: 4.5
      }
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.ok(res.body.data.id.startsWith('SUP-'));
    assert.equal(res.body.data.name, 'Delta Semiconductors LLP');
    assert.equal(res.body.data.city, 'Noida');
  });

  it('updates supplier fields via PATCH /suppliers/:id', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'PATCH',
      url: '/suppliers/SUP-0001',
      params: { id: 'SUP-0001' },
      body: {
        phone: '+91 98201 99999',
        payment_terms: 'net15'
      }
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'SUP-0001');
    assert.equal(res.body.data.phone, '+91 98201 99999');
    assert.equal(res.body.data.payment_terms, 'net15');
  });

  it('deactivates supplier via DELETE /suppliers/:id', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'DELETE',
      url: '/suppliers/SUP-0006',
      params: { id: 'SUP-0006' }
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.message);
  });
});

describe('ERP-2 Supplier Rating & Top Suppliers Tests ([ERP2-A3] / #76)', () => {

  it('returns top 3 suppliers via GET /suppliers/top', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'GET',
      url: '/suppliers/top'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 3);
    // Verified sorted in descending order of rating
    assert.ok(Number(res.body.data[0].rating) >= Number(res.body.data[1].rating));
    assert.ok(Number(res.body.data[1].rating) >= Number(res.body.data[2].rating));
  });

  it('fetches rating history for a supplier via GET /suppliers/:id/ratings', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'GET',
      url: '/suppliers/SUP-0001/ratings',
      params: { id: 'SUP-0001' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].supplier_id, 'SUP-0001');
  });

  it('records rating and recalculates supplier average via POST /suppliers/:id/ratings', async () => {
    // Current rating of SUP-0002 is 4.5 from initial seed
    const res = await dispatch(suppliersRouter, {
      method: 'POST',
      url: '/suppliers/SUP-0002/ratings',
      params: { id: 'SUP-0002' },
      body: {
        delivery_score: 5,
        quality_score: 5,
        comment: 'Outstanding delivery speed and chip purity'
      }
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.ok(res.body.data.id.startsWith('RAT-'));
    assert.equal(res.body.data.delivery_score, 5);
    assert.equal(res.body.data.quality_score, 5);
    // Check that new average rating is calculated and updated
    assert.ok(res.body.data.new_average_rating !== undefined);
    assert.ok(Number(res.body.data.new_average_rating) >= 4.5);
  });

  it('rejects POST /suppliers/:id/ratings with invalid scores below 1 or above 5', async () => {
    const resLow = await dispatch(suppliersRouter, {
      method: 'POST',
      url: '/suppliers/SUP-0001/ratings',
      params: { id: 'SUP-0001' },
      body: {
        delivery_score: 0,
        quality_score: 4
      }
    });
    assert.equal(resLow.status, 400);
    assert.ok(resLow.body.error.includes('delivery_score'));

    const resHigh = await dispatch(suppliersRouter, {
      method: 'POST',
      url: '/suppliers/SUP-0001/ratings',
      params: { id: 'SUP-0001' },
      body: {
        delivery_score: 4,
        quality_score: 6
      }
    });
    assert.equal(resHigh.status, 400);
    assert.ok(resHigh.body.error.includes('quality_score'));
  });

  it('returns 404 when rating a nonexistent supplier', async () => {
    const res = await dispatch(suppliersRouter, {
      method: 'POST',
      url: '/suppliers/SUP-UNKNOWN/ratings',
      params: { id: 'SUP-UNKNOWN' },
      body: {
        delivery_score: 4,
        quality_score: 4
      }
    });
    assert.equal(res.status, 404);
  });
});
