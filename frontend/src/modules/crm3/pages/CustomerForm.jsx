import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\d{10}$/;
const GSTIN_REGEX = /^[0-9A-Za-z]{15}$/;

/**
 * CustomerForm Component
 * Supports creating and editing customers, including both billing and shipping addresses.
 * Includes "Same as billing address" checkbox to sync addresses automatically.
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

  // Sync shipping address when "Same as billing address" is checked
  useEffect(() => {
    if (sameAsBilling) {
      setFormData(prev => ({
        ...prev,
        shipping_address: prev.billing_address
      }));
    }
  }, [sameAsBilling, formData.billing_address]);

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
        const cleaned = String(value || '').trim().replace(/\D/g, '');
        if (!cleaned) {
          error = 'Phone number is required and must be 10 digits';
        } else if (!PHONE_REGEX.test(cleaned)) {
          error = 'Phone number must be exactly 10 digits';
        }
        break;
      }

      case 'email': {
        const cleanEmail = (value || '').trim();
        if (!cleanEmail) {
          error = 'Email address is required';
        } else if (!EMAIL_REGEX.test(cleanEmail)) {
          error = 'Invalid email format (e.g. name@example.com)';
        }
        break;
      }

      case 'gstin': {
        const cleanGstin = (value || '').trim();
        if (currentType === 'corporate' || currentType === 'dealer') {
          if (!cleanGstin) {
            error = `GSTIN is required for ${currentType} customers`;
          } else if (!GSTIN_REGEX.test(cleanGstin)) {
            error = 'GSTIN must be exactly 15 alphanumeric characters';
          }
        } else if (cleanGstin && !GSTIN_REGEX.test(cleanGstin)) {
          error = 'GSTIN must be exactly 15 alphanumeric characters';
        }
        break;
      }

      case 'billing_address':
        if (!value || !value.trim()) {
          error = 'Billing address is required';
        }
        break;

      case 'shipping_address':
        if (!sameAsBilling && (!value || !value.trim())) {
          error = 'Shipping address is required';
        }
        break;

      case 'city':
        if (!value || !value.trim()) {
          error = 'City is required';
        }
        break;

      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };

    if (name === 'billing_address' && sameAsBilling) {
      updated.shipping_address = value;
    }

    setFormData(updated);

    if (touched[name]) {
      const err = validateField(name, value, updated.type);
      setErrors(prev => ({ ...prev, [name]: err }));
    }

    if (name === 'type') {
      const gstinErr = validateField('gstin', updated.gstin, value);
      setErrors(prev => ({ ...prev, gstin: gstinErr }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validateField(name, value, formData.type);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setSameAsBilling(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        shipping_address: prev.billing_address
      }));
      setErrors(prev => ({ ...prev, shipping_address: '' }));
    }
  };

  const validateAll = () => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key], formData.type);
      if (err) newErrors[key] = err;
    });

    setErrors(newErrors);
    setTouched({
      name: true,
      type: true,
      email: true,
      phone: true,
      gstin: true,
      billing_address: true,
      shipping_address: true,
      city: true
    });

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateAll()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim().replace(/\D/g, ''),
        gstin: formData.gstin.trim() ? formData.gstin.trim().toUpperCase() : null,
        billing_address: formData.billing_address.trim(),
        shipping_address: sameAsBilling
          ? formData.billing_address.trim()
          : (formData.shipping_address.trim() || formData.billing_address.trim()),
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
      if (err.message && err.message.includes('already exists')) {
        setServerError(err.message);
        setErrors(prev => ({ ...prev, email: 'A customer with this email already exists' }));
      } else {
        setServerError(err.message || 'Failed to save customer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a' }}>
          {isEdit ? `Edit Customer (${initialData.id})` : 'Add New Customer'}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              color: '#64748b',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        )}
      </div>

      {serverError && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          <strong>Error:</strong> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Customer Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Customer / Company Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Aarav Mehta / Sunrise Electronics"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.name ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            {errors.name && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.name}
              </span>
            )}
          </div>

          {/* Customer Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Customer Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              onBlur={handleBlur}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.type ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '0.875rem',
                background: '#ffffff',
                outline: 'none'
              }}
            >
              <option value="retail">Retail</option>
              <option value="corporate">Corporate</option>
              <option value="dealer">Dealer</option>
            </select>
            {errors.type && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.type}
              </span>
            )}
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Email Address <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. customer@example.com"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.email ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            {errors.email && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.email}
              </span>
            )}
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Phone (10 digits) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 9820112345"
              maxLength={10}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.phone ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            {errors.phone && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.phone}
              </span>
            )}
          </div>

          {/* GSTIN */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              GSTIN {formData.type !== 'retail' ? <span style={{ color: '#ef4444' }}>*</span> : <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional for retail)</span>}
            </label>
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="15-char GSTIN (e.g. 27AABCS1234F1Z5)"
              maxLength={15}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.gstin ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
            {errors.gstin && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.gstin}
              </span>
            )}
          </div>

          {/* City */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              City <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Mumbai / Pune / Bengaluru"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.city ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            {errors.city && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.city}
              </span>
            )}
          </div>
        </div>

        {/* Addresses Section (Both Billing and Shipping) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Billing Address */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Billing Address <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              name="billing_address"
              value={formData.billing_address}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Full billing address with building, street, pincode..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.billing_address ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
            {errors.billing_address && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.billing_address}
              </span>
            )}
          </div>

          {/* Shipping Address */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                Shipping Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#2563eb', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={handleCheckboxChange}
                  style={{ cursor: 'pointer' }}
                />
                Same as billing address
              </label>
            </div>
            <textarea
              name="shipping_address"
              value={formData.shipping_address}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={sameAsBilling}
              placeholder="Full delivery/warehouse shipping address..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${errors.shipping_address ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                background: sameAsBilling ? '#f8fafc' : '#ffffff'
              }}
            />
            {errors.shipping_address && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.shipping_address}
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn"
            style={{ padding: '0.55rem 1.5rem', fontSize: '0.875rem' }}
          >
            {submitting ? 'Saving Customer...' : isEdit ? 'Update Customer' : 'Save Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
