import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame, deleteGame, getGames } from '@/client/api/games.api';
import { ApiError, request } from '@/client/api/http-client';

const respond = (status: number, body?: unknown) =>
  vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('request', () => {
  it('returns the parsed JSON body', async () => {
    vi.stubGlobal('fetch', respond(200, [{ id: 1 }]));
    expect(await request('/x')).toEqual([{ id: 1 }]);
  });

  it('returns undefined for 204', async () => {
    vi.stubGlobal('fetch', respond(204));
    expect(await deleteGame(3)).toBeUndefined();
  });

  it('throws ApiError with status, message and field errors from the API', async () => {
    vi.stubGlobal(
      'fetch',
      respond(400, { error: 'Invalid request', fieldErrors: { title: ['x'] } }),
    );
    await expect(request('/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Invalid request',
      fieldErrors: { title: ['x'] },
    });
  });

  it('throws a generic ApiError when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })));
    await expect(request('/x')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed (502)',
    });
  });

  it('throws ApiError when a 2xx response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })));
    await expect(request('/x')).rejects.toMatchObject({ status: 200 });
  });

  it('keeps caller headers given as a Headers instance and adds the JSON content type', async () => {
    const fetchMock = respond(200, {});
    vi.stubGlobal('fetch', fetchMock);
    await request('/x', { headers: new Headers({ 'X-Test': '1' }) });
    const sent = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(sent.get('X-Test')).toBe('1');
    expect(sent.get('Content-Type')).toBe('application/json');
  });

  it('throws ApiError with status 0 when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await request('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0 });
  });
});

describe('games.api', () => {
  it('builds the query string and skips empty values', async () => {
    const fetchMock = respond(200, []);
    vi.stubGlobal('fetch', fetchMock);
    await getGames({ genre: 'Roguelike', q: '', sortBy: 'revenue', minRating: undefined });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/games?genre=Roguelike&sortBy=revenue',
      expect.anything(),
    );
  });

  it('POSTs the input as JSON', async () => {
    const fetchMock = respond(201, { id: 1 });
    vi.stubGlobal('fetch', fetchMock);
    const input = {
      title: 'A',
      developer: 'B',
      genre: 'Puzzle' as const,
      monthly_revenue_usd: 1,
      monthly_downloads: 1,
      average_rating: 1,
    };
    await createGame(input);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/games',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    );
  });
});
