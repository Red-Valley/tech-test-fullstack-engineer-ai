import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET as getOne, PUT } from './[id]/route';
import { GET, POST } from './route';

const DB_ERROR = 'SqliteError: no such table: games';

vi.mock('@/lib/games', () => {
  const fail = () => {
    throw new Error('SqliteError: no such table: games');
  };
  return { listGames: fail, createGame: fail, getGame: fail, updateGame: fail, deleteGame: fail };
});

const url = 'http://test/api/games';
const ctx = { params: Promise.resolve({ id: '1' }) };
const validGame = { title: 'T', developer: 'D', genre: 'G', monthly_revenue_usd: 1, monthly_downloads: 1, average_rating: 1 };

describe('when the repository throws', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['GET /api/games', () => GET(new Request(url))],
    ['POST /api/games', () => POST(new Request(url, { method: 'POST', body: JSON.stringify(validGame) }))],
    ['GET /api/games/1', () => getOne(new Request(`${url}/1`), ctx)],
    ['PUT /api/games/1', () => PUT(new Request(`${url}/1`, { method: 'PUT', body: '{"title":"x"}' }), ctx)],
    ['DELETE /api/games/1', () => DELETE(new Request(`${url}/1`, { method: 'DELETE' }), ctx)],
  ])('%s answers the INTERNAL envelope and logs the cause', async (_route, call) => {
    const res = await call();

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
    expect(body).not.toContain('Sqlite');
    expect(console.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ message: DB_ERROR }));
  });
});
