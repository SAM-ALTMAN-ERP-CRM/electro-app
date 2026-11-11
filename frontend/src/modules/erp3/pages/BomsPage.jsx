// frontend/src/modules/erp3/pages/BomsPage.jsx
// Lists all BOMs with optional product_sku filter.
// Inline "Create BOM" form lets you add a BOM with up to N component rows.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api';

// Fallback seed data shown when the backend is not yet reachable
const SEED_BOMS = [
  { id: 'BOM-0001', product_sku: 'SKU-0001', product_name: '55-Inch LED Smart TV',   version: 1, active: true },
  { id: 'BOM-0002', product_sku: 'SKU-0003', product_name: '65-Inch OLED Smart TV',  version: 1, active: true }
];

// Pre-filled component options (the 5 shared SKUs)
const COMPONENT_OPTIONS = [
  { sku: 'SKU-0101', name: 'Display Panel' },
  { sku: 'SKU-0102', name: 'Main Board' },
  { sku: 'SKU-0103', name: 'Power Supply Unit' },
  { sku: 'SKU-0104', name: 'Remote Control' },
  { sku: 'SKU-0105', name: 'Packaging Box' }
];

// One blank item row
const blankItem = () => ({ component_sku: 'SKU-0101', component_name: 'Display Panel', qty_per_unit: 1 });

