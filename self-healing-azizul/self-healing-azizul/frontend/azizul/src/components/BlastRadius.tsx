interface Props {
  blastRadius: string;
  reason: string;
}

export function BlastRadius({ blastRadius, reason }: Props) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="7" opacity="0.4" />
          <circle cx="12" cy="12" r="10" opacity="0.2" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-200">{blastRadius}</div>
        <div className="mt-0.5 text-xs text-slate-500">{reason}</div>
      </div>
    </div>
  );
}
