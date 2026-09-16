import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Incident, IncidentStatus, Severity } from "../types/incident";
import { fetchIncidents } from "../services/incidentService";
import { Navbar } from "../components/Navbar";
import { IncidentTable } from "../components/IncidentTable";
import { cn } from "../utils/cn";

const ALL = "ALL";

export function IncidentHistory() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const [severity, setSeverity] = useState<typeof ALL | Severity>(ALL);
  const [status, setStatus] = useState<typeof ALL | IncidentStatus>(ALL);
  const [resource, setResource] = useState<typeof ALL | string>(ALL);

  useEffect(() => {
    fetchIncidents().then((list) => {
      setIncidents(list);
      setLoading(false);
    });
  }, []);

  const resources = useMemo(() => {
    const set = new Set(incidents.map((i) => i.resourceType));
    return Array.from(set).sort();
  }, [incidents]);

  const filtered = useMemo(() => {
    return incidents
      .filter((i) => (severity === ALL ? true : i.severity === severity))
      .filter((i) => (status === ALL ? true : i.status === status))
      .filter((i) => (resource === ALL ? true : i.resourceType === resource))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [incidents, severity, status, resource]);

  return (
    <div className="min-h-screen bg-[#07090d]">
      <Navbar />

      <main className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Incident History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Audit log of all self-healing events stored in DynamoDB.
          </p>
        </div>

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-[#1f2632] bg-[#0d1117] p-3">
          <Filter
            label="Severity"
            value={severity}
            onChange={(v) => setSeverity(v as typeof severity)}
            options={[ALL, "HIGH", "MEDIUM", "LOW"]}
          />
          <Filter
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as typeof status)}
            options={[
              ALL,
              "AWAITING_APPROVAL",
              "FIXING",
              "RESOLVED",
              "REJECTED",
              "FAILED",
            ]}
          />
          <Filter
            label="Resource"
            value={resource}
            onChange={(v) => setResource(v)}
            options={[ALL, ...resources]}
          />

          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span>
              Showing <span className="font-medium text-slate-300">{filtered.length}</span>{" "}
              of {incidents.length}
            </span>
          </div>
        </section>

        {loading ? (
          <div className="rounded-lg border border-[#1f2632] bg-[#0d1117] p-10 text-center text-sm text-slate-400">
            Loading incidents…
          </div>
        ) : (
          <IncidentTable
            incidents={filtered}
            onRowClick={(id) => navigate(`/incidents/${id}`)}
          />
        )}
      </main>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "rounded-md border border-[#2a3240] bg-[#11161f] px-2.5 py-1.5 text-xs text-slate-200",
          "focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
        )}
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0d1117]">
            {o === ALL ? "All" : o.replace("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
