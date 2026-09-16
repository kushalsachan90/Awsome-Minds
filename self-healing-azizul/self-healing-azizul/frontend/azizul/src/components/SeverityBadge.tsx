import { cn } from "../utils/cn";

export function SeverityBadge({
  severity,
  size = "md",
}: {
  severity: "HIGH" | "MEDIUM" | "LOW";
  size?: "sm" | "md";
}) {
  const map = {
    HIGH: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      dot: "bg-red-500",
    },
    MEDIUM: {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      dot: "bg-amber-500",
    },
    LOW: {
      text: "text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
      dot: "bg-sky-400",
    },
  } as const;

  const s = map[severity];
  const sizing =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2.5 py-1 text-[11px]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-semibold tracking-wider",
        s.text,
        s.bg,
        s.border,
        sizing
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {severity} SEVERITY
    </span>
  );
}
