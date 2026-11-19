import type { DatabaseSync } from 'node:sqlite';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
    createGame,
    findGamesByTitle,
    getCatalogStats,
    getGameById,
    listGames,
    updateGame,
} from '@/lib/games-repository';
import { CreateGameSchema, Game, UpdateGameSchema } from '@/types/game';

function formatToolResult(payload: unknown): string {
    return JSON.stringify(payload);
}

export function createCatalogTools(database?: DatabaseSync) {
    const searchGamesTool = tool(
        async (input) => {
            const games = listGames(
                {
                    search: input.search,
                    genre: input.genre,
                    minRating: input.minRating,
                    maxRating: input.maxRating,
                    sortBy: input.sortBy,
                    sortOrder: input.sortOrder,
                    limit: input.limit,
                },
                database,
            );
            return formatToolResult({
                count: games.length,
                games,
            });
        },
        {
            name: 'search_games',
            description:
                'Search, filter, and sort indie games in the catalog by title/developer/genre text query, genre, rating range, sort column, sort order, and limit.',
            schema: z.object({
                search: z
                    .string()
                    .optional()
                    .describe('Search text matching title, developer, or genre.'),
                genre: z
                    .string()
                    .optional()
                    .describe("Exact genre filter (case-insensitive), e.g. 'Roguelike'."),
                minRating: z
                    .number()
                    .min(0)
                    .max(5)
                    .optional()
                    .describe('Minimum average rating (0 to 5).'),
                maxRating: z
                    .number()
                    .min(0)
                    .max(5)
                    .optional()
                    .describe('Maximum average rating (0 to 5).'),
                sortBy: z
                    .enum([
                        'title',
                        'developer',
                        'genre',
                        'monthly_revenue_usd',
                        'monthly_downloads',
                        'average_rating',
                        'updated_at',
                    ])
                    .optional()
                    .describe('Column to sort results by.'),
                sortOrder: z
                    .enum(['asc', 'desc'])
                    .optional()
                    .describe("Sort direction ('asc' or 'desc')."),
                limit: z
                    .number()
                    .int()
                    .min(1)
                    .max(100)
                    .optional()
                    .describe('Maximum number of games to return.'),
            }),
        },
    );

    const countGamesTool = tool(
        async (input) => {
            const games = listGames(
                {
                    genre: input.genre,
                    minRating: input.minRating,
                    maxRating: input.maxRating,
                    sortBy: 'average_rating',
                    sortOrder: 'desc',
                },
                database,
            );

            return formatToolResult({
                count: games.length,
                games: games.map((g) => ({
                    id: g.id,
                    title: g.title,
                    average_rating: g.average_rating,
                    genre: g.genre,
                    monthly_revenue_usd: g.monthly_revenue_usd,
                })),
            });
        },
        {
            name: 'count_games',
            description:
                'Count games in the catalog matching optional minRating, maxRating, and genre filters, and return matching game summaries.',
            schema: z.object({
                minRating: z
                    .number()
                    .min(0)
                    .max(5)
                    .optional()
                    .describe('Minimum average rating (inclusive).'),
                maxRating: z
                    .number()
                    .min(0)
                    .max(5)
                    .optional()
                    .describe('Maximum average rating (inclusive).'),
                genre: z.string().optional().describe('Optional genre filter (case-insensitive).'),
            }),
        },
    );

    const getCatalogStatsTool = tool(
        async () => {
            const stats = getCatalogStats(database);
            return formatToolResult(stats);
        },
        {
            name: 'get_catalog_stats',
            description:
                'Get overall catalog statistics including total games, total monthly revenue, total monthly downloads, average rating, highest revenue game, highest rated game, and per-genre breakdown.',
            schema: z.object({}),
        },
    );

    const compareGamesTool = tool(
        async (input) => {
            const matched: Game[] = [];
            const seenIds = new Set<number>();
            const notFound: string[] = [];

            for (const title of input.titles) {
                const results = findGamesByTitle(title, database);
                const best = results[0];
                if (!best) {
                    notFound.push(title);
                    continue;
                }
                if (!seenIds.has(best.id)) {
                    seenIds.add(best.id);
                    matched.push(best);
                }
            }

            if (matched.length === 0) {
                return formatToolResult({
                    matched: [],
                    not_found: notFound,
                    comparison: null,
                });
            }

            const byRevenue = [...matched].sort(
                (a, b) => b.monthly_revenue_usd - a.monthly_revenue_usd,
            );
            const byDownloads = [...matched].sort(
                (a, b) => b.monthly_downloads - a.monthly_downloads,
            );
            const byRating = [...matched].sort((a, b) => b.average_rating - a.average_rating);

            const highestRevenue = byRevenue[0];
            const lowestRevenue = byRevenue[byRevenue.length - 1];
            const highestDownloads = byDownloads[0];
            const lowestDownloads = byDownloads[byDownloads.length - 1];
            const highestRated = byRating[0];
            const lowestRated = byRating[byRating.length - 1];

            return formatToolResult({
                matched,
                not_found: notFound,
                comparison: {
                    highest_revenue: {
                        title: highestRevenue.title,
                        monthly_revenue_usd: highestRevenue.monthly_revenue_usd,
                    },
                    highest_downloads: {
                        title: highestDownloads.title,
                        monthly_downloads: highestDownloads.monthly_downloads,
                    },
                    highest_rated: {
                        title: highestRated.title,
                        average_rating: highestRated.average_rating,
                    },
                    revenue_difference_usd: Number(
                        (
                            highestRevenue.monthly_revenue_usd - lowestRevenue.monthly_revenue_usd
                        ).toFixed(2),
                    ),
                    downloads_difference:
                        highestDownloads.monthly_downloads - lowestDownloads.monthly_downloads,
                    rating_difference: Number(
                        (highestRated.average_rating - lowestRated.average_rating).toFixed(2),
                    ),
                },
            });
        },
        {
            name: 'compare_games',
            description:
                'Compare 2 to 5 games side by side by title, returning their full records and computed revenue, downloads, and rating comparisons.',
            schema: z.object({
                titles: z
                    .array(z.string().trim().min(1))
                    .min(2, 'Provide at least 2 game titles to compare.')
                    .max(5, 'Provide at most 5 game titles to compare.')
                    .describe('List of 2 to 5 game titles to look up and compare.'),
            }),
        },
    );

    const addOrUpdateGameTool = tool(
        async (input) => {
            if (input.action === 'add') {
                const parsed = CreateGameSchema.safeParse({
                    title: input.title,
                    developer: input.developer,
                    genre: input.genre,
                    description: input.description ?? '',
                    monthly_revenue_usd: input.monthly_revenue_usd,
                    monthly_downloads: input.monthly_downloads,
                    average_rating: input.average_rating,
                });

                if (!parsed.success) {
                    return formatToolResult({
                        status: 'error',
                        message: 'Invalid game fields for creation.',
                        issues: parsed.error.flatten().fieldErrors,
                    });
                }

                const created = createGame(parsed.data, database);
                return formatToolResult({
                    status: 'created',
                    game: created,
                });
            }

            let target: Game | null = null;
            if (typeof input.id === 'number') {
                target = getGameById(input.id, database);
            } else if (input.title) {
                const matches = findGamesByTitle(input.title, database);
                target = matches[0] ?? null;
            }

            if (!target) {
                return formatToolResult({
                    status: 'error',
                    message: 'Game not found for update. Provide a valid id or existing title.',
                });
            }

            const updatePayload: Record<string, unknown> = {};
            if (input.id !== undefined && input.title !== undefined) {
                updatePayload.title = input.title;
            }
            if (input.developer !== undefined) {
                updatePayload.developer = input.developer;
            }
            if (input.genre !== undefined) {
                updatePayload.genre = input.genre;
            }
            if (input.description !== undefined) {
                updatePayload.description = input.description;
            }
            if (input.monthly_revenue_usd !== undefined) {
                updatePayload.monthly_revenue_usd = input.monthly_revenue_usd;
            }
            if (input.monthly_downloads !== undefined) {
                updatePayload.monthly_downloads = input.monthly_downloads;
            }
            if (input.average_rating !== undefined) {
                updatePayload.average_rating = input.average_rating;
            }

            const parsedUpdate = UpdateGameSchema.safeParse(updatePayload);
            if (!parsedUpdate.success) {
                return formatToolResult({
                    status: 'error',
                    message: 'Invalid update payload.',
                    issues: parsedUpdate.error.flatten().fieldErrors,
                });
            }

            const updated = updateGame(target.id, parsedUpdate.data, database);
            return formatToolResult({
                status: 'updated',
                game: updated,
            });
        },
        {
            name: 'add_or_update_game',
            description:
                "Add a new game to the catalog or update an existing game's metrics. Only call this when the user explicitly asks to add or update a game.",
            schema: z.object({
                action: z
                    .enum(['add', 'update'])
                    .describe("Whether to 'add' a new game or 'update' an existing one."),
                id: z.number().int().min(1).optional().describe('Game ID when updating by ID.'),
                title: z
                    .string()
                    .trim()
                    .min(1)
                    .max(120)
                    .optional()
                    .describe(
                        "Game title (required for 'add', or used to look up the game for 'update').",
                    ),
                developer: z.string().trim().min(1).max(120).optional(),
                genre: z.string().trim().min(1).max(60).optional(),
                description: z.string().trim().max(1000).optional(),
                monthly_revenue_usd: z.number().finite().min(0).optional(),
                monthly_downloads: z.number().int().min(0).optional(),
                average_rating: z.number().finite().min(0).max(5).optional(),
            }),
        },
    );

    return [
        searchGamesTool,
        countGamesTool,
        getCatalogStatsTool,
        compareGamesTool,
        addOrUpdateGameTool,
    ];
}
