import type { Incident } from "../types/incident";
import { SeverityBadge } from "./SeverityBadge";
import { IncidentStatusBadge } from "./IncidentStatus";
import { formatRelativeTime, formatDateTime } from "../utils/time";
import { cn } from "../utils/cn";

interface Props {
  incidents: Incident[];
  onRowClick: (id: string) => void;
}

export function IncidentTable({ incidents, onRowClick }: Props) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#1f2632] bg-[#0d1117] p-10 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-[#11161f] text-slate-500">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 11H5a2 2 0 00-2 2v7h18v-7a2 2 0 00-2-2h-4" />
            <path d="M9 11V7a3 3 0 016 0v4" />
          </svg>
        </div>
        <div className="text-sm font-medium text-slate-300">No incidents found</div>
        <div className="text-xs text-slate-500">
          Adjust filters or wait for new events from CloudWatch.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#1f2632] bg-[#0d1117]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[#1f2632] bg-[#0b0e14] text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 text-left font-semibold">Incident</th>
              <th className="px-4 py-3 text-left font-semibold">Resource</th>
              <th className="px-4 py-3 text-left font-semibold">Severity</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Confidence</th>
              <th className="px-4 py-3 text-left font-semibold">Detected</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr
                key={i.incidentId}
                onClick={() => onRowClick(i.incidentId)}
                className="cursor-pointer border-b border-[#1f2632] text-slate-300 transition-colors last:border-b-0 hover:bg-[#11161f]"
              >
                <td className="px-4 py-3">
                  <div className="font-mono text-sm font-medium text-slate-100">
                    {i.incidentId}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {i.alarmName}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-slate-200">{i.resourceType}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {i.resourceId}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={i.severity} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <IncidentStatusBadge status={i.status} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#11161f] ring-1 ring-inset ring-[#1f2632]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          i.confidence >= 90
                            ? "bg-emerald-500"
                            : i.confidence >= 70
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${i.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums text-slate-300">
                      {i.confidence}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-slate-300">
                    {formatRelativeTime(i.createdAt)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {formatDateTime(i.createdAt)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
