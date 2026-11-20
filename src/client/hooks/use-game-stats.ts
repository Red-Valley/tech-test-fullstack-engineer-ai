'use client';

import { getStats } from '@/client/api/games.api';
import { useResource } from '@/client/hooks/use-resource';
import { toGameStats } from '@/client/transformers/game.transformer';

/** `version` comes from CatalogContext: bumping it refetches after any mutation. */
export function useGameStats(version = 0) {
  const { data, ...rest } = useResource(
    async () => toGameStats(await getStats()),
    `stats|${version}`,
  );
  return { stats: data ?? null, ...rest };
}
