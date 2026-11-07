const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

// Set dummy auth bypass for testing
process.env.AUTH_REQUIRED = 'false';

const customersRouter = require('../routes/customers');

/**
 * Pure in-memory dispatcher for Express router (no network sockets required).
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
      user: { id: 'USR-0001', name: 'Admin', role: 'admin' }
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

/**
 * Helper to parse a CSV string into an array of objects (using native split).
 */
function parseCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse comma-separated line respecting quotes
  function parseLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  const headers = parseLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    rows.push(obj);
  }

  return rows;
}

describe('CRM3 Customer CSV Bulk Import Integration Tests (CRM3-D3)', () => {

  it('satisfies acceptance criteria: a 10-row CSV with 2 bad rows imports 8 and lists the 2 errors', async () => {
    const csvPath = path.resolve(__dirname, '../mocks/import-sample.csv');
    assert.ok(fs.existsSync(csvPath), 'import-sample.csv must exist');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    assert.equal(rows.length, 10, 'Sample CSV must contain exactly 10 rows');

    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers/import',
      body: rows
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.inserted, 8, 'Must successfully insert exactly 8 rows');
    assert.equal(res.body.skipped, 2, 'Must skip exactly 2 invalid rows');
    assert.equal(res.body.total, 10, 'Total processed rows must be 10');
    assert.ok(Array.isArray(res.body.errors), 'Errors must be an array');
    assert.equal(res.body.errors.length, 2, 'Must list exactly 2 errors');

    // Verify error details
    const errRow3 = res.body.errors.find(e => e.row === 3);
    assert.ok(errRow3, 'Row 3 error must be listed');
    assert.equal(errRow3.name, 'Invalid Phone Customer');
    assert.equal(errRow3.error, 'Phone number must be exactly 10 digits');

    const errRow6 = res.body.errors.find(e => e.row === 6);
    assert.ok(errRow6, 'Row 6 error must be listed');
    assert.equal(errRow6.name, 'Corporate Missing GSTIN');
    assert.ok(errRow6.error.includes('GSTIN is required'));
  });

  it('rejects row with invalid email format and skips it', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers/import',
      body: [
        {
          name: 'Good Customer',
          type: 'retail',
          email: 'good.retail@example.com',
          phone: '9820556677'
        },
        {
          name: 'Bad Email Customer',
          type: 'retail',
          email: 'invalid-email-no-domain',
          phone: '9820556688'
        }
      ]
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.inserted, 1);
    assert.equal(res.body.skipped, 1);
    assert.equal(res.body.errors.length, 1);
    assert.equal(res.body.errors[0].row, 2);
    assert.equal(res.body.errors[0].error, 'Invalid email format');
  });

  it('rejects dealer row with invalid 10-char GSTIN', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers/import',
      body: [
        {
          name: 'Short GSTIN Dealer',
          type: 'dealer',
          email: 'short.gstin@dealer.com',
          phone: '9820556699',
          gstin: '27AABCS123' // Only 10 characters instead of 15
        }
      ]
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.inserted, 0);
    assert.equal(res.body.skipped, 1);
    assert.equal(res.body.errors.length, 1);
    assert.equal(res.body.errors[0].error, 'GSTIN must be exactly 15 alphanumeric characters');
  });

  it('skips duplicate email within the same import batch', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers/import',
      body: [
        {
          name: 'First Sibling',
          type: 'retail',
          email: 'duplicate.batch@example.com',
          phone: '9820123456'
        },
        {
          name: 'Second Sibling',
          type: 'retail',
          email: 'duplicate.batch@example.com',
          phone: '9820654321'
        }
      ]
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.inserted, 1);
    assert.equal(res.body.skipped, 1);
    assert.equal(res.body.errors.length, 1);
    assert.equal(res.body.errors[0].row, 2);
    assert.ok(res.body.errors[0].error.includes('Duplicate email'));
  });

  it('handles empty import payload gracefully', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers/import',
      body: []
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.inserted, 0);
    assert.equal(res.body.skipped, 0);
    assert.equal(res.body.total, 0);
    assert.equal(res.body.errors.length, 0);
  });

  it('supports payload wrapped in object { customers: [...] }', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers/import',
      body: {
        customers: [
          {
            name: 'Object Wrapped Customer',
            type: 'retail',
            email: 'wrapped.customer@example.com',
            phone: '9811223344'
          }
        ]
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.inserted, 1);
    assert.equal(res.body.skipped, 0);
    assert.ok(res.body.data.customers[0].id.startsWith('CUST-'));
  });
});
