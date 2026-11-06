import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { SortField } from '@/lib/games';

export type Sort = { field: SortField; order: 'asc' | 'desc' };
export type GamesView = 'table' | 'cards';

const SORT_OPTIONS: { label: string; sort: Sort }[] = [
  { label: 'Revenue: high to low', sort: { field: 'monthly_revenue_usd', order: 'desc' } },
  { label: 'Revenue: low to high', sort: { field: 'monthly_revenue_usd', order: 'asc' } },
  { label: 'Downloads: high to low', sort: { field: 'monthly_downloads', order: 'desc' } },
  { label: 'Downloads: low to high', sort: { field: 'monthly_downloads', order: 'asc' } },
  { label: 'Rating: high to low', sort: { field: 'average_rating', order: 'desc' } },
  { label: 'Rating: low to high', sort: { field: 'average_rating', order: 'asc' } },
  { label: 'Title: A to Z', sort: { field: 'title', order: 'asc' } },
  { label: 'Title: Z to A', sort: { field: 'title', order: 'desc' } },
];

const VIEWS: { view: GamesView; label: string; icon: IconName }[] = [
  { view: 'table', label: 'Table', icon: 'table' },
  { view: 'cards', label: 'Cards', icon: 'cards' },
];

const CONTROL = 'rounded-lg bg-surface-lowest px-3 py-2 font-sans text-sm font-normal tracking-normal normal-case focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none';
const LABEL = 'flex flex-col gap-1 font-mono text-xs font-medium tracking-wide text-muted uppercase';

interface GamesFiltersProps {
  search: string;
  onSearch: (search: string) => void;
  genre: string;
  genres: string[];
  onGenre: (genre: string) => void;
  sort: Sort | null;
  onSort: (sort: Sort | null) => void;
  view: GamesView;
  onView: (view: GamesView) => void;
  onAdd: () => void;
}

export function GamesFilters({ search, onSearch, genre, genres, onGenre, sort, onSort, view, onView, onAdd }: GamesFiltersProps) {
  const selected = SORT_OPTIONS.find((option) => option.sort.field === sort?.field && option.sort.order === sort.order);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-low p-4 shadow-lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className={`${LABEL} md:flex-1`}>
          Search games
          <span className="relative">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-outline" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Title, developer or genre"
              className={`w-full pl-9 placeholder:text-outline ${CONTROL}`}
            />
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <label className={LABEL}>
            Genre
            <select value={genre} onChange={(event) => onGenre(event.target.value)} className={`w-full ${CONTROL}`}>
              <option value="">All genres</option>
              {genres.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL}>
            Sort
            <select
              value={selected?.label ?? ''}
              onChange={(event) => onSort(SORT_OPTIONS.find((option) => option.label === event.target.value)?.sort ?? null)}
              className={`w-full ${CONTROL}`}
            >
              <option value="">Default order</option>
              {SORT_OPTIONS.map(({ label }) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div role="group" aria-label="View" className="flex rounded-lg bg-surface-lowest p-1">
          {VIEWS.map(({ view: option, label, icon }) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => onView(option)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                view === option ? 'bg-brand text-on-brand' : 'text-muted hover:text-foreground'
              }`}
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </div>
        <Button variant="primary" className="whitespace-nowrap" onClick={onAdd}>
          <Icon name="plus" />
          Add game
        </Button>
      </div>
    </div>
  );
}
