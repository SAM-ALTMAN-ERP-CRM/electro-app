const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const templatesRouter = require('../routes/templates');

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

describe('CRM-4 Templates Routes & Placeholders API Tests ([CRM4-C1])', () => {

  it('GET /templates returns 200 and list of seed templates (TPL-0001 to TPL-0004)', async () => {
    const res = await dispatch(templatesRouter, {
      method: 'GET',
      url: '/templates'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 4);

    const tpl1 = res.body.data.find(t => t.id === 'TPL-0001');
    assert.ok(tpl1, 'TPL-0001 must exist');
    assert.equal(tpl1.name, 'Product Launch Announcement');
    assert.equal(tpl1.channel, 'whatsapp');
    assert.ok(tpl1.body.includes('{{name}}'));
    assert.ok(tpl1.body.includes('{{product}}'));
    assert.ok(tpl1.body.includes('{{offer}}'));
  });

  it('GET /templates filters by channel correctly', async () => {
    const res = await dispatch(templatesRouter, {
      method: 'GET',
      url: '/templates?channel=email',
      query: { channel: 'email' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    for (const t of res.body.data) {
      assert.equal(t.channel, 'email');
    }
  });

  it('GET /templates/:id returns single template details or 404', async () => {
    const successRes = await dispatch(templatesRouter, {
      method: 'GET',
      url: '/templates/TPL-0002'
    });
    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.data.id, 'TPL-0002');
    assert.equal(successRes.body.data.channel, 'email');
    assert.ok(successRes.body.data.subject.includes('{{product}}'));

    const notFoundRes = await dispatch(templatesRouter, {
      method: 'GET',
      url: '/templates/TPL-9999'
    });
    assert.equal(notFoundRes.status, 404);
  });

  it('POST /templates creates a new template with TPL- prefix sequence and 201 status', async () => {
    const newTpl = {
      name: 'Corporate Bulk Discount VIP',
      channel: 'email',
      subject: 'Special Institutional Quote for {{name}}',
      body: 'Dear {{name}}, we have prepared a custom quote on {{product}} with {{offer}}. Let us know your requirements.'
    };

    const res = await dispatch(templatesRouter, {
      method: 'POST',
      url: '/templates',
      body: newTpl
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.match(res.body.data.id, /^TPL-\d{4}$/);
    assert.equal(res.body.data.name, newTpl.name);
    assert.equal(res.body.data.channel, 'email');
    assert.ok(res.body.data.body.includes('{{product}}'));
  });

  it('POST /templates validates required fields and returns 400', async () => {
    // Missing name
    const resNoName = await dispatch(templatesRouter, {
      method: 'POST',
      url: '/templates',
      body: { channel: 'email', body: 'Hello' }
    });
    assert.equal(resNoName.status, 400);

    // Invalid channel
    const resBadChannel = await dispatch(templatesRouter, {
      method: 'POST',
      url: '/templates',
      body: { name: 'Promo', channel: 'telegram', body: 'Hello' }
    });
    assert.equal(resBadChannel.status, 400);

    // Missing body
    const resNoBody = await dispatch(templatesRouter, {
      method: 'POST',
      url: '/templates',
      body: { name: 'Promo', channel: 'sms' }
    });
    assert.equal(resNoBody.status, 400);
  });

  it('PUT /templates/:id updates an existing template', async () => {
    const res = await dispatch(templatesRouter, {
      method: 'PUT',
      url: '/templates/TPL-0003',
      body: {
        name: 'Updated Extended Warranty Care',
        body: 'Dear {{name}}, protect {{product}} for 3 years with {{offer}}! Reply YES.'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'TPL-0003');
    assert.equal(res.body.data.name, 'Updated Extended Warranty Care');
    assert.ok(res.body.data.body.includes('3 years'));
  });

  it('DELETE /templates/:id deletes the template', async () => {
    // Create temporary template to delete
    const createRes = await dispatch(templatesRouter, {
      method: 'POST',
      url: '/templates',
      body: {
        name: 'Temporary Template to Delete',
        channel: 'sms',
        body: 'Hi {{name}}, delete me.'
      }
    });
    const toDeleteId = createRes.body.data.id;

    const delRes = await dispatch(templatesRouter, {
      method: 'DELETE',
      url: `/templates/${toDeleteId}`
    });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.data.id, toDeleteId);

    // Verify it is gone
    const verifyRes = await dispatch(templatesRouter, {
      method: 'GET',
      url: `/templates/${toDeleteId}`
    });
    assert.equal(verifyRes.status, 404);
  });
});
