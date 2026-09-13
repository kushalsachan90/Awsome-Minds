import { useCallback, useEffect, useMemo, useState } from 'react';
import IncidentCard from './components/IncidentCard';
import { approveIncident, getIncidents, rejectIncident } from './services/api';

const DEMO_INCIDENT = {
  incidentId: 'DEMO-001', resourceType: 'EC2', resourceId: 'i-demo123456',
  metric: 'CPUUtilization', metricValue: 96, threshold: 80, severity: 'HIGH',
  rootCause: 'Sustained CPU saturation', reason: 'CPU utilization remained above the configured threshold.',
  recommendedAction: 'Restart the affected EC2 instance.', status: 'AWAITING_APPROVAL',
  diagnosedAt: new Date().toISOString()
};

const activeStatuses = new Set(['DETECTED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'APPROVED', 'REMEDIATING']);

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async ({ firstLoad = false } = {}) => {
    firstLoad ? setLoading(true) : setRefreshing(true);
    setError('');
    try {
      const data = await getIncidents();
      setIncidents(data);
      setDemoMode(false);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      if (firstLoad) {
        setIncidents([DEMO_INCIDENT]);
        setDemoMode(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load({ firstLoad: true }); }, [load]);

  const handleDecision = async (id, type) => {
    try {
      if (demoMode) {
        setIncidents((items) => items.map((item) => item.incidentId === id
          ? { ...item, status: type === 'approve' ? 'APPROVED' : 'REJECTED', approvedBy: 'demo-operator', approvedAt: new Date().toISOString() }
          : item));
        return;
      }
      if (type === 'approve') await approveIncident(id);
      else await rejectIncident(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = useMemo(() => incidents.filter((incident) => {
    const matchesFilter = filter === 'ALL' || incident.status === filter;
    const text = `${incident.incidentId} ${incident.resourceId} ${incident.resourceType} ${incident.metric} ${incident.severity}`.toLowerCase();
    return matchesFilter && text.includes(query.toLowerCase().trim());
  }), [incidents, filter, query]);

  const awaiting = incidents.filter((i) => i.status === 'AWAITING_APPROVAL').length;
  const active = incidents.filter((i) => activeStatuses.has(i.status)).length;
  const resolved = incidents.filter((i) => ['FIXED', 'FIX_APPLIED', 'REJECTED'].includes(i.status)).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">↯</div><div><div className="brand-name">SELF-HEALING</div><div className="brand-sub">INFRASTRUCTURE CONTROL</div></div></div>
        <div className="live"><i /> Control plane online</div>
      </header>

      <main className="page">
        <section className="hero">
          <div><p className="eyebrow">INCIDENT OPERATIONS</p><h1>Review infrastructure incidents.</h1><p className="hero-copy">Inspect the diagnosis and authorize or reject the recommended remediation.</p></div>
          <button className="refresh-button" onClick={() => load()} disabled={refreshing}>{refreshing ? 'Refreshing…' : '↻ Refresh'}</button>
        </section>

        <section className="stat-grid">
          <div className="stat-card"><span>Total incidents</span><strong>{incidents.length}</strong><small>Visible records</small></div>
          <div className="stat-card highlight"><span>Awaiting approval</span><strong>{awaiting}</strong><small>Requires operator action</small></div>
          <div className="stat-card"><span>Active</span><strong>{active}</strong><small>Currently in workflow</small></div>
          <div className="stat-card"><span>Resolved</span><strong>{resolved}</strong><small>Completed or rejected</small></div>
        </section>

        {demoMode && <div className="banner info"><b>Demo mode</b><span>API is not configured, so a sample incident is shown. Configure <code>VITE_API_URL</code> and <code>VITE_API_TOKEN</code> to use AWS.</span></div>}
        {error && !demoMode && <div className="banner danger"><b>API error</b><span>{error}</span></div>}

        <section className="toolbar">
          <div className="search-wrap"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search incidents, resources, metrics…" /></div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="ALL">All statuses</option><option value="AWAITING_APPROVAL">Awaiting approval</option><option value="APPROVED">Approved</option><option value="REMEDIATING">Remediating</option><option value="FIXED">Fixed</option><option value="REJECTED">Rejected</option></select>
        </section>

        <div className="list-heading"><div><h2>Incidents</h2><p>{filtered.length} matching {filtered.length === 1 ? 'incident' : 'incidents'}</p></div>{lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}</div>

        {loading ? <div className="empty"><div className="spinner" /><p>Loading incidents…</p></div> : filtered.length === 0 ? <div className="empty"><div className="empty-icon">✓</div><h3>No incidents found</h3><p>There are no incidents matching the current filters.</p></div> : <div className="incident-list">{filtered.map((incident) => <IncidentCard key={incident.incidentId} incident={incident} onDecision={handleDecision} />)}</div>}
      </main>
    </div>
  );
}
