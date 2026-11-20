import { formatInteger, formatRating, formatUsd } from "@/lib/games/format";
import type { Game, SortField } from "@/lib/games/schema";
import type { SortState } from "@/lib/games/view";

interface GamesTableProps {
  games: Game[];
  sort: SortState;
  onSort: (field: SortField) => void;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
}

const columns: { field: SortField; label: string; numeric?: boolean }[] = [
  { field: "title", label: "Game" },
  { field: "genre", label: "Genre" },
  { field: "monthly_revenue_usd", label: "Revenue / mo", numeric: true },
  { field: "monthly_downloads", label: "Downloads / mo", numeric: true },
  { field: "average_rating", label: "Rating", numeric: true },
];

// Full class names so Tailwind can see them; the genre picks one deterministically.
const badgeStyles = [
  "bg-indigo-50 text-indigo-700 ring-indigo-200",
  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "bg-amber-50 text-amber-800 ring-amber-200",
  "bg-rose-50 text-rose-700 ring-rose-200",
  "bg-sky-50 text-sky-700 ring-sky-200",
  "bg-violet-50 text-violet-700 ring-violet-200",
  "bg-teal-50 text-teal-700 ring-teal-200",
  "bg-orange-50 text-orange-700 ring-orange-200",
];

function badgeStyle(genre: string): string {
  let hash = 0;
  for (const char of genre.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) % badgeStyles.length;
  return badgeStyles[hash];
}

export function GamesTable({ games, sort, onSort, onEdit, onDelete }: GamesTableProps) {
  return (
    // `relative` makes this the containing block for the absolutely-positioned `sr-only` labels inside, so they are
    // clipped with the table instead of escaping it and widening the whole page on small screens.
    <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map(({ field, label, numeric }) => {
              const active = sort.field === field;
              return (
                <th
                  key={field}
                  scope="col"
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                  className={`px-4 py-3 font-medium ${numeric ? "text-right" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(field)}
                    className={`inline-flex items-center gap-1 rounded uppercase tracking-wide hover:text-slate-900 ${
                      active ? "text-slate-900" : ""
                    }`}
                  >
                    {label}
                    <span aria-hidden="true" className={active ? "" : "opacity-30"}>
                      {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {games.map((game) => (
            <tr key={game.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{game.title}</div>
                <div className="text-xs text-slate-500">{game.developer}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeStyle(game.genre)}`}>
                  {game.genre}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatUsd(game.monthly_revenue_usd)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatInteger(game.monthly_downloads)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span className="text-amber-500" aria-hidden="true">
                  ★{" "}
                </span>
                <span className="sr-only">Rated </span>
                {formatRating(game.average_rating)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(game)}
                  aria-label={`Edit ${game.title}`}
                  className="rounded px-2 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(game)}
                  aria-label={`Delete ${game.title}`}
                  className="ml-1 rounded px-2 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
