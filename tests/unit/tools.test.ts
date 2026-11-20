import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import { openDatabase } from '@/server/db/client';
import { createGamesRepository } from '@/server/repositories/games.repository';
import { createTools, type ChatTools } from '@/server/ai/tools';
import { createGamesService, type GamesService } from '@/server/services/games.service';
import { GAMES_FIXTURE, INJECTION_GAME_TITLE } from '../fixtures/games.fixture';

// Level 1 (ARCHITECTURE.md §7.1): these prove the data the model receives is right.
// Expected values come from the fixture by hand, not from the code under test.

let tools: ChatTools;
let service: GamesService;

beforeEach(() => {
  const repo = createGamesRepository(openDatabase(':memory:'));
  repo.createMany(GAMES_FIXTURE);
  service = createGamesService(repo);
  tools = createTools(service);
});

afterEach(() => vi.restoreAllMocks());

/** Validates the input with the tool's own schema (as the SDK does, defaults included), then runs it. */
async function call<K extends keyof ChatTools>(name: K, input: unknown): Promise<unknown> {
  const t = tools[name];
  if (!t.execute) throw new Error(`${name} has no execute function`);
  const parsed = (t.inputSchema as z.ZodType).parse(input);
  // `parsed` matches this tool's schema; the cast only bridges the per-tool union of input types.
  return t.execute(parsed as never, { toolCallId: 'test', messages: [], context: {} });
}

const inputIsValid = (name: keyof ChatTools, input: unknown) =>
  (tools[name].inputSchema as z.ZodType).safeParse(input).success;

const titles = (result: unknown) =>
  (result as { games: { title: string }[] }).games.map((g) => g.title);

describe('query_games', () => {
  it('top revenue last month is Lantern Drift', async () => {
    const result = await call('query_games', { limit: 1 });
    expect(titles(result)).toEqual(['Lantern Drift']);
    expect(result).toMatchObject({ total: 18 });
  });

  it('top 3 by downloads', async () => {
    expect(titles(await call('query_games', { sortBy: 'downloads', limit: 3 }))).toEqual([
      'Lantern Drift',
      'Kitebound',
      'Ashfall Run',
    ]);
  });

  it('"above 4" as minRating 4.1 finds the 9 games and reports total before the limit', async () => {
    const result = await call('query_games', { minRating: 4.1 });
    expect(result).toMatchObject({ total: 9 });
    expect(titles(result)).toHaveLength(5);
  });

  it('returns an empty list (not an error) when nothing matches', async () => {
    expect(await call('query_games', { genre: 'Horror', minRating: 4.6 })).toEqual({
      games: [],
      total: 0,
    });
  });

  it('rejects a limit above 10 and a sort field outside §6.1', () => {
    expect(inputIsValid('query_games', { limit: 11 })).toBe(false);
    expect(inputIsValid('query_games', { limit: 10 })).toBe(true);
    expect(inputIsValid('query_games', { sortBy: 'genre' })).toBe(false);
  });

  it('rejects a genre that is not in the list', () => {
    expect(inputIsValid('query_games', { genre: 'Sports' })).toBe(false);
  });
});

describe('aggregate_games', () => {
  it('counts games rated above 4', async () => {
    expect(
      await call('aggregate_games', { metric: 'rating', operation: 'count', minRating: 4.1 }),
    ).toEqual({ value: 9, n: 9 });
  });

  it('averages the Roguelike rating', async () => {
    expect(
      await call('aggregate_games', { metric: 'rating', operation: 'avg', genre: 'Roguelike' }),
    ).toEqual({ value: 3.8, n: 3 });
  });

  it('totals last month revenue', async () => {
    expect(await call('aggregate_games', { metric: 'revenue', operation: 'sum' })).toEqual({
      value: 1_665_000,
      n: 18,
    });
  });

  it('answers "which genre has the highest average revenue" in one call: RPG first', async () => {
    const result = (await call('aggregate_games', {
      metric: 'revenue',
      operation: 'avg',
      groupBy: 'genre',
    })) as { groups: { genre: string; value: number }[] };
    expect(result.groups[0]).toEqual({ genre: 'RPG', value: 205_000, n: 1 });
    expect(result.groups[1].genre).toBe('Roguelike');
  });

  it('returns value null for an empty set', async () => {
    expect(
      await call('aggregate_games', { metric: 'revenue', operation: 'avg', minRating: 4.9 }),
    ).toEqual({ value: null, n: 0 });
  });
});

describe('find_game', () => {
  it('finds a misspelled title and says it was a fuzzy match', async () => {
    expect(await call('find_game', { title: 'Lantren Drift' })).toMatchObject({
      game: { title: 'Lantern Drift' },
      matchedBy: 'fuzzy',
    });
  });

  it('returns notFound with suggestions for an invented title', async () => {
    const result = await call('find_game', { title: 'Crystal Fortress Online' });
    expect(result).toMatchObject({ notFound: true });
    expect((result as { suggestions: string[] }).suggestions).toHaveLength(3);
  });

  it("returns the injection game's real data, untouched", async () => {
    expect(await call('find_game', { title: INJECTION_GAME_TITLE })).toMatchObject({
      game: { average_rating: 2.1, developer: expect.stringMatching(/ignore previous/i) },
    });
  });

  it('rejects an empty title', () => {
    expect(inputIsValid('find_game', { title: '  ' })).toBe(false);
  });
});

describe('compare_games', () => {
  it('names the winner and the ratio, computed in code', async () => {
    expect(
      await call('compare_games', {
        titleA: 'Lantern Drift',
        titleB: 'Copper Tides',
        metric: 'revenue',
      }),
    ).toMatchObject({ winner: 'Lantern Drift', ratio: 2 });
  });

  it('works with misspelled titles', async () => {
    expect(
      await call('compare_games', {
        titleA: 'Lantren Drift',
        titleB: 'Coper Tides',
        metric: 'revenue',
      }),
    ).toMatchObject({ winner: 'Lantern Drift', ratio: 2 });
  });
});

describe('every tool', () => {
  it('returns a structured { error } instead of throwing when the service fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(service, 'queryGames').mockImplementation(() => {
      throw new Error('SQLITE_BUSY');
    });
    const result = await call('query_games', {});
    expect(result).toEqual({ error: expect.stringContaining('query_games') });
    expect(JSON.stringify(result)).not.toContain('SQLITE_BUSY');
  });

  it('never returns more than 10 games, whatever the input', async () => {
    const countGames = (value: unknown): number => {
      if (Array.isArray(value)) return value.reduce((n: number, v) => n + countGames(v), 0);
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const own = 'title' in obj && 'average_rating' in obj ? 1 : 0;
        return own + Object.values(obj).reduce((n: number, v) => n + countGames(v), 0);
      }
      return 0;
    };
    const results = await Promise.all([
      call('query_games', { limit: 10 }),
      call('aggregate_games', { metric: 'revenue', operation: 'sum', groupBy: 'genre' }),
      call('find_game', { title: 'a' }),
      call('compare_games', { titleA: 'Lantern Drift', titleB: 'Kitebound', metric: 'rating' }),
    ]);
    for (const result of results) expect(countGames(result)).toBeLessThanOrEqual(10);
  });
});
