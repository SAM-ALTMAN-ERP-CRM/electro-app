import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

export default function ReportsPage() {
  const [summary, setSummary] = useState({
    total_sales: '0.00',
    total_received: '0.00',
    outstanding: '0.00',
    cash_balance: '0.00'
  });
  const [monthlySales, setMonthlySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch Summary and Monthly Sales Data
  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setError('');
      try {
        const [sumData, monthData] = await Promise.all([
          api('erp5', '/api/reports/summary'),
          api('erp5', '/api/reports/monthly-sales')
        ]);
        if (sumData) setSummary(sumData);
        if (Array.isArray(monthData)) setMonthlySales(monthData);
      } catch (err) {
        setError(err.message || 'Failed to load finance reports');
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  // Format INR Currency
  const formatINR = (val) => {
    const num = parseFloat(val) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Generate & Download CSV Report
  const handleDownloadCSV = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const lines = [
      'Electro App - Financial Summary Report',
      `Generated Date,${dateStr}`,
      '',
      '--- Key Performance Indicators (KPIs) ---',
      'Metric,Amount (INR)',
      `Total Sales,${summary.total_sales}`,
      `Total Received (Cash),${summary.total_received}`,
      `Outstanding Receivables,${summary.outstanding}`,
      `Cash Balance,${summary.cash_balance}`,
      '',
      '--- Monthly Sales Trend ---',
      'Month,Sales Amount (INR)'
    ];

    monthlySales.forEach((item) => {
      lines.push(`${item.month},${item.amount}`);
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute maximum sales amount for CSS bar scaling
  const maxSales = monthlySales.reduce((max, item) => Math.max(max, parseFloat(item.amount) || 0), 1);

  return (
    <div className="page-container">
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a' }}>Financial Reports</h1>
            <span className="badge badge-blue">ERP-5 Finance</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Executive revenue insights, cash position, and receivables ageing trends.
          </p>
        </div>
        <button
          className="btn"
          onClick={handleDownloadCSV}
          disabled={loading}
          style={{ background: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>📥</span> Download CSV Report
        </button>
      </div>

      {/* Friendly Notifications */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', borderRadius: '6px', marginBottom: '1.5rem' }}>
          <strong>Error: </strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading financial analytics...
        </div>
      ) : (
        <>
          {/* 4 KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {/* Card 1: Total Sales */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>Total Revenue</span>
                <span className="badge badge-blue">Sales</span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
                {formatINR(summary.total_sales)}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Credit minus debit on sales account
              </p>
            </div>

            {/* Card 2: Total Received */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>Total Collected</span>
                <span className="badge badge-green">Received</span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#15803d' }}>
                {formatINR(summary.total_received)}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Cash inflow from payments
              </p>
            </div>

            {/* Card 3: Outstanding Receivables */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>Outstanding Dues</span>
                <span className="badge badge-amber">Receivables</span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b45309' }}>
                {formatINR(summary.outstanding)}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Customer pending payments
              </p>
            </div>

            {/* Card 4: Cash Balance */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>Cash & Bank</span>
                <span className="badge badge-green">Liquidity</span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#2563eb' }}>
                {formatINR(summary.cash_balance)}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Net debit minus credit on cash
              </p>
            </div>
          </div>

          {/* Monthly Sales CSS Bar Chart */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>Monthly Sales Trend</h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Aggregated sales volume grouped by invoice month</p>
              </div>
            </div>

            {monthlySales.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                No monthly sales history found in ledger.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {monthlySales.map((item) => {
                  const numAmt = parseFloat(item.amount) || 0;
                  const percentage = Math.max(5, Math.min(100, Math.round((numAmt / maxSales) * 100)));

                  return (
                    <div key={item.month}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#334155' }}>{item.month}</span>
                        <span style={{ color: '#0f172a' }}>{formatINR(item.amount)}</span>
                      </div>
                      {/* Pure CSS Bar Container */}
                      <div style={{ width: '100%', height: '24px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #38bdf8 0%, #2563eb 100%)',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease-in-out'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
