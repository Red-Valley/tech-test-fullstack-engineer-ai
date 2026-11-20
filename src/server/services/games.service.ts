import { NotFoundError } from '@/server/http/errors';
import {
  getGamesRepository,
  type GameFilters,
  type GamesRepository,
  type GameSortBy,
  type SortOrder,
} from '@/server/repositories/games.repository';
import type { GameDto, GameInputDto, GameStatsDto } from '@/shared/types/game.dto';

export type Metric = 'revenue' | 'downloads' | 'rating';
export type AggregateOperation = 'count' | 'sum' | 'avg' | 'min' | 'max';
export type RangeFilters = Pick<GameFilters, 'genre' | 'minRating' | 'maxRating'>;

export const MAX_LIMIT = 10;
export const DEFAULT_LIMIT = 5;

const METRIC_FIELD = {
  revenue: 'monthly_revenue_usd',
  downloads: 'monthly_downloads',
  rating: 'average_rating',
} as const satisfies Record<Metric, keyof GameDto>;

const valueOf = (game: GameDto, metric: Metric) => game[METRIC_FIELD[metric]];

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** `value` is null when there's nothing to aggregate (count is 0 instead). */
export type AggregateResult = { value: number | null; n: number };

function computeAggregate(values: number[], operation: AggregateOperation): AggregateResult {
  const n = values.length;
  if (operation === 'count') return { value: n, n };
  if (n === 0) return { value: null, n };
  const total = values.reduce((a, b) => a + b, 0);
  const results: Record<Exclude<AggregateOperation, 'count'>, number> = {
    sum: total,
    avg: total / n,
    min: Math.min(...values),
    max: Math.max(...values),
  };
  return { value: round(results[operation], 2), n };
}

// ---- fuzzy title matching ---------------------------------------------------------------

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

const similarity = (a: string, b: string) =>
  a.length === 0 && b.length === 0 ? 1 : 1 - levenshtein(a, b) / Math.max(a.length, b.length);

/** Best of: the whole title, or any single word of it (so "lantren" still finds "Lantern Drift"). */
function titleScore(query: string, title: string): number {
  const q = normalize(query);
  const whole = similarity(q, normalize(title));
  const words = title.split(/\s+/).map((word) => similarity(q, normalize(word)));
  return Math.max(whole, ...words);
}

// A typo or two in a normal-length title scores above this; unrelated titles score far below.
const MATCH_THRESHOLD = 0.75;
const SUGGESTION_COUNT = 3;

export type FindGameResult = { game: GameDto } | { notFound: true; suggestions: string[] };

// ---- service ----------------------------------------------------------------------------

