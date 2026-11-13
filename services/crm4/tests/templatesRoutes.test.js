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

  describe('Render Endpoint & Placeholder Validation ([CRM4-C3])', () => {

    it('POST /templates/:id/render replaces name, product, and offer placeholders', async () => {
      const res = await dispatch(templatesRouter, {
        method: 'POST',
        url: '/templates/TPL-0001/render',
        body: {
          name: 'Priya Sharma',
          product: 'UltraSound Soundbar 500',
          offer: 'Flat 20% Discount'
        }
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data);
      assert.equal(res.body.data.template_id, 'TPL-0001');
      assert.ok(res.body.data.rendered_body.includes('Hi Priya Sharma!'));
      assert.ok(res.body.data.rendered_body.includes('UltraSound Soundbar 500'));
      assert.ok(res.body.data.rendered_body.includes('Flat 20% Discount'));
      assert.equal(res.body.data.rendered_text, res.body.data.rendered_body);
      assert.equal(res.body.data.character_count, res.body.data.rendered_body.length);
      assert.equal(res.body.data.warnings.length, 0);
    });

    it('POST /templates/:id/render handles default placeholder values if not provided', async () => {
      const res = await dispatch(templatesRouter, {
        method: 'POST',
        url: '/templates/TPL-0001/render',
        body: {}
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data.rendered_body.includes('Valued Customer'));
      assert.ok(res.body.data.rendered_body.includes('our product'));
      assert.ok(res.body.data.rendered_body.includes('exclusive discount'));
    });

    it('POST /templates/:id/render reports unknown placeholders like {{abc}} with warnings', async () => {
      const res = await dispatch(templatesRouter, {
        method: 'POST',
        url: '/templates/TPL-0001/render',
        body: {
          body: 'Hello {{name}}, check {{product}} with {{offer}} and {{abc}} promo code {{coupon_code}}!'
        }
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data.warnings.length > 0);
      const warningText = res.body.data.warnings.join(' ');
      assert.ok(warningText.includes('{{abc}}'));
      assert.ok(warningText.includes('{{coupon_code}}'));
      assert.ok(res.body.data.unknown_placeholders.includes('abc'));
      assert.ok(res.body.data.unknown_placeholders.includes('coupon_code'));
    });

    it('POST /templates/:id/render rejects SMS body exceeding 160 characters with 400', async () => {
      const longText = 'A'.repeat(161);
      const res = await dispatch(templatesRouter, {
        method: 'POST',
        url: '/templates/TPL-0003/render',
        body: {
          channel: 'sms',
          body: `Dear {{name}}, this is an intentionally very long SMS message that contains lots of words: ${longText}`
        }
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.error);
      assert.ok(res.body.error.includes('160 character limit'));
    });

    it('POST /templates/:id/render allows SMS within 160 characters with 200', async () => {
      const res = await dispatch(templatesRouter, {
        method: 'POST',
        url: '/templates/TPL-0003/render',
        body: {
          name: 'Aarav',
          product: 'TV',
          offer: '10% off'
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.channel, 'sms');
      assert.ok(res.body.data.character_count <= 160);
    });

    it('POST /templates/:id/render returns 404 for non-existent template', async () => {
      const res = await dispatch(templatesRouter, {
        method: 'POST',
        url: '/templates/TPL-9999/render',
        body: {}
      });

      assert.equal(res.status, 404);
      assert.ok(res.body.error);
    });
  });
});
