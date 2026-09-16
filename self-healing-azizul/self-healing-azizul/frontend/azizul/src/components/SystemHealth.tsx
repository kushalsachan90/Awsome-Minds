import type { SystemHealth } from "../types/incident";
import { cn } from "../utils/cn";
import { formatRelativeTime } from "../utils/time";

interface Props {
  health: SystemHealth;
}

export function SystemHealth({ health }: Props) {
  const statusColor =
    health.status === "Operational"
      ? "text-emerald-400"
      : health.status === "Degraded"
      ? "text-amber-400"
      : "text-red-400";
  const statusDot =
    health.status === "Operational"
      ? "bg-emerald-500"
      : health.status === "Degraded"
      ? "bg-amber-500"
      : "bg-red-500";

  const tiles: { label: string; value: string; sub?: string; accent?: string }[] = [
    {
      label: "SYSTEM HEALTH",
      value: health.status,
      accent: statusColor,
      sub: `Updated ${formatRelativeTime(health.updatedAt)}`,
    },
    { label: "AWS REGION", value: health.region, sub: "Mumbai" },
    {
      label: "ACTIVE INCIDENTS",
      value: String(health.activeIncidents),
      sub: health.activeIncidents === 0 ? "All clear" : "Requires attention",
      accent: health.activeIncidents > 0 ? "text-amber-400" : "text-slate-200",
    },
    {
      label: "RESOLVED TODAY",
      value: String(health.resolvedToday),
      sub: "Last 24h",
    },
    {
      label: "AUTO-HEALING SUCCESS",
      value: `${health.autoHealingSuccess}%`,
      sub: "30-day window",
      accent: "text-sky-400",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#1f2632] bg-[#1f2632] md:grid-cols-5">
      {tiles.map((t, i) => (
        <div
          key={i}
          className="flex flex-col justify-between gap-6 bg-[#0d1117] px-4 py-4"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-slate-500">
            {i === 0 && (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  statusDot,
                  "animate-pulse-dot"
                )}
              />
            )}
            {t.label}
          </div>
          <div>
            <div
              className={cn(
                "text-xl font-semibold tabular-nums text-slate-100",
                t.accent
              )}
            >
              {t.value}
            </div>
            {t.sub && (
              <div className="mt-0.5 text-[11px] text-slate-500">{t.sub}</div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
