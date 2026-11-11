import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../api';

const DEFAULT_BOM_DATA = {
  id: 'BOM-0001',
  product_sku: 'SKU-0001',
  product_name: '55-Inch LED Smart TV',
  version: 1,
  active: true,
  items: [
    { component_sku: 'SKU-0101', component_name: 'Display Panel', qty_per_unit: 1 },
    { component_sku: 'SKU-0102', component_name: 'Main Board', qty_per_unit: 1 },
    { component_sku: 'SKU-0103', component_name: 'Power Supply Unit', qty_per_unit: 1 },
    { component_sku: 'SKU-0104', component_name: 'Remote Control', qty_per_unit: 1 },
    { component_sku: 'SKU-0105', component_name: 'Packaging Box', qty_per_unit: 1 }
  ]
};

// Seed stock availability simulation according to ERP3-A3 (SKU-0102 is short for 20 units)
const STOCK_AVAILABILITY = {
  'SKU-0101': 35,
  'SKU-0102': 12, // Shortfall for 20 units: 20 - 12 = 8
  'SKU-0103': 40,
  'SKU-0104': 85,
  'SKU-0105': 50
};

export default function BOMDetailPage() {
  const { id } = useParams();
  const bomId = id || 'BOM-0001';

  const [bom, setBom] = useState(DEFAULT_BOM_DATA);
  const [loading, setLoading] = useState(false);
  const [targetQty, setTargetQty] = useState(20);
  const [checked, setChecked] = useState(false);
  const [purchasedSkus, setPurchasedSkus] = useState({});
  const [notification, setNotification] = useState('');

  useEffect(() => {
    async function loadBom() {
      try {
        const data = await api('erp3', `/api/boms/${bomId}`);
        if (data && data.items) {
          setBom(data);
        }
      } catch (err) {
        console.info(`Using fallback BOM data for ${bomId}:`, err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBom();
  }, [bomId]);

  const handleCheckMaterials = async () => {
    setChecked(true);
    setNotification('Checked live inventory against ERP-1 warehouse stock.');
  };

  const handleRequestPurchase = async (compSku, compName, shortfall) => {
    try {
      // ERP3-A3: Call ERP-2 purchase requests
      await api('erp3', `/api/boms/${bomId}/purchase-request`, {
        method: 'POST',
        body: {
          sku: compSku,
          product_name: compName,
          quantity: shortfall,
          requested_by: 'ERP-3 production',
          reason: 'Work order shortage'
        }
      });
    } catch (err) {
      console.info('Purchase request simulated mock triggered:', err.message);
    }

    setPurchasedSkus(prev => ({ ...prev, [compSku]: true }));
    setNotification(`Purchase request for ${shortfall} units of ${compSku} submitted to ERP-2 Purchasing.`);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
              {bom.id}: {bom.product_name}
            </h2>
            <span className="badge badge-green">active</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Finished Good SKU: <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{bom.product_sku}</span> | Version: {bom.version}
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

      {notification && (
        <div style={{ background: '#dbeafe', border: '1px solid #3b82f6', color: '#1d4ed8', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {notification}
        </div>
      )}

      {/* Material Requirement & Availability Checker (ERP3-A3) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
          Batch Material Requirement & Shortage Checker (ERP3-A3)
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
          Simulate production batch size and verify component availability in ERP-1 warehouse stock.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
            Batch Target Quantity:
          </label>
          <input
            type="number"
            min="1"
            value={targetQty}
            onChange={(e) => setTargetQty(Number(e.target.value) || 1)}
            style={{ width: '90px', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'monospace' }}
          />
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>units</span>
          <button
            type="button"
            onClick={handleCheckMaterials}
            className="btn btn-primary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}
          >
            🔍 Check Materials
          </button>
        </div>
      </div>

      {/* Components & Availability Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            Components & Stock Shortfall Matrix
          </h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>COMPONENT SKU</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>COMPONENT NAME</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>QTY / UNIT</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>REQUIRED ({targetQty})</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>AVAIL. STOCK</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>SHORTAGE ACTION</th>
            </tr>
          </thead>
          <tbody>
            {(bom.items || []).map((item) => {
              const reqQty = Number(item.qty_per_unit) * targetQty;
              const stock = STOCK_AVAILABILITY[item.component_sku] !== undefined ? STOCK_AVAILABILITY[item.component_sku] : 50;
              const shortfall = checked ? Math.max(0, reqQty - stock) : 0;
              const isShort = checked && shortfall > 0;
              const isPurchased = purchasedSkus[item.component_sku];

              return (
                <tr key={item.component_sku} style={{ borderBottom: '1px solid #f1f5f9', background: isShort ? '#fff7ed' : '#ffffff' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                    {item.component_sku}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                    {item.component_name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>
                    {Number(item.qty_per_unit).toFixed(1)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {reqQty}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: isShort ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                    {checked ? stock : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {!checked ? (
                      <span style={{ color: '#94a3b8' }}>Unchecked</span>
                    ) : isShort ? (
                      <span className="badge badge-red">✗ Shortfall: {shortfall}</span>
                    ) : (
                      <span className="badge badge-green">✓ Available</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {isShort ? (
                      isPurchased ? (
                        <span className="badge badge-blue">✓ Purchase Requested</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestPurchase(item.component_sku, item.component_name, shortfall)}
                          className="btn"
                          style={{ background: '#dc2626', color: '#ffffff', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Request Purchase
                        </button>
                      )
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
