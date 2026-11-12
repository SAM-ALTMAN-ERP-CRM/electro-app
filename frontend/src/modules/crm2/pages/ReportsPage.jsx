// [CRM2-D3] Support reports: summary cards, tables and plain HTML/CSS bar charts (no chart library).
import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import { prettyLabel, styles } from './TicketsPage';

// Bar colours follow the badge colours used on the ticket pages
const STATUS_COLOURS = { open: '#3b82f6', in_progress: '#f59e0b', resolved: '#22c55e', closed: '#94a3b8' };
const PRIORITY_COLOURS = { high: '#ef4444', medium: '#f59e0b', low: '#94a3b8' };

// Empty report, so the page renders before data arrives and when there are no tickets
const EMPTY = {
  by_status: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
  by_priority: { high: 0, medium: 0, low: 0 },
  total_tickets: 0,
  overdue_count: 0,
  avg_resolution_hours: 0,
  active_centres: 0,
  by_centre: []
};

function SummaryCard({ label, value, highlight }) {
  return (
    <div style={{ ...styles.card, marginBottom: 0, flex: '1 1 160px' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem', color: highlight ? '#b91c1c' : '#0f172a' }}>{value}</div>
    </div>
  );
}

// One bar per row; width is the row's share of the largest value (a div with a % width)
function BarTable({ title, rows, total }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div style={{ ...styles.card, flex: '1 1 340px' }}>
      <h3 style={{ marginBottom: '0.75rem' }}>{title}</h3>
      {total === 0 ? (
        <p style={styles.muted}>No tickets yet.</p>
      ) : (
        rows.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '120px', fontSize: '0.9rem' }}>{r.label}</div>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '4px', height: '1.1rem' }}>
              <div style={{ width: `${(r.count / max) * 100}%`, background: r.colour, height: '100%', borderRadius: '4px' }} />
            </div>
            <div style={{ width: '2.5rem', textAlign: 'right', fontWeight: 600 }}>{r.count}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('crm2', '/api/reports/tickets-summary')
      .then(data => setReport({ ...EMPTY, ...data }))
      .catch(err => setError(`Could not load reports: ${err.message}`))
      .finally(() => setLoading(false));
  }, []);

  const statusRows = Object.entries(report.by_status).map(([key, count]) => ({
    label: prettyLabel(key), count, colour: STATUS_COLOURS[key] || '#94a3b8'
  }));
  const priorityRows = Object.entries(report.by_priority).map(([key, count]) => ({
    label: prettyLabel(key), count, colour: PRIORITY_COLOURS[key] || '#94a3b8'
  }));
  const centreMax = Math.max(1, ...report.by_centre.map(c => c.ticket_count));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2>Support Reports</h2>
          <p style={styles.muted}>Ticket volume, SLA and resolution time, and how tickets are spread across service centres.</p>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {loading && <p style={styles.muted}>Loading reports…</p>}

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <SummaryCard label="Total tickets" value={report.total_tickets} />
        <SummaryCard label="Overdue tickets" value={report.overdue_count} highlight={report.overdue_count > 0} />
        <SummaryCard label="Avg resolution" value={`${report.avg_resolution_hours} h`} />
        <SummaryCard label="Active centres" value={report.active_centres} />
      </div>

      {/* Bar charts */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <BarTable title="Tickets by status" rows={statusRows} total={report.total_tickets} />
        <BarTable title="Tickets by priority" rows={priorityRows} total={report.total_tickets} />
      </div>

      {/* Tickets per service centre */}
      <div style={styles.card}>
        <h3 style={{ marginBottom: '0.5rem' }}>Tickets per service centre</h3>
        {report.by_centre.length === 0 ? (
          <p style={styles.muted}>No service centres yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ margin: 0, boxShadow: 'none' }}>
              <thead>
                <tr>
                  <th>Centre</th>
                  <th>City</th>
                  <th style={{ width: '40%' }}>Tickets</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {report.by_centre.map(c => (
                  <tr key={c.centre_id}>
                    <td>{c.centre_name}<div style={{ ...styles.muted, fontSize: '0.75rem' }}>{c.centre_id}</div></td>
                    <td>{c.city}</td>
                    <td>
                      <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '0.9rem' }}>
                        <div style={{ width: `${(c.ticket_count / centreMax) * 100}%`, background: '#2563eb', height: '100%', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.ticket_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
