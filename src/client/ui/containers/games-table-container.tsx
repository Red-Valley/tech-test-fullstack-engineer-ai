'use client';

import { useDeferredValue, useState } from 'react';
import { useCatalog } from '@/client/context/catalog-context';
import { useGames } from '@/client/hooks/use-games';
import { GamesTable, type SortState } from '@/client/ui/components/games/games-table';
import { GamesToolbar } from '@/client/ui/components/games/games-toolbar';
import { Button } from '@/client/ui/components/primitives/button';
import { EmptyState, Spinner } from '@/client/ui/components/primitives/feedback';
import { GENRES } from '@/shared/constants/genres';

export function GamesTableContainer() {
  const { catalogVersion, highlightedGameIds } = useCatalog();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState<SortState>({ sortBy: 'revenue', order: 'desc' });
  // Typing stays responsive; the request uses the deferred value.
  const deferredSearch = useDeferredValue(search.trim());

  const { games, isLoading, error, refetch } = useGames(
    { q: deferredSearch || undefined, genre: genre || undefined, ...sort },
    catalogVersion,
  );
  const isFiltered = Boolean(deferredSearch || genre);

  const retry = (
    <Button variant="secondary" size="sm" onClick={refetch}>
      Try again
    </Button>
  );

  let body: React.ReactNode;
  if (error && games.length > 0) {
    // A refresh failed but earlier rows exist: keep showing them under the error.
    body = (
      <div className="flex flex-col gap-2">
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-danger px-3 py-2 text-sm"
        >
          <span>
            <span className="font-medium text-danger">Couldn&apos;t refresh games.</span> {error}{' '}
            Showing the last loaded list.
          </span>
          {retry}
        </div>
        <GamesTable
          games={games}
          sort={sort}
          onSortChange={setSort}
          highlightedIds={highlightedGameIds}
        />
      </div>
    );
  } else if (error) {
    body = (
      <EmptyState
        tone="error"
        title="Couldn't load games"
        description={error}
        action={
          <Button variant="secondary" onClick={refetch}>
            Try again
          </Button>
        }
      />
    );
  } else if (isLoading && games.length === 0) {
    body = (
      <div className="flex justify-center py-12">
        <Spinner label="Loading games" />
      </div>
    );
  } else if (games.length === 0) {
    body = isFiltered ? (
      <EmptyState
        title="No games match these filters"
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setSearch('');
              setGenre('');
            }}
          >
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState title="No games yet" description="Run npm run seed, or add the first game." />
    );
  } else {
    body = (
      // Dim (don't hide) the current rows while a new filter loads, so the table doesn't jump.
      <div
        aria-busy={isLoading}
        className={isLoading ? 'opacity-60 transition-opacity' : undefined}
      >
        <GamesTable
          games={games}
          sort={sort}
          onSortChange={setSort}
          highlightedIds={highlightedGameIds}
        />
      </div>
    );
  }

  return (
    <section aria-labelledby="games-heading" className="flex flex-col gap-3">
      <h2 id="games-heading" className="text-lg font-semibold">
        Games
      </h2>
      <GamesToolbar
        search={search}
        onSearchChange={setSearch}
        genre={genre}
        genres={GENRES}
        onGenreChange={setGenre}
      />
      {body}
    </section>
  );
}
