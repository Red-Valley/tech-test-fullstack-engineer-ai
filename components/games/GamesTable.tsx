'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SortField } from '@/lib/games';
import { formatNumber, formatRating, formatUSD } from '@/lib/format';
import type { Game } from '@/lib/types';
import { GameActions } from './GameActions';
import { GameCard } from './GameCard';
import { GameFormModal } from './GameFormModal';
import { GamesFilters, type GamesView, type Sort } from './GamesFilters';

type Dialog = { kind: 'create' } | { kind: 'edit'; game: Game };

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const matchesSearch = (game: Game, needle: string) =>
  [game.title, game.developer, game.genre].some((text) => text.toLowerCase().includes(needle));

function compareGames(a: Game, b: Game, field: SortField): number {
  if (field === 'title') return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
  return a[field] - b[field];
}

function SortableHeader({
  field,
  label,
  sort,
  align = 'left',
  onSort,
}: {
  field: SortField;
  label: string;
  sort: Sort | null;
  align?: 'left' | 'right';
  onSort: (field: SortField) => void;
}) {
  const order = sort?.field === field ? sort.order : null;
  const ariaSort = order === 'asc' ? 'ascending' : order === 'desc' ? 'descending' : undefined;

  return (
    <th scope="col" aria-sort={ariaSort} className={`px-4 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 rounded tracking-wider uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <span aria-hidden="true" className="w-3 text-xs">
          {order === 'asc' ? '▲' : order === 'desc' ? '▼' : ''}
        </span>
      </button>
    </th>
  );
}

interface GamesTableProps {
  games: Game[];
  genres: string[];
  /** Size of the whole catalog, which can exceed the rows that listGames() returns. */
  total?: number;
}

// Sorting and filtering run in the browser: the catalog is small and already loaded, so
// they feel instant and need no extra requests. A larger catalog would move them to the API.
export function GamesTable({ games, genres, total = games.length }: GamesTableProps) {
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState<Sort | null>(null);
  const [view, setView] = useState<GamesView>('table');
  const [dialog, setDialog] = useState<Dialog | null>(null);

  // Deleting the last game of a genre removes it from the options, so the filter must let go.
  const activeGenre = genres.some((option) => option === genre) ? genre : '';

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = games.filter(
      (game) => matchesSearch(game, needle) && (activeGenre === '' || sameText(game.genre, activeGenre)),
    );
    if (!sort) return filtered;
    const direction = sort.order === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => direction * compareGames(a, b, sort.field) || a.id - b.id);
  }, [games, search, activeGenre, sort]);

  function toggleSort(field: SortField) {
    setSort((current) => {
      if (current?.field === field) return { field, order: current.order === 'asc' ? 'desc' : 'asc' };
      // First click: A to Z for titles, biggest first for metrics.
      return { field, order: field === 'title' ? 'asc' : 'desc' };
    });
  }

  function clearFilters() {
    setSearch('');
    setGenre('');
  }

  const openEdit = (game: Game) => setDialog({ kind: 'edit', game });

  return (
    <section aria-label="Games" className="flex flex-col gap-4">
      <GamesFilters
        search={search}
        onSearch={setSearch}
        genre={activeGenre}
        genres={genres}
        onGenre={setGenre}
        sort={sort}
        onSort={setSort}
        view={view}
        onView={setView}
        onAdd={() => setDialog({ kind: 'create' })}
      />

      {games.length > 0 && (
        <p aria-live="polite" className="px-1 font-mono text-xs text-outline">
          Showing {rows.length} of {total} games
        </p>
      )}

      {total > games.length && (
        <p className="text-sm text-muted">
          Showing the first {games.length} of {total} games. Search, filters and sorting only cover these.
        </p>
      )}

      {games.length === 0 ? (
        <EmptyState title="No games yet. Create the first one." />
      ) : rows.length === 0 ? (
        <EmptyState title="No games match your filters.">
          <Button onClick={clearFilters}>Clear filters</Button>
        </EmptyState>
      ) : view === 'cards' ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((game) => (
            <GameCard key={game.id} game={game} onEdit={() => openEdit(game)} />
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface-low shadow-xl">
          <table className="w-full min-w-[56rem] text-sm">
            <caption className="sr-only">Indie games catalog</caption>
            <thead className="bg-surface-high font-mono text-xs tracking-wider text-muted uppercase">
              <tr>
                <SortableHeader field="title" label="Title" sort={sort} onSort={toggleSort} />
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Developer
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Genre
                </th>
                <SortableHeader field="monthly_revenue_usd" label="Revenue" align="right" sort={sort} onSort={toggleSort} />
                <SortableHeader field="monthly_downloads" label="Downloads" align="right" sort={sort} onSort={toggleSort} />
                <SortableHeader field="average_rating" label="Rating" align="right" sort={sort} onSort={toggleSort} />
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((game) => (
                <tr key={game.id} className="even:bg-surface hover:bg-surface-high">
                  <th scope="row" className="px-4 py-3 text-left font-display font-bold [overflow-wrap:anywhere]">
                    {game.title}
                  </th>
                  <td className="px-4 py-3 text-muted [overflow-wrap:anywhere]">{game.developer}</td>
                  <td className="min-w-40 px-4 py-3 [overflow-wrap:anywhere]">
                    <span className="inline-block rounded-md bg-surface-high px-2 py-1 font-mono text-xs text-secondary">{game.genre}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-tertiary tabular-nums">{formatUSD(game.monthly_revenue_usd)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatNumber(game.monthly_downloads)}</td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap text-secondary tabular-nums">{formatRating(game.average_rating)}</td>
                  <td className="px-4 py-3">
                    <GameActions game={game} onEdit={() => openEdit(game)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && <GameFormModal game={dialog.kind === 'edit' ? dialog.game : undefined} onClose={() => setDialog(null)} />}
    </section>
  );
}
