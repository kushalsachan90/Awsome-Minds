import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Incident, SystemHealth } from "../types/incident";
import { fetchIncidents, fetchSystemHealth } from "../services/incidentService";
import { Navbar } from "../components/Navbar";
import { SystemHealth as SystemHealthPanel } from "../components/SystemHealth";
import { IncidentCard } from "../components/IncidentCard";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { IncidentTable } from "../components/IncidentTable";
import { SeverityBadge } from "../components/SeverityBadge";
import { IncidentStatusBadge } from "../components/IncidentStatus";
import { formatRelativeTime } from "../utils/time";

export function Dashboard() {
  const navigate = useNavigate();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [h, list] = await Promise.all([fetchSystemHealth(), fetchIncidents()]);
    setHealth(h);
    setIncidents(list);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  // Keep list in sync when a card updates its status.
  const handleUpdate = (updated: Incident) => {
    setIncidents((prev) =>
      prev.map((i) => (i.incidentId === updated.incidentId ? updated : i))
    );
    // Also refresh system health counters
    fetchSystemHealth().then(setHealth);

    // After the backend-style async transition (FIXING -> RESOLVED),
    // refetch so the dashboard shows the final state without a manual refresh.
    setTimeout(() => {
      Promise.all([fetchIncidents(), fetchSystemHealth()]).then(
        ([list, h]) => {
          setIncidents(list);
          setHealth(h);
        }
      );
    }, 4200);
  };

  const activeIncidents = useMemo(
    () =>
      incidents.filter(
        (i) =>
          i.status !== "RESOLVED" &&
          i.status !== "REJECTED" &&
          i.status !== "FAILED"
      ),
    [incidents]
  );

  const recent = useMemo(
    () =>
      [...incidents]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [incidents]
  );

  const featured = activeIncidents[0];

  return (
    <div className="min-h-screen bg-[#07090d]">
      <Navbar systemStatus={health?.status ?? "Operational"} />

      <main className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">
              Operations Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              AI-monitored AWS infrastructure with human-in-the-loop remediation.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-[#2a3240] bg-[#11161f] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#3a4250] hover:text-slate-100 disabled:opacity-50"
          >
            <svg
              className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 11-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            Refresh
          </button>
        </div>

        {/* System health tiles */}
        {health && <SystemHealthPanel health={health} />}

        {/* Active incidents */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Active Incidents
              </h2>
              <span className="rounded-full border border-[#1f2632] bg-[#0d1117] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                {activeIncidents.length}
              </span>
            </div>
            <button
              onClick={() => navigate("/incidents")}
              className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
            >
              View all →
            </button>
          </div>

          {activeIncidents.length === 0 && !loading && (
            <div className="rounded-lg border border-dashed border-[#1f2632] bg-[#0d1117] p-10 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-sm font-medium text-slate-200">
                No active incidents
              </div>
              <div className="text-xs text-slate-500">
                All monitored AWS resources are operating normally.
              </div>
            </div>
          )}

          {activeIncidents.length > 0 && (
            <div className="space-y-4">
              {featured && (
                <IncidentCard incident={featured} onUpdate={handleUpdate} />
              )}
              {activeIncidents.slice(1).map((i) => (
                <IncidentCard key={i.incidentId} incident={i} onUpdate={handleUpdate} />
              ))}
            </div>
          )}
        </section>

        {/* Timeline explainer */}
        {featured && (
          <section className="rounded-lg border border-[#1f2632] bg-[#0d1117] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Self-Healing Workflow
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Live progress for <span className="font-mono text-slate-300">{featured.incidentId}</span>
                </p>
              </div>
              <IncidentStatusBadge status={featured.status} />
            </div>
            <IncidentTimeline status={featured.status} />
          </section>
        )}

        {/* Recent incidents */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Recent Incidents
            </h2>
            <button
              onClick={() => navigate("/history")}
              className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
            >
              Full history →
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <IncidentTable
              incidents={recent}
              onRowClick={(id) => navigate(`/incidents/${id}`)}
            />
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {recent.map((i) => (
              <button
                key={i.incidentId}
                onClick={() => navigate(`/incidents/${i.incidentId}`)}
                className="block w-full rounded-lg border border-[#1f2632] bg-[#0d1117] p-4 text-left transition-colors hover:border-[#2a3240]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium text-slate-100">
                    {i.incidentId}
                  </span>
                  <SeverityBadge severity={i.severity} size="sm" />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-slate-300">{i.resourceType}</span>
                  <IncidentStatusBadge status={i.status} size="sm" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Confidence {i.confidence}%</span>
                  <span>{formatRelativeTime(i.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
