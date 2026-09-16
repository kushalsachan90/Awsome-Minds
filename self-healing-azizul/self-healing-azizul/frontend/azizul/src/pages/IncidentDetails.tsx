import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Incident } from "../types/incident";
import { fetchIncidentById } from "../services/incidentService";
import { Navbar } from "../components/Navbar";
import { SeverityBadge } from "../components/SeverityBadge";
import { IncidentStatusBadge } from "../components/IncidentStatus";
import { ConfidenceScore } from "../components/ConfidenceScore";
import { BlastRadius } from "../components/BlastRadius";
import { CostImpact } from "../components/CostImpact";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { ApprovalPanel } from "../components/ApprovalPanel";
import { formatTimestamp } from "../utils/time";

function KV({
  label,
  value,
  mono,
  span = 1,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  span?: 1 | 2;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : undefined}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-slate-200 ${
          mono ? "truncate font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export function IncidentDetails() {
  const { id } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetchIncidentById(id).then((inc) => {
      if (cancelled) return;
      if (!inc) setNotFound(true);
      else setIncident(inc);
      setLoading(false);
    });

    // Poll to reflect status transitions triggered from this page.
    const timer = setInterval(() => {
      if (cancelled) return;
      fetchIncidentById(id).then((inc) => {
        if (cancelled || !inc) return;
        setIncident(inc);
      });
    }, 1200);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-[#07090d]">
      <Navbar />

      <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-300">
            Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <Link to="/incidents" className="hover:text-slate-300">
            Incidents
          </Link>
          <span className="text-slate-700">/</span>
          <span className="font-mono text-slate-300">{id}</span>
        </nav>

        {loading && (
          <div className="rounded-lg border border-[#1f2632] bg-[#0d1117] p-10 text-center text-sm text-slate-400">
            Loading incident…
          </div>
        )}

        {!loading && notFound && (
          <div className="rounded-lg border border-dashed border-[#1f2632] bg-[#0d1117] p-10 text-center">
            <div className="text-sm font-medium text-slate-200">
              Incident not found
            </div>
            <div className="text-xs text-slate-500">
              The requested incident <span className="font-mono">{id}</span> does
              not exist.
            </div>
          </div>
        )}

        {!loading && incident && (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={incident.severity} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-100">
                  {incident.alarmName}
                </h1>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono text-slate-300">
                    {incident.incidentId}
                  </span>
                  <span className="text-slate-700">•</span>
                  <span>{incident.resourceType}</span>
                  <span className="text-slate-700">•</span>
                  <span>ap-south-1</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CostImpact impact={incident.estimatedCostImpact} />
              </div>
            </div>

            {/* Workflow timeline */}
            <section className="rounded-lg border border-[#1f2632] bg-[#0d1117] p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Self-Healing Workflow
              </h2>
              <IncidentTimeline status={incident.status} />
            </section>

            {/* Main grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left column - details */}
              <div className="space-y-6 lg:col-span-2">
                {/* Incident metadata */}
                <section className="rounded-lg border border-[#1f2632] bg-[#0d1117]">
                  <div className="border-b border-[#1f2632] px-5 py-3">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Incident Metadata
                    </h2>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 md:grid-cols-3">
                    <KV label="Resource" value={incident.resourceType} />
                    <KV label="Resource ID" value={incident.resourceId} />
                    <KV label="Alarm" value={incident.alarmName} />
                    <KV
                      label="Resource ARN"
                      value={incident.resourceArn}
                      mono
                      span={2}
                    />
                    <KV label="Region" value="ap-south-1" />
                    <KV label="Metric" value={incident.metric} />
                    <KV
                      label="Metric Value"
                      value={
                        <span className="font-mono text-red-400">
                          {incident.metricValue}
                        </span>
                      }
                    />
                    <KV
                      label="Threshold"
                      value={
                        <span className="font-mono text-slate-400">
                          {incident.threshold}
                        </span>
                      }
                    />
                  </dl>
                </section>

                {/* AI Diagnosis */}
                <section className="relative overflow-hidden rounded-lg border border-sky-500/20 bg-[#0d1117]">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-500 via-indigo-500/60 to-transparent" />
                  <div className="border-b border-[#1f2632] px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-400 ring-1 ring-inset ring-sky-500/30">
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </div>
                      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        AI Diagnosis
                      </h2>
                      <span className="text-[10px] uppercase tracking-wider text-sky-400">
                        Amazon Bedrock
                      </span>
                    </div>
                  </div>
                  <div className="space-y-5 p-5">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Root Cause
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-100">
                        {incident.rootCause}
                      </p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Reason
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {incident.reason}
                      </p>
                    </div>
                    <div className="rounded-md border border-[#1f2632] bg-[#0b0e14] p-4">
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-3.5 w-3.5 text-sky-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                        </svg>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                          Recommended Action
                        </div>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                        {incident.recommendedAction}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Activity / Audit log */}
                <section className="rounded-lg border border-[#1f2632] bg-[#0d1117]">
                  <div className="border-b border-[#1f2632] px-5 py-3">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Activity Log
                    </h2>
                  </div>
                  <ol className="divide-y divide-[#1f2632]">
                    {incident.activity.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-start gap-4 px-5 py-3 text-sm"
                      >
                        <span className="w-20 shrink-0 font-mono text-xs text-slate-500">
                          {formatTimestamp(a.timestamp)}
                        </span>
                        <div className="min-w-0">
                          <div className="text-slate-200">{a.label}</div>
                          {a.detail && (
                            <div className="mt-0.5 text-xs text-slate-500">
                              {a.detail}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Confidence */}
                <section className="rounded-lg border border-[#1f2632] bg-[#0d1117]">
                  <div className="border-b border-[#1f2632] px-5 py-3">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      AI Confidence
                    </h2>
                  </div>
                  <div className="space-y-3 p-5">
                    <ConfidenceScore value={incident.confidence} size="lg" />
                    <p className="text-xs leading-relaxed text-slate-400">
                      {incident.confidenceReason}
                    </p>
                  </div>
                </section>

                {/* Blast radius */}
                <section className="rounded-lg border border-[#1f2632] bg-[#0d1117] p-5">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Blast Radius
                  </div>
                  <BlastRadius
                    blastRadius={incident.blastRadius}
                    reason={incident.blastRadiusReason}
                  />
                </section>

                {/* Human approval */}
                <ApprovalPanel incident={incident} onUpdate={setIncident} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
