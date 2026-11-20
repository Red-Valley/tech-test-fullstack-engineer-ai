import { formatCompact, formatRating, formatUsdCompact } from "@/lib/games/format";
import type { CatalogStats } from "@/lib/games/view";

interface StatsCardsProps {
  stats: CatalogStats;
  /** Size of the whole catalog, so the first card can say "3 of 24" while a filter is active. */
  catalogSize: number;
}

export function StatsCards({ stats, catalogSize }: StatsCardsProps) {
  const cards = [
    {
      label: "Games",
      value: String(stats.count),
      detail: stats.count === catalogSize ? "in the catalog" : `of ${catalogSize} in the catalog`,
    },
    {
      label: "Monthly revenue",
      value: formatUsdCompact(stats.totalRevenue),
      detail: stats.topEarner ? `Top earner: ${stats.topEarner.title}` : "No games to total",
    },
    {
      label: "Monthly downloads",
      value: formatCompact(stats.totalDownloads),
      detail: "across the listed games",
    },
    {
      label: "Average rating",
      value: stats.averageRating === null ? "–" : formatRating(stats.averageRating),
      detail: "out of 5",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, detail }) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">{value}</dd>
          <dd className="mt-0.5 truncate text-xs text-slate-500" title={detail}>
            {detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
