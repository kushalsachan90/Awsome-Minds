import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Incident } from "../types/incident";
import { fetchIncidents } from "../services/incidentService";
import { Navbar } from "../components/Navbar";
import { IncidentTable } from "../components/IncidentTable";

export function Incidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents().then((list) => {
      setIncidents(list);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#07090d]">
      <Navbar />
      <main className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Incidents
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All incidents detected by CloudWatch and processed by the self-healing agent.
          </p>
        </div>
        {loading ? (
          <div className="rounded-lg border border-[#1f2632] bg-[#0d1117] p-10 text-center text-sm text-slate-400">
            Loading incidents…
          </div>
        ) : (
          <IncidentTable
            incidents={incidents}
            onRowClick={(id) => navigate(`/incidents/${id}`)}
          />
        )}
      </main>
    </div>
  );
}
