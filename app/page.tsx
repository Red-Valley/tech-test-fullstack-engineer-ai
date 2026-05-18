import { getGames } from "@/lib/db";
import GameTable from "@/components/GameTable";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const games = getGames({});
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Games Catalog</h1>
          <p className="text-sm text-gray-400 mt-1">{games.length} games in catalog</p>
        </div>
      </div>
      <GameTable initialGames={games} />
    </div>
  );
}
