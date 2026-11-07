const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidPhone,
  isValidEmail,
  isValidGSTIN,
  validateCustomerPayload,
  validateCustomer,
  checkEmailUniqueness
} = require('../validators/customerValidator');

describe('CRM3-A3 Validation Rules Unit & Integration Tests', () => {

  describe('1. Phone Number Validation (10 digits)', () => {
    it('accepts valid 10-digit phone strings', () => {
      assert.equal(isValidPhone('9820112345'), true);
      assert.equal(isValidPhone('0123456789'), true);
    });

    it('accepts 10-digit numbers', () => {
      assert.equal(isValidPhone(9820112345), true);
    });

    it('rejects phone numbers with fewer than 10 digits', () => {
      assert.equal(isValidPhone('982011234'), false);
      assert.equal(isValidPhone('123'), false);
    });

    it('rejects phone numbers with more than 10 digits', () => {
      assert.equal(isValidPhone('98201123456'), false);
    });

    it('rejects non-numeric characters and symbols', () => {
      assert.equal(isValidPhone('982011234a'), false);
      assert.equal(isValidPhone('9820-11234'), false);
      assert.equal(isValidPhone('+9198201123'), false);
    });

    it('rejects null, undefined, and empty string', () => {
      assert.equal(isValidPhone(''), false);
      assert.equal(isValidPhone(null), false);
      assert.equal(isValidPhone(undefined), false);
    });
  });

  describe('2. Email Format Validation', () => {
    it('accepts standard valid email addresses', () => {
      assert.equal(isValidEmail('aarav.mehta@example.com'), true);
      assert.equal(isValidEmail('purchase@sunrise.com'), true);
      assert.equal(isValidEmail('test.user+tag@domain.co.in'), true);
    });

    it('rejects invalid email formats', () => {
      assert.equal(isValidEmail('notanemail'), false);
      assert.equal(isValidEmail('user@'), false);
      assert.equal(isValidEmail('@example.com'), false);
      assert.equal(isValidEmail('user@domain'), false);
      assert.equal(isValidEmail('user@domain.'), false);
      assert.equal(isValidEmail('user with spaces@domain.com'), false);
    });

    it('rejects null, undefined, and empty string', () => {
      assert.equal(isValidEmail(''), false);
      assert.equal(isValidEmail(null), false);
      assert.equal(isValidEmail(undefined), false);
    });
  });

  describe('3. GSTIN Validation (15 alphanumeric characters)', () => {
    it('accepts valid 15-character alphanumeric GSTINs', () => {
      assert.equal(isValidGSTIN('27AABCS1234F1Z5'), true);
      assert.equal(isValidGSTIN('07AABCM9012K1Z8'), true);
      assert.equal(isValidGSTIN('29AABCG3456L1Z4'), true);
    });

    it('rejects GSTINs shorter or longer than 15 characters', () => {
      assert.equal(isValidGSTIN('27AABCS1234F1Z'), false); // 14 chars
      assert.equal(isValidGSTIN('27AABCS1234F1Z59'), false); // 16 chars
    });

    it('rejects GSTINs with symbols', () => {
      assert.equal(isValidGSTIN('27AABCS1234F-Z5'), false);
    });
  });

  describe('4. Full Customer Payload Validation (validateCustomerPayload)', () => {
    const validRetail = {
      name: 'Aarav Mehta',
      type: 'retail',
      email: 'aarav.mehta@example.com',
      phone: '9820112345',
      billing_address: '101 Worli',
      shipping_address: '101 Worli',
      city: 'Mumbai'
    };

    const validCorporate = {
      name: 'Sunrise Electronics Pvt Ltd',
      type: 'corporate',
      email: 'purchase@sunrise.com',
      phone: '9820223456',
      gstin: '27AABCS1234F1Z5',
      billing_address: 'MIDC Andheri',
      shipping_address: 'MIDC Andheri',
      city: 'Mumbai'
    };

    it('passes for a valid retail customer (GSTIN optional)', () => {
      const res = validateCustomerPayload(validRetail);
      assert.equal(res.isValid, true);
      assert.equal(res.firstError, null);
      assert.equal(res.sanitized.gstin, null);
    });

    it('passes for a valid corporate customer with 15-char GSTIN', () => {
      const res = validateCustomerPayload(validCorporate);
      assert.equal(res.isValid, true);
      assert.equal(res.firstError, null);
      assert.equal(res.sanitized.gstin, '27AABCS1234F1Z5');
    });

    it('rejects corporate customer without GSTIN', () => {
      const invalid = { ...validCorporate, gstin: '' };
      const res = validateCustomerPayload(invalid);
      assert.equal(res.isValid, false);
      assert.equal(res.errors.gstin, 'GSTIN is required for corporate customer type');
    });

    it('rejects dealer customer without GSTIN', () => {
      const invalidDealer = {
        name: 'BrightHome Retail LLP',
        type: 'dealer',
        email: 'contact@brighthome.com',
        phone: '9850145678',
        gstin: ''
      };
      const res = validateCustomerPayload(invalidDealer);
      assert.equal(res.isValid, false);
      assert.equal(res.errors.gstin, 'GSTIN is required for dealer customer type');
    });

    it('rejects invalid customer type', () => {
      const invalidType = { ...validRetail, type: 'wholesale' };
      const res = validateCustomerPayload(invalidType);
      assert.equal(res.isValid, false);
      assert.equal(res.errors.type, 'Customer type must be retail, corporate, or dealer');
    });

    it('rejects missing customer name', () => {
      const missingName = { ...validRetail, name: '   ' };
      const res = validateCustomerPayload(missingName);
      assert.equal(res.isValid, false);
      assert.equal(res.errors.name, 'Customer name is required');
    });

    it('rejects invalid phone (not 10 digits)', () => {
      const badPhone = { ...validRetail, phone: '98201' };
      const res = validateCustomerPayload(badPhone);
      assert.equal(res.isValid, false);
      assert.equal(res.errors.phone, 'Phone number must be exactly 10 digits');
    });

    it('rejects invalid email format', () => {
      const badEmail = { ...validRetail, email: 'bad-email@' };
      const res = validateCustomerPayload(badEmail);
      assert.equal(res.isValid, false);
      assert.equal(res.errors.email, 'Invalid email format');
    });
  });

  describe('5. Email Uniqueness in API Code (409 on Duplicate)', () => {
    // Mock DB pool
    const mockCustomers = [
      { id: 'CUST-0001', email: 'aarav.mehta@example.com' },
      { id: 'CUST-0002', email: 'purchase@sunrise.com' }
    ];

    const mockPool = {
      query: async (sql, params) => {
        const emailParam = params[0]?.toLowerCase();
        const excludeId = params[1];

        const match = mockCustomers.find(c => {
          if (c.email.toLowerCase() !== emailParam) return false;
          if (excludeId && c.id === excludeId) return false;
          return true;
        });

        return { rows: match ? [{ id: match.id }] : [] };
      }
    };

    it('detects existing duplicate email and returns conflict id', async () => {
      const res = await checkEmailUniqueness(mockPool, 'aarav.mehta@example.com');
      assert.equal(res.isUnique, false);
      assert.equal(res.conflictId, 'CUST-0001');
    });

    it('is case-insensitive when checking email uniqueness', async () => {
      const res = await checkEmailUniqueness(mockPool, 'AARAV.MEHTA@EXAMPLE.COM');
      assert.equal(res.isUnique, false);
      assert.equal(res.conflictId, 'CUST-0001');
    });

    it('allows a brand new unique email address', async () => {
      const res = await checkEmailUniqueness(mockPool, 'brand.new@example.com');
      assert.equal(res.isUnique, true);
      assert.equal(res.conflictId, null);
    });

    it('allows a customer to retain their own email when updating', async () => {
      const res = await checkEmailUniqueness(mockPool, 'aarav.mehta@example.com', 'CUST-0001');
      assert.equal(res.isUnique, true);
    });

    it('rejects an update if another customer owns that email', async () => {
      const res = await checkEmailUniqueness(mockPool, 'purchase@sunrise.com', 'CUST-0001');
      assert.equal(res.isUnique, false);
      assert.equal(res.conflictId, 'CUST-0002');
    });

    it('returns status 409 from validateCustomer when duplicate email is detected', async () => {
      const duplicatePayload = {
        name: 'Another Aarav',
        type: 'retail',
        email: 'aarav.mehta@example.com',
        phone: '9820999999'
      };

      const result = await validateCustomer(duplicatePayload, { pool: mockPool });
      assert.equal(result.isValid, false);
      assert.equal(result.status, 409);
      assert.match(result.error, /already exists/);
      assert.equal(result.errors.email, 'A customer with this email already exists');
    });

    it('returns status 200 from validateCustomer when all validations and uniqueness pass', async () => {
      const freshPayload = {
        name: 'Unique Customer',
        type: 'retail',
        email: 'unique.customer@example.com',
        phone: '9820999999'
      };

      const result = await validateCustomer(freshPayload, { pool: mockPool });
      assert.equal(result.isValid, true);
      assert.equal(result.status, 200);
      assert.equal(result.data.email, 'unique.customer@example.com');
    });
  });

  describe('6. Acceptance Criteria: Bad inputs rejected with clear messages and nothing saved', () => {
    it('returns 400 with descriptive error message on multiple invalid fields', async () => {
      const invalidData = {
        name: '',
        type: 'invalid-type',
        email: 'bad-email',
        phone: '123'
      };

      const result = await validateCustomer(invalidData);
      assert.equal(result.isValid, false);
      assert.equal(result.status, 400);
      assert.ok(result.error);
      assert.ok(result.errors.name);
      assert.ok(result.errors.type);
      assert.ok(result.errors.email);
      assert.ok(result.errors.phone);
    });
  });

});
