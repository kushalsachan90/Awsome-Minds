import type { IncidentStatus } from "../types/incident";
import { cn } from "../utils/cn";

const STEPS: { key: IncidentStatus; label: string }[] = [
  { key: "DETECTED", label: "Detected" },
  { key: "DIAGNOSING", label: "AI Diagnosis" },
  { key: "AWAITING_APPROVAL", label: "Awaiting Approval" },
  { key: "APPROVED", label: "Approved" },
  { key: "FIXING", label: "Fixing" },
  { key: "RESOLVED", label: "Resolved" },
];

// Index used to determine progression.
const INDEX: Record<IncidentStatus, number> = {
  DETECTED: 0,
  DIAGNOSING: 1,
  AWAITING_APPROVAL: 2,
  APPROVED: 3,
  FIXING: 4,
  RESOLVED: 5,
  FAILED: 4,
  REJECTED: 3,
};

export function IncidentTimeline({ status }: { status: IncidentStatus }) {
  const currentIdx = INDEX[status];
  const isTerminalBad = status === "FAILED" || status === "REJECTED";

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-[640px] items-start justify-between">
        {STEPS.map((step, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx && !isTerminalBad;
          const isBadCurrent =
            isTerminalBad &&
            ((status === "FAILED" && i === 4) ||
              (status === "REJECTED" && i === 2));

          return (
            <li key={step.key} className="flex flex-1 items-start">
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex items-center">
                  {i > 0 && (
                    <div
                      className={cn(
                        "h-px w-10 md:w-16 lg:w-20",
                        isPast || isCurrent ? "bg-sky-500/60" : "bg-[#2a3240]"
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                      isPast &&
                        "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                      isCurrent &&
                        "border-sky-500/60 bg-sky-500/10 text-sky-300 shadow-[0_0_0_4px_rgba(56,189,248,0.08)]",
                      isBadCurrent &&
                        "border-red-500/60 bg-red-500/10 text-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.08)]",
                      !isPast &&
                        !isCurrent &&
                        !isBadCurrent &&
                        "border-[#2a3240] bg-[#0d1117] text-slate-500"
                    )}
                  >
                    {isPast ? (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isCurrent || isBadCurrent ? (
                      <span className="h-2 w-2 rounded-full bg-current animate-pulse-dot" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-10 md:w-16 lg:w-20",
                        isPast ? "bg-sky-500/60" : "bg-[#2a3240]"
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-center text-[11px] font-medium",
                    isPast && "text-slate-400",
                    isCurrent && "text-sky-300",
                    isBadCurrent && "text-red-400",
                    !isPast && !isCurrent && !isBadCurrent && "text-slate-500"
                  )}
                >
                  {isBadCurrent
                    ? status === "FAILED"
                      ? "Failed"
                      : "Rejected"
                    : step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
