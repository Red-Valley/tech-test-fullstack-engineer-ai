import type { Game, GameSortBy } from '@/client/domain/game';
import { cn } from '@/client/lib/cn';
import { GameRow } from '@/client/ui/components/games/game-row';

export type SortState = { sortBy: GameSortBy; order: 'asc' | 'desc' };

type Column = { key: GameSortBy; label: string; align: 'left' | 'right' };

const COLUMNS: Column[] = [
  { key: 'title', label: 'Game', align: 'left' },
  { key: 'genre', label: 'Genre', align: 'left' },
  { key: 'revenue', label: 'Revenue', align: 'right' },
  { key: 'downloads', label: 'Downloads', align: 'right' },
  { key: 'rating', label: 'Rating', align: 'right' },
];

type GamesTableProps = {
  games: Game[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  highlightedIds: ReadonlySet<number>;
  /** Per-row action buttons (edit/delete); omit to render a read-only table. */
  renderActions?: (game: Game) => React.ReactNode;
};

function SortHeader({
  column,
  sort,
  onSortChange,
}: {
  column: Column;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}) {
  const active = sort.sortBy === column.key;
  // A new column starts with the natural order: A→Z for text, biggest first for numbers.
  const nextOrder = active
    ? sort.order === 'asc'
      ? 'desc'
      : 'asc'
    : column.align === 'left'
      ? 'asc'
      : 'desc';
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn('px-3 py-2 font-medium', column.align === 'right' ? 'text-right' : 'text-left')}
    >
      <button
        type="button"
        onClick={() => onSortChange({ sortBy: column.key, order: nextOrder })}
        className={cn(
          'inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
          active && 'text-foreground',
        )}
      >
        {column.label}
        <span aria-hidden="true" className="w-3 text-[10px]">
          {active ? (sort.order === 'asc' ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  );
}

export function GamesTable({
  games,
  sort,
  onSortChange,
  highlightedIds,
  renderActions,
}: GamesTableProps) {
  return (
    // Wide tables scroll inside their box on small screens; the page itself never scrolls sideways.
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">
          Games, sorted by {sort.sortBy} ({sort.order})
        </caption>
        <thead className="text-xs text-muted">
          <tr>
            {COLUMNS.map((column) => (
              <SortHeader
                key={column.key}
                column={column}
                sort={sort}
                onSortChange={onSortChange}
              />
            ))}
            {renderActions && (
              <th scope="col" className="px-3 py-2 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              highlighted={highlightedIds.has(game.id)}
              actions={renderActions?.(game)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
