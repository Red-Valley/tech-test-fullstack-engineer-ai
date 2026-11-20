import type { GameStats } from '@/client/domain/game';
import { formatNumber, formatRating, formatUsd, formatUsdCompact } from '@/client/lib/format';
import { KpiCard, KpiCardSkeleton } from '@/client/ui/components/games/kpi-card';

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5';

export function KpiGrid({ stats }: { stats: GameStats }) {
  return (
    <dl className={GRID}>
      <KpiCard label="Games" value={formatNumber(stats.totalGames)} />
      <KpiCard
        label="Revenue last month"
        value={formatUsdCompact(stats.totalRevenue)}
        detail={formatUsd(stats.totalRevenue)}
      />
      <KpiCard label="Downloads last month" value={formatNumber(stats.totalDownloads)} />
      <KpiCard label="Average rating" value={formatRating(stats.averageRating)} detail="out of 5" />
      <KpiCard label="Rated above 4" value={formatNumber(stats.ratedAbove4)} />
    </dl>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className={GRID} role="status" aria-label="Loading stats">
      {Array.from({ length: 5 }, (_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}
