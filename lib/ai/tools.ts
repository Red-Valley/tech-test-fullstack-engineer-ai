import 'server-only';
import { tool, type InferUITools, type UIDataTypes, type UIMessage } from 'ai';
import { z } from 'zod';
import { findGamesByTitles, getStats, listGames, listGenres } from '@/lib/games';
import { gameFiltersSchema } from '@/lib/schema';
import type { Game } from '@/lib/types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

// Optional fields are fine for OpenAI: @ai-sdk/openai sends `strict: tool.strict ?? false`,
// and its "use .nullable()" warning is about strictJsonSchema, which applies to structured output.
export const searchGamesInputSchema = gameFiltersSchema.extend({
  limit: z
    .number()
    .int()
    .positive()
    .max(MAX_LIMIT)
    .optional()
    .describe(`Maximum number of games to return. Defaults to ${DEFAULT_LIMIT}, at most ${MAX_LIMIT}`),
});

export const catalogStatsInputSchema = gameFiltersSchema.omit({ sortBy: true, order: true, limit: true });

export const compareGamesInputSchema = z.object({
  titles: z
    .array(z.string().trim().min(1).describe('A game title, or part of one'))
    .min(2)
    .max(5)
    .describe('The titles of the 2 to 5 games to compare'),
});

function toGameSummary({ title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating }: Game) {
  return { title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating };
}

/**
 * The SDK feeds a thrown message back to the model, which could repeat it to the
 * user, so database details stay in the server log.
 */
function runQuery<T>(toolName: string, query: () => T): T {
  try {
    return query();
  } catch (error) {
    console.error(`[chat] tool ${toolName} failed`, error);
    throw new Error('The catalog could not be queried');
  }
}

export const chatTools = {
  searchGames: tool({
    description:
      'Find games in the catalog with optional filters, sorting and a limit. Use it to list games or to find the top games by revenue, downloads or rating.',
    inputSchema: searchGamesInputSchema,
    execute: ({ limit = DEFAULT_LIMIT, ...filters }) => {
      const games = runQuery('searchGames', () => listGames({ ...filters, limit }));
      if (games.length === 0) return { results: [], note: 'No games matched' };
      return { results: games.map(toGameSummary), count: games.length };
    },
  }),

  getCatalogStats: tool({
    description:
      'Get the count, total and average revenue, total downloads and average rating of the games that match optional filters. Use it for "how many" and for totals or averages.',
    inputSchema: catalogStatsInputSchema,
    execute: (filters) => ({ stats: runQuery('getCatalogStats', () => getStats(filters)) }),
  }),

  compareGames: tool({
    description:
      'Get the data of 2 to 5 specific games by title so they can be compared. Titles match without regard to case and may be partial. Titles without a match are returned in notFound.',
    inputSchema: compareGamesInputSchema,
    execute: ({ titles }) => {
      const games = runQuery('compareGames', () => findGamesByTitles(titles));
      // findGamesByTitles matches each title as a case-insensitive substring but does
      // not say which title matched, so that same rule has to be applied here.
      const lowerCaseTitles = games.map((game) => game.title.toLowerCase());
      const notFound = titles.filter(
        (title) => !lowerCaseTitles.some((gameTitle) => gameTitle.includes(title.toLowerCase())),
      );
      return { games: games.slice(0, MAX_LIMIT).map(toGameSummary), notFound };
    },
  }),

  listGenres: tool({
    description: 'List every genre name in the catalog. Use it to find the exact name to filter by.',
    inputSchema: z.object({}),
    execute: () => ({ genres: runQuery('listGenres', () => listGenres()) }),
  }),
};

export type ChatUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<typeof chatTools>>;
