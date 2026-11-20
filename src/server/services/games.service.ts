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
// A wrong confident match is worse than "not found": the model would report another game's
// numbers as fact. So a match needs every word of the query to line up with a word of the
// title; otherwise the result is notFound with suggestions.

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
const compact = (text: string) => words(text).join('');

/** Optimal string alignment distance: Levenshtein where swapping two adjacent letters costs 1. */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

const similarity = (a: string, b: string) =>
  a.length + b.length === 0 ? 1 : 1 - editDistance(a, b) / Math.max(a.length, b.length);

/** A query word fits a title word if it starts it, or is within 1 typo per 4 letters of it. */
const wordFits = (queryWord: string, titleWord: string) =>
  titleWord.startsWith(queryWord) ||
  editDistance(queryWord, titleWord) <= Math.max(1, Math.floor(queryWord.length / 4));

const everyWordFits = (query: string, title: string) => {
  const titleWords = words(title);
  return words(query).every((qw) => titleWords.some((tw) => wordFits(qw, tw)));
};

/**
 * How close a query is to a title: the whole title compared as one string, or, for a single
 * long word like "Lantren", its best match among the title's long words.
 */
function closeness(query: string, title: string): number {
  const whole = similarity(compact(query), compact(title));
  const [only, ...rest] = words(query);
  if (rest.length > 0 || !only || only.length < 5) return whole;
  const longWords = words(title).filter((w) => w.length >= 6);
  return Math.max(whole, ...longWords.map((w) => similarity(only, w)));
}

const MIN_PARTIAL_LENGTH = 4;
const MATCH_THRESHOLD = 0.8;
const CLEAR_MARGIN = 0.1;
const SUGGESTION_COUNT = 3;

export type MatchKind = 'exact' | 'partial' | 'fuzzy';
export type FindGameResult =
  { game: GameDto; matchedBy: MatchKind } | { notFound: true; suggestions: string[] };

// ---- service ----------------------------------------------------------------------------

export function createGamesService(repo: GamesRepository) {
  const getGame = (id: number): GameDto => {
    const game = repo.findById(id);
    if (!game) throw new NotFoundError(`Game ${id} not found`);
    return game;
  };

  const findGame = (title: string): FindGameResult => {
    const query = compact(title);
    if (!query) return { notFound: true, suggestions: [] };
    const games = repo.list();

    const exact = games.find((g) => compact(g.title) === query);
    if (exact) return { game: exact, matchedBy: 'exact' };

    // Partial: each query word starts a word of the title ("Copper Tide", "Lantern").
    // Too-short queries ("x", "the") would match almost anything, so they don't count.
    if (query.length >= MIN_PARTIAL_LENGTH) {
      const partial = games.filter((g) => {
        const titleWords = words(g.title);
        return words(title).every((qw) => titleWords.some((tw) => tw.startsWith(qw)));
      });
      if (partial.length === 1) return { game: partial[0], matchedBy: 'partial' };
      if (partial.length > 1) {
        return {
          notFound: true,
          suggestions: partial.slice(0, SUGGESTION_COUNT).map((g) => g.title),
        };
      }
    }

    const ranked = games
      .map((game) => ({ game, score: closeness(title, game.title) }))
      .sort((a, b) => b.score - a.score);
    const candidates = ranked.filter(({ game }) => everyWordFits(title, game.title));
    const [best, second] = candidates;
    if (
      best &&
      best.score >= MATCH_THRESHOLD &&
      (!second || best.score - second.score >= CLEAR_MARGIN)
    ) {
      return { game: best.game, matchedBy: 'fuzzy' };
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
      const safe = Number.isFinite(limit) ? Math.trunc(limit) : DEFAULT_LIMIT;
      const capped = Math.min(Math.max(safe, 1), MAX_LIMIT);
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
      if (a.game.id === b.game.id) {
        return { error: `Both titles refer to the same game: ${a.game.title}` };
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
