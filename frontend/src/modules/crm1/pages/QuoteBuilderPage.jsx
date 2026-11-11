import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../api';

// Shared products contract fallback (ERP-1 shared seed catalog)
const FALLBACK_PRODUCTS = [
  { sku: 'SKU-0001', name: '55-inch 4K Smart TV', unit_price: 42990 },
  { sku: 'SKU-0002', name: '43-inch Full HD TV', unit_price: 24990 },
  { sku: 'SKU-0003', name: '65-inch OLED TV', unit_price: 94990 },
  { sku: 'SKU-0004', name: 'Soundbar 2.1', unit_price: 8990 },
  { sku: 'SKU-0005', name: 'Soundbar 5.1', unit_price: 17990 },
  { sku: 'SKU-0006', name: 'Wireless Headphones', unit_price: 3499 },
  { sku: 'SKU-0007', name: 'Bluetooth Earbuds', unit_price: 2299 },
  { sku: 'SKU-0008', name: '20W Fast Charger', unit_price: 899 }
];

export default function QuoteBuilderPage() {
  const navigate = useNavigate();

  // Products state (fetched from ERP-1 or fallback)
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Quote Header Form State
  const [opportunityId, setOpportunityId] = useState('OPP-0001');
  const [customerId, setCustomerId] = useState('CUST-0001');
  const [salesRepId, setSalesRepId] = useState('EMP-0001');
  const [dealerId, setDealerId] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');

  // Dynamic Item Rows State
  const [items, setItems] = useState([
    {
      sku: 'SKU-0001',
      product_name: '55-inch 4K Smart TV',
      quantity: 1,
      unit_price: 42990
    }
  ]);

  // Submission UI States
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch real products catalog from ERP-1
  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const data = await api('erp1', '/api/products');
        if (Array.isArray(data) && data.length > 0) {
          // Normalize product fields (support both price and unit_price)
          const normalized = data.map(p => ({
            sku: p.sku || p.id,
            name: p.name || p.product_name,
            unit_price: Number(p.unit_price || p.price || 0)
          }));
          setProducts(normalized);
        }
      } catch (err) {
        console.warn('[crm1] ERP-1 /api/products unavailable, using shared catalog seed fallback:', err.message);
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, []);

  // 2. Dynamic row manipulation
  const handleAddItem = () => {
    const defaultProduct = products[0] || FALLBACK_PRODUCTS[0];
    setItems(prev => [
      ...prev,
      {
        sku: defaultProduct.sku,
        product_name: defaultProduct.name,
        quantity: 1,
        unit_price: defaultProduct.unit_price
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemSkuChange = (index, selectedSku) => {
    const prod = products.find(p => p.sku === selectedSku);
    if (!prod) return;

    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        sku: prod.sku,
        product_name: prod.name,
        unit_price: prod.unit_price
      };
      return updated;
    });
  };

  const handleQuantityChange = (index, val) => {
    const parsed = parseInt(val, 10);
    const validQty = isNaN(parsed) || parsed < 1 ? 1 : parsed;

    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: validQty
      };
      return updated;
    });
  };

  // 3. Live Financial Totals Calculation
  const subtotal = items.reduce((sum, itm) => sum + (Number(itm.quantity) * Number(itm.unit_price)), 0);
  const discountRate = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = Number((subtotal * (discountRate / 100)).toFixed(2));
  const taxableValue = Number((subtotal - discountAmount).toFixed(2));
  const gst = Number((taxableValue * 0.18).toFixed(2));
  const grandTotal = Number((taxableValue + gst).toFixed(2));

  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 4. Form Submit: Save as Draft
  const handleSaveDraft = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!opportunityId.trim()) {
      setError('Opportunity ID is required.');
      return;
    }
    if (!customerId.trim()) {
      setError('Customer ID is required.');
      return;
    }
    if (!salesRepId.trim()) {
      setError('Sales Rep ID is required.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one line item.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        opportunity_id: opportunityId.trim(),
        customer_id: customerId.trim(),
        dealer_id: dealerId.trim() || null,
        sales_rep_id: salesRepId.trim(),
        discount_percent: discountRate,
        status: 'draft',
        items: items.map(itm => ({
          sku: itm.sku,
          product_name: itm.product_name,
          quantity: parseInt(itm.quantity, 10),
          unit_price: parseFloat(itm.unit_price)
        }))
      };

      await api('crm1', '/api/quotes', {
        method: 'POST',
        body: payload
      });

      // Navigate to Quotes List upon successful creation
      navigate('/crm1/quotes');
    } catch (err) {
      setError(err.message || 'Failed to save quote. Please verify network and backend service.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Navigation header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link to="/crm1/quotes" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            ← Back to Quotes List
          </Link>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>
            Quote Builder ([CRM1-C2])
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Configure quotation details, select products from ERP-1 catalog, and calculate live GST breakdown.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="badge badge-amber">Draft Mode</span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div style={{ padding: '0.9rem 1.25rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #fecaca', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSaveDraft}>
        {/* Quote Header Information Card */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            1. Quote Header Information
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {/* Opportunity ID */}
            <div>
              <label htmlFor="opp-id" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Opportunity ID *
              </label>
              <select
                id="opp-id"
                value={opportunityId}
                onChange={(e) => setOpportunityId(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
              >
                <option value="OPP-0001">OPP-0001 (Aarav Mehta - Smart TV)</option>
                <option value="OPP-0002">OPP-0002 (BrightHome Retail - Bulk TVs)</option>
                <option value="OPP-0003">OPP-0003 (Priya Nair - Home Audio)</option>
                <option value="OPP-0004">OPP-0004 (Sunrise Electronics - Display)</option>
                <option value="OPP-0005">OPP-0005 (Kiran Patel - Appliances)</option>
                <option value="OPP-0006">OPP-0006 (Metro Offices - Audio/Visual)</option>
              </select>
            </div>

            {/* Customer ID */}
            <div>
              <label htmlFor="cust-id" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Customer (CRM-3) *
              </label>
              <select
                id="cust-id"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
              >
                <option value="CUST-0001">CUST-0001 - Aarav Mehta (Retail)</option>
                <option value="CUST-0002">CUST-0002 - Sunrise Electronics Pvt Ltd</option>
                <option value="CUST-0003">CUST-0003 - Priya Nair (Retail)</option>
                <option value="CUST-0004">CUST-0004 - BrightHome Retail LLP (Dealer)</option>
                <option value="CUST-0005">CUST-0005 - Kiran Patel (Retail)</option>
                <option value="CUST-0006">CUST-0006 - Metro Offices Ltd</option>
                <option value="CUST-0007">CUST-0007 - Sneha Iyer (Retail)</option>
                <option value="CUST-0008">CUST-0008 - Gadget Hub (Dealer)</option>
              </select>
            </div>

            {/* Sales Rep ID */}
            <div>
              <label htmlFor="rep-id" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Sales Representative (ERP-6) *
              </label>
              <select
                id="rep-id"
                value={salesRepId}
                onChange={(e) => setSalesRepId(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
              >
                <option value="EMP-0001">EMP-0001 - Rohan Kulkarni</option>
                <option value="EMP-0002">EMP-0002 - Neha Sharma</option>
                <option value="EMP-0003">EMP-0003 - Vikram Singh</option>
                <option value="EMP-0004">EMP-0004 - Anjali Rao</option>
              </select>
            </div>

            {/* Dealer ID */}
            <div>
              <label htmlFor="dealer-id" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Dealer ID (Optional)
              </label>
              <select
                id="dealer-id"
                value={dealerId}
                onChange={(e) => setDealerId(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
              >
                <option value="">None (Direct Customer)</option>
                <option value="DLR-0001">DLR-0001 - BrightHome Retail (Pune - Gold)</option>
                <option value="DLR-0002">DLR-0002 - Gadget Hub (Bengaluru - Silver)</option>
                <option value="DLR-0003">DLR-0003 - Metro Electronics (Bronze)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Quote Line Items Card */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
              2. Line Items ({items.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {loadingProducts ? 'Refreshing products catalog...' : 'Products source: ERP-1'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 1rem 0' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', width: '30%' }}>Select Product (SKU)</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', width: '30%' }}>Product Name</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', width: '12%', textAlign: 'center' }}>Quantity</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', width: '13%', textAlign: 'right' }}>Price (₹)</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', width: '15%', textAlign: 'right' }}>Line Total (₹)</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', width: '50px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* SKU Selection Dropdown */}
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <select
                        value={row.sku}
                        onChange={(e) => handleItemSkuChange(idx, e.target.value)}
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      >
                        {products.map(p => (
                          <option key={p.sku} value={p.sku}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Pre-filled Product Name */}
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <input
                        type="text"
                        value={row.product_name}
                        readOnly
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.85rem', color: '#475569' }}
                      />
                    </td>

                    {/* Quantity Input */}
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity}
                        onChange={(e) => handleQuantityChange(idx, e.target.value)}
                        style={{ width: '70px', padding: '0.45rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </td>

                    {/* Unit Price (pre-populated) */}
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 500, color: '#334155', fontSize: '0.85rem' }}>
                      {formatMoney(row.unit_price)}
                    </td>

                    {/* Live Row Total */}
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                      {formatMoney(Number(row.quantity) * Number(row.unit_price))}
                    </td>

                    {/* Remove Action */}
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        style={{
                          background: items.length <= 1 ? '#f1f5f9' : '#fee2e2',
                          color: items.length <= 1 ? '#94a3b8' : '#dc2626',
                          border: 'none',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '4px',
                          cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                        title={items.length <= 1 ? 'At least 1 item is required' : 'Remove item row'}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            style={{
              background: '#f8fafc',
              color: '#2563eb',
              border: '1px dashed #3b82f6',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>+</span> Add Line Item
          </button>
        </div>

        {/* Live Calculation & Totals Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Discount Settings Box */}
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
              3. Discount & Approvals
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="discount-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                Special Discount Percentage (%)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="discount-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  style={{ width: '120px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600 }}
                />
                <span style={{ fontSize: '1rem', color: '#64748b' }}>%</span>
              </div>
            </div>

            {/* Discount policy hint */}
            {Number(discountPercent) > 5 ? (
              <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.8rem', color: '#92400e' }}>
                <strong>⚠️ Approval Required:</strong> Discount is greater than 5.0%. This quote will be flagged with <code>needs_approval = true</code> and must be approved by admin prior to sending.
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Standard discount allowance up to 5.0% applies without manager approval.
              </div>
            )}
          </div>

          {/* Live Summary Breakdown Box */}
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              4. Live Totals (INR)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Subtotal ({items.length} items):</span>
                <strong style={{ color: '#0f172a' }}>{formatMoney(subtotal)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Discount ({discountRate.toFixed(1)}%):</span>
                <strong style={{ color: discountAmount > 0 ? '#b91c1c' : '#475569' }}>
                  -{formatMoney(discountAmount)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Taxable Amount:</span>
                <strong style={{ color: '#0f172a' }}>{formatMoney(taxableValue)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>GST (18% Statutory):</span>
                <strong style={{ color: '#0f172a' }}>{formatMoney(gst)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem', fontSize: '1.15rem' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Grand Total:</span>
                <strong style={{ color: '#15803d', fontWeight: 800 }}>{formatMoney(grandTotal)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
          <Link
            to="/crm1/quotes"
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '6px',
              background: saving ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving Quote...' : 'Save as Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