export default function BomsPage() {
  const navigate = useNavigate();

  // ── List state ──────────────────────────────────────────────────────────────
  const [boms, setBoms]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [skuFilter, setSkuFilter] = useState('');

  // ── Create form state ───────────────────────────────────────────────────────
  const [showForm, setShowForm]         = useState(false);
  const [formError, setFormError]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [productSku, setProductSku]     = useState('SKU-0001');
  const [productName, setProductName]   = useState('55-Inch LED Smart TV');
  const [version, setVersion]           = useState(1);
  // Start with one blank component row; user can add more
  const [items, setItems]               = useState([blankItem()]);

  // ── Fetch BOMs ──────────────────────────────────────────────────────────────
  const fetchBoms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs  = skuFilter ? `?product_sku=${encodeURIComponent(skuFilter)}` : '';
      const res = await api('erp3', `/api/boms${qs}`);
      // The api helper may return { data: [...] } or the array directly
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setBoms(list);
    } catch (err) {
      console.warn('[erp3] BOM fetch failed, using seed fallback:', err.message);
      // Show seed data so the page is useful even before the backend merges
      setBoms(skuFilter ? SEED_BOMS.filter(b => b.product_sku === skuFilter) : SEED_BOMS);
    } finally {
      setLoading(false);
    }
  }, [skuFilter]);

  useEffect(() => { fetchBoms(); }, [fetchBoms]);

  // ── Item row helpers ────────────────────────────────────────────────────────
  // When user picks a component SKU from the dropdown, auto-fill its name
  const handleItemSkuChange = (idx, sku) => {
    const opt  = COMPONENT_OPTIONS.find(o => o.sku === sku) || { sku, name: '' };
    const copy = [...items];
    copy[idx]  = { ...copy[idx], component_sku: opt.sku, component_name: opt.name };
    setItems(copy);
  };

  const handleItemQtyChange = (idx, qty) => {
    const copy = [...items];
    copy[idx]  = { ...copy[idx], qty_per_unit: Number(qty) };
    setItems(copy);
  };

  const addItemRow    = () => setItems(prev => [...prev, blankItem()]);
  const removeItemRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  // ── Create BOM ──────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    // Client-side validation
    if (!productSku.trim() || !productName.trim()) {
      setFormError('Product SKU and name are required.');
      return;
    }
    if (items.length === 0) {
      setFormError('Add at least one component.');
      return;
    }
    for (const it of items) {
      if (it.qty_per_unit <= 0) { setFormError('Qty per unit must be > 0 for all rows.'); return; }
    }

    setSaving(true);
    try {
      await api('erp3', '/api/boms', {
        method: 'POST',
        body: { product_sku: productSku.trim(), product_name: productName.trim(), version, items }
      });
      // Reset form and reload list
      setShowForm(false);
      setProductSku('SKU-0001');
      setProductName('55-Inch LED Smart TV');
      setVersion(1);
      setItems([blankItem()]);
      fetchBoms();
    } catch (err) {
      setFormError(err.message || 'Failed to create BOM. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Bill of Materials</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Define which components go into each finished product.
          </p>
        </div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
        >
          {showForm ? 'Close Form' : '+ New BOM'}
        </button>
      </div>

      {/* Top-level error */}
      {error && (
        <div style={{ padding: '0.85rem 1.2rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #fecaca', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ── Create BOM form ──────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>New Bill of Materials</h3>

          {formError && (
            <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate}>
            {/* BOM header fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Product SKU *</label>
                <input
                  value={productSku}
                  onChange={e => setProductSku(e.target.value)}
                  required
                  placeholder="e.g. SKU-0001"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Product Name *</label>
                <input
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  required
                  placeholder="e.g. 55-Inch LED Smart TV"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Version</label>
                <input
                  type="number"
                  min="1"
                  value={version}
                  onChange={e => setVersion(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Component rows */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Components *</label>
                <button type="button" onClick={addItemRow} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.3rem 0.7rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  + Add Row
                </button>
              </div>

              {/* Component table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 32px', gap: '0.5rem', marginBottom: '0.4rem', padding: '0 0.25rem' }}>
                {['Component SKU', 'Component Name', 'Qty / Unit', ''].map(h => (
                  <span key={h} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>

              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 32px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  {/* Component SKU dropdown (shared component SKUs) */}
                  <select
                    value={item.component_sku}
                    onChange={e => handleItemSkuChange(idx, e.target.value)}
                    style={{ ...inputStyle, margin: 0 }}
                  >
                    {COMPONENT_OPTIONS.map(o => (
                      <option key={o.sku} value={o.sku}>{o.sku}</option>
                    ))}
                  </select>

                  {/* Component name auto-filled but editable */}
                  <input
                    value={item.component_name}
                    onChange={e => { const c = [...items]; c[idx] = { ...c[idx], component_name: e.target.value }; setItems(c); }}
                    placeholder="Component Name"
                    style={{ ...inputStyle, margin: 0 }}
                  />

                  {/* Qty */}
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.qty_per_unit}
                    onChange={e => handleItemQtyChange(idx, e.target.value)}
                    style={{ ...inputStyle, margin: 0 }}
                  />

                  {/* Remove row button — always keep at least 1 row */}
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length === 1}
                    style={{ background: 'none', border: 'none', color: items.length === 1 ? '#cbd5e1' : '#ef4444', cursor: items.length === 1 ? 'default' : 'pointer', fontSize: '1rem', padding: 0 }}
                    title="Remove row"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Form actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '4px', fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Create BOM'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="sku-filter" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Filter by SKU:</label>
          <input
            id="sku-filter"
            value={skuFilter}
            onChange={e => setSkuFilter(e.target.value)}
            placeholder="e.g. SKU-0001"
            style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', width: '140px' }}
          />
          {skuFilter && (
            <button onClick={() => setSkuFilter('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Clear</button>
          )}
        </div>
        <button onClick={fetchBoms} style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
          Refresh
        </button>
        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b' }}>
          Total: <strong>{boms.length}</strong> BOM{boms.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── BOM list table ───────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading BOMs…</div>
      ) : boms.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b' }}>No BOMs found{skuFilter ? ` for SKU "${skuFilter}"` : ''}.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['BOM ID', 'Product SKU', 'Product Name', 'Version', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boms.map(bom => (
                <tr key={bom.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1e40af', fontFamily: 'monospace' }}>{bom.id}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569', fontFamily: 'monospace' }}>{bom.product_sku}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#0f172a', fontWeight: 500 }}>{bom.product_name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>v{bom.version}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {bom.active
                      ? <span className="badge badge-green">Active</span>
                      : <span className="badge badge-red">Inactive</span>}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <button
                      onClick={() => navigate(`boms/${bom.id}`)}
                      style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Reusable inline styles so JSX stays readable
const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem'
};
const inputStyle = {
  width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px',
  fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box'
};

