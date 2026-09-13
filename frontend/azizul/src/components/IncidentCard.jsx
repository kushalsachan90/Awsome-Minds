import { useState } from 'react';

const format = (value) => value === undefined || value === null || value === '' ? '—' : String(value);
const label = (value) => String(value || 'UNKNOWN').replaceAll('_', ' ');

export default function IncidentCard({ incident, onDecision }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const awaiting = incident.status === 'AWAITING_APPROVAL';

  const decide = async (type) => {
    if (!awaiting || busy) return;
    const verb = type === 'approve' ? 'approve' : 'reject';
    const message = type === 'approve'
      ? `Approve remediation for ${incident.incidentId}?`
      : `Reject remediation for ${incident.incidentId}?`;
    if (!window.confirm(message)) return;

    setBusy(true);
    try { await onDecision(incident.incidentId, verb); }
    finally { setBusy(false); }
  };

  return (
    <article className="incident-card">
      <div className="incident-head">
        <div className="incident-title">
          <div className={`severity severity-${String(incident.severity || 'unknown').toLowerCase()}`}>
            {format(incident.severity)}
          </div>
          <div>
            <h2>{format(incident.incidentId)}</h2>
            <p>{format(incident.resourceType)} <span>•</span> {format(incident.resourceId)}</p>
          </div>
        </div>
        <span className={`status status-${String(incident.status || 'unknown').toLowerCase()}`}>{label(incident.status)}</span>
      </div>

      <div className="metric-grid">
        <div><span>Metric</span><strong>{format(incident.metric)}</strong></div>
        <div><span>Observed</span><strong>{format(incident.metricValue)}</strong></div>
        <div><span>Threshold</span><strong>{format(incident.threshold)}</strong></div>
      </div>

      <div className="diagnosis-grid">
        <section><span>Root cause</span><p>{format(incident.rootCause)}</p></section>
        <section><span>Reason</span><p>{format(incident.reason)}</p></section>
        <section><span>Recommended action</span><p>{format(incident.recommendedAction)}</p></section>
      </div>

      <div className="card-footer">
        <button className="details-button" onClick={() => setOpen(!open)}>{open ? 'Hide details' : 'View details'}</button>
        {awaiting && (
          <div className="decision-buttons">
            <button className="reject-button" disabled={busy} onClick={() => decide('reject')}>Reject</button>
            <button className="approve-button" disabled={busy} onClick={() => decide('approve')}>
              {busy ? 'Processing…' : 'Approve fix'}
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="details-panel">
          <div><span>Diagnosed at</span><strong>{format(incident.diagnosedAt)}</strong></div>
          <div><span>Approved by</span><strong>{format(incident.approvedBy)}</strong></div>
          <div><span>Approved at</span><strong>{format(incident.approvedAt)}</strong></div>
          <div><span>Fix status</span><strong>{format(incident.fixStatus)}</strong></div>
          <div><span>Fixed at</span><strong>{format(incident.fixedAt)}</strong></div>
        </div>
      )}
    </article>
  );
}
