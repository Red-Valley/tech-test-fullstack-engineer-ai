'use client';

import { getGames } from '@/client/api/games.api';
import type { Game, GameQuery } from '@/client/domain/game';
import { useResource } from '@/client/hooks/use-resource';
import { toGames } from '@/client/transformers/game.transformer';

// One shared empty array, so `games` keeps the same identity across renders while empty.
const NO_GAMES: Game[] = [];

/** `version` comes from CatalogContext: bumping it refetches after any mutation. */
export function useGames(query: GameQuery = {}, version = 0) {
  const { data, ...rest } = useResource(
    async () => toGames(await getGames(query)),
    `${JSON.stringify(query)}|${version}`,
  );
  return { games: data ?? NO_GAMES, ...rest };
}
