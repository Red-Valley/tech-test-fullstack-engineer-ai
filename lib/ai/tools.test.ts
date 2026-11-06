import type { Tool } from 'ai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as games from '@/lib/games';
import type { z } from 'zod';
import type { Game } from '@/lib/types';
import { catalogStatsInputSchema, chatTools, compareGamesInputSchema, searchGamesInputSchema } from './tools';

vi.mock('@/lib/games', () => ({
  listGames: vi.fn(),
  getStats: vi.fn(),
  findGamesByTitles: vi.fn(),
  listGenres: vi.fn(),
}));

/** Runs a tool the way the SDK does, once its input has passed the schema. */
async function run<INPUT, OUTPUT>(definition: Tool<INPUT, OUTPUT>, input: INPUT): Promise<OUTPUT> {
  const output = await definition.execute?.(input, { toolCallId: 'call-1', messages: [], context: {} });
  return output as OUTPUT;
}

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    title: 'Starfall Tactics',
    developer: 'Nimbus Forge',
    genre: 'Strategy',
    monthly_revenue_usd: 100,
    monthly_downloads: 10,
    average_rating: 4.5,
    created_at: '2026-11-05T21:00:00.000Z',
    updated_at: '2026-11-05T21:00:00.000Z',
    ...overrides,
  };
}

describe('searchGames', () => {
  const search = (input: z.input<typeof searchGamesInputSchema>) => run(chatTools.searchGames, input);

  it('returns only the needed fields and the count', async () => {
    vi.mocked(games.listGames).mockReturnValue([makeGame()]);

    expect(await search({})).toEqual({
      results: [
        {
          title: 'Starfall Tactics',
          developer: 'Nimbus Forge',
          genre: 'Strategy',
          monthly_revenue_usd: 100,
          monthly_downloads: 10,
          average_rating: 4.5,
        },
      ],
      count: 1,
    });
  });

  it('applies a limit of 10 by default', async () => {
    vi.mocked(games.listGames).mockReturnValue([]);
    await search({ genre: 'Horror' });
    expect(games.listGames).toHaveBeenCalledWith({ genre: 'Horror', limit: 10 });
  });

  it('forwards filters, sorting and an explicit limit', async () => {
    vi.mocked(games.listGames).mockReturnValue([]);
    const input = { minRating: 4, sortBy: 'monthly_revenue_usd', order: 'desc', limit: 1 } as const;
    await search(input);
    expect(games.listGames).toHaveBeenCalledWith(input);
  });

  it('says so explicitly when nothing matches', async () => {
    vi.mocked(games.listGames).mockReturnValue([]);
    expect(await search({ search: 'nope' })).toEqual({ results: [], note: 'No games matched' });
  });

  it.each([
    [25, true],
    [26, false],
    [0, false],
    [1.5, false],
  ])('accepts a limit of %s: %s', (limit, valid) => {
    expect(searchGamesInputSchema.safeParse({ limit }).success).toBe(valid);
  });

  it('rejects a sort field outside the whitelist', () => {
    expect(searchGamesInputSchema.safeParse({ sortBy: 'id; DROP TABLE games' }).success).toBe(false);
  });

  it('rejects numbers sent as strings or null', () => {
    expect(searchGamesInputSchema.safeParse({ minRating: '4' }).success).toBe(false);
    expect(searchGamesInputSchema.safeParse({ minRating: null }).success).toBe(false);
  });

  it('describes every input field for the model', () => {
    for (const field of Object.values(searchGamesInputSchema.shape)) {
      expect(field.description).toEqual(expect.any(String));
    }
  });
});

