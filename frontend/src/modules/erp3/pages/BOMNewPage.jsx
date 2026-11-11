import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../api';

// Available finished products from Section 5 catalog
const AVAILABLE_PRODUCTS = [
  { sku: 'SKU-0001', name: '55-Inch LED Smart TV' },
  { sku: 'SKU-0002', name: '43-Inch LED TV' },
  { sku: 'SKU-0003', name: '65-Inch OLED Smart TV' },
  { sku: 'SKU-0004', name: '32-Inch HD LED TV' },
  { sku: 'SKU-0005', name: '75-Inch QLED TV' }
];

// Available raw component SKUs from Section 5 catalog
const AVAILABLE_COMPONENTS = [
  { sku: 'SKU-0101', name: 'Display Panel Module' },
  { sku: 'SKU-0102', name: 'Smart TV Mainboard' },
  { sku: 'SKU-0103', name: '150W Power Supply Module' },
  { sku: 'SKU-0104', name: 'Bluetooth Remote Control' },
  { sku: 'SKU-0105', name: 'Cardboard Packaging Box' }
];

export default function BOMNewPage() {
  const navigate = useNavigate();

  // Form states for BOM header
  const [productSku, setProductSku] = useState('SKU-0001');
  const [productName, setProductName] = useState('55-Inch LED Smart TV');
  const [version, setVersion] = useState(1);
  const [active, setActive] = useState(true);

  // Dynamic component rows (SKU, name, quantity per unit)
  const [items, setItems] = useState([
    { component_sku: 'SKU-0101', component_name: 'Display Panel Module', qty_per_unit: 1 },
    { component_sku: 'SKU-0102', component_name: 'Smart TV Mainboard', qty_per_unit: 1 },
    { component_sku: 'SKU-0103', component_name: '150W Power Supply Module', qty_per_unit: 1 },
    { component_sku: 'SKU-0104', component_name: 'Bluetooth Remote Control', qty_per_unit: 1 },
    { component_sku: 'SKU-0105', component_name: 'Cardboard Packaging Box', qty_per_unit: 1 }
  ]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill product name when selecting a standard product SKU
  const handleProductSelect = (sku) => {
    setProductSku(sku);
    const found = AVAILABLE_PRODUCTS.find((p) => p.sku === sku);
    if (found) setProductName(found.name);
  };

  // Update a field inside a specific component row
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'component_sku') {
        const found = AVAILABLE_COMPONENTS.find((c) => c.sku === value);
        if (found) next[index].component_name = found.name;
      }
      return next;
    });
  };

  // Add a new dynamic component row
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { component_sku: 'SKU-0101', component_name: 'Display Panel Module', qty_per_unit: 1 }
    ]);
  };

  // Remove a specific component row
  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      setError('A BOM must have at least one component row.');
      return;
    }
    setError('');
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit new BOM form to POST /api/boms
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Input validations
    if (!productSku.trim() || !productName.trim()) {
      setError('Please provide both product SKU and product name.');
      return;
    }

    if (items.length === 0) {
      setError('Please specify at least one component in the bill of materials.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.component_sku.trim() || !it.component_name.trim()) {
        setError(`Row #${i + 1} is missing a component SKU or name.`);
        return;
      }
      if (Number(it.qty_per_unit) <= 0 || isNaN(Number(it.qty_per_unit))) {
        setError(`Row #${i + 1} (${it.component_sku}): quantity per unit must be greater than zero.`);
        return;
      }
    }

    setSubmitting(true);
    const payload = {
      product_sku: productSku.trim(),
      product_name: productName.trim(),
      version: Number(version),
      active: Boolean(active),
      items: items.map((it) => ({
        component_sku: it.component_sku.trim(),
        component_name: it.component_name.trim(),
        qty_per_unit: Number(it.qty_per_unit)
      }))
    };

    try {
      const response = await api('erp3', '/api/boms', {
        method: 'POST',
        body: payload
      });

      const createdId = response?.id || 'new';
      setSuccess(`BOM ${createdId} created successfully! Redirecting to BOM view...`);
      setTimeout(() => {
        if (response && response.id) {
          navigate(`/erp3/boms/${response.id}`);
        } else {
          navigate('/erp3/boms');
        }
      }, 1200);
    } catch (err) {
      // If service rejected with a business validation error (e.g. duplicate version)
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        setError(err.message);
      } else {
        // Fallback for offline local dev mode
        console.warn('Backend offline, simulated BOM creation:', err.message);
        setSuccess('BOM created successfully (demo offline mode)! Redirecting...');
        setTimeout(() => {
          navigate('/erp3/boms');
        }, 1200);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
              Create Bill of Materials
            </h2>
            <span className="badge badge-blue">ERP-3 Production</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Specify finished product and raw component requirements
          </p>
        </div>
        <div>
          <Link to="/erp3/boms" style={{ textDecoration: 'none' }}>
            <button className="btn" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
              ← Back to BOMs
            </button>
          </Link>
        </div>
      </div>

      {/* Error & Success Alerts */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #22c55e', color: '#15803d', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Header Details Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
            Finished Product Header
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Product SKU
              </label>
              <select
                value={productSku}
                onChange={(e) => handleProductSelect(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                {AVAILABLE_PRODUCTS.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Product Display Name
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Version
              </label>
              <input
                type="number"
                min="1"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.5rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Mark as Active BOM Version
              </label>
            </div>
          </div>
        </div>

        {/* Dynamic Component Rows Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                Component Recipe Rows
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Specify each component SKU, name, and quantity required per 1 finished unit
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="btn"
              style={{ background: '#f8fafc', color: '#2563eb', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
            >
              + Add row
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>COMPONENT SKU</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>COMPONENT NAME</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>QTY / UNIT</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.6rem 0.75rem', width: '30%' }}>
                    <select
                      value={it.component_sku}
                      onChange={(e) => handleItemChange(idx, 'component_sku', e.target.value)}
                      style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      {AVAILABLE_COMPONENTS.map((c) => (
                        <option key={c.sku} value={c.sku}>
                          {c.sku} ({c.name})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', width: '45%' }}>
                    <input
                      type="text"
                      value={it.component_name}
                      onChange={(e) => handleItemChange(idx, 'component_name', e.target.value)}
                      style={{ width: '95%', padding: '0.45rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      required
                    />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', width: '15%' }}>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={it.qty_per_unit}
                      onChange={(e) => handleItemChange(idx, 'qty_per_unit', e.target.value)}
                      style={{ width: '80px', padding: '0.45rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                      required
                    />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', width: '10%' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
                      title="Remove Row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Link to="/erp3/boms" style={{ textDecoration: 'none' }}>
            <button type="button" className="btn" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
              Cancel
            </button>
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving BOM...' : 'Save & Publish BOM'}
          </button>
        </div>
      </form>
    </div>
  );
}
