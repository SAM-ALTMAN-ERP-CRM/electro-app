const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const campaignsRouter = require('../routes/campaigns');

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

describe('CRM-4 Campaigns Routes & API Tests ([CRM4-A1])', () => {

  it('GET /campaigns returns 200 and list of seed campaigns (CMP-0001 to CMP-0005)', async () => {
    const res = await dispatch(campaignsRouter, {
      method: 'GET',
      url: '/campaigns'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);

    const cmp1 = res.body.data.find(c => c.id === 'CMP-0001');
    assert.ok(cmp1, 'CMP-0001 must exist');
    assert.equal(cmp1.name, 'Diwali Festive Sale');
    assert.equal(cmp1.channel, 'email');
    assert.equal(cmp1.status, 'sent');
    assert.equal(cmp1.segment_id, 'SEG-0001');
    assert.equal(cmp1.template_id, 'TPL-0002');
  });

  it('GET /campaigns filters by status correctly', async () => {
    const res = await dispatch(campaignsRouter, {
      method: 'GET',
      url: '/campaigns?status=sent',
      query: { status: 'sent' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    for (const c of res.body.data) {
      assert.equal(c.status, 'sent');
    }
  });

  it('GET /campaigns filters by channel correctly', async () => {
    const res = await dispatch(campaignsRouter, {
      method: 'GET',
      url: '/campaigns?channel=whatsapp',
      query: { channel: 'whatsapp' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    for (const c of res.body.data) {
      assert.equal(c.channel, 'whatsapp');
    }
  });

  it('GET /campaigns/:id returns single campaign details or 404', async () => {
    const successRes = await dispatch(campaignsRouter, {
      method: 'GET',
      url: '/campaigns/CMP-0002'
    });
    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.data.id, 'CMP-0002');
    assert.equal(successRes.body.data.channel, 'whatsapp');

    const notFoundRes = await dispatch(campaignsRouter, {
      method: 'GET',
      url: '/campaigns/CMP-9999'
    });
    assert.equal(notFoundRes.status, 404);
    assert.ok(notFoundRes.body.error);
  });

  it('POST /campaigns creates a new campaign with CMP- prefix sequence and 201 status', async () => {
    const newCamp = {
      name: 'Spring Clearance Offer',
      objective: 'Clear out older inventory with promotional coupons',
      channel: 'email',
      status: 'draft',
      segment_id: 'SEG-0002',
      template_id: 'TPL-0001',
      scheduled_at: '2026-12-15T09:00:00.000Z'
    };

    const res = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns',
      body: newCamp
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.match(res.body.data.id, /^CMP-\d{4}$/);
    assert.equal(res.body.data.name, newCamp.name);
    assert.equal(res.body.data.channel, 'email');
    assert.equal(res.body.data.status, 'draft');
    assert.equal(res.body.data.segment_id, 'SEG-0002');
    assert.equal(res.body.data.template_id, 'TPL-0001');
  });

  it('POST /campaigns validates required fields and returns 400', async () => {
    // Missing name
    const resNoName = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns',
      body: { channel: 'email', segment_id: 'SEG-0001', template_id: 'TPL-0001' }
    });
    assert.equal(resNoName.status, 400);

    // Invalid channel
    const resBadChannel = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns',
      body: { name: 'Test', channel: 'pager', segment_id: 'SEG-0001', template_id: 'TPL-0001' }
    });
    assert.equal(resBadChannel.status, 400);

    // Missing segment_id
    const resNoSegment = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns',
      body: { name: 'Test', channel: 'sms', template_id: 'TPL-0001' }
    });
    assert.equal(resNoSegment.status, 400);
  });

  it('PUT /campaigns/:id updates an existing campaign', async () => {
    const res = await dispatch(campaignsRouter, {
      method: 'PUT',
      url: '/campaigns/CMP-0003',
      body: {
        name: 'Updated Warranty Plan Campaign',
        channel: 'whatsapp'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'CMP-0003');
    assert.equal(res.body.data.name, 'Updated Warranty Plan Campaign');
    assert.equal(res.body.data.channel, 'whatsapp');
  });

  it('PATCH /api/campaigns/:id/status updates status correctly', async () => {
    const res = await dispatch(campaignsRouter, {
      method: 'PATCH',
      url: '/campaigns/CMP-0003/status',
      body: { status: 'scheduled' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'CMP-0003');
    assert.equal(res.body.data.status, 'scheduled');

    // Invalid status returns 400
    const badRes = await dispatch(campaignsRouter, {
      method: 'PATCH',
      url: '/campaigns/CMP-0003/status',
      body: { status: 'flying' }
    });
    assert.equal(badRes.status, 400);
  });

  it('DELETE /campaigns/:id deletes the campaign', async () => {
    // Create temporary campaign to delete
    const createRes = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns',
      body: {
        name: 'Temporary Promo to Delete',
        channel: 'sms',
        status: 'draft',
        segment_id: 'SEG-0001',
        template_id: 'TPL-0001'
      }
    });
    const toDeleteId = createRes.body.data.id;

    const delRes = await dispatch(campaignsRouter, {
      method: 'DELETE',
      url: `/campaigns/${toDeleteId}`
    });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.data.id, toDeleteId);

    // Verifying it is gone
    const verifyRes = await dispatch(campaignsRouter, {
      method: 'GET',
      url: `/campaigns/${toDeleteId}`
    });
    assert.equal(verifyRes.status, 404);
  });

  // ==========================================
  // [CRM4-A3] Send Simulation & Messaging Tests
  // ==========================================

  it('POST /campaigns/:id/send simulates broadcast dispatch and creates messages ([CRM4-A3])', async () => {
    // Send campaign CMP-0002 (Smart LED TV Launch)
    const sendRes = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns/CMP-0002/send'
    });

    assert.equal(sendRes.status, 200);
    assert.ok(sendRes.body.data);
    assert.equal(sendRes.body.data.campaign_id, 'CMP-0002');
    assert.equal(sendRes.body.data.status, 'sent');
    assert.equal(sendRes.body.data.count, 3);
    assert.equal(sendRes.body.data.messages.length, 3);

    // Verify campaign status updated to sent
    const checkRes = await dispatch(campaignsRouter, {
      method: 'GET',
      url: '/campaigns/CMP-0002'
    });
    assert.equal(checkRes.status, 200);
    assert.equal(checkRes.body.data.status, 'sent');
    assert.equal(checkRes.body.data.message_count, 3);
  });

  it('POST /campaigns/:id/send blocks second send with 409 Conflict ([CRM4-A3])', async () => {
    // CMP-0002 is now sent, second send must return 409
    const secondSendRes = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns/CMP-0002/send'
    });
    assert.equal(secondSendRes.status, 409);
    assert.ok(secondSendRes.body.error);
    assert.ok(secondSendRes.body.error.includes('already been sent'));

    // CMP-0001 was already sent in initial seed data
    const seedSentRes = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns/CMP-0001/send'
    });
    assert.equal(seedSentRes.status, 409);
    assert.ok(seedSentRes.body.error.includes('already been sent'));
  });

  it('POST /campaigns/:id/send returns 404 for non-existent campaign', async () => {
    const res = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns/CMP-9999/send'
    });
    assert.equal(res.status, 404);
  });

  it('GET /campaigns/:id/messages returns simulated messages sent for campaign', async () => {
    const res = await dispatch(campaignsRouter, {
      method: 'GET',
      url: '/campaigns/CMP-0001/messages'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 8);

    const firstMsg = res.body.data[0];
    assert.equal(firstMsg.campaign_id, 'CMP-0001');
    assert.equal(firstMsg.status, 'sent');
    assert.equal(firstMsg.customer_id, 'CUST-0001');
  });

  it('POST /campaigns/:id/send returns 502 Bad Gateway when USE_MOCKS=false and CRM-3 is offline', async () => {
    // Create new campaign
    const createRes = await dispatch(campaignsRouter, {
      method: 'POST',
      url: '/campaigns',
      body: {
        name: 'Unreachable Test Promo',
        channel: 'sms',
        status: 'draft',
        segment_id: 'SEG-9999',
        template_id: 'TPL-0001'
      }
    });
    const testId = createRes.body.data.id;

    process.env.USE_MOCKS = 'false';
    try {
      const res = await dispatch(campaignsRouter, {
        method: 'POST',
        url: `/campaigns/${testId}/send`
      });
      assert.equal(res.status, 502);
      assert.ok(res.body.error.includes('502 Bad Gateway'));
    } finally {
      process.env.USE_MOCKS = 'true';
    }
  });

});
