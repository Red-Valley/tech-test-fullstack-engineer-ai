type KpiCardProps = {
  label: string;
  value: string;
  /** Secondary line, e.g. the exact figure behind a compact value. */
  detail?: string;
};

export function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="truncate text-2xl font-semibold tabular-nums" title={detail ?? value}>
        {value}
      </dd>
      {detail && <dd className="truncate text-xs text-muted tabular-nums">{detail}</dd>}
    </div>
  );
}

/** Placeholder with the same footprint as a KpiCard, so the grid doesn't jump on load. */
export function KpiCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-[88px] animate-pulse rounded-lg border border-border bg-surface"
    />
  );
}
