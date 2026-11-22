import 'server-only';
import { tool } from 'ai';
import { z } from 'zod';
import { getGamesService, GamesService } from '@/lib/services/games-service';

export const searchGamesSchema = z.object({
  query: z.string().optional().describe('Search keyword matching title or developer'),
  genre: z.string().optional().describe('Filter by specific genre (e.g., Roguelike, Platformer, Metroidvania)'),
  rating_above: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe('Strict exclusive lower bound for rating (average_rating > value)'),
  min_rating: z.number().min(0).max(5).optional().describe('Minimum rating (average_rating >= value)'),
  max_rating: z.number().min(0).max(5).optional().describe('Maximum rating (average_rating <= value)'),
  min_revenue: z.number().nonnegative().optional().describe('Minimum monthly revenue in USD'),
  limit: z.number().int().positive().max(25).optional().describe('Maximum number of games to return'),
});
export type SearchGamesParams = z.infer<typeof searchGamesSchema>;

export const countGamesSchema = z.object({
  rating_above: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe('Strict exclusive rating bound: counts games where average_rating > rating_above'),
  min_rating: z.number().min(0).max(5).optional().describe('Inclusive minimum rating (average_rating >= min_rating)'),
  max_rating: z.number().min(0).max(5).optional().describe('Inclusive maximum rating (average_rating <= max_rating)'),
  genre: z.string().optional().describe('Filter by game genre'),
  min_revenue: z.number().nonnegative().optional().describe('Filter by minimum monthly revenue in USD'),
});
export type CountGamesParams = z.infer<typeof countGamesSchema>;

export const getTopGamesSchema = z.object({
  metric: z
    .enum(['monthly_revenue_usd', 'monthly_downloads', 'average_rating'])
    .describe('Metric to rank by'),
  order: z.enum(['asc', 'desc']).optional().describe('Sort direction: desc for top, asc for bottom'),
  limit: z.number().int().positive().max(20).optional().describe('Number of top games to retrieve'),
});
export type GetTopGamesParams = z.infer<typeof getTopGamesSchema>;

export const compareGamesSchema = z.object({
  titles_or_ids: z
    .array(z.string().min(1))
    .min(2, 'Provide at least two game titles or IDs to compare')
    .max(5, 'Maximum of 5 games can be compared simultaneously')
    .describe('Array of game titles or IDs to compare'),
});
export type CompareGamesParams = z.infer<typeof compareGamesSchema>;

export const getCatalogStatsSchema = z.object({});
export type GetCatalogStatsParams = z.infer<typeof getCatalogStatsSchema>;

/**
 * Creates the five dedicated database-backed AI tools.
 * Each tool directly calls GamesService methods, guaranteeing zero code or query duplication.
 */
export function createCatalogTools(customService?: GamesService) {
  const service = customService || getGamesService();

  return {
    search_games: tool({
      description:
        'Search the indie games catalog by keyword (matching title or developer), genre, rating bounds, or minimum revenue.',
      inputSchema: searchGamesSchema,
      execute: async (args: SearchGamesParams) => {
        const games = service.searchGames({
          query: args.query,
          genre: args.genre,
          rating_above: args.rating_above,
          min_rating: args.min_rating,
          max_rating: args.max_rating,
          min_revenue: args.min_revenue,
          limit: args.limit,
        });

        return {
          count: games.length,
          games: games.map((g) => ({
            id: g.id,
            title: g.title,
            developer: g.developer,
            genre: g.genre,
            monthly_revenue_usd: g.monthly_revenue_usd,
            monthly_downloads: g.monthly_downloads,
            average_rating: g.average_rating,
          })),
        };
      },
    }),

    count_games: tool({
      description:
        'Count games in the catalog matching specific criteria. Use rating_above for questions like "How many games are rated above 4?" to enforce strict inequality (average_rating > value).',
      inputSchema: countGamesSchema,
      execute: async (args: CountGamesParams) => {
        const result = service.countGames({
          rating_above: args.rating_above,
          min_rating: args.min_rating,
          max_rating: args.max_rating,
          genre: args.genre,
          min_revenue: args.min_revenue,
        });

        return {
          matching_games_count: result.count,
          applied_filters: {
            rating_above: args.rating_above,
            min_rating: args.min_rating,
            max_rating: args.max_rating,
            genre: args.genre,
            min_revenue: args.min_revenue,
          },
        };
      },
    }),

    get_top_games: tool({
      description:
        'Retrieve top-ranked games ordered by a key metric. Note: monthly_revenue_usd represents recorded catalog figures without calendar month timestamps.',
      inputSchema: getTopGamesSchema,
      execute: async (args: GetTopGamesParams) => {
        const games = service.getTopGames({
          metric: args.metric,
          order: args.order,
          limit: args.limit,
        });

        return {
          ranked_by: args.metric,
          order: args.order || 'desc',
          total_returned: games.length,
          games: games.map((g, index) => ({
            rank: index + 1,
            id: g.id,
            title: g.title,
            developer: g.developer,
            genre: g.genre,
            monthly_revenue_usd: g.monthly_revenue_usd,
            monthly_downloads: g.monthly_downloads,
            average_rating: g.average_rating,
          })),
          data_limitation_notice:
            'monthly_revenue_usd reflects recorded catalog numbers without a calendar month or reporting period timestamp.',
        };
      },
    }),

    compare_games: tool({
      description:
        'Compare two or more games side-by-side by titles or IDs, returning key metrics and calculated differences in revenue, downloads, and ratings.',
      inputSchema: compareGamesSchema,
      execute: async (args: CompareGamesParams) => {
        const comparison = service.compareGames(args.titles_or_ids);

        return {
          games_found_count: comparison.games.length,
          games: comparison.games.map((g) => ({
            id: g.id,
            title: g.title,
            developer: g.developer,
            genre: g.genre,
            monthly_revenue_usd: g.monthly_revenue_usd,
            monthly_downloads: g.monthly_downloads,
            average_rating: g.average_rating,
          })),
          revenue_difference_usd: comparison.revenue_delta_usd,
          downloads_difference: comparison.downloads_delta,
          rating_difference: comparison.rating_delta,
        };
      },
    }),

    get_catalog_stats: tool({
      description:
        'Retrieve overall aggregate statistics for the entire indie games catalog, including total game count, total revenue, average downloads, average rating, and genre breakdown.',
      inputSchema: getCatalogStatsSchema,
      execute: async () => {
        const stats = service.getCatalogStats();
        return {
          total_games: stats.total_games,
          total_monthly_revenue_usd: stats.total_monthly_revenue_usd,
          average_monthly_downloads: stats.average_monthly_downloads,
          average_rating: stats.average_rating,
          top_genres: stats.genre_breakdown,
        };
      },
    }),
  };
}

export const catalogTools = createCatalogTools();
