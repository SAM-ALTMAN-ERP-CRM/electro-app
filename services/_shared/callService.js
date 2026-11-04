const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_production';

const DEFAULT_PORTS = {
  crm1: 5101,
  crm2: 5102,
  crm3: 5103,
  crm4: 5104,
  crm5: 5105,
  erp1: 5201,
  erp2: 5202,
  erp3: 5203,
  erp4: 5204,
  erp5: 5205,
  erp6: 5206
};

/**
 * Inter-service communication helper.
 * @param {string} team - Target team slug (crm1..erp6)
 * @param {string} reqPath - API path e.g. /api/customers/CUST-0001
 * @param {object} options - { method, body, mock }
 */
async function callService(team, reqPath, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body;
  const mockName = options.mock;

  const teamUpper = team.toUpperCase();
  const envUrl = process.env[`${teamUpper}_URL`];
  const port = DEFAULT_PORTS[team.toLowerCase()] || 5000;
  const baseUrl = envUrl || `http://localhost:${port}`;
  const targetUrl = `${baseUrl}${reqPath}`;

  // Sign a short-lived internal service JWT token
  const serviceToken = jwt.sign(
    { service: 'internal', role: 'admin', caller: 'callService' },
    JWT_SECRET,
    { expiresIn: '5m' }
  );

  const fetchOptions = {
    method,
    headers: {
      'Authorization': `Bearer ${serviceToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(body);
  }

  const useMocks = process.env.USE_MOCKS !== 'false'; // Default to true if not explicitly false

  try {
    const res = await fetch(targetUrl, fetchOptions);
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      // Forward target service error response unchanged
      const errMsg = (data && data.error) ? data.error : `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(errMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return (data && data.data !== undefined) ? data.data : data;
  } catch (err) {
    // If error is an HTTP error returned by target (e.g. 400, 404, 409), rethrow unchanged
    if (err.status && err.status !== 502) {
      throw err;
    }

    // Network / unreachable error: fallback to mock if USE_MOCKS=true
    if (useMocks && mockName) {
      const mockFilePath = path.resolve(__dirname, `../${team.toLowerCase()}/mocks/${mockName}.json`);
      if (fs.existsSync(mockFilePath)) {
        console.log(`[mock] used for ${team.toLowerCase()}${reqPath}`);
        try {
          const mockContent = JSON.parse(fs.readFileSync(mockFilePath, 'utf-8'));
          return mockContent;
        } catch (readErr) {
          console.error(`[mock] Error parsing mock file ${mockFilePath}:`, readErr.message);
        }
      } else {
        console.warn(`[mock] Mock file requested but not found: ${mockFilePath}`);
      }
    }

    // If USE_MOCKS=false or no mock file found, throw 502
    const unreachableErr = new Error(`${team.toLowerCase()} is not reachable`);
    unreachableErr.status = 502;
    throw unreachableErr;
  }
}

module.exports = {
  callService
};
