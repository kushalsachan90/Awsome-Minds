import { useState } from "react";
import type { Incident } from "../types/incident";
import { approveIncident, rejectIncident } from "../services/incidentService";
import { RejectModal } from "./RejectModal";
import { cn } from "../utils/cn";

interface Props {
  incident: Incident;
  onUpdate: (updated: Incident) => void;
}

export function ApprovalPanel({ incident, onUpdate }: Props) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const awaiting = incident.status === "AWAITING_APPROVAL";
  const done =
    incident.status === "RESOLVED" ||
    incident.status === "FIXING" ||
    incident.status === "APPROVED";
  const rejected = incident.status === "REJECTED";

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
      <div className="overflow-hidden rounded-lg border border-[#1f2632] bg-[#0d1117]">
        <div className="border-b border-[#1f2632] px-5 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-sky-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 12l2 2 4-4" />
              <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
            </svg>
            <h2 className="text-sm font-semibold tracking-wide text-slate-100">
              Human Approval
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              Human-in-the-loop
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="rounded-md border border-[#1f2632] bg-[#0b0e14] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              AI recommends
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-400 ring-1 ring-inset ring-sky-500/30">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-wider text-slate-100">
                REMEDIATE {incident.resourceType.toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {incident.recommendedAction}
            </p>
          </div>

          {awaiting && (
            <div className="mt-4 flex items-center justify-end gap-2">
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
                className="rounded-md bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-[0_0_0_1px_rgba(16,185,129,0.6)] transition-all hover:bg-emerald-400 disabled:opacity-60"
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

          {done && (
            <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
              <div className="flex items-center gap-2 text-emerald-400">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">APPROVED</span>
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-400 sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Approved by: </span>
                  <span className="text-slate-200">{incident.approvedBy ?? "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Approval time: </span>
                  <span className="text-slate-200">
                    {incident.approvedAt
                      ? new Date(incident.approvedAt).toLocaleTimeString("en-GB", {
                          hour12: false,
                        })
                      : "—"}
                  </span>
                </div>
              </dl>
            </div>
          )}

          {rejected && (
            <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-4 text-sm">
              <div className="flex items-center gap-2 text-red-400">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                <span className="font-semibold">REJECTED</span>
              </div>
              {incident.rejectionReason && (
                <p className="mt-2 text-xs text-slate-300">
                  <span className="text-slate-500">Reason: </span>
                  {incident.rejectionReason}
                </p>
              )}
            </div>
          )}

          {incident.status === "FIXING" && (
            <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm">
              <div className="flex items-center gap-2 text-indigo-300">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-300" />
                <span className="font-semibold">FIXING IN PROGRESS</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Apply-Fix Lambda is remediating the resource…
              </p>
            </div>
          )}

          {incident.status === "RESOLVED" && (
            <div className="mt-3 text-xs text-emerald-400/80">
              ✓ Incident resolved and verified.
            </div>
          )}

          {/* Fix status */}
          <div className="mt-4 border-t border-[#1f2632] pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Fix status</span>
              <span
                className={cn(
                  "font-semibold",
                  incident.fixStatus === "SUCCESS" && "text-emerald-400",
                  incident.fixStatus === "IN_PROGRESS" && "text-indigo-400",
                  incident.fixStatus === "PENDING" && "text-slate-400",
                  incident.fixStatus === "FAILED" && "text-red-400"
                )}
              >
                {incident.fixStatus}
              </span>
            </div>
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
