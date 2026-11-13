// [CRM2-D2] Assign screen
// Lists unassigned tickets (from GET /api/tickets minus assigned ones) with centre dropdown and Assign action.
import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

export default function AssignPage() {
  const [unassignedTickets, setUnassignedTickets] = useState([]);
  const [centres, setCentres] = useState([]);
  const [selectedCentres, setSelectedCentres] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [assigningId, setAssigningId] = useState(null);

  // Load tickets, assignments, and centres
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load centres (active only)
      let centresList = [];
      try {
        const centresData = await api('crm2', '/api/centres?active=true');
        centresList = Array.isArray(centresData) ? centresData : [];
        setCentres(centresList);
      } catch (err) {
        throw new Error('Failed to load service centres: ' + err.message);
      }

      // Load assignments
      let assignedMap = new Set();
      try {
        const assignmentsData = await api('crm2', '/api/assignments');
        if (Array.isArray(assignmentsData)) {
          assignmentsData.forEach(a => assignedMap.add(a.ticket_id));
        }
      } catch (err) {
        // Assignments endpoint error
        throw new Error('Failed to load assignments: ' + err.message);
      }

      // Load tickets from CRM-2 tickets service (Ashutosh's CRM2-A1)
      let ticketsList = [];
      try {
        const ticketsData = await api('crm2', '/api/tickets');
        ticketsList = Array.isArray(ticketsData) ? ticketsData : [];
      } catch (err) {
        // If tickets service is not available yet, show friendly guidance
        setError('Tickets service not available yet (waiting on CRM2-A1)');
        setLoading(false);
        return;
      }

      // Filter unassigned tickets (omit already assigned tickets and closed tickets)
      const unassigned = ticketsList.filter(
        t => !assignedMap.has(t.id) && t.status !== 'closed'
      );

      setUnassignedTickets(unassigned);

      // Default the dropdown selection for each ticket to the first active centre
      if (centresList.length > 0) {
        const initialSelections = {};
        unassigned.forEach(t => {
          initialSelections[t.id] = centresList[0].id;
        });
        setSelectedCentres(initialSelections);
      }
    } catch (err) {
      setError(err.message || 'Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handle dropdown change for a particular ticket
  function handleCentreChange(ticketId, centreId) {
    setSelectedCentres(prev => ({
      ...prev,
      [ticketId]: centreId
    }));
  }

  // Handle assigning ticket to service centre
  async function handleAssign(ticketId) {
    const centreId = selectedCentres[ticketId] || (centres.length > 0 ? centres[0].id : null);
    if (!centreId) {
      setError('Please select a service centre first');
      return;
    }

    try {
      setAssigningId(ticketId);
      setError(null);
      setSuccessMsg(null);

      await api('crm2', '/api/assignments', {
        method: 'POST',
        body: {
          ticket_id: ticketId,
          centre_id: centreId
        }
      });

      const assignedCentre = centres.find(c => c.id === centreId);
      const centreName = assignedCentre ? assignedCentre.name : centreId;
      setSuccessMsg(`Ticket ${ticketId} successfully assigned to ${centreName}!`);

      // Done when: assigning from the page removes the ticket from the unassigned list
      setUnassignedTickets(prev => prev.filter(t => t.id !== ticketId));
    } catch (err) {
      setError(err.message || `Failed to assign ticket ${ticketId}`);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
            Assign Tickets
          </h2>
          <span className="badge badge-blue">CRM-2</span>
        </div>
      </div>

      <p style={{ color: '#64748b', marginTop: 0, marginBottom: '1.5rem' }}>
        Route open support tickets to regional service and repair centres for diagnostic inspection and repair.
      </p>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '1.25rem' }}>
          {successMsg}
        </div>
      )}

      {/* Info summary */}
      {!loading && !error && (
        <div style={{ padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
          ℹ {unassignedTickets.length} ticket{unassignedTickets.length === 1 ? '' : 's'} awaiting service centre assignment
        </div>
      )}

      {/* Unassigned Tickets Table */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Loading unassigned tickets...</p>
      ) : unassignedTickets.length === 0 ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#475569', margin: 0, fontWeight: 500 }}>
            ✓ All open tickets have been assigned to service centres.
          </p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>
              <th style={{ padding: '0.75rem 1rem' }}>TICKET ID</th>
              <th style={{ padding: '0.75rem 1rem' }}>CUSTOMER</th>
              <th style={{ padding: '0.75rem 1rem' }}>SUBJECT</th>
              <th style={{ padding: '0.75rem 1rem' }}>STATUS</th>
              <th style={{ padding: '0.75rem 1rem' }}>ASSIGN TO CENTRE</th>
              <th style={{ padding: '0.75rem 1rem' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {unassignedTickets.map((t, idx) => {
              const statusClass =
                t.status === 'in_progress' ? 'badge badge-amber' :
                t.status === 'resolved' ? 'badge badge-green' :
                t.status === 'closed' ? 'badge' : 'badge badge-blue';

              return (
                <tr key={t.id} style={{ borderBottom: idx < unassignedTickets.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '0.9rem' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                    {t.id}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                    {t.customer_name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                    {t.subject}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={statusClass}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {centres.length === 0 ? (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No active centres</span>
                    ) : (
                      <select
                        value={selectedCentres[t.id] || centres[0]?.id || ''}
                        onChange={e => handleCentreChange(t.id, e.target.value)}
                        style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', maxWidth: '240px' }}
                      >
                        {centres.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.city})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button
                      className="btn"
                      onClick={() => handleAssign(t.id)}
                      disabled={centres.length === 0 || assigningId === t.id}
                      style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {assigningId === t.id ? 'Assigning...' : 'Assign'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
