import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '@/lib/db';
import { createGame, listGames } from '@/lib/games';
import { makeGameInput } from '@/test/game-factory';
import { dynamic, GET, POST, runtime } from './route';

const get = (query = '') => GET(new Request(`http://test/api/games${query}`));
const post = (body: string) => POST(new Request('http://test/api/games', { method: 'POST', body, headers: { 'content-type': 'application/json' } }));
const postGame = (body: unknown) => post(JSON.stringify(body));
const titles = async (res: Response) => ((await res.json()) as { title: string }[]).map((game) => game.title);

beforeEach(() => resetDb());

it('declares the node runtime and dynamic rendering', () => {
  expect(runtime).toBe('nodejs');
  expect(dynamic).toBe('force-dynamic');
});

describe('GET /api/games', () => {
  it('returns 200 with [] for an empty catalog', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('filters by genre and search', async () => {
    createGame(makeGameInput({ title: 'Red Puzzle', genre: 'Puzzle' }));
    createGame(makeGameInput({ title: 'Blue Puzzle', genre: 'Puzzle' }));
    createGame(makeGameInput({ title: 'Red Horror', genre: 'Horror' }));
    expect(await titles(await get('?genre=puzzle&search=red'))).toEqual(['Red Puzzle']);
  });

  it('sorts by sortBy and order', async () => {
    createGame(makeGameInput({ title: 'Low', monthly_revenue_usd: 1 }));
    createGame(makeGameInput({ title: 'High', monthly_revenue_usd: 9 }));
    expect(await titles(await get('?sortBy=monthly_revenue_usd&order=desc'))).toEqual(['High', 'Low']);
  });

  it('applies the numeric filters with their boundaries', async () => {
    createGame(makeGameInput({ title: 'Four', average_rating: 4, monthly_revenue_usd: 10 }));
    createGame(makeGameInput({ title: 'FourOne', average_rating: 4.1, monthly_revenue_usd: 20 }));
    expect(await titles(await get('?minRating=4'))).toEqual(['FourOne']);
    expect(await titles(await get('?maxRating=4'))).toEqual(['Four']);
    expect(await titles(await get('?minRevenue=20'))).toEqual(['FourOne']);
  });

  it('applies limit', async () => {
    createGame(makeGameInput({ title: 'A' }));
    createGame(makeGameInput({ title: 'B' }));
    expect(await titles(await get('?limit=1'))).toEqual(['A']);
  });

  it('treats empty params as absent, not as 0', async () => {
    createGame(makeGameInput({ title: 'Zero', average_rating: 0 }));
    const res = await get('?minRating=&maxRating=&minRevenue=&limit=&genre=&developer=&search=&sortBy=&order=');
    expect(res.status).toBe(200);
    expect(await titles(res)).toEqual(['Zero']);
  });

  it.each([
    ['minRating=abc', 'minRating'],
    ['minRating=6', 'minRating'],
    ['maxRating=-1', 'maxRating'],
    ['minRevenue=-5', 'minRevenue'],
    ['sortBy=created_at', 'sortBy'],
    ['sortBy=title;DROP TABLE games', 'sortBy'],
    ['order=sideways', 'order'],
    ['limit=0', 'limit'],
    ['limit=101', 'limit'],
    ['limit=1.5', 'limit'],
  ])('answers 400 for ?%s with an issue on the field', async (query, field) => {
    const res = await get(`?${query}`);
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.issues[field]).toEqual([expect.any(String)]);
  });

  it('ignores unknown params', async () => {
    expect((await get('?foo=bar')).status).toBe(200);
  });
});

describe('POST /api/games', () => {
  it('creates a game: 201, the Game and its Location', async () => {
    const res = await postGame(makeGameInput({ title: 'New', average_rating: 4.2 }));
    expect(res.status).toBe(201);
    const game = await res.json();
    expect(game).toMatchObject({ id: 1, title: 'New', average_rating: 4.2, created_at: expect.any(String) });
    expect(res.headers.get('location')).toBe('/api/games/1');
    expect(listGames()).toHaveLength(1);
  });

  it('trims strings and strips unknown keys', async () => {
    const res = await postGame({ ...makeGameInput({ title: '  Spaced  ' }), id: 99, hacker: true });
    const game = await res.json();
    expect(game.title).toBe('Spaced');
    expect(game.id).toBe(1);
    expect(game).not.toHaveProperty('hacker');
  });

  it.each([
    ['rating of 7', { average_rating: 7 }, 'average_rating'],
    ['negative revenue', { monthly_revenue_usd: -1 }, 'monthly_revenue_usd'],
    ['negative downloads', { monthly_downloads: -1 }, 'monthly_downloads'],
    ['fractional downloads', { monthly_downloads: 1.5 }, 'monthly_downloads'],
    ['numeric string', { monthly_revenue_usd: '100' }, 'monthly_revenue_usd'],
    ['null number', { average_rating: null }, 'average_rating'],
    ['blank title', { title: '   ' }, 'title'],
    ['title over 120 chars', { title: 'x'.repeat(121) }, 'title'],
  ])('rejects a %s with 400 and the detail per field', async (_name, overrides, field) => {
    const res = await postGame({ ...makeGameInput(), ...overrides });
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Request validation failed' });
    expect(error.issues[field]).toEqual([expect.any(String)]);
    expect(listGames()).toEqual([]);
  });

  it('reports every missing field', async () => {
    const res = await postGame({ title: '' });
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(Object.keys(error.issues).sort()).toEqual(
      ['average_rating', 'developer', 'genre', 'monthly_downloads', 'monthly_revenue_usd', 'title'].sort(),
    );
  });

  it.each(['{bad json', ''])('answers 400 INVALID_JSON for the body %j', async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_JSON');
  });

  it.each(['[]', '42', '"text"'])('answers 400 VALIDATION_ERROR for the non-object body %s', async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });
});
