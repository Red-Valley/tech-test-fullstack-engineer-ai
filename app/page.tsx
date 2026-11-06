import { connection } from 'next/server';
import { GamesTable } from '@/components/games/GamesTable';
import { StatsCards } from '@/components/games/StatsCards';
import { getStats, listGames, listGenres } from '@/lib/games';

export const runtime = 'nodejs';

export default async function DashboardPage() {
  // better-sqlite3 is synchronous, so without this the page would prerender at build time:
  // it would open the database during the build and then serve stale data.
  await connection();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <StatsCards stats={getStats()} />
      <GamesTable games={listGames()} genres={listGenres()} />
    </main>
  );
}
