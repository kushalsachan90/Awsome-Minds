import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  incidentId: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function RejectModal({
  open,
  incidentId,
  onCancel,
  onConfirm,
  loading,
}: Props) {
  const [reason, setReason] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setTimeout(() => ref.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const canSubmit = reason.trim().length >= 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="w-full max-w-md overflow-hidden rounded-lg border border-[#2a3240] bg-[#0d1117] shadow-2xl"
      >
        <div className="border-b border-[#1f2632] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/30">
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
            </div>
            <div>
              <h2
                id="reject-title"
                className="text-sm font-semibold text-slate-100"
              >
                Reject fix for {incidentId}
              </h2>
              <p className="text-xs text-slate-500">
                The AI recommendation will be discarded and the incident will remain open.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onConfirm(reason.trim());
          }}
          className="px-5 py-4"
        >
          <label
            htmlFor="reject-reason"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Why are you rejecting this fix?
          </label>
          <textarea
            id="reject-reason"
            ref={ref}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this recommendation should not be applied…"
            rows={4}
            className="w-full resize-none rounded-md border border-[#2a3240] bg-[#11161f] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Minimum 5 characters. Required for audit trail.
          </p>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-[#2a3240] bg-[#11161f] px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-[#3a4250] hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-600/50 disabled:text-red-200/60"
            >
              {loading ? "Rejecting…" : "Reject Fix"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
