import { cn } from "../utils/cn";
import type { IncidentStatus } from "../types/incident";

const STATUS_META: Record<
  IncidentStatus,
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  DETECTED: {
    label: "DETECTED",
    text: "text-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
  },
  DIAGNOSING: {
    label: "DIAGNOSING",
    text: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    dot: "bg-sky-400",
  },
  AWAITING_APPROVAL: {
    label: "AWAITING APPROVAL",
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  APPROVED: {
    label: "APPROVED",
    text: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    dot: "bg-sky-400",
  },
  FIXING: {
    label: "FIXING",
    text: "text-indigo-300",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    dot: "bg-indigo-400",
  },
  RESOLVED: {
    label: "RESOLVED",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  FAILED: {
    label: "FAILED",
    text: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
  REJECTED: {
    label: "REJECTED",
    text: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
};

export function IncidentStatusBadge({
  status,
  size = "md",
}: {
  status: IncidentStatus;
  size?: "sm" | "md";
}) {
  const m = STATUS_META[status];
  const sizing =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2.5 py-1 text-[11px]";
  const pulsing =
    status === "AWAITING_APPROVAL" || status === "FIXING" || status === "DIAGNOSING";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-semibold tracking-wider",
        m.text,
        m.bg,
        m.border,
        sizing
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          m.dot,
          pulsing && "animate-pulse-dot"
        )}
      />
      {m.label}
    </span>
  );
}
