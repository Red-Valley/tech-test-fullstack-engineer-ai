'use client';

import { useCatalog } from '@/client/context/catalog-context';
import { useGameStats } from '@/client/hooks/use-game-stats';
import { DashboardHeader } from '@/client/ui/components/games/dashboard-header';
import { KpiGrid, KpiGridSkeleton } from '@/client/ui/components/games/kpi-grid';
import { Button } from '@/client/ui/components/primitives/button';
import { EmptyState } from '@/client/ui/components/primitives/feedback';
import { GamesTableContainer } from '@/client/ui/containers/games-table-container';

export function DashboardContainer() {
  const { catalogVersion } = useCatalog();
  const { stats, error, refetch } = useGameStats(catalogVersion);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader />

      <section aria-label="Key figures">
        {error ? (
          <EmptyState
            tone="error"
            title="Couldn't load the key figures"
            description={error}
            action={
              <Button variant="secondary" onClick={refetch}>
                Try again
              </Button>
            }
          />
        ) : stats ? (
          <KpiGrid stats={stats} />
        ) : (
          <KpiGridSkeleton />
        )}
      </section>

      <GamesTableContainer />
    </div>
  );
}
