/**
 * Customer Validation Rules (CRM3-A3)
 *
 * Rules:
 * 1. Phone must be exactly 10 digits.
 * 2. Email must have a valid format.
 * 3. Email uniqueness enforced in API code (returns 409 on duplicate),
 *    NOT as a database UNIQUE constraint (to support duplicate seed rows CUST-0009/CUST-0010).
 * 4. GSTIN is required and must be exactly 15 characters for corporate and dealer types.
 *    For retail, GSTIN is optional (if provided, must be 15 characters).
 * 5. Name is required.
 * 6. Type must be one of: 'retail', 'corporate', 'dealer'.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\d{10}$/;
const GSTIN_REGEX = /^[0-9A-Za-z]{15}$/;
const VALID_TYPES = ['retail', 'corporate', 'dealer'];

/**
 * Validates email string format.
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates phone number (must be exactly 10 digits).
 */
function isValidPhone(phone) {
  if (typeof phone !== 'string' && typeof phone !== 'number') return false;
  return PHONE_REGEX.test(String(phone).trim());
}

/**
 * Validates GSTIN (must be 15 alphanumeric characters).
 */
function isValidGSTIN(gstin) {
  if (typeof gstin !== 'string') return false;
  return GSTIN_REGEX.test(gstin.trim());
}

/**
 * Performs payload field validation (synchronous).
 * @param {object} data - Customer input payload
 * @returns {{ isValid: boolean, errors: Record<string, string>, firstError: string | null, sanitized: object }}
 */
function validateCustomerPayload(data = {}) {
  const errors = {};

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const type = typeof data.type === 'string' ? data.type.trim().toLowerCase() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const phone = data.phone !== undefined && data.phone !== null ? String(data.phone).trim() : '';
  const gstin = typeof data.gstin === 'string' ? data.gstin.trim().toUpperCase() : (data.gstin ? String(data.gstin).trim().toUpperCase() : null);
  const billing_address = typeof data.billing_address === 'string' ? data.billing_address.trim() : (data.billing_address || '');
  const shipping_address = typeof data.shipping_address === 'string' ? data.shipping_address.trim() : (data.shipping_address || '');
  const city = typeof data.city === 'string' ? data.city.trim() : (data.city || '');

  // 1. Name validation
  if (!name) {
    errors.name = 'Customer name is required';
  }

  // 2. Type validation
  if (!type || !VALID_TYPES.includes(type)) {
    errors.type = 'Customer type must be retail, corporate, or dealer';
  }

  // 3. Phone validation (must be 10 digits)
  if (!phone) {
    errors.phone = 'Phone number is required and must be exactly 10 digits';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Phone number must be exactly 10 digits';
  }

  // 4. Email format validation
  if (!email) {
    errors.email = 'Email address is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Invalid email format';
  }

  // 5. GSTIN validation
  if (type === 'corporate' || type === 'dealer') {
    if (!gstin) {
      errors.gstin = `GSTIN is required for ${type} customer type`;
    } else if (!isValidGSTIN(gstin)) {
      errors.gstin = 'GSTIN must be exactly 15 alphanumeric characters';
    }
  } else if (gstin && !isValidGSTIN(gstin)) {
    errors.gstin = 'GSTIN must be exactly 15 alphanumeric characters';
  }

  const isValid = Object.keys(errors).length === 0;
  const firstError = isValid ? null : Object.values(errors)[0];

  return {
    isValid,
    errors,
    firstError,
    sanitized: {
      name,
      type,
      email,
      phone,
      gstin: gstin || null,
      billing_address,
      shipping_address: shipping_address || billing_address,
      city
    }
  };
}

/**
 * Checks email uniqueness in database.
 * @param {object} pool - PostgreSQL pool or client
 * @param {string} email - Email to check
 * @param {string|null} excludeId - Customer ID to exclude (for updates)
 * @returns {Promise<{ isUnique: boolean, conflictId: string|null }>}
 */
async function checkEmailUniqueness(pool, email, excludeId = null) {
  if (!pool || typeof pool.query !== 'function') {
    return { isUnique: true, conflictId: null };
  }

  let queryText = 'SELECT id FROM customers WHERE LOWER(email) = LOWER($1)';
  const queryParams = [email.trim()];

  if (excludeId) {
    queryText += ' AND id <> $2';
    queryParams.push(excludeId);
  }

  const result = await pool.query(queryText, queryParams);
  if (result.rows && result.rows.length > 0) {
    return { isUnique: false, conflictId: result.rows[0].id };
  }

  return { isUnique: true, conflictId: null };
}

/**
 * Full customer validator combining format rules and DB uniqueness check.
 * @param {object} data - Input payload
 * @param {object} [options]
 * @param {object} [options.pool] - PostgreSQL pool
 * @param {boolean} [options.isUpdate=false] - Whether this is an update
 * @param {string} [options.customerId=null] - Customer ID for updates
 * @returns {Promise<{ isValid: boolean, status: number, error?: string, errors?: Record<string, string>, data?: object }>}
 */
async function validateCustomer(data, options = {}) {
  const { pool = null, isUpdate = false, customerId = null } = options;

  // Step 1: Format validation
  const payloadCheck = validateCustomerPayload(data);
  if (!payloadCheck.isValid) {
    return {
      isValid: false,
      status: 400,
      error: payloadCheck.firstError,
      errors: payloadCheck.errors
    };
  }

  // Step 2: Email uniqueness validation in API code (returns 409)
  if (pool) {
    try {
      const uniqueness = await checkEmailUniqueness(pool, payloadCheck.sanitized.email, isUpdate ? customerId : null);
      if (!uniqueness.isUnique) {
        return {
          isValid: false,
          status: 409,
          error: `Customer with email '${payloadCheck.sanitized.email}' already exists`,
          errors: {
            email: 'A customer with this email already exists'
          }
        };
      }
    } catch (dbErr) {
      console.warn('[customerValidator] DB uniqueness check error (skipping check):', dbErr.message);
    }
  }

  return {
    isValid: true,
    status: 200,
    data: payloadCheck.sanitized
  };
}

module.exports = {
  EMAIL_REGEX,
  PHONE_REGEX,
  GSTIN_REGEX,
  VALID_TYPES,
  isValidEmail,
  isValidPhone,
  isValidGSTIN,
  validateCustomerPayload,
  checkEmailUniqueness,
  validateCustomer
};
