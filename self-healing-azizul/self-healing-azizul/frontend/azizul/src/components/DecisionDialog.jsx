import { useState } from 'react';

export default function DecisionDialog({ incident, type, onClose, onConfirm }) {
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const reject = type === 'reject';
  const submit = async (event) => { event.preventDefault(); if (reject && !reason.trim()) return; setBusy(true); try { await onConfirm(reason.trim()); } finally { setBusy(false); } };
  return <div className="backdrop" role="presentation"><form className="dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">{reject ? 'Reject remediation' : 'Approve remediation'}</h2><p>{reject ? `Tell the learning loop why ${incident.incidentId} should not be applied.` : `This will authorize the recommended remediation for ${incident.incidentId}.`}</p>{reject && <label>Rejection reason<textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Example: restart would interrupt a customer migration" required maxLength="500" /></label>}<div className="dialog-actions"><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className={reject ? 'danger' : 'primary'} disabled={busy}>{busy ? 'Submitting...' : reject ? 'Reject fix' : 'Approve fix'}</button></div></form></div>;
}
