import { NUMERIC_METRICS, type Game, type NumericMetric, type SortField } from "./schema";

/**
 * Pure helpers behind the dashboard table: filter, sort and summarise a list of games.
 * The page loads the whole (small) catalog once, so these run in the browser for instant feedback.
 */

export type SortDirection = "asc" | "desc";

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export interface ViewFilters {
  /** Matched against title or developer, ignoring case. */
  search: string;
  /** Exact genre, ignoring case. Empty string means "all genres". */
  genre: string;
}

export interface CatalogStats {
  count: number;
  totalRevenue: number;
  totalDownloads: number;
  averageRating: number | null;
  topEarner: Game | null;
}

const collator = new Intl.Collator("en", { sensitivity: "base" });

export const isNumericField = (field: SortField): field is NumericMetric =>
  (NUMERIC_METRICS as readonly string[]).includes(field);

export function filterGames(games: Game[], { search, genre }: ViewFilters): Game[] {
  const needle = search.trim().toLowerCase();
  const wantedGenre = genre.trim().toLowerCase();

  return games.filter(
    (game) =>
      (!wantedGenre || game.genre.toLowerCase() === wantedGenre) &&
      (!needle || game.title.toLowerCase().includes(needle) || game.developer.toLowerCase().includes(needle)),
  );
}

export function sortGames(games: Game[], { field, direction }: SortState): Game[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...games].sort((a, b) => {
    const difference = isNumericField(field) ? a[field] - b[field] : collator.compare(a[field], b[field]);
    return sign * difference || collator.compare(a.title, b.title); // stable, predictable ties
  });
}

/** The state to switch to when a column header is clicked. */
export function nextSort(current: SortState, field: SortField): SortState {
  if (current.field === field) {
    return { field, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  // First click: biggest numbers first, text A-Z.
  return { field, direction: isNumericField(field) ? "desc" : "asc" };
}

export function uniqueGenres(games: Game[]): string[] {
  const byLowerCase = new Map<string, string>();
  for (const { genre } of games) {
    if (!byLowerCase.has(genre.toLowerCase())) byLowerCase.set(genre.toLowerCase(), genre);
  }
  return [...byLowerCase.values()].sort(collator.compare);
}

export function computeStats(games: Game[]): CatalogStats {
  if (games.length === 0) {
    return { count: 0, totalRevenue: 0, totalDownloads: 0, averageRating: null, topEarner: null };
  }
  const totalRevenue = games.reduce((sum, game) => sum + game.monthly_revenue_usd, 0);
  const totalRating = games.reduce((sum, game) => sum + game.average_rating, 0);

  return {
    count: games.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalDownloads: games.reduce((sum, game) => sum + game.monthly_downloads, 0),
    averageRating: totalRating / games.length,
    topEarner: games.reduce((top, game) => (game.monthly_revenue_usd > top.monthly_revenue_usd ? game : top)),
  };
}