export function createGamesService(repo: GamesRepository) {
  const getGame = (id: number): GameDto => {
    const game = repo.findById(id);
    if (!game) throw new NotFoundError(`Game ${id} not found`);
    return game;
  };

  const findGame = (title: string): FindGameResult => {
    const query = normalize(title);
    const games = repo.list();
    if (!query) return { notFound: true, suggestions: [] };

    const exact = games.find((g) => normalize(g.title) === query);
    if (exact) return { game: exact };

    // A partial title that points at exactly one game is a match; several is ambiguous.
    const containing = games.filter((g) => normalize(g.title).includes(query));
    if (containing.length === 1) return { game: containing[0] };
    if (containing.length > 1) {
      return {
        notFound: true,
        suggestions: containing.slice(0, SUGGESTION_COUNT).map((g) => g.title),
      };
    }

    const ranked = games
      .map((game) => ({ game, score: titleScore(title, game.title) }))
      .sort((a, b) => b.score - a.score);
    const [best, second] = ranked;
    // Only accept a fuzzy match that is clearly better than the runner-up.
    if (best && best.score >= MATCH_THRESHOLD && (!second || best.score - second.score >= 0.1)) {
      return { game: best.game };
    }
    return {
      notFound: true,
      suggestions: ranked.slice(0, SUGGESTION_COUNT).map(({ game }) => game.title),
    };
  };

  return {
    listGames: (filters: GameFilters = {}): GameDto[] => repo.list(filters),

    getGame,

    createGame: (input: GameInputDto): GameDto => repo.create(input),

    updateGame(id: number, input: GameInputDto): GameDto {
      const updated = repo.update(id, input);
      if (!updated) throw new NotFoundError(`Game ${id} not found`);
      return updated;
    },

    deleteGame(id: number): void {
      if (!repo.delete(id)) throw new NotFoundError(`Game ${id} not found`);
    },

    getStats(): GameStatsDto {
      const games = repo.list();
      const sum = (pick: (g: GameDto) => number) => games.reduce((acc, g) => acc + pick(g), 0);
      return {
        totalGames: games.length,
        totalRevenue: sum((g) => g.monthly_revenue_usd),
        totalDownloads: sum((g) => g.monthly_downloads),
        averageRating: games.length ? round(sum((g) => g.average_rating) / games.length, 2) : 0,
        ratedAbove4: games.filter((g) => g.average_rating > 4).length,
      };
    },

    /** Top-N query for the chat: never returns more than MAX_LIMIT games, plus the full count. */
    queryGames(
      options: RangeFilters & { sortBy?: GameSortBy; order?: SortOrder; limit?: number } = {},
    ): { games: GameDto[]; total: number } {
      const { limit = DEFAULT_LIMIT, ...filters } = options;
      const matching = repo.list({
        ...filters,
        sortBy: filters.sortBy ?? 'revenue',
        order: filters.order ?? 'desc',
      });
      const capped = Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
      return { games: matching.slice(0, capped), total: matching.length };
    },

    /** `value` is null when no game matches (except count, which is 0). */
    aggregate(
      metric: Metric,
      operation: AggregateOperation,
      filters: RangeFilters = {},
    ): AggregateResult {
      return computeAggregate(
        repo.list(filters).map((g) => valueOf(g, metric)),
        operation,
      );
    },

    /**
     * The same aggregate per genre, highest value first (ties by genre name), so "which genre
     * has the highest X" is answered by the first row instead of one call per genre. Only
     * genres with at least one matching game are listed.
     */
    aggregateByGenre(
      metric: Metric,
      operation: AggregateOperation,
      filters: RangeFilters = {},
    ): { groups: Array<{ genre: string } & AggregateResult> } {
      const valuesByGenre = new Map<string, number[]>();
      for (const game of repo.list(filters)) {
        valuesByGenre.set(game.genre, [
          ...(valuesByGenre.get(game.genre) ?? []),
          valueOf(game, metric),
        ]);
      }
      const groups = [...valuesByGenre]
        .map(([genre, values]) => ({ genre, ...computeAggregate(values, operation) }))
        .sort(
          (a, b) =>
            (b.value ?? -Infinity) - (a.value ?? -Infinity) || a.genre.localeCompare(b.genre),
        );
      return { groups };
    },

    findGame,

    /** Resolves both titles fuzzily; `ratio` is larger / smaller (null if the smaller is 0). */
    compareGames(titleA: string, titleB: string, metric: Metric) {
      const a = findGame(titleA);
      const b = findGame(titleB);
      if (!('game' in a) || !('game' in b)) {
        return {
          notFound: [
            ...('game' in a ? [] : [{ title: titleA, suggestions: a.suggestions }]),
            ...('game' in b ? [] : [{ title: titleB, suggestions: b.suggestions }]),
          ],
        };
      }
      const [va, vb] = [valueOf(a.game, metric), valueOf(b.game, metric)];
      const [high, low] = va >= vb ? [va, vb] : [vb, va];
      return {
        metric,
        games: [a.game, b.game],
        winner: va === vb ? null : va > vb ? a.game.title : b.game.title,
        ratio: low === 0 ? null : round(high / low, 2),
      };
    },
  };
}

export type GamesService = ReturnType<typeof createGamesService>;

export const getGamesService = (): GamesService => createGamesService(getGamesRepository());
