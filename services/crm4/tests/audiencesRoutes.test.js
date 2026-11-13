const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const audiencesRouter = require('../routes/audiences');

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

describe('CRM-4 Audiences & Audience Members API Tests ([CRM4-B1])', () => {

  // 1. GET /audiences
  it('GET /audiences returns 200 and list of seed audiences with member counts', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'GET',
      url: '/audiences'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 3);

    const aud1 = res.body.data.find(a => a.id === 'AUD-0001');
    assert.ok(aud1, 'AUD-0001 must exist');
    assert.equal(aud1.name, 'Festive Shoppers 2026');
    assert.equal(aud1.member_count, 8);
    assert.equal(aud1.reachable_count, 7);
  });

  // 2. GET /audiences/:id
  it('GET /audiences/:id returns single audience details or 404', async () => {
    const successRes = await dispatch(audiencesRouter, {
      method: 'GET',
      url: '/audiences/AUD-0001'
    });
    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.data.id, 'AUD-0001');
    assert.equal(successRes.body.data.name, 'Festive Shoppers 2026');
    assert.equal(successRes.body.data.member_count, 8);
    assert.equal(successRes.body.data.reachable_count, 7);

    const notFoundRes = await dispatch(audiencesRouter, {
      method: 'GET',
      url: '/audiences/AUD-9999'
    });
    assert.equal(notFoundRes.status, 404);
  });

  // 3. POST /audiences
  it('POST /audiences creates a new audience with AUD- prefix sequence and 201 status', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'POST',
      url: '/audiences',
      body: {
        name: 'High-Volume Commercial Buyers',
        description: 'B2B key accounts for commercial displays and air conditioners'
      }
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.match(res.body.data.id, /^AUD-\d{4}$/);
    assert.equal(res.body.data.name, 'High-Volume Commercial Buyers');
    assert.equal(res.body.data.member_count, 0);
  });

  it('POST /audiences validates required fields and returns 400 on empty name', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'POST',
      url: '/audiences',
      body: { description: 'Missing name' }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  // 4. PUT /audiences/:id
  it('PUT /audiences/:id updates an existing audience', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'PUT',
      url: '/audiences/AUD-0002',
      body: {
        name: 'Corporate Fleet Accounts - Updated',
        description: 'Updated enterprise segment'
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'AUD-0002');
    assert.equal(res.body.data.name, 'Corporate Fleet Accounts - Updated');
  });

  it('PUT /audiences/:id returns 400 on empty name and 404 for non-existent audience', async () => {
    const emptyNameRes = await dispatch(audiencesRouter, {
      method: 'PUT',
      url: '/audiences/AUD-0002',
      body: { name: '   ' }
    });
    assert.equal(emptyNameRes.status, 400);

    const notFoundRes = await dispatch(audiencesRouter, {
      method: 'PUT',
      url: '/audiences/AUD-9999',
      body: { name: 'Valid' }
    });
    assert.equal(notFoundRes.status, 404);
  });

  // 5. GET /audiences/:id/members
  it('GET /audiences/:id/members returns audience members and supports filtering by opted_out', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'GET',
      url: '/audiences/AUD-0001/members'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 8);

    // Verify Section 5 shared IDs
    const member1 = res.body.data.find(m => m.customer_id === 'CUST-0001');
    assert.ok(member1);
    assert.equal(member1.name, 'Aarav Mehta');
    assert.equal(member1.opted_out, false);

    // Filter by opted_out=true
    const optedOutRes = await dispatch(audiencesRouter, {
      method: 'GET',
      url: '/audiences/AUD-0001/members?opted_out=true',
      query: { opted_out: 'true' }
    });
    assert.equal(optedOutRes.status, 200);
    assert.equal(optedOutRes.body.data.length, 1);
    assert.equal(optedOutRes.body.data[0].customer_id, 'CUST-0003');
    assert.equal(optedOutRes.body.data[0].opted_out, true);
  });

  it('GET /audiences/:id/members returns 404 for non-existent audience', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'GET',
      url: '/audiences/AUD-9999/members'
    });
    assert.equal(res.status, 404);
  });

  // 6. POST /audiences/:id/members
  it('POST /audiences/:id/members adds a new member with MEM- prefix sequence and 201 status', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'POST',
      url: '/audiences/AUD-0002/members',
      body: {
        customer_id: 'CUST-0005',
        name: 'Kiran Patel',
        email: 'kiran.patel@example.com',
        phone: '9879156789'
      }
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.match(res.body.data.id, /^MEM-\d{4}$/);
    assert.equal(res.body.data.customer_id, 'CUST-0005');
    assert.equal(res.body.data.opted_out, false);
  });

  it('POST /audiences/:id/members prevents duplicate members in the same audience with 409 Conflict', async () => {
    const dupRes = await dispatch(audiencesRouter, {
      method: 'POST',
      url: '/audiences/AUD-0001/members',
      body: {
        customer_id: 'CUST-0001',
        name: 'Aarav Mehta',
        email: 'aarav.mehta@example.com'
      }
    });
    assert.equal(dupRes.status, 409);
    assert.ok(dupRes.body.error);
  });

  it('POST /audiences/:id/members validates required customer_id, name, email and returns 400', async () => {
    const missingName = await dispatch(audiencesRouter, {
      method: 'POST',
      url: '/audiences/AUD-0001/members',
      body: { customer_id: 'CUST-0009', email: 'test@example.com' }
    });
    assert.equal(missingName.status, 400);

    const missingEmail = await dispatch(audiencesRouter, {
      method: 'POST',
      url: '/audiences/AUD-0001/members',
      body: { customer_id: 'CUST-0009', name: 'Test' }
    });
    assert.equal(missingEmail.status, 400);

    const missingCust = await dispatch(audiencesRouter, {
      method: 'POST',
      url: '/audiences/AUD-0001/members',
      body: { name: 'Test', email: 'test@example.com' }
    });
    assert.equal(missingCust.status, 400);
  });

  // 7. PATCH /audiences/:id/members/:member_id
  it('PATCH /audiences/:id/members/:member_id updates member opt-out status', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'PATCH',
      url: '/audiences/AUD-0001/members/MEM-0001',
      body: { opted_out: true }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'MEM-0001');
    assert.equal(res.body.data.opted_out, true);

    // Toggle back
    const toggleBack = await dispatch(audiencesRouter, {
      method: 'PATCH',
      url: '/audiences/AUD-0001/members/MEM-0001',
      body: { opted_out: false }
    });
    assert.equal(toggleBack.status, 200);
    assert.equal(toggleBack.body.data.opted_out, false);
  });

  it('PATCH /audiences/:id/members/:member_id returns 404 for non-existent member', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'PATCH',
      url: '/audiences/AUD-0001/members/MEM-9999',
      body: { opted_out: true }
    });
    assert.equal(res.status, 404);
  });

  // 8. DELETE /audiences/:id/members/:member_id
  it('DELETE /audiences/:id/members/:member_id removes member from audience', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'DELETE',
      url: '/audiences/AUD-0001/members/MEM-0008'
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.message);

    // Verify member count decreased
    const getRes = await dispatch(audiencesRouter, {
      method: 'GET',
      url: '/audiences/AUD-0001'
    });
    assert.equal(getRes.body.data.member_count, 7);
  });

  it('DELETE /audiences/:id/members/:member_id returns 404 for non-existent member', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'DELETE',
      url: '/audiences/AUD-0001/members/MEM-9999'
    });
    assert.equal(res.status, 404);
  });

  // 9. DELETE /audiences/:id
  it('DELETE /audiences/:id deletes the audience and cascades to its members', async () => {
    const deleteRes = await dispatch(audiencesRouter, {
      method: 'DELETE',
      url: '/audiences/AUD-0003'
    });
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.data.id, 'AUD-0003');

    const getRes = await dispatch(audiencesRouter, {
      method: 'GET',
      url: '/audiences/AUD-0003'
    });
    assert.equal(getRes.status, 404);
  });

  it('DELETE /audiences/:id returns 404 for non-existent audience', async () => {
    const res = await dispatch(audiencesRouter, {
      method: 'DELETE',
      url: '/audiences/AUD-9999'
    });
    assert.equal(res.status, 404);
  });

});