describe('getCatalogStats', () => {
  const stats = { count: 2, total_revenue_usd: 300, avg_revenue_usd: 150, total_downloads: 20, avg_rating: 4.5 };

  it('returns the stats for the given filters', async () => {
    vi.mocked(games.getStats).mockReturnValue(stats);
    const output = await run(chatTools.getCatalogStats, { minRating: 4 });
    expect(output).toEqual({ stats });
    expect(games.getStats).toHaveBeenCalledWith({ minRating: 4 });
  });

  it('reports a count of 0 when nothing matches', async () => {
    const empty = { count: 0, total_revenue_usd: 0, avg_revenue_usd: 0, total_downloads: 0, avg_rating: 0 };
    vi.mocked(games.getStats).mockReturnValue(empty);
    expect(await run(chatTools.getCatalogStats, { genre: 'Nope' })).toEqual({ stats: empty });
  });

  it('strips sort options from its input', () => {
    const parsed = catalogStatsInputSchema.parse({ genre: 'Horror', sortBy: 'title', limit: 1 });
    expect(parsed).toEqual({ genre: 'Horror' });
  });
});

describe('compareGames', () => {
  const compare = (titles: string[]) => run(chatTools.compareGames, { titles });

  it('returns the matched games and an empty notFound', async () => {
    vi.mocked(games.findGamesByTitles).mockReturnValue([
      makeGame({ title: 'Starfall Tactics' }),
      makeGame({ title: 'Hollow Pines' }),
    ]);
    const output = await compare(['Starfall Tactics', 'Hollow Pines']);
    expect(output.games.map((game) => game.title)).toEqual(['Starfall Tactics', 'Hollow Pines']);
    expect(output.notFound).toEqual([]);
    expect(output.games[0]).not.toHaveProperty('id');
  });

  it('matches case-insensitively and accepts partial titles', async () => {
    vi.mocked(games.findGamesByTitles).mockReturnValue([
      makeGame({ title: 'Starfall Tactics' }),
      makeGame({ title: 'Hollow Pines' }),
    ]);
    expect((await compare(['STARFALL', 'hollow pines'])).notFound).toEqual([]);
  });

  it('lists each title that did not match, as the model wrote it', async () => {
    vi.mocked(games.findGamesByTitles).mockReturnValue([makeGame({ title: 'Starfall Tactics' })]);
    expect((await compare(['Starfall', 'Ghost Game'])).notFound).toEqual(['Ghost Game']);
  });

  it('does not count a title as found because a game is a substring of it', async () => {
    vi.mocked(games.findGamesByTitles).mockReturnValue([makeGame({ title: 'Starfall' })]);
    expect((await compare(['Starfall', 'Starfall 2'])).notFound).toEqual(['Starfall 2']);
  });

  it('returns every title in notFound when nothing matches', async () => {
    vi.mocked(games.findGamesByTitles).mockReturnValue([]);
    expect(await compare(['A', 'B'])).toEqual({ games: [], notFound: ['A', 'B'] });
  });

  it.each([
    [['A'], false],
    [['A', 'B'], true],
    [['A', 'B', 'C', 'D', 'E'], true],
    [['A', 'B', 'C', 'D', 'E', 'F'], false],
    [['A', '   '], false],
  ])('validates the number and content of titles: %j', (titles, valid) => {
    expect(compareGamesInputSchema.safeParse({ titles }).success).toBe(valid);
  });
});

describe('listGenres', () => {
  it('returns the genres of the catalog', async () => {
    vi.mocked(games.listGenres).mockReturnValue(['Horror', 'Strategy']);
    expect(await run(chatTools.listGenres, {})).toEqual({ genres: ['Horror', 'Strategy'] });
  });
});

describe('repository failures', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the cause and hides it from the model', async () => {
    const cause = new Error('SQLITE_ERROR: no such table: games');
    vi.mocked(games.listGenres).mockImplementation(() => {
      throw cause;
    });

    await expect(run(chatTools.listGenres, {})).rejects.toThrow('The catalog could not be queried');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('listGenres'), cause);
  });
});

describe('tool set', () => {
  it('offers only the four read-only tools', () => {
    expect(Object.keys(chatTools).sort()).toEqual(['compareGames', 'getCatalogStats', 'listGenres', 'searchGames']);
  });
});
