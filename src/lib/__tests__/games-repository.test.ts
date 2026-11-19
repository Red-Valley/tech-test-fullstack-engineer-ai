import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SEED_GAMES, initializeSchema } from '@/lib/db';
import {
    createGame,
    deleteGame,
    findGamesByTitle,
    getCatalogStats,
    getGameById,
    listGames,
    updateGame,
} from '@/lib/games-repository';
import { CreateGameSchema, UpdateGameSchema } from '@/types/game';

describe('games-repository', () => {
    let db: DatabaseSync;

    beforeEach(() => {
        db = new DatabaseSync(':memory:');
        initializeSchema(db, true);
    });

    afterEach(() => {
        db.close();
    });

    describe('seeding', () => {
        it('seeds 28 indie games on initialization', () => {
            const games = listGames({}, db);
            expect(games).toHaveLength(28);
            expect(SEED_GAMES).toHaveLength(28);
        });

        it('does not duplicate seed rows when initializeSchema is called again', () => {
            initializeSchema(db, true);
            const games = listGames({}, db);
            expect(games).toHaveLength(28);
        });
    });

    describe('listGames', () => {
        it('orders by monthly_revenue_usd descending by default', () => {
            const games = listGames({}, db);
            expect(games[0]?.title).toBe('Hades II');
            for (let i = 1; i < games.length; i++) {
                expect(games[i - 1].monthly_revenue_usd).toBeGreaterThanOrEqual(
                    games[i].monthly_revenue_usd,
                );
            }
        });

        it('filters by search across title, developer, and genre', () => {
            const byTitle = listGames({ search: 'silksong' }, db);
            expect(byTitle).toHaveLength(1);
            expect(byTitle[0].title).toBe('Hollow Knight: Silksong');

            const byDeveloper = listGames({ search: 'supergiant' }, db);
            expect(byDeveloper).toHaveLength(1);
            expect(byDeveloper[0].title).toBe('Hades II');

            const byGenre = listGames({ search: 'deckbuilder' }, db);
            expect(byGenre).toHaveLength(3);
        });

        it("filters by genre case-insensitively and treats 'all' as unfiltered", () => {
            const platformers = listGames({ genre: 'platformer' }, db);
            expect(platformers).toHaveLength(3);
            expect(platformers.every((g) => g.genre === 'Platformer')).toBe(true);

            const allGames = listGames({ genre: 'all' }, db);
            expect(allGames).toHaveLength(28);
        });

        it('filters by minRating > 4 and maxRating', () => {
            const highRated = listGames({ minRating: 4.01 }, db);
            expect(highRated.length).toBe(26);
            expect(highRated.every((g) => g.average_rating > 4)).toBe(true);

            const midRated = listGames({ minRating: 4.0, maxRating: 4.5 }, db);
            expect(midRated.every((g) => g.average_rating >= 4.0 && g.average_rating <= 4.5)).toBe(
                true,
            );
            expect(midRated.map((g) => g.title)).toEqual(
                expect.arrayContaining(['Sea of Stars', 'Neon White', 'Loop Hero']),
            );
        });

        it('supports sortBy and sortOrder', () => {
            const byTitleAsc = listGames({ sortBy: 'title', sortOrder: 'asc' }, db);
            expect(byTitleAsc[0].title).toBe('Backpack Hero');
            expect(byTitleAsc[byTitleAsc.length - 1].title).toBe('Vampire Survivors');

            const byRatingDesc = listGames({ sortBy: 'average_rating', sortOrder: 'desc' }, db);
            expect(byRatingDesc[0].title).toBe('Stardew Valley');
            expect(byRatingDesc[0].average_rating).toBe(4.95);
        });

        it('applies limit', () => {
            const top3 = listGames({ limit: 3 }, db);
            expect(top3).toHaveLength(3);
            expect(top3.map((g) => g.title)).toEqual(['Hades II', 'Terraria', 'Balatro']);
        });
    });

    describe('getGameById & findGamesByTitle', () => {
        it('retrieves a game by id and returns null for missing id', () => {
            const game = getGameById(1, db);
            expect(game).not.toBeNull();
            expect(game?.id).toBe(1);
            expect(getGameById(9999, db)).toBeNull();
        });

        it('finds games by exact or partial title and prioritizes exact matches', () => {
            const exact = findGamesByTitle('Balatro', db);
            expect(exact).toHaveLength(1);
            expect(exact[0].title).toBe('Balatro');

            const partial = findGamesByTitle('hero', db);
            expect(partial).toHaveLength(2);
            expect(partial.map((g) => g.title)).toEqual(
                expect.arrayContaining(['Loop Hero', 'Backpack Hero']),
            );

            expect(findGamesByTitle('   ', db)).toEqual([]);
        });
    });

    describe('createGame, updateGame, deleteGame', () => {
        it('creates a new game and assigns an id', () => {
            const created = createGame(
                {
                    title: 'Animal Well',
                    developer: 'Shared Memory',
                    genre: 'Metroidvania',
                    monthly_revenue_usd: 310000,
                    monthly_downloads: 27500,
                    average_rating: 4.86,
                },
                db,
            );

            expect(created.id).toBe(29);
            expect(created.title).toBe('Animal Well');
            expect(created.description).toBe('');
            expect(created.created_at).toBeTruthy();
            expect(listGames({}, db)).toHaveLength(29);

            const withDesc = createGame(
                {
                    title: 'Nine Sols',
                    developer: 'RedCandleGames',
                    genre: 'Metroidvania',
                    description: 'Taopunk hand-drawn action platformer.',
                    monthly_revenue_usd: 220000,
                    monthly_downloads: 18000,
                    average_rating: 4.89,
                },
                db,
            );
            expect(withDesc.description).toBe('Taopunk hand-drawn action platformer.');
            expect(listGames({ search: 'taopunk' }, db)).toHaveLength(1);
        });

        it('updates an existing game partially and returns null when missing', () => {
            const updated = updateGame(
                1,
                { monthly_revenue_usd: 550000, average_rating: 4.97 },
                db,
            );
            expect(updated).not.toBeNull();
            expect(updated?.monthly_revenue_usd).toBe(550000);
            expect(updated?.average_rating).toBe(4.97);
            expect(updated?.title).toBe('Hollow Knight: Silksong');

            expect(updateGame(9999, { title: 'Ghost' }, db)).toBeNull();
        });

        it('deletes an existing game and returns false when missing', () => {
            expect(deleteGame(1, db)).toBe(true);
            expect(getGameById(1, db)).toBeNull();
            expect(listGames({}, db)).toHaveLength(27);

            expect(deleteGame(1, db)).toBe(false);
        });
    });

    describe('getCatalogStats', () => {
        it('computes catalog totals, top games, and genre breakdown', () => {
            const stats = getCatalogStats(db);
            const expectedRevenue = SEED_GAMES.reduce((sum, g) => sum + g.monthly_revenue_usd, 0);
            const expectedDownloads = SEED_GAMES.reduce((sum, g) => sum + g.monthly_downloads, 0);

            expect(stats.total_games).toBe(28);
            expect(stats.total_monthly_revenue_usd).toBe(expectedRevenue);
            expect(stats.total_monthly_downloads).toBe(expectedDownloads);
            expect(stats.average_rating).toBeGreaterThan(4.5);
            expect(stats.highest_revenue_game?.title).toBe('Hades II');
            expect(stats.highest_rated_game?.title).toBe('Stardew Valley');
            expect(stats.genres.length).toBeGreaterThan(0);

            const roguelikeDeckbuilder = stats.genres.find(
                (g) => g.genre === 'Roguelike Deckbuilder',
            );
            expect(roguelikeDeckbuilder?.count).toBe(3);
            expect(roguelikeDeckbuilder?.total_revenue_usd).toBe(985000);
        });

        it('handles an empty database gracefully', () => {
            const emptyDb = new DatabaseSync(':memory:');
            initializeSchema(emptyDb, false);
            try {
                const stats = getCatalogStats(emptyDb);
                expect(stats.total_games).toBe(0);
                expect(stats.total_monthly_revenue_usd).toBe(0);
                expect(stats.total_monthly_downloads).toBe(0);
                expect(stats.average_rating).toBe(0);
                expect(stats.highest_revenue_game).toBeNull();
                expect(stats.highest_rated_game).toBeNull();
                expect(stats.genres).toEqual([]);
            } finally {
                emptyDb.close();
            }
        });
    });

    describe('Zod schemas', () => {
        it('validates and coerces valid CreateGameSchema input', () => {
            const result = CreateGameSchema.safeParse({
                title: '  Nine Sols  ',
                developer: 'RedCandleGames',
                genre: 'Metroidvania',
                monthly_revenue_usd: '240000',
                monthly_downloads: '19000',
                average_rating: '4.8',
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.title).toBe('Nine Sols');
                expect(result.data.monthly_revenue_usd).toBe(240000);
                expect(result.data.monthly_downloads).toBe(19000);
                expect(result.data.average_rating).toBe(4.8);
            }
        });

        it('rejects invalid CreateGameSchema inputs', () => {
            expect(
                CreateGameSchema.safeParse({
                    title: '',
                    developer: 'Dev',
                    genre: 'Action',
                    monthly_revenue_usd: 100,
                    monthly_downloads: 10,
                    average_rating: 4.5,
                }).success,
            ).toBe(false);

            expect(
                CreateGameSchema.safeParse({
                    title: 'Bad Rating',
                    developer: 'Dev',
                    genre: 'Action',
                    monthly_revenue_usd: 100,
                    monthly_downloads: 10,
                    average_rating: 5.5,
                }).success,
            ).toBe(false);

            expect(
                CreateGameSchema.safeParse({
                    title: 'Negative Revenue',
                    developer: 'Dev',
                    genre: 'Action',
                    monthly_revenue_usd: -50,
                    monthly_downloads: 10,
                    average_rating: 4,
                }).success,
            ).toBe(false);

            expect(
                CreateGameSchema.safeParse({
                    title: 'Float Downloads',
                    developer: 'Dev',
                    genre: 'Action',
                    monthly_revenue_usd: 100,
                    monthly_downloads: 10.5,
                    average_rating: 4,
                }).success,
            ).toBe(false);
        });

        it('validates partial updates and rejects empty UpdateGameSchema objects', () => {
            expect(UpdateGameSchema.safeParse({}).success).toBe(false);
            expect(UpdateGameSchema.safeParse({ average_rating: 4.9 }).success).toBe(true);
            expect(UpdateGameSchema.safeParse({ average_rating: -0.1 }).success).toBe(false);
        });
    });
});
