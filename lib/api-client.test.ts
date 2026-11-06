import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame, deleteGame, updateGame } from './api-client';
import { makeGame, makeGameInput } from '@/test/game-factory';

const stubFetch = (response: Response | Error) => {
  const fetchMock = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => vi.unstubAllGlobals());

describe('api-client', () => {
  it('posts the input as JSON and returns the game', async () => {
    const game = makeGame();
    const fetchMock = stubFetch(Response.json(game, { status: 201 }));
    const input = makeGameInput();

    expect(await createGame(input)).toEqual({ ok: true, data: game });
    expect(fetchMock).toHaveBeenCalledWith('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });

  it('puts to the game path', async () => {
    const fetchMock = stubFetch(Response.json(makeGame()));
    await updateGame(7, { title: 'x' });
    expect(fetchMock).toHaveBeenCalledWith('/api/games/7', expect.objectContaining({ method: 'PUT' }));
  });

  it('handles the empty body of a 204', async () => {
    stubFetch(new Response(null, { status: 204 }));
    expect(await deleteGame(1)).toEqual({ ok: true, data: undefined });
  });

  it('returns the envelope of a failed request with its issues', async () => {
    const error = { code: 'VALIDATION_ERROR', message: 'Bad', issues: { title: ['Required'] } };
    stubFetch(Response.json({ error }, { status: 400 }));
    expect(await createGame(makeGameInput())).toEqual({ ok: false, status: 400, error });
  });

  it('does not throw when the network fails', async () => {
    stubFetch(new TypeError('Failed to fetch'));
    expect(await deleteGame(1)).toMatchObject({ ok: false, status: 0, error: { code: 'INTERNAL', message: expect.stringContaining('reach the server') } });
  });

  it.each([
    ['an HTML error page', new Response('<html>502</html>', { status: 502 })],
    ['JSON that is not the envelope', Response.json({ oops: true }, { status: 500 })],
    ['an unknown error code', Response.json({ error: { code: 'TEAPOT', message: 'x' } }, { status: 418 })],
  ])('falls back to INTERNAL for %s', async (_name, response) => {
    stubFetch(response);
    expect(await deleteGame(1)).toMatchObject({ ok: false, status: response.status, error: { code: 'INTERNAL' } });
  });

  it('reports a 2xx response without valid JSON as a failure', async () => {
    stubFetch(new Response('not json', { status: 200 }));
    expect(await updateGame(1, { title: 'x' })).toMatchObject({ ok: false, status: 200 });
  });
});
