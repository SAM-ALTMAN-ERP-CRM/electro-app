import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\d{10}$/;
const GSTIN_REGEX = /^[0-9A-Za-z]{15}$/;

/**
 * CustomerForm Component (CRM3-A3 Validation rules)
 *
 * Implements client-side & inline validation:
 * - Phone must be 10 digits
 * - Email format validation
 * - Email uniqueness (409 duplicate handling)
 * - GSTIN required and 15 characters for corporate and dealer types
 * - "Same as billing address" checkbox copies billing address to shipping address
 */
export default function CustomerForm({ initialData = null, onSuccess, onCancel }) {
  const isEdit = Boolean(initialData && initialData.id);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'retail',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    gstin: initialData?.gstin || '',
    billing_address: initialData?.billing_address || '',
    shipping_address: initialData?.shipping_address || '',
    city: initialData?.city || ''
  });

  const [sameAsBilling, setSameAsBilling] = useState(
    Boolean(
      initialData?.billing_address &&
      initialData?.billing_address === initialData?.shipping_address
    )
  );

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // When "Same as billing address" is checked, automatically sync shipping address
  useEffect(() => {
    if (sameAsBilling) {
      setFormData(prev => ({
        ...prev,
        shipping_address: prev.billing_address
      }));
    }
  }, [sameAsBilling, formData.billing_address]);

  // Client-side validation function for a single field or entire form
  const validateField = (name, value, currentType = formData.type) => {
    let error = '';

    switch (name) {
      case 'name':
        if (!value || !value.trim()) {
          error = 'Customer name is required';
        }
        break;

      case 'type':
        if (!['retail', 'corporate', 'dealer'].includes(value)) {
          error = 'Customer type must be retail, corporate, or dealer';
        }
        break;

      case 'phone': {
        const trimmedPhone = String(value || '').trim();
        if (!trimmedPhone) {
          error = 'Phone number is required and must be exactly 10 digits';
        } else if (!PHONE_REGEX.test(trimmedPhone)) {
          error = 'Phone number must be exactly 10 digits';
        }
        break;
      }

      case 'email': {
        const trimmedEmail = (value || '').trim();
        if (!trimmedEmail) {
          error = 'Email address is required';
        } else if (!EMAIL_REGEX.test(trimmedEmail)) {
          error = 'Invalid email format (e.g. name@example.com)';
        }
        break;
      }

      case 'gstin': {
        const trimmedGstin = (value || '').trim();
        if (currentType === 'corporate' || currentType === 'dealer') {
          if (!trimmedGstin) {
            error = `GSTIN is required for ${currentType} customers`;
          } else if (!GSTIN_REGEX.test(trimmedGstin)) {
            error = 'GSTIN must be exactly 15 alphanumeric characters';
          }
        } else if (trimmedGstin && !GSTIN_REGEX.test(trimmedGstin)) {
          error = 'GSTIN must be exactly 15 alphanumeric characters';
        }
        break;
      }

      default:
        break;
    }

    return error;
  };

  const validateAll = (data) => {
    const newErrors = {};
    ['name', 'type', 'phone', 'email', 'gstin'].forEach(field => {
      const fieldError = validateField(field, data[field], data.type);
      if (fieldError) {
        newErrors[field] = fieldError;
      }
    });
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // If billing address changes and sameAsBilling is checked, update shipping
      if (name === 'billing_address' && sameAsBilling) {
        next.shipping_address = value;
      }
      return next;
    });

    // Validate on change if touched
    if (touched[name]) {
      const error = validateField(name, value, name === 'type' ? value : formData.type);
      setErrors(prev => ({ ...prev, [name]: error }));
    }

    // If type changed, also re-validate GSTIN
    if (name === 'type') {
      const gstinError = validateField('gstin', formData.gstin, value);
      setErrors(prev => ({ ...prev, gstin: gstinError }));
    }

    setServerError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value, formData.type);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSameAsBillingChange = (e) => {
    const checked = e.target.checked;
    setSameAsBilling(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        shipping_address: prev.billing_address
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      type: true,
      phone: true,
      email: true,
      gstin: true,
      billing_address: true,
      shipping_address: true,
      city: true
    });

    const formErrors = validateAll(formData);
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      setServerError('Please fix the validation errors below before submitting.');
      return;
    }

    setSubmitting(true);
    setServerError('');

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gstin: formData.gstin ? formData.gstin.trim().toUpperCase() : null,
        billing_address: formData.billing_address.trim(),
        shipping_address: formData.shipping_address.trim(),
        city: formData.city.trim()
      };

      let result;
      if (isEdit) {
        result = await api('crm3', `/api/customers/${initialData.id}`, {
          method: 'PUT',
          body: payload
        });
      } else {
        result = await api('crm3', '/api/customers', {
          method: 'POST',
          body: payload
        });
      }

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      // 409 Conflict: duplicate email error
      if (err.status === 409) {
        setErrors(prev => ({
          ...prev,
          email: err.data?.errors?.email || err.message || 'A customer with this email already exists'
        }));
        setServerError('Duplicate email error (409): A customer with this email already exists.');
      } else if (err.data?.errors) {
        setErrors(err.data.errors);
        setServerError(err.message || 'Validation failed on server');
      } else {
        setServerError(err.message || 'An error occurred while saving the customer.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isGstinRequired = formData.type === 'corporate' || formData.type === 'dealer';

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>
          {isEdit ? `Edit Customer (${initialData.id})` : 'Add New Customer'}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '4px' }}
          >
            Cancel
          </button>
        )}
      </div>

      {serverError && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          <strong>Error:</strong> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {/* Customer Name */}
          <div>
            <label htmlFor="customer-name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Customer Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="customer-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Aarav Mehta / Sunrise Electronics"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.name ? '#dc2626' : '#cbd5e1'}`,
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            {errors.name && (
              <span style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.name}
              </span>
            )}
          </div>

          {/* Customer Type */}
          <div>
            <label htmlFor="customer-type" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Customer Type <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="customer-type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              onBlur={handleBlur}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.type ? '#dc2626' : '#cbd5e1'}`,
                outline: 'none',
                background: '#ffffff',
                fontSize: '0.9rem'
              }}
            >
              <option value="retail">Retail</option>
              <option value="corporate">Corporate</option>
              <option value="dealer">Dealer</option>
            </select>
            {errors.type && (
              <span style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.type}
              </span>
            )}
          </div>

          {/* Phone (10 digits) */}
          <div>
            <label htmlFor="customer-phone" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Phone (10 Digits) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="customer-phone"
              name="phone"
              type="tel"
              maxLength={10}
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 9820112345"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.phone ? '#dc2626' : '#cbd5e1'}`,
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            {errors.phone ? (
              <span style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.phone}
              </span>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '0.725rem', marginTop: '0.25rem', display: 'block' }}>
                Must be exactly 10 digits
              </span>
            )}
          </div>

          {/* Email (Format & Unique) */}
          <div>
            <label htmlFor="customer-email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Email Address <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="customer-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. aarav.mehta@example.com"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.email ? '#dc2626' : '#cbd5e1'}`,
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            {errors.email ? (
              <span style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.email}
              </span>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '0.725rem', marginTop: '0.25rem', display: 'block' }}>
                Must be unique and valid format
              </span>
            )}
          </div>

          {/* GSTIN (Required 15 chars for Corporate & Dealer) */}
          <div>
            <label htmlFor="customer-gstin" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              GSTIN {isGstinRequired && <span style={{ color: '#dc2626' }}>*</span>}
              {!isGstinRequired && <span style={{ color: '#94a3b8', fontWeight: 400 }}> (Optional for Retail)</span>}
            </label>
            <input
              id="customer-gstin"
              name="gstin"
              type="text"
              maxLength={15}
              value={formData.gstin}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 27AABCS1234F1Z5"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.gstin ? '#dc2626' : '#cbd5e1'}`,
                outline: 'none',
                textTransform: 'uppercase',
                fontSize: '0.9rem'
              }}
            />
            {errors.gstin ? (
              <span style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.gstin}
              </span>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '0.725rem', marginTop: '0.25rem', display: 'block' }}>
                {isGstinRequired ? 'Required, exactly 15 characters' : 'Optional (15 characters if provided)'}
              </span>
            )}
          </div>

          {/* City */}
          <div>
            <label htmlFor="customer-city" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              City
            </label>
            <input
              id="customer-city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Mumbai, Pune, Delhi"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>

        {/* Addresses */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Billing Address */}
          <div>
            <label htmlFor="customer-billing" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Billing Address
            </label>
            <textarea
              id="customer-billing"
              name="billing_address"
              rows={3}
              value={formData.billing_address}
              onChange={handleChange}
              placeholder="Full billing address..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.9rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Shipping Address */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label htmlFor="customer-shipping" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Shipping Address
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#2563eb', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="sameAsBilling"
                  checked={sameAsBilling}
                  onChange={handleSameAsBillingChange}
                />
                Same as billing address
              </label>
            </div>
            <textarea
              id="customer-shipping"
              name="shipping_address"
              rows={3}
              value={formData.shipping_address}
              onChange={handleChange}
              disabled={sameAsBilling}
              placeholder="Full shipping address..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.9rem',
                resize: 'vertical',
                backgroundColor: sameAsBilling ? '#f1f5f9' : '#ffffff',
                color: sameAsBilling ? '#64748b' : '#0f172a'
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              style={{
                background: '#f8fafc',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: submitting ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Saving...' : (isEdit ? 'Update Customer' : 'Create Customer')}
          </button>
        </div>
      </form>
    </div>
  );
}
