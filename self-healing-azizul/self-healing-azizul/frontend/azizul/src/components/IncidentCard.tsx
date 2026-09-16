import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Incident } from "../types/incident";
import { SeverityBadge } from "./SeverityBadge";
import { IncidentStatusBadge } from "./IncidentStatus";
import { ConfidenceScore } from "./ConfidenceScore";
import { BlastRadius } from "./BlastRadius";
import { CostImpact } from "./CostImpact";
import { RejectModal } from "./RejectModal";
import { approveIncident, rejectIncident } from "../services/incidentService";
import { formatRelativeTime } from "../utils/time";
import { cn } from "../utils/cn";

interface Props {
  incident: Incident;
  onUpdate: (updated: Incident) => void;
}

export function IncidentCard({ incident, onUpdate }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const awaiting = incident.status === "AWAITING_APPROVAL";

  const handleApprove = async () => {
    setBusy("approve");
    const updated = await approveIncident(incident.incidentId);
    setBusy(null);
    if (updated) onUpdate(updated);
  };

  const handleReject = async (reason: string) => {
    setBusy("reject");
    const updated = await rejectIncident(incident.incidentId, reason);
    setBusy(null);
    setRejectOpen(false);
    if (updated) onUpdate(updated);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-lg border border-[#1f2632] bg-[#0d1117] shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]">
        {/* Top accent stripe */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-[2px]",
            incident.severity === "HIGH"
              ? "bg-gradient-to-r from-red-500 via-red-500/60 to-transparent"
              : incident.severity === "MEDIUM"
              ? "bg-gradient-to-r from-amber-500 via-amber-500/60 to-transparent"
              : "bg-gradient-to-r from-sky-500 via-sky-500/60 to-transparent"
          )}
        />

        <div className="p-5">
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={incident.severity} />
                <IncidentStatusBadge status={incident.status} />
              </div>
              <h3 className="truncate text-base font-semibold text-slate-100">
                {incident.alarmName}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono text-slate-400">{incident.incidentId}</span>
                <span className="text-slate-700">•</span>
                <span>Detected {formatRelativeTime(incident.createdAt)}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <CostImpact impact={incident.estimatedCostImpact} />
            </div>
          </div>

          {/* Grid */}
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <dl className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-[#1f2632] bg-[#0b0e14] p-4 text-xs md:grid-cols-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Resource
                </dt>
                <dd className="mt-0.5 truncate font-medium text-slate-200">
                  {incident.resourceId}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Metric
                </dt>
                <dd className="mt-0.5 font-medium text-slate-200">{incident.metric}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Value / Threshold
                </dt>
                <dd className="mt-0.5 font-mono text-slate-200">
                  <span className="text-red-400">{incident.metricValue}</span>{" "}
                  <span className="text-slate-500">/ {incident.threshold}</span>
                </dd>
              </div>
              <div className="col-span-2 md:col-span-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Root Cause (AI)
                </dt>
                <dd className="mt-0.5 text-slate-300">{incident.rootCause}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3 rounded-md border border-[#1f2632] bg-[#0b0e14] p-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  AI Confidence
                </div>
                <div className="mt-2">
                  <ConfidenceScore value={incident.confidence} size="sm" />
                </div>
              </div>
              <div className="h-px bg-[#1f2632]" />
              <BlastRadius
                blastRadius={incident.blastRadius}
                reason={incident.blastRadiusReason}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => navigate(`/incidents/${incident.incidentId}`)}
              className="inline-flex items-center gap-2 rounded-md border border-[#2a3240] bg-[#11161f] px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-sky-500/40 hover:text-slate-100"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View Diagnosis
            </button>

            {awaiting && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRejectOpen(true)}
                  disabled={busy !== null}
                  className="rounded-md border border-red-500/40 bg-red-500/5 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  {busy === "reject" ? "Rejecting…" : "Reject"}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={busy !== null}
                  className="group relative overflow-hidden rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-[0_0_0_1px_rgba(16,185,129,0.6)] transition-all hover:bg-emerald-400 disabled:opacity-60"
                >
                  {busy === "approve" ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-950/30 border-t-emerald-950" />
                      Approving…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      Approve Fix
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <RejectModal
        open={rejectOpen}
        incidentId={incident.incidentId}
        onCancel={() => setRejectOpen(false)}
        onConfirm={handleReject}
        loading={busy === "reject"}
      />
    </>
  );
}
