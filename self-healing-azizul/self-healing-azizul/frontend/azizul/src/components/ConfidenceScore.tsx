import { cn } from "../utils/cn";

export function ConfidenceScore({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const level: "high" | "medium" | "low" =
    clamped >= 90 ? "high" : clamped >= 70 ? "medium" : "low";

  const colors = {
    high: { bar: "bg-emerald-500", text: "text-emerald-400", label: "High Confidence" },
    medium: { bar: "bg-amber-500", text: "text-amber-400", label: "Medium Confidence" },
    low: { bar: "bg-red-500", text: "text-red-400", label: "Low Confidence" },
  }[level];

  const height = size === "lg" ? "h-2.5" : size === "sm" ? "h-1" : "h-1.5";
  const font = size === "lg" ? "text-3xl" : size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className={cn("font-semibold tabular-nums", font, colors.text)}>
          {clamped}%
        </span>
        {size !== "sm" && (
          <span className="text-[11px] text-slate-500">{colors.label}</span>
        )}
      </div>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-[#11161f] ring-1 ring-inset ring-[#1f2632]",
          height
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", colors.bar)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
