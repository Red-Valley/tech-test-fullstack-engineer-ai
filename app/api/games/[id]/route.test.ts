import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '@/lib/db';
import { createGame, getGame } from '@/lib/games';
import { makeGameInput } from '@/test/game-factory';
import { DELETE, dynamic, GET, PUT, runtime } from './route';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const url = (id: string) => `http://test/api/games/${id}`;
const put = (id: string, body: string) => PUT(new Request(url(id), { method: 'PUT', body }), ctx(id));
const putJson = (id: string, body: unknown) => put(id, JSON.stringify(body));

beforeEach(() => resetDb());

it('declares the node runtime and dynamic rendering', () => {
  expect(runtime).toBe('nodejs');
  expect(dynamic).toBe('force-dynamic');
});

describe.each([
  ['GET', (id: string) => GET(new Request(url(id)), ctx(id))],
  ['PUT', (id: string) => putJson(id, { title: 'x' })],
  ['DELETE', (id: string) => DELETE(new Request(url(id), { method: 'DELETE' }), ctx(id))],
])('%s id handling', (_method, call) => {
  it.each(['abc', '0', '-1', '1.5', '1e2', '0x10', ' 1', '99999999999999999999'])('answers 400 INVALID_ID for %j', async (id) => {
    const res = await call(id);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_ID');
  });

  it('answers 404 NOT_FOUND for an unknown id', async () => {
    const res = await call('999');
    expect(res.status).toBe(404);
    expect((await res.json()).error).toEqual({ code: 'NOT_FOUND', message: 'Game 999 not found' });
  });
});

describe('GET /api/games/:id', () => {
  it('returns the game', async () => {
    const game = createGame(makeGameInput());
    const res = await GET(new Request(url('1')), ctx(String(game.id)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(game);
  });
});

describe('PUT /api/games/:id', () => {
  it('updates only the given fields', async () => {
    createGame(makeGameInput({ title: 'Keep', average_rating: 1 }));
    const res = await putJson('1', { average_rating: 4.9 });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 1, title: 'Keep', average_rating: 4.9 });
  });

  it('accepts 0 as a real value', async () => {
    createGame(makeGameInput({ monthly_revenue_usd: 50 }));
    expect(await (await putJson('1', { monthly_revenue_usd: 0 })).json()).toMatchObject({ monthly_revenue_usd: 0 });
  });

  it.each([
    ['rating of 7', { average_rating: 7 }, 'average_rating'],
    ['negative revenue', { monthly_revenue_usd: -1 }, 'monthly_revenue_usd'],
    ['null field', { title: null }, 'title'],
  ])('rejects a %s with 400 and leaves the game untouched', async (_name, body, field) => {
    const game = createGame(makeGameInput());
    const res = await putJson('1', body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.issues[field]).toEqual([expect.any(String)]);
    expect(getGame(game.id)).toEqual(game);
  });

  it.each([
    ['empty', {}],
    ['only unknown keys', { hacker: true }],
  ])('rejects an update that is %s', async (_name, body) => {
    createGame(makeGameInput());
    const res = await putJson('1', body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Provide at least one field to update' });
  });

  it('answers 400 INVALID_JSON for a malformed body', async () => {
    createGame(makeGameInput());
    const res = await put('1', '{bad');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_JSON');
  });

  it('prefers 400 over 404 when an unknown id gets an invalid body', async () => {
    const res = await putJson('999', { average_rating: 7 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/games/:id', () => {
  it('answers 204 with an empty body and removes the game', async () => {
    const game = createGame(makeGameInput());
    const res = await DELETE(new Request(url('1'), { method: 'DELETE' }), ctx(String(game.id)));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(getGame(game.id)).toBeNull();
  });

  it('answers 404 on the second delete', async () => {
    createGame(makeGameInput());
    await DELETE(new Request(url('1'), { method: 'DELETE' }), ctx('1'));
    expect((await DELETE(new Request(url('1'), { method: 'DELETE' }), ctx('1'))).status).toBe(404);
  });
});
