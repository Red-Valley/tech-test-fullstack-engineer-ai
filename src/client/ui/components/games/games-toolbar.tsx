import { Input } from '@/client/ui/components/primitives/input';
import { Select } from '@/client/ui/components/primitives/select';

type GamesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  genre: string;
  genres: readonly string[];
  onGenreChange: (value: string) => void;
  /** Right-aligned slot, e.g. the "Add game" button. */
  actions?: React.ReactNode;
};

export function GamesToolbar({
  search,
  onSearchChange,
  genre,
  genres,
  onGenreChange,
  actions,
}: GamesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="sm:w-64">
        <Input
          label="Search titles"
          type="search"
          placeholder="e.g. Deepdelve"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="sm:w-48">
        <Select
          label="Genre"
          placeholder="All genres"
          options={genres}
          value={genre}
          onChange={(event) => onGenreChange(event.target.value)}
        />
      </div>
      {actions && <div className="sm:ml-auto">{actions}</div>}
    </div>
  );
}
