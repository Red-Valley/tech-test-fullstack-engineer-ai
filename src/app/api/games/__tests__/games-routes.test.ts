import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '@/lib/db';

let testDb: DatabaseSync;

vi.mock('@/lib/db', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/db')>();
    return {
        ...actual,
        getDb: () => testDb,
    };
});

import { GET as gamesGet, POST as gamesPost } from '@/app/api/games/route';
import {
    DELETE as gameDelete,
    GET as gameGet,
    PATCH as gamePatch,
} from '@/app/api/games/[id]/route';

describe('/api/games routes', () => {
    beforeEach(() => {
        testDb = new DatabaseSync(':memory:');
        initializeSchema(testDb, true);
    });

    afterEach(() => {
        testDb.close();
    });

    it('GET /api/games returns seeded games and filtered results', async () => {
        const allRes = await gamesGet(new Request('http://localhost:3000/api/games'));
        expect(allRes.status).toBe(200);
        const allBody = (await allRes.json()) as {
            games: Array<{ title: string }>;
            stats: { total_games: number };
        };
        expect(allBody.games).toHaveLength(28);
        expect(allBody.stats.total_games).toBe(28);

        const filteredRes = await gamesGet(
            new Request('http://localhost:3000/api/games?search=balatro&minRating=4.5'),
        );
        const filteredBody = (await filteredRes.json()) as {
            games: Array<{ title: string }>;
        };
        expect(filteredBody.games).toHaveLength(1);
        expect(filteredBody.games[0].title).toBe('Balatro');
    });

    it('POST /api/games creates a game with description and rejects invalid payloads', async () => {
        const badRes = await gamesPost(
            new Request('http://localhost:3000/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: '' }),
            }),
        );
        expect(badRes.status).toBe(400);

        const createRes = await gamesPost(
            new Request('http://localhost:3000/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'Nine Sols',
                    developer: 'RedCandleGames',
                    genre: 'Metroidvania',
                    description: 'Taopunk hand-drawn action platformer.',
                    monthly_revenue_usd: 195000,
                    monthly_downloads: 21000,
                    average_rating: 4.88,
                }),
            }),
        );
        expect(createRes.status).toBe(201);
        const { game } = (await createRes.json()) as {
            game: { id: number; title: string; description: string };
        };
        expect(game.title).toBe('Nine Sols');
        expect(game.description).toBe('Taopunk hand-drawn action platformer.');
    });

    it('GET, PATCH, and DELETE /api/games/[id] handle valid and invalid ids', async () => {
        const invalidIdRes = await gameGet(new Request('http://localhost:3000/api/games/abc'), {
            params: Promise.resolve({ id: 'abc' }),
        });
        expect(invalidIdRes.status).toBe(400);

        const missingRes = await gameGet(new Request('http://localhost:3000/api/games/9999'), {
            params: Promise.resolve({ id: '9999' }),
        });
        expect(missingRes.status).toBe(404);

        const patchRes = await gamePatch(
            new Request('http://localhost:3000/api/games/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ average_rating: 4.99 }),
            }),
            { params: Promise.resolve({ id: '1' }) },
        );
        expect(patchRes.status).toBe(200);
        const patched = (await patchRes.json()) as { game: { average_rating: number } };
        expect(patched.game.average_rating).toBe(4.99);

        const delRes = await gameDelete(new Request('http://localhost:3000/api/games/1'), {
            params: Promise.resolve({ id: '1' }),
        });
        expect(delRes.status).toBe(200);
        expect(await delRes.json()).toEqual({ deleted: true, id: 1 });
    });
});
