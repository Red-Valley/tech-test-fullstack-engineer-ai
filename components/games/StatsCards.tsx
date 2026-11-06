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
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
      {cards.map(({ label, value }) => (
        <div key={label} className="rounded-xl bg-surface p-4 shadow-md">
          <dt className="font-mono text-[11px] leading-4 font-medium tracking-widest text-outline uppercase">{label}</dt>
          <dd className="mt-2 font-display text-lg font-bold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-2xl lg:text-3xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
