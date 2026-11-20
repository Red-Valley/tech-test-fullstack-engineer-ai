import { tool } from 'ai';
import { z } from 'zod';
import { getGamesService, MAX_LIMIT, type GamesService } from '@/server/services/games.service';
import { GENRES } from '@/shared/constants/genres';

// Read-only tools for the chat (ARCHITECTURE.md §6.1). Rules:
// - every tool calls the service (never SQL), and all math happens there;
// - no tool returns more than MAX_LIMIT games, so the model never sees the whole catalog;
// - failures come back as { error } objects, never thrown.

// The tools' own sort list. Deliberately not the repository's list, which also has 'genre'
// for the dashboard; §6.1 defines these four.
const TOOL_SORT_FIELDS = ['revenue', 'downloads', 'rating', 'title'] as const;
const METRICS = ['revenue', 'downloads', 'rating'] as const;

const ratingBound = (which: 'min' | 'max') =>
  z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe(
      which === 'min'
        ? 'Minimum average rating, inclusive. Ratings have one decimal, so "above 4" is 4.1.'
        : 'Maximum average rating, inclusive. "Below 4" is 3.9.',
    );

const filters = {
  genre: z.enum(GENRES).optional().describe('Only games of this exact genre.'),
  minRating: ratingBound('min'),
  maxRating: ratingBound('max'),
};

const metric = z
  .enum(METRICS)
  .describe('revenue = monthly revenue in USD last month; downloads = last month; rating = 0–5.');

async function safely<T>(name: string, run: () => T): Promise<T | { error: string }> {
  try {
    // await, so a rejected promise is caught here too if a service call ever becomes async.
    return await run();
  } catch (error) {
    console.error(`[tool ${name}]`, error);
    return { error: `The ${name} tool failed. Tell the user the catalog couldn't be queried.` };
  }
}

export function createTools(service: GamesService) {
  return {
    query_games: tool({
      description:
        'List games from the catalog, filtered and sorted, e.g. "top 3 by downloads" or "Puzzle games rated above 4". ' +
        `Returns at most ${MAX_LIMIT} games plus "total", the number of matching games before the limit.`,
      inputSchema: z.object({
        ...filters,
        sortBy: z.enum(TOOL_SORT_FIELDS).default('revenue').describe('Field to sort by.'),
        order: z.enum(['asc', 'desc']).default('desc').describe('desc = highest first.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .default(5)
          .describe(`How many games to return, 1–${MAX_LIMIT}.`),
      }),
      execute: (input) => safely('query_games', () => service.queryGames(input)),
    }),

    aggregate_games: tool({
      description:
        'Count, sum, average, min or max of a metric over the matching games, e.g. "how many games are rated above 4", ' +
        '"average rating of Roguelike games", "total revenue last month". Returns { value, n } (n = games used; value is null when n is 0). ' +
        'With groupBy "genre" it returns { groups: [{ genre, value, n }] } sorted highest value first, for "which genre has the highest …" questions.',
      inputSchema: z.object({
        metric,
        operation: z
          .enum(['count', 'sum', 'avg', 'min', 'max'])
          .describe('count ignores the metric and counts games.'),
        groupBy: z.enum(['genre']).optional().describe('Aggregate per genre instead of overall.'),
        ...filters,
      }),
      execute: ({ metric, operation, groupBy, ...rangeFilters }) =>
        safely('aggregate_games', () =>
          groupBy === 'genre'
            ? service.aggregateByGenre(metric, operation, rangeFilters)
            : service.aggregate(metric, operation, rangeFilters),
        ),
    }),

    find_game: tool({
      description:
        'Look up one game by title. The title may be partial or misspelled. Returns one of: ' +
        '{ game, matchedBy } with matchedBy "exact", "partial" or "fuzzy" (say it is the closest match if fuzzy); ' +
        '{ ambiguous: true, candidates } when several real games match: ask which one, do not say it is missing; ' +
        '{ notFound: true, suggestions } with up to 3 real titles when nothing matches.',
      inputSchema: z.object({
        title: z.string().trim().min(1).max(100).describe('The title as the user wrote it.'),
      }),
      execute: ({ title }) => safely('find_game', () => service.findGame(title)),
    }),

    compare_games: tool({
      description:
        'Compare two games on one metric. Titles may be partial or misspelled. Returns both games, the winner (null on a tie) ' +
        'and ratio = larger / smaller, computed in code. If a title cannot be resolved, returns { unresolved: [...] } ' +
        'with notFound + suggestions or ambiguous + candidates for that title.',
      inputSchema: z.object({
        titleA: z.string().trim().min(1).max(100),
        titleB: z.string().trim().min(1).max(100),
        metric,
      }),
      execute: ({ titleA, titleB, metric }) =>
        safely('compare_games', () => service.compareGames(titleA, titleB, metric)),
    }),
  };
}

export type ChatTools = ReturnType<typeof createTools>;

export const getChatTools = (): ChatTools => createTools(getGamesService());
