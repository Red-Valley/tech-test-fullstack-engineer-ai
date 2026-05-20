import { tool } from 'ai';
import { z } from 'zod';
import { listGames } from '@/lib/games/repository';
import { GENRES, type Game } from '@/lib/games/schema';

interface ToolError {
  error: string;
  reason: string;
}

interface CompactGame {
  id: string;
  title: string;
  genre: string;
  average_rating: number;
}

interface AggregateResult {
  metric: string;
  operation: string;
  value: number;
  n: number;
}

// Iterative Levenshtein distance, single-row DP. Pure function, ~15 lines.
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr: number[] = new Array(n + 1);
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

const listGamesTool = tool({
  description:
    "List games in the catalog, optionally filtered by genre or minimum rating. Use this for counting questions ('how many games rated above 4') or for scoped enumeration. Returns a compact projection: id, title, genre, average_rating.",
  inputSchema: z.object({
    genre: z.enum(GENRES).optional(),
    minRating: z.number().min(0).max(5).optional(),
  }),
  execute: async ({ genre, minRating }): Promise<CompactGame[] | ToolError> => {
    try {
      const games = await listGames({ genre, minRating });
      return games.map((g) => ({
        id: g.id,
        title: g.title,
        genre: g.genre,
        average_rating: g.average_rating,
      }));
    } catch (err) {
      return { error: 'listGames failed', reason: (err as Error).message };
    }
  },
});

const queryGamesTool = tool({
  description:
    "Workhorse tool for ranking, filtering, and top-N questions. Sorts the catalog by any numeric metric (revenue, downloads, or rating) in ascending or descending order, optionally filtered. Use this for 'which game made the most revenue', 'top 3 rated', 'roguelikes by downloads'. Returns full game objects.",
  inputSchema: z.object({
    filters: z
      .object({
        genre: z.enum(GENRES).optional(),
        minRating: z.number().min(0).max(5).optional(),
      })
      .optional(),
    sortBy: z.enum([
      'monthly_revenue_usd',
      'monthly_downloads',
      'average_rating',
    ]),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    limit: z.number().int().min(1).max(20).default(5),
  }),
  execute: async ({
    filters,
    sortBy,
    sortOrder,
    limit,
  }): Promise<Game[] | ToolError> => {
    try {
      const games = await listGames(filters);
      const sorted = [...games].sort((a, b) =>
        sortOrder === 'asc' ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy],
      );
      return sorted.slice(0, limit);
    } catch (err) {
      return { error: 'queryGames failed', reason: (err as Error).message };
    }
  },
});

const getGameByTitleTool = tool({
  description:
    "Resolve a user-provided game title (which may be informal, misspelled, or partial) to a game record. Use this BEFORE any tool that takes an id when the user refers to a game by name. Returns the matched game, OR if no exact match, returns { notFound: true, suggestions: string[] } with the top 3 closest titles from the catalog.",
  inputSchema: z.object({
    title: z.string().min(1),
  }),
  execute: async ({
    title,
  }): Promise<
    { game: Game } | { notFound: true; suggestions: string[] } | ToolError
  > => {
    try {
      const games = await listGames();
      const input = title.toLowerCase();

      const exact = games.find((g) => g.title.toLowerCase() === input);
      if (exact) return { game: exact };

      const substringMatches = games.filter((g) => {
        const t = g.title.toLowerCase();
        return t.includes(input) || input.includes(t);
      });
      if (substringMatches.length === 1) return { game: substringMatches[0] };

      const pool = substringMatches.length > 1 ? substringMatches : games;
      const suggestions = pool
        .map((g) => ({
          title: g.title,
          dist: levenshtein(g.title.toLowerCase(), input),
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
        .map((x) => x.title);
      return { notFound: true, suggestions };
    } catch (err) {
      return {
        error: 'getGameByTitle failed',
        reason: (err as Error).message,
      };
    }
  },
});

const aggregateGamesTool = tool({
  description:
    "Compute sum, average, min, max, or count over a numeric field across the catalog, optionally filtered. Use for 'average rating across Metroidvanias', 'total monthly revenue', 'how many roguelikes are there', 'max downloads in Puzzle genre'.",
  inputSchema: z.object({
    metric: z.enum([
      'monthly_revenue_usd',
      'monthly_downloads',
      'average_rating',
    ]),
    operation: z.enum(['sum', 'avg', 'min', 'max', 'count']),
    filters: z
      .object({
        genre: z.enum(GENRES).optional(),
        minRating: z.number().min(0).max(5).optional(),
      })
      .optional(),
  }),
  execute: async ({
    metric,
    operation,
    filters,
  }): Promise<AggregateResult | ToolError> => {
    try {
      const games = await listGames(filters);
      const n = games.length;

      if (operation === 'count') return { metric, operation, value: n, n };
      if (n === 0) return { metric, operation, value: 0, n: 0 };

      const values = games.map((g) => g[metric]);
      if (operation === 'sum') {
        return {
          metric,
          operation,
          value: values.reduce((s, v) => s + v, 0),
          n,
        };
      }
      if (operation === 'avg') {
        const avg = values.reduce((s, v) => s + v, 0) / n;
        return { metric, operation, value: Math.round(avg * 100) / 100, n };
      }
      if (operation === 'min') {
        return { metric, operation, value: Math.min(...values), n };
      }
      if (operation === 'max') {
        return { metric, operation, value: Math.max(...values), n };
      }
      // Unreachable: Zod enum guarantees one of the five operations.
      return {
        error: 'aggregateGames internal',
        reason: `unknown operation ${String(operation)}`,
      };
    } catch (err) {
      return {
        error: 'aggregateGames failed',
        reason: (err as Error).message,
      };
    }
  },
});

export const chatTools = {
  listGames: listGamesTool,
  queryGames: queryGamesTool,
  getGameByTitle: getGameByTitleTool,
  aggregateGames: aggregateGamesTool,
};
