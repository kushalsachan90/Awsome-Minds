import { cn } from "../utils/cn";

export function CostImpact({ impact }: { impact: "Low" | "Medium" | "High" }) {
  const map = {
    Low: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    Medium: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    High: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  }[impact];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold tracking-wider",
        map.text,
        map.bg,
        map.border
      )}
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 010 7H6" />
      </svg>
      {impact.toUpperCase()} IMPACT
    </span>
  );
}
