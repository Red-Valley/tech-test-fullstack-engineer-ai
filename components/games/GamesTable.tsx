'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SortField } from '@/lib/games';
import { formatNumber, formatRating, formatUSD } from '@/lib/format';
import type { Game } from '@/lib/types';
import { DeleteButton } from './DeleteButton';
import { GameFormModal } from './GameFormModal';

type Sort = { field: SortField; order: 'asc' | 'desc' };
type Dialog = { kind: 'create' } | { kind: 'edit'; game: Game };

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

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
        className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
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
  const [dialog, setDialog] = useState<Dialog | null>(null);

  // Deleting the last game of a genre removes it from the options, so the filter must let go.
  const activeGenre = genres.some((option) => option === genre) ? genre : '';

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = games.filter(
      (game) => game.title.toLowerCase().includes(needle) && (activeGenre === '' || sameText(game.genre, activeGenre)),
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

  const controlClass =
    'rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none';

  return (
    <section aria-label="Games" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm font-medium sm:flex-1">
          Search by title
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={`font-normal ${controlClass}`} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Genre
          <select value={activeGenre} onChange={(event) => setGenre(event.target.value)} className={`font-normal ${controlClass}`}>
            <option value="">All genres</option>
            {genres.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>
          Add game
        </Button>
      </div>

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
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[56rem] text-sm">
            <caption className="sr-only">Indie games catalog</caption>
            <thead className="border-b border-border text-muted">
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
                <tr key={game.id} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-4 py-3 text-left font-medium [overflow-wrap:anywhere]">
                    {game.title}
                  </th>
                  <td className="px-4 py-3">{game.developer}</td>
                  <td className="px-4 py-3">{game.genre}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatUSD(game.monthly_revenue_usd)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(game.monthly_downloads)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatRating(game.average_rating)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button aria-label={`Edit ${game.title}`} onClick={() => setDialog({ kind: 'edit', game })}>
                        Edit
                      </Button>
                      <DeleteButton game={game} />
                    </div>
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
