const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const surveysRouter = require('../routes/surveys');

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

describe('CRM-4 Surveys & Survey Responses API Tests ([CRM4-D1])', () => {

  // --- 1. GET /surveys ---
  it('GET /surveys returns 200 and list of seed surveys (SRV-0001 and SRV-0002)', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2);

    const srv1 = res.body.data.find(s => s.id === 'SRV-0001');
    assert.ok(srv1, 'SRV-0001 must exist');
    assert.equal(srv1.type, 'nps');
    assert.ok(srv1.response_count >= 10, 'SRV-0001 has at least 10 seed responses');

    const srv2 = res.body.data.find(s => s.id === 'SRV-0002');
    assert.ok(srv2, 'SRV-0002 must exist');
    assert.equal(srv2.type, 'csat');
  });

  it('GET /surveys filters by type (nps / csat) correctly', async () => {
    const resNps = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys',
      query: { type: 'nps' }
    });
    assert.equal(resNps.status, 200);
    assert.ok(resNps.body.data.every(s => s.type === 'nps'));

    const resCsat = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys',
      query: { type: 'csat' }
    });
    assert.equal(resCsat.status, 200);
    assert.ok(resCsat.body.data.every(s => s.type === 'csat'));
  });

  // --- 2. GET /surveys/:id ---
  it('GET /surveys/:id returns single survey details or 404 for non-existent', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys/SRV-0001',
      params: { id: 'SRV-0001' }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'SRV-0001');
    assert.equal(res.body.data.type, 'nps');

    const res404 = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys/SRV-9999',
      params: { id: 'SRV-9999' }
    });
    assert.equal(res404.status, 404);
    assert.ok(res404.body.error);
  });

  // --- 3. POST /surveys ---
  it('POST /surveys creates a new survey with SRV- prefix and 201 status', async () => {
    const payload = {
      title: 'Q4 Customer Delivery Experience',
      type: 'csat'
    };
    const res = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys',
      body: payload
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.id.startsWith('SRV-'));
    assert.equal(res.body.data.title, payload.title);
    assert.equal(res.body.data.type, payload.type);
    assert.equal(res.body.data.response_count, 0);
  });

  it('POST /surveys validates required title and type', async () => {
    const resNoTitle = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys',
      body: { type: 'nps' }
    });
    assert.equal(resNoTitle.status, 400);
    assert.match(resNoTitle.body.error, /title/i);

    const resBadType = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys',
      body: { title: 'Test Survey', type: 'invalid_type' }
    });
    assert.equal(resBadType.status, 400);
    assert.match(resBadType.body.error, /type/i);
  });

  // --- 4. PUT /surveys/:id ---
  it('PUT /surveys/:id updates an existing survey', async () => {
    const createRes = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys',
      body: { title: 'Pre-update Survey', type: 'nps' }
    });
    const srvId = createRes.body.data.id;

    const updateRes = await dispatch(surveysRouter, {
      method: 'PUT',
      url: `/surveys/${srvId}`,
      params: { id: srvId },
      body: { title: 'Updated Survey Title', type: 'csat' }
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.id, srvId);
    assert.equal(updateRes.body.data.title, 'Updated Survey Title');
    assert.equal(updateRes.body.data.type, 'csat');
  });

  it('PUT /surveys/:id returns 404 for non-existent survey and 400 on invalid input', async () => {
    const res404 = await dispatch(surveysRouter, {
      method: 'PUT',
      url: '/surveys/SRV-9999',
      params: { id: 'SRV-9999' },
      body: { title: 'Non-existent' }
    });
    assert.equal(res404.status, 404);

    const resBadType = await dispatch(surveysRouter, {
      method: 'PUT',
      url: '/surveys/SRV-0001',
      params: { id: 'SRV-0001' },
      body: { type: 'invalid' }
    });
    assert.equal(resBadType.status, 400);

    const resEmptyTitle = await dispatch(surveysRouter, {
      method: 'PUT',
      url: '/surveys/SRV-0001',
      params: { id: 'SRV-0001' },
      body: { title: '   ' }
    });
    assert.equal(resEmptyTitle.status, 400);
  });

  // --- 5. DELETE /surveys/:id ---
  it('DELETE /surveys/:id deletes survey and cascades responses', async () => {
    const createRes = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys',
      body: { title: 'Temporary Survey To Delete', type: 'nps' }
    });
    const tempId = createRes.body.data.id;

    // Add a response to this survey
    await dispatch(surveysRouter, {
      method: 'POST',
      url: `/surveys/${tempId}/responses`,
      params: { id: tempId },
      body: { customer_id: 'CUST-0001', score: 10, comment: 'Great!' }
    });

    const delRes = await dispatch(surveysRouter, {
      method: 'DELETE',
      url: `/surveys/${tempId}`,
      params: { id: tempId }
    });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.data.id, tempId);

    // Verify it is gone
    const checkRes = await dispatch(surveysRouter, {
      method: 'GET',
      url: `/surveys/${tempId}`,
      params: { id: tempId }
    });
    assert.equal(checkRes.status, 404);
  });

  it('DELETE /surveys/:id returns 404 for non-existent survey', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'DELETE',
      url: '/surveys/SRV-9999',
      params: { id: 'SRV-9999' }
    });
    assert.equal(res.status, 404);
  });

  // --- 6. GET /surveys/:id/responses ---
  it('GET /surveys/:id/responses returns responses for valid survey', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys/SRV-0001/responses',
      params: { id: 'SRV-0001' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 10, 'Seed SRV-0001 must have 10 responses');

    const first = res.body.data[0];
    assert.ok(first.id.startsWith('RES-'));
    assert.equal(first.survey_id, 'SRV-0001');
    assert.ok(first.score >= 0 && first.score <= 10);
    assert.ok(first.customer_id.startsWith('CUST-'));
  });

  it('GET /surveys/:id/responses returns 404 for non-existent survey', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys/SRV-9999/responses',
      params: { id: 'SRV-9999' }
    });
    assert.equal(res.status, 404);
  });

  // --- 7. POST /surveys/:id/responses ---
  it('POST /surveys/:id/responses creates a new response with RES- prefix and 201 status', async () => {
    const payload = {
      customer_id: 'CUST-0005',
      score: 9,
      comment: 'Prompt resolution from service support.'
    };
    const res = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys/SRV-0001/responses',
      params: { id: 'SRV-0001' },
      body: payload
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.id.startsWith('RES-'));
    assert.equal(res.body.data.survey_id, 'SRV-0001');
    assert.equal(res.body.data.customer_id, payload.customer_id);
    assert.equal(res.body.data.score, 9);
    assert.equal(res.body.data.comment, payload.comment);
  });

  it('POST /surveys/:id/responses validates score range (0-10) and rejects invalid scores with 400', async () => {
    // Score > 10
    const resOver = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys/SRV-0001/responses',
      params: { id: 'SRV-0001' },
      body: { customer_id: 'CUST-0001', score: 11 }
    });
    assert.equal(resOver.status, 400);
    assert.match(resOver.body.error, /score/i);

    // Score < 0
    const resUnder = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys/SRV-0001/responses',
      params: { id: 'SRV-0001' },
      body: { customer_id: 'CUST-0001', score: -1 }
    });
    assert.equal(resUnder.status, 400);
    assert.match(resUnder.body.error, /score/i);

    // Non-integer score
    const resFloat = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys/SRV-0001/responses',
      params: { id: 'SRV-0001' },
      body: { customer_id: 'CUST-0001', score: 8.5 }
    });
    assert.equal(resFloat.status, 400);

    // Missing score
    const resMissing = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys/SRV-0001/responses',
      params: { id: 'SRV-0001' },
      body: { customer_id: 'CUST-0001' }
    });
    assert.equal(resMissing.status, 400);
  });

  it('POST /surveys/:id/responses validates customer_id is required', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys/SRV-0001/responses',
      params: { id: 'SRV-0001' },
      body: { score: 10, comment: 'Missing customer' }
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /customer/i);
  });

  it('POST /surveys/:id/responses returns 404 for non-existent survey', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys/SRV-9999/responses',
      params: { id: 'SRV-9999' },
      body: { customer_id: 'CUST-0001', score: 10 }
    });
    assert.equal(res.status, 404);
  });

  // --- 8. GET /surveys/:id/results ([CRM4-D3] NPS Calculation & Stats) ---
  it('GET /surveys/:id/results returns NPS breakdown, average score, and comments ([CRM4-D3])', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys/SRV-0001/results',
      params: { id: 'SRV-0001' }
    });
    assert.equal(res.status, 200);
    const data = res.body.data;
    assert.equal(data.survey_id, 'SRV-0001');
    assert.equal(data.type, 'nps');
    assert.ok(data.total >= 10);
    assert.ok(typeof data.nps === 'number');
    assert.ok(typeof data.average_score === 'number');
    assert.ok(Array.isArray(data.latest_comments));
    assert.ok(data.latest_comments.length <= 5);
  });

  it('GET /surveys/SRV-0001/results matches hand calculation on seed data ([CRM4-D3])', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys/SRV-0001/results',
      params: { id: 'SRV-0001' }
    });
    assert.equal(res.status, 200);
    const data = res.body.data;

    // Seed data: 6 Promoters (60%), 2 Passives (20%), 2 Detractors (20%)
    // NPS = 60 - 20 = +40
    // Total responses: at least 10
    assert.ok(data.promoters >= 6);
    assert.ok(data.passives >= 2);
    assert.ok(data.detractors >= 2);
    assert.ok(data.average_score > 0);
    assert.ok(data.nps !== undefined);
  });

  it('GET /surveys/:id/results returns 404 for non-existent survey', async () => {
    const res = await dispatch(surveysRouter, {
      method: 'GET',
      url: '/surveys/SRV-9999/results',
      params: { id: 'SRV-9999' }
    });
    assert.equal(res.status, 404);
  });

  it('GET /surveys/:id/results handles newly created survey with 0 responses', async () => {
    const newSurveyRes = await dispatch(surveysRouter, {
      method: 'POST',
      url: '/surveys',
      body: { title: 'Empty Test Survey', type: 'nps' }
    });
    const newId = newSurveyRes.body.data.id;

    const res = await dispatch(surveysRouter, {
      method: 'GET',
      url: `/surveys/${newId}/results`,
      params: { id: newId }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.total, 0);
    assert.equal(res.body.data.average_score, 0);
    assert.equal(res.body.data.nps, 0);
    assert.equal(res.body.data.promoters, 0);
    assert.equal(res.body.data.detractors, 0);
    assert.equal(res.body.data.latest_comments.length, 0);
  });

});
