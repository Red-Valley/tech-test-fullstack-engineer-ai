import type { GameStats } from '@/lib/games';
import { formatNumber, formatRating, formatUSD } from '@/lib/format';

export function StatsCards({ stats }: { stats: GameStats }) {
  const cards = [
    { label: 'Total games', value: formatNumber(stats.count) },
    { label: 'Total revenue', value: formatUSD(stats.total_revenue_usd) },
    { label: 'Total downloads', value: formatNumber(stats.total_downloads) },
    // With no games the average does not exist, and "★ 0.0" would read as a terrible score.
    { label: 'Average rating', value: stats.count > 0 ? formatRating(stats.avg_rating) : '—' },
  ];

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-border bg-surface p-4">
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
