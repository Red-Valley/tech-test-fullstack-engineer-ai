import { DatabaseSync } from 'node:sqlite';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '@/lib/db';
import { createCatalogTools } from '@/lib/ai/tools';

describe('createCatalogTools', () => {
    let db: DatabaseSync;
    let toolsByName: Record<string, StructuredToolInterface>;

    beforeEach(() => {
        db = new DatabaseSync(':memory:');
        initializeSchema(db, true);
        const tools = createCatalogTools(db);
        toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
    });

    afterEach(() => {
        db.close();
    });

    it('search_games filters by search query, genre, rating, and limit', async () => {
        const raw = await toolsByName.search_games.invoke({
            genre: 'Roguelike',
            minRating: 4.5,
            sortBy: 'monthly_revenue_usd',
            sortOrder: 'desc',
            limit: 5,
        });
        const parsed = JSON.parse(String(raw));

        expect(parsed.count).toBe(3);
        expect(parsed.games[0].title).toBe('Hades II');
    });

    it('count_games counts games with minRating: 4 and returns game summaries', async () => {
        const raw = await toolsByName.count_games.invoke({
            minRating: 4,
        });
        const parsed = JSON.parse(String(raw));

        // In SEED_GAMES, 26 of 28 games have average_rating >= 4
        // (Rollerdrome is 3.85, Backpack Hero is 3.92)
        expect(parsed.count).toBe(26);
        expect(parsed.games).toHaveLength(26);
        expect(parsed.games[0]).toHaveProperty('id');
        expect(parsed.games[0]).toHaveProperty('title');
        expect(parsed.games[0]).toHaveProperty('average_rating');
        expect(parsed.games[0]).toHaveProperty('genre');
        expect(parsed.games[0]).toHaveProperty('monthly_revenue_usd');
        for (const game of parsed.games) {
            expect(game.average_rating).toBeGreaterThanOrEqual(4);
        }
    });

    it('get_catalog_stats returns totals, top revenue game, and genre breakdown', async () => {
        const raw = await toolsByName.get_catalog_stats.invoke({});
        const parsed = JSON.parse(String(raw));

        expect(parsed.total_games).toBe(28);
        expect(parsed.highest_revenue_game.title).toBe('Hades II');
        expect(parsed.highest_revenue_game.monthly_revenue_usd).toBe(740000);
        expect(parsed.highest_rated_game.title).toBe('Stardew Valley');
        expect(Array.isArray(parsed.genres)).toBe(true);
        expect(parsed.genres.length).toBeGreaterThan(0);
    });

    it('compare_games compares Hades II and Balatro', async () => {
        const raw = await toolsByName.compare_games.invoke({
            titles: ['Hades II', 'Balatro'],
        });
        const parsed = JSON.parse(String(raw));

        expect(parsed.not_found).toEqual([]);
        expect(parsed.matched).toHaveLength(2);
        expect(parsed.matched.map((g: { title: string }) => g.title)).toEqual([
            'Hades II',
            'Balatro',
        ]);
        expect(parsed.comparison.highest_revenue.title).toBe('Hades II');
        expect(parsed.comparison.highest_downloads.title).toBe('Balatro');
        expect(parsed.comparison.highest_rated.title).toBe('Hades II');
        expect(parsed.comparison.revenue_difference_usd).toBe(740000 - 612000);
        expect(parsed.comparison.downloads_difference).toBe(51800 - 46500);
        expect(parsed.comparison.rating_difference).toBe(0.07);
    });

    it('add_or_update_game adds a new game and updates an existing game', async () => {
        const addRaw = await toolsByName.add_or_update_game.invoke({
            action: 'add',
            title: 'Animal Well',
            developer: 'Shared Memory',
            genre: 'Metroidvania',
            monthly_revenue_usd: 195000,
            monthly_downloads: 22000,
            average_rating: 4.86,
        });
        const added = JSON.parse(String(addRaw));
        expect(added.status).toBe('created');
        expect(added.game.title).toBe('Animal Well');

        const updateRaw = await toolsByName.add_or_update_game.invoke({
            action: 'update',
            title: 'Animal Well',
            monthly_revenue_usd: 210000,
            average_rating: 4.9,
        });
        const updated = JSON.parse(String(updateRaw));
        expect(updated.status).toBe('updated');
        expect(updated.game.monthly_revenue_usd).toBe(210000);
        expect(updated.game.average_rating).toBe(4.9);
    });
});
