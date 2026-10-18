"use client";

import type { Game } from "@/lib/db/schema";
import type { CatalogView } from "@/lib/games/catalog-view";
import { CatalogToolbar } from "./CatalogToolbar";
import { GamesTable } from "./GamesTable";

type Props = { games: Game[]; total: number; genres: string[]; maxRevenue: number; view: CatalogView };

export function CatalogSection({ games, total, genres, maxRevenue, view }: Props) {
  return (
    <>
      <div>
        <h1 className="mb-1 text-[25px]">Games catalog</h1>
        <p className="text-[13px] text-muted">Monthly revenue, downloads and ratings for every tracked title.</p>
      </div>
      <CatalogToolbar view={view} genres={genres} shown={games.length} total={total} />
      <GamesTable games={games} total={total} maxRevenue={maxRevenue} view={view} />
    </>
  );
}
