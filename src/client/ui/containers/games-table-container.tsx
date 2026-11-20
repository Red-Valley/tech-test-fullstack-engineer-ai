'use client';

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { useCatalog } from '@/client/context/catalog-context';
import type { Game } from '@/client/domain/game';
import { useGameMutations } from '@/client/hooks/use-game-mutations';
import { useGames } from '@/client/hooks/use-games';
import { SectionHeading } from '@/client/ui/components/games/dashboard-header';
import { DeleteConfirm } from '@/client/ui/components/games/delete-confirm';
import { GameRowActions } from '@/client/ui/components/games/game-row-actions';
import { GamesTable, type SortState } from '@/client/ui/components/games/games-table';
import { GamesToolbar } from '@/client/ui/components/games/games-toolbar';
import { Button } from '@/client/ui/components/primitives/button';
import { EmptyState, InlineAlert, Spinner } from '@/client/ui/components/primitives/feedback';
import { GameFormContainer } from '@/client/ui/containers/game-form-container';
import { GENRES } from '@/shared/constants/genres';

type FormState = { mode: 'create' } | { mode: 'edit'; game: Game } | null;

export function GamesTableContainer() {
  const { catalogVersion, highlightedGameIds, refreshCatalog } = useCatalog();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState<SortState>({ sortBy: 'revenue', order: 'desc' });
  // Typing stays responsive; the request uses the deferred value.
  const deferredSearch = useDeferredValue(search.trim());

  const [form, setForm] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<Game | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const { deleteGame, isSubmitting: isDeleting } = useGameMutations();
  // After a delete the row's own Delete button is gone, so focus goes to "Add game" instead of
  // <body>. It has to happen after the dialog's close() (which restores focus to the removed
  // button), so it runs in an effect: effects run after the Modal's layout effect.
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const focusAddAfterClose = useRef(false);
  useEffect(() => {
    if (deleting === null && focusAddAfterClose.current) {
      focusAddAfterClose.current = false;
      addButtonRef.current?.focus();
    }
  }, [deleting]);

  const { games, isLoading, error, refetch } = useGames(
    { q: deferredSearch || undefined, genre: genre || undefined, ...sort },
    catalogVersion,
  );
  const isFiltered = Boolean(deferredSearch || genre);

  const closeDelete = () => {
    setDeleting(null);
    setDeleteError(undefined);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteGame(deleting.id);
    if (result.ok) {
      refreshCatalog();
      focusAddAfterClose.current = true;
      closeDelete();
    } else {
      setDeleteError(result.message);
    }
  };

  const table = (
    <GamesTable
      games={games}
      sort={sort}
      onSortChange={setSort}
      highlightedIds={highlightedGameIds}
      renderActions={(game) => (
        <GameRowActions
          title={game.title}
          onEdit={() => setForm({ mode: 'edit', game })}
          onDelete={() => setDeleting(game)}
        />
      )}
    />
  );

  let body: React.ReactNode;
  if (error && games.length > 0) {
    // A refresh failed but earlier rows exist: keep showing them under the error.
    body = (
      <div className="flex flex-col gap-2">
        <InlineAlert
          title="Couldn't refresh games."
          message={`${error} Showing the last loaded list.`}
          action={
            <Button variant="secondary" size="sm" onClick={refetch}>
              Try again
            </Button>
          }
        />
        {table}
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
      <EmptyState
        title="No games yet"
        description="Add the first game, or run npm run seed."
        action={<Button onClick={() => setForm({ mode: 'create' })}>Add game</Button>}
      />
    );
  } else {
    body = (
      // Dim (don't hide) the current rows while a new filter loads, so the table doesn't jump.
      <div
        aria-busy={isLoading}
        className={isLoading ? 'opacity-60 transition-opacity' : undefined}
      >
        {table}
      </div>
    );
  }

  return (
    <section aria-labelledby="games-heading" className="flex flex-col gap-3">
      <SectionHeading id="games-heading">Games</SectionHeading>
      <GamesToolbar
        search={search}
        onSearchChange={setSearch}
        genre={genre}
        genres={GENRES}
        onGenreChange={setGenre}
        actions={
          <Button ref={addButtonRef} onClick={() => setForm({ mode: 'create' })}>
            Add game
          </Button>
        }
      />
      {body}

      {form && (
        <GameFormContainer
          // A new key per opening resets the form state.
          key={form.mode === 'edit' ? `edit-${form.game.id}` : 'create'}
          game={form.mode === 'edit' ? form.game : undefined}
          onClose={() => setForm(null)}
        />
      )}
      <DeleteConfirm
        open={deleting !== null}
        gameTitle={deleting?.title ?? ''}
        isDeleting={isDeleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      />
    </section>
  );
}
