import React, { useEffect, useState } from 'react';
import api from '../../../api';

const money = (n) =>
  `Rs ${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export default function Receivables() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api('erp5', '/api/receivables/ageing');
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || 'Failed to load receivables');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading receivables...</p>;

  const totals = rows.reduce(
    (acc, r) => ({
      not_yet_due: acc.not_yet_due + Number(r.not_yet_due || 0),
      overdue_1_15: acc.overdue_1_15 + Number(r.overdue_1_15 || 0),
      overdue_16_30: acc.overdue_16_30 + Number(r.overdue_16_30 || 0),
      overdue_31_plus: acc.overdue_31_plus + Number(r.overdue_31_plus || 0),
      total_outstanding: acc.total_outstanding + Number(r.total_outstanding || 0)
    }),
    {
      not_yet_due: 0,
      overdue_1_15: 0,
      overdue_16_30: 0,
      overdue_31_plus: 0,
      total_outstanding: 0
    }
  );

  return (
    <div>
      <h2>Receivables Ageing</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {rows.length === 0 ? (
        <p>All invoices are paid. No outstanding receivables.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>Customer</th>
              <th>Not yet due</th>
              <th>1 to 15 days</th>
              <th>16 to 30 days</th>
              <th>31 or more</th>
              <th>Total outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customer_id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{r.customer_name} ({r.customer_id})</td>
                <td>{money(r.not_yet_due)}</td>
                <td>{money(r.overdue_1_15)}</td>
                <td>{money(r.overdue_16_30)}</td>
                <td style={{ color: Number(r.overdue_31_plus) > 0 ? 'crimson' : 'inherit' }}>
                  {money(r.overdue_31_plus)}
                </td>
                <td>{money(r.total_outstanding)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', background: '#f8fafc' }}>
              <td>TOTAL</td>
              <td>{money(totals.not_yet_due)}</td>
              <td>{money(totals.overdue_1_15)}</td>
              <td>{money(totals.overdue_16_30)}</td>
              <td>{money(totals.overdue_31_plus)}</td>
              <td>{money(totals.total_outstanding)}</td>
            </tr>
          </tbody>
        </table>
      )}
      <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>
        Grand Total Outstanding: {money(totals.total_outstanding)}
      </p>
    </div>
  );
}
