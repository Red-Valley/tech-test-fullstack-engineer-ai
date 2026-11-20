import { GamesDashboard } from "@/components/games/games-dashboard";
import { getGames } from "@/lib/db";

// Reads the database on every request; never prerender it at build time.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { games } = getGames().list({ sortBy: "title" });
  return <GamesDashboard games={games} />;
}
