import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

const INITIAL_QC_CHECKS = [
  { id: 'QC-0001', wo_id: 'WO-0001', inspector: 'EMP-0005', checked_qty: 50, passed_qty: 50, failed_qty: 0, defect_reason: null, result: 'pass', checked_at: '2026-11-12 14:00' },
  { id: 'QC-0002', wo_id: 'WO-0002', inspector: 'EMP-0006', checked_qty: 25, passed_qty: 23, failed_qty: 2, defect_reason: 'scratch', result: 'rework', checked_at: '2026-11-13 11:30' },
  { id: 'QC-0003', wo_id: 'WO-0003', inspector: 'EMP-0005', checked_qty: 20, passed_qty: 14, failed_qty: 6, defect_reason: 'no power', result: 'fail', checked_at: '2026-11-14 16:15' }
];

export default function QCPage() {
  const [checks, setChecks] = useState(INITIAL_QC_CHECKS);
  const [loading, setLoading] = useState(false);

  // Fetch live inspection records from backend API [ERP3-D2]
  const fetchChecks = async () => {
    setLoading(true);
    try {
      const res = await api('erp3', '/api/qc');
      const items = res?.data || res;
      if (Array.isArray(items) && items.length > 0) {
        setChecks(items);
      }
    } catch (err) {
      console.warn('[erp3/qc] Failed to fetch live QC checks, using fallback:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, []);

  // Form State
  const [woId, setWoId] = useState('WO-0001');
  const [inspector, setInspector] = useState('EMP-0005');
  const [checkedQty, setCheckedQty] = useState(50);
  const [passedQty, setPassedQty] = useState(50);
  const [failedQty, setFailedQty] = useState(0);
  const [defectReason, setDefectReason] = useState('none');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculate Result according to rule:
  // Pass if failed is 0; Fail if failed > 20% of checked; otherwise Rework.
  const calculateResult = (checked, passed, failed) => {
    if (failed === 0) return 'pass';
    if (failed > 0.2 * checked) return 'fail';
    return 'rework';
  };

  const previewResult = calculateResult(Number(checkedQty), Number(passedQty), Number(failedQty));

  const handleCheckedChange = (val) => {
    const c = Number(val) || 0;
    setCheckedQty(c);
    setPassedQty(c);
    setFailedQty(0);
  };

  const handleFailedChange = (val) => {
    const f = Number(val) || 0;
    const c = Number(checkedQty) || 0;
    setFailedQty(f);
    setPassedQty(Math.max(0, c - f));
  };

  const handlePassedChange = (val) => {
    const p = Number(val) || 0;
    const c = Number(checkedQty) || 0;
    setPassedQty(p);
    setFailedQty(Math.max(0, c - p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const c = Number(checkedQty);
    const p = Number(passedQty);
    const f = Number(failedQty);

    if (c <= 0) {
      setError('Checked quantity must be greater than 0.');
      return;
    }
    if (p + f !== c) {
      setError(`Quantity mismatch: Passed (${p}) + Failed (${f}) must equal Checked (${c}).`);
      return;
    }

    const calculated = calculateResult(c, p, f);
    const newCheck = {
      id: `QC-000${checks.length + 1}`,
      wo_id: woId,
      inspector,
      checked_qty: c,
      passed_qty: p,
      failed_qty: f,
      defect_reason: f > 0 && defectReason !== 'none' ? defectReason : null,
      result: calculated,
      checked_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    try {
      const res = await api('erp3', '/api/qc', {
        method: 'POST',
        body: newCheck
      });
      const created = res?.data || newCheck;
      setChecks(prev => [created, ...prev]);
      setSuccess(`Inspection ${created.id} recorded with result: ${calculated.toUpperCase()}.`);
    } catch (err) {
      console.info('Simulated QC submit fallback:', err.message);
      setChecks(prev => [newCheck, ...prev]);
      setSuccess(`Inspection ${newCheck.id} recorded with result: ${calculated.toUpperCase()}.`);
    }
  };

  // Metrics (ERP3-D3)
  const totalChecked = checks.reduce((sum, c) => sum + Number(c.checked_qty), 0);
  const totalPassed = checks.reduce((sum, c) => sum + Number(c.passed_qty), 0);
  const passRate = totalChecked > 0 ? ((totalPassed / totalChecked) * 100).toFixed(1) : '100.0';

  const defects = { scratch: 0, 'dead pixel': 0, 'no power': 0, 'wrong label': 0, other: 0 };
  checks.forEach(c => {
    if (c.defect_reason && defects[c.defect_reason] !== undefined) {
      defects[c.defect_reason] += Number(c.failed_qty) || 1;
    } else if (c.defect_reason) {
      defects.other += Number(c.failed_qty) || 1;
    }
  });

  const getResultBadge = (res) => {
    switch (res) {
      case 'pass': return <span className="badge badge-green">pass</span>;
      case 'rework': return <span className="badge badge-amber">rework</span>;
      case 'fail': return <span className="badge badge-red">fail</span>;
      default: return <span className="badge badge-blue">{res}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
              Quality Control (QC) & Inspection
            </h2>
            <span className="badge badge-blue">ERP-3 Production</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Assembly batch inspections, pass/fail/rework evaluation and defect trend analytics
          </p>
        </div>
      </div>

      {/* Alerts */}
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

      {/* QC Summary Metrics Card (ERP3-D3) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
          Overall QC Summary & Defect Distribution (ERP3-D3)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>OVERALL PASS RATE</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}>
              {passRate}%
            </div>
            <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', marginTop: '0.5rem' }}>
              <div style={{ width: `${passRate}%`, height: '100%', background: '#16a34a' }} />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
              {totalPassed} of {totalChecked} total inspected units passed.
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
              DEFECT REASONS BREAKDOWN
            </div>
            {Object.entries(defects).map(([reason, count]) => (
              <div key={reason} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ textTransform: 'capitalize', color: '#334155' }}>{reason}:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: count > 0 ? '#b91c1c' : '#64748b' }}>
                  {count} units
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Record Inspection Form (ERP3-D2) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
          Record Batch Inspection (ERP3-D2)
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Work Order
              </label>
              <select
                value={woId}
                onChange={(e) => setWoId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="WO-0001">WO-0001 (55" TV)</option>
                <option value="WO-0002">WO-0002 (65" TV)</option>
                <option value="WO-0003">WO-0003 (55" TV)</option>
                <option value="WO-0004">WO-0004 (55" TV)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Inspector
              </label>
              <select
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="EMP-0005">EMP-0005 (Lead QC)</option>
                <option value="EMP-0006">EMP-0006 (Floor Inspector)</option>
                <option value="EMP-0007">EMP-0007 (Assembly Inspector)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Checked Qty
              </label>
              <input
                type="number"
                min="1"
                value={checkedQty}
                onChange={(e) => handleCheckedChange(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'monospace' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Passed Qty
              </label>
              <input
                type="number"
                min="0"
                max={checkedQty}
                value={passedQty}
                onChange={(e) => handlePassedChange(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'monospace' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Failed Qty
              </label>
              <input
                type="number"
                min="0"
                max={checkedQty}
                value={failedQty}
                onChange={(e) => handleFailedChange(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'monospace' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Defect Reason
              </label>
              <select
                value={defectReason}
                onChange={(e) => setDefectReason(e.target.value)}
                disabled={Number(failedQty) === 0}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="none">None (Zero defects)</option>
                <option value="scratch">Scratch</option>
                <option value="dead pixel">Dead pixel</option>
                <option value="no power">No power</option>
                <option value="wrong label">Wrong label</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Calculated Result:
              </span>
              {getResultBadge(previewResult)}
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                (Pass if 0 fail, Fail if &gt;20% defective, Rework otherwise)
              </span>
            </div>

            <button type="submit" className="btn btn-primary">
              Submit QC Check
            </button>
          </div>
        </form>
      </div>

      {/* QC Log Table (ERP3-D1) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            Quality Inspection Records Log (ERP3-D1)
          </h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>QC ID</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>WORK ORDER</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>INSPECTOR</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>CHECKED</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>PASSED</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>FAILED</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>DEFECT REASON</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>RESULT</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Loading quality inspection records...
                </td>
              </tr>
            ) : checks.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No quality checks recorded yet.
                </td>
              </tr>
            ) : (
              checks.map((chk) => (
                <tr key={chk.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{chk.id}</td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#2563eb' }}>{chk.wo_id}</td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{chk.inspector}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{chk.checked_qty}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: '#16a34a', fontWeight: 600 }}>{chk.passed_qty}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: chk.failed_qty > 0 ? '#dc2626' : '#64748b' }}>{chk.failed_qty}</td>
                  <td style={{ padding: '0.75rem 1rem', color: chk.defect_reason ? '#b45309' : '#94a3b8', textTransform: 'capitalize' }}>
                    {chk.defect_reason || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {getResultBadge(chk.result)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                    {chk.checked_at}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
