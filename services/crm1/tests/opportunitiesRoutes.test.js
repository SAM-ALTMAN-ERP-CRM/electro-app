const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';
process.env.USE_MOCKS = 'true';

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

describe('CRM1 Opportunities Routes Integration Tests', () => {

  beforeEach(() => {
    if (typeof opportunitiesRouter._resetInMemory === 'function') {
      opportunitiesRouter._resetInMemory();
    }
  });

  describe('CRM1-B1 Opportunities CRUD', () => {
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
  });

  describe('CRM1-B3 Pipeline Summary (GET /api/opportunities/summary)', () => {
    it('returns counts and monetary totals for all 5 stages', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'GET',
        url: '/opportunities/summary'
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data);

      const stages = ['prospect', 'proposal', 'negotiation', 'won', 'lost'];
      for (const stage of stages) {
        assert.ok(res.body.data[stage], `Missing summary for ${stage}`);
        assert.equal(typeof res.body.data[stage].count, 'number');
        assert.equal(typeof res.body.data[stage].total_value, 'number');
        assert.ok(res.body.data[stage].count >= 0);
        assert.ok(res.body.data[stage].total_value >= 0);
      }

      // Check specific expected baseline values from initial seed data
      assert.equal(res.body.data.prospect.count, 1);
      assert.equal(res.body.data.prospect.total_value, 35980.00);
      assert.equal(res.body.data.proposal.count, 2);
      assert.equal(res.body.data.proposal.total_value, 564900.00);
      assert.equal(res.body.data.negotiation.count, 1);
      assert.equal(res.body.data.negotiation.total_value, 25490.00);
      assert.equal(res.body.data.won.count, 1);
      assert.equal(res.body.data.won.total_value, 128970.00);
      assert.equal(res.body.data.lost.count, 1);
      assert.equal(res.body.data.lost.total_value, 94990.00);
    });

    it('summary reflects stage transition changes accurately', async () => {
      // Move OPP-0005 (prospect, 35980.00) -> proposal
      const patchRes = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0005/stage',
        params: { id: 'OPP-0005' },
        body: { stage: 'proposal' }
      });
      assert.equal(patchRes.status, 200);

      const summaryRes = await dispatch(opportunitiesRouter, {
        method: 'GET',
        url: '/opportunities/summary'
      });
      assert.equal(summaryRes.status, 200);

      // Prospect count should decrease to 0, total_value 0
      assert.equal(summaryRes.body.data.prospect.count, 0);
      assert.equal(summaryRes.body.data.prospect.total_value, 0);

      // Proposal count should increase to 3, total_value + 35980.00 (564900 + 35980 = 600880)
      assert.equal(summaryRes.body.data.proposal.count, 3);
      assert.equal(summaryRes.body.data.proposal.total_value, 600880.00);
    });
  });

  describe('CRM1-B3 Stage Rules and Transitions (PATCH /api/opportunities/:id/stage)', () => {
    it('allows forward progression: prospect -> proposal', async () => {
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

    it('allows forward progression: proposal -> negotiation', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0002/stage',
        params: { id: 'OPP-0002' },
        body: { stage: 'negotiation' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'OPP-0002');
      assert.equal(res.body.data.stage, 'negotiation');
    });

    it('allows forward progression: negotiation -> won when accepted quote exists', async () => {
      // OPP-0003 is in negotiation and has accepted quote QUO-0003
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0003/stage',
        params: { id: 'OPP-0003' },
        body: { stage: 'won' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'OPP-0003');
      assert.equal(res.body.data.stage, 'won');
    });

    it('allows transition to lost from prospect', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0005/stage',
        params: { id: 'OPP-0005' },
        body: { stage: 'lost' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.stage, 'lost');
    });

    it('allows transition to lost from proposal', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0002/stage',
        params: { id: 'OPP-0002' },
        body: { stage: 'lost' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.stage, 'lost');
    });

    it('allows transition to lost from negotiation', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0003/stage',
        params: { id: 'OPP-0003' },
        body: { stage: 'lost' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.stage, 'lost');
    });

    it('allows transition to lost from won', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0001/stage',
        params: { id: 'OPP-0001' },
        body: { stage: 'lost' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.stage, 'lost');
    });

    it('rejects skipping stages from prospect -> negotiation with exact 400 error', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0005/stage',
        params: { id: 'OPP-0005' },
        body: { stage: 'negotiation' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Cannot skip stages. Next allowed stage: proposal or lost');
    });

    it('rejects skipping stages from prospect -> won with exact 400 error', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0005/stage',
        params: { id: 'OPP-0005' },
        body: { stage: 'won' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Cannot skip stages. Next allowed stage: proposal or lost');
    });

    it('rejects skipping stages from proposal -> won with exact 400 error', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0002/stage',
        params: { id: 'OPP-0002' },
        body: { stage: 'won' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Cannot skip stages. Next allowed stage: negotiation or lost');
    });

    it('rejects backward transition from proposal -> prospect with exact 400 error', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0002/stage',
        params: { id: 'OPP-0002' },
        body: { stage: 'prospect' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Cannot skip stages. Next allowed stage: negotiation or lost');
    });

    it('rejects backward transition from negotiation -> proposal with exact 400 error', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0003/stage',
        params: { id: 'OPP-0003' },
        body: { stage: 'proposal' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Cannot skip stages. Next allowed stage: won or lost');
    });

    it('rejects backward transition from won -> negotiation with exact 400 error', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0001/stage',
        params: { id: 'OPP-0001' },
        body: { stage: 'negotiation' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Cannot skip stages. Next allowed stage: lost');
    });

    it('rejects transitioning a lost opportunity with exact 400 error', async () => {
      // OPP-0006 is in lost stage
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0006/stage',
        params: { id: 'OPP-0006' },
        body: { stage: 'prospect' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Cannot transition a lost opportunity');
    });

    it('rejects invalid stage value with 400 error', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0005/stage',
        params: { id: 'OPP-0005' },
        body: { stage: 'invalid_stage' }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'stage must be one of: prospect, proposal, negotiation, won, lost');
    });

    it('returns 404 for unknown opportunity on stage patch', async () => {
      const res = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-9999/stage',
        params: { id: 'OPP-9999' },
        body: { stage: 'proposal' }
      });

      assert.equal(res.status, 404);
      assert.match(res.body.error, /not found/i);
    });
  });

  describe('CRM1-B3 Won Gate (Quotation requirement)', () => {
    it('rejects closing as won if no accepted quotation exists for the opportunity', async () => {
      // Step 1: Advance OPP-0004 from proposal -> negotiation
      const advanceRes = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0004/stage',
        params: { id: 'OPP-0004' },
        body: { stage: 'negotiation' }
      });
      assert.equal(advanceRes.status, 200);
      assert.equal(advanceRes.body.data.stage, 'negotiation');

      // Step 2: Attempt negotiation -> won (OPP-0004 has NO accepted quote in mock)
      const wonRes = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0004/stage',
        params: { id: 'OPP-0004' },
        body: { stage: 'won' }
      });

      assert.equal(wonRes.status, 400);
      assert.equal(wonRes.body.error, 'Cannot close as won without an accepted quote');

      // Step 3: Verify opportunity remains in negotiation
      const getRes = await dispatch(opportunitiesRouter, {
        method: 'GET',
        url: '/opportunities/OPP-0004',
        params: { id: 'OPP-0004' }
      });
      assert.equal(getRes.status, 200);
      assert.equal(getRes.body.data.stage, 'negotiation');
    });

    it('summary remains unchanged when Won Gate rejects transition', async () => {
      // Advance OPP-0004 to negotiation
      await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0004/stage',
        params: { id: 'OPP-0004' },
        body: { stage: 'negotiation' }
      });

      const beforeSummary = await dispatch(opportunitiesRouter, {
        method: 'GET',
        url: '/opportunities/summary'
      });

      // Attempt invalid won transition
      const wonRes = await dispatch(opportunitiesRouter, {
        method: 'PATCH',
        url: '/opportunities/OPP-0004/stage',
        params: { id: 'OPP-0004' },
        body: { stage: 'won' }
      });
      assert.equal(wonRes.status, 400);

      const afterSummary = await dispatch(opportunitiesRouter, {
        method: 'GET',
        url: '/opportunities/summary'
      });

      assert.deepEqual(beforeSummary.body.data, afterSummary.body.data);
    });
  });

});
