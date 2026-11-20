import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '@/server/db/client';
import { NotFoundError } from '@/server/http/errors';
import { createGamesRepository } from '@/server/repositories/games.repository';
import { createGamesService, type GamesService } from '@/server/services/games.service';
import { GAMES_FIXTURE, INJECTION_GAME_TITLE } from '../fixtures/games.fixture';

// Expected values are worked out by hand from the fixture, not recomputed with the code under test.
let service: GamesService;

beforeEach(() => {
  const repo = createGamesRepository(openDatabase(':memory:'));
  repo.createMany(GAMES_FIXTURE);
  service = createGamesService(repo);
});

const titles = (games: { title: string }[]) => games.map((g) => g.title);

describe('getStats', () => {
  it('returns the dashboard KPIs for the fixture', () => {
    expect(service.getStats()).toEqual({
      totalGames: 18,
      totalRevenue: 1_665_000,
      totalDownloads: 455_500,
      averageRating: 3.82,
      ratedAbove4: 9,
    });
  });

  it('returns zeros for an empty catalog', () => {
    const empty = createGamesService(createGamesRepository(openDatabase(':memory:')));
    expect(empty.getStats()).toEqual({
      totalGames: 0,
      totalRevenue: 0,
      totalDownloads: 0,
      averageRating: 0,
      ratedAbove4: 0,
    });
  });
});

describe('CRUD errors', () => {
  it('throws NotFoundError for unknown ids', () => {
    expect(() => service.getGame(999)).toThrow(NotFoundError);
    expect(() => service.updateGame(999, GAMES_FIXTURE[0])).toThrow(NotFoundError);
    expect(() => service.deleteGame(999)).toThrow(NotFoundError);
  });
});

describe('queryGames', () => {
  it('defaults to top 5 by revenue and reports the total before the limit', () => {
    const result = service.queryGames();
    expect(titles(result.games)).toEqual([
      'Lantern Drift',
      'Iron Psalm',
      'Glimmerdeep',
      'Copper Tides',
      'Sunken Choir',
    ]);
    expect(result.total).toBe(18);
  });

  it('returns the top 3 by downloads', () => {
    const { games } = service.queryGames({ sortBy: 'downloads', limit: 3 });
    expect(titles(games)).toEqual(['Lantern Drift', 'Kitebound', 'Ashfall Run']);
  });

  it('caps the limit at 10, floors it at 1, and falls back to 5 for NaN', () => {
    expect(service.queryGames({ limit: 50 }).games).toHaveLength(10);
    expect(service.queryGames({ limit: 0 }).games).toHaveLength(1);
    expect(service.queryGames({ limit: NaN }).games).toHaveLength(5);
  });

  it('returns an empty list with total 0 when nothing matches', () => {
    expect(service.queryGames({ genre: 'Horror', minRating: 4.6 })).toEqual({
      games: [],
      total: 0,
    });
  });
});

describe('aggregate', () => {
  it('counts games rated above 4', () => {
    expect(service.aggregate('rating', 'count', { minRating: 4.1 })).toEqual({ value: 9, n: 9 });
  });

  it('averages the Roguelike rating', () => {
    expect(service.aggregate('rating', 'avg', { genre: 'Roguelike' })).toEqual({
      value: 3.8,
      n: 3,
    });
  });

  it('sums total revenue', () => {
    expect(service.aggregate('revenue', 'sum')).toEqual({ value: 1_665_000, n: 18 });
  });

  it('rounds rating averages to one decimal in code', () => {
    // All 18 ratings sum to 68.8; 68.8 / 18 = 3.822… → 3.8
    expect(service.aggregate('rating', 'avg')).toEqual({ value: 3.8, n: 18 });
  });

  it('finds min and max', () => {
    expect(service.aggregate('rating', 'min')).toEqual({ value: 2.1, n: 18 });
    expect(service.aggregate('downloads', 'max')).toEqual({ value: 64_000, n: 18 });
  });

  it('returns null (not 0) for an empty set, except count', () => {
    expect(service.aggregate('revenue', 'avg', { genre: 'Horror', minRating: 4.9 })).toEqual({
      value: null,
      n: 0,
    });
    expect(service.aggregate('revenue', 'count', { minRating: 4.9 })).toEqual({ value: 0, n: 0 });
  });
});

describe('aggregateByGenre', () => {
  it('ranks genres by average revenue: RPG first, ahead of Roguelike', () => {
    const { groups } = service.aggregateByGenre('revenue', 'avg');
    // RPG: 205,000 (1 game). Roguelike: (310,000 + 176,000 + 15,000) / 3 = 167,000.
    expect(groups.slice(0, 2)).toEqual([
      { genre: 'RPG', value: 205_000, n: 1 },
      { genre: 'Roguelike', value: 167_000, n: 3 },
    ]);
    expect(groups).toHaveLength(10);
  });

  it('ranks genres by total revenue: Roguelike first', () => {
    const [first] = service.aggregateByGenre('revenue', 'sum').groups;
    expect(first).toEqual({ genre: 'Roguelike', value: 501_000, n: 3 });
  });

  it('applies filters before grouping and lists only genres with matches', () => {
    // Rated above 4.5: Lantern Drift (Roguelike 4.7), Paper Moons (Puzzle 4.8), Ashfall Run (Action 4.6)
    const { groups } = service.aggregateByGenre('rating', 'count', { minRating: 4.6 });
    expect(groups.map((g) => g.genre).sort()).toEqual(['Action', 'Puzzle', 'Roguelike']);
  });

  it('returns no groups when nothing matches', () => {
    expect(service.aggregateByGenre('revenue', 'avg', { minRating: 4.9 })).toEqual({ groups: [] });
  });
});

describe('findGame', () => {
  it.each([
    ['exact', 'Lantern Drift', 'Lantern Drift', 'exact'],
    ['different case and spacing', '  lantern DRIFT ', 'Lantern Drift', 'exact'],
    ['a partial title', 'Lantern', 'Lantern Drift', 'partial'],
    ['a partial last word', 'Copper Tide', 'Copper Tides', 'partial'],
    ['a swapped-letter typo', 'Lantren Drift', 'Lantern Drift', 'fuzzy'],
    ['a missing letter', 'Lantern Drft', 'Lantern Drift', 'fuzzy'],
    ['one misspelled long word', 'Lantren', 'Lantern Drift', 'fuzzy'],
    ['a typo in a short word', 'Coper Tides', 'Copper Tides', 'fuzzy'],
  ])('matches %s', (_label, query, title, matchedBy) => {
    expect(service.findGame(query)).toMatchObject({ game: { title }, matchedBy });
  });

  // Plausible invented titles must NOT resolve to a real game: the model would report that
  // game's numbers as fact. Each of these matched confidently in the first version.
  it.each(['x', 'the', 'Irony', 'Rune', 'Hexmarch 2', 'Starlight', 'Crystal Fortress Online'])(
    'does not confidently match %s',
    (query) => {
      expect(service.findGame(query)).toMatchObject({ notFound: true });
    },
  );

  it('suggests the closest real titles when not found', () => {
    const result = service.findGame('Hexmarch 2');
    expect(result).toMatchObject({ notFound: true });
    expect('suggestions' in result && result.suggestions[0]).toBe('Hexmarch');
  });

  it('suggests the near title for a misspelled single word it cannot be sure about', () => {
    const result = service.findGame('Kitebond');
    // Either a confident match or a suggestion is fine here; what matters is that it's offered.
    const offered =
      'game' in result
        ? [result.game.title]
        : 'suggestions' in result
          ? result.suggestions
          : result.candidates;
    expect(offered).toContain('Kitebound');
  });

  it('treats a partial word that starts several titles as ambiguous and lists them', () => {
    // The fixture has no shared title words by design, so this needs its own catalog.
    const repo = createGamesRepository(openDatabase(':memory:'));
    repo.createMany([
      { ...GAMES_FIXTURE[0], title: 'Star Racer' },
      { ...GAMES_FIXTURE[1], title: 'Star Miner' },
    ]);
    expect(createGamesService(repo).findGame('Star')).toEqual({
      ambiguous: true,
      candidates: ['Star Miner', 'Star Racer'],
    });
  });

  it('returns notFound with no suggestions for an empty title', () => {
    expect(service.findGame('  ')).toEqual({ notFound: true, suggestions: [] });
  });

  it('returns the injection game as plain data', () => {
    expect(service.findGame(INJECTION_GAME_TITLE)).toMatchObject({ game: { average_rating: 2.1 } });
  });
});

describe('compareGames', () => {
  it('names the winner and computes the ratio in code', () => {
    const result = service.compareGames('Lantern Drift', 'Copper Tides', 'revenue');
    // 310,000 / 155,000 = 2
    expect(result).toMatchObject({ winner: 'Lantern Drift', ratio: 2 });
  });

  it('resolves misspelled titles before comparing', () => {
    const result = service.compareGames('Lantren Drift', 'Coper Tides', 'revenue');
    expect(result).toMatchObject({ winner: 'Lantern Drift', ratio: 2 });
  });

  it('works when the second game wins', () => {
    // 47,000 / 39,000 = 1.205… → 1.21
    const result = service.compareGames('Gutter Kings', 'Ashfall Run', 'downloads');
    expect(result).toMatchObject({ winner: 'Ashfall Run', ratio: 1.21 });
  });

  it('reports only the title that was not found, with suggestions', () => {
    const result = service.compareGames('Lantern Drift', 'Crystal Fortress Online', 'revenue');
    expect(result).toEqual({
      unresolved: [
        { title: 'Crystal Fortress Online', notFound: true, suggestions: expect.any(Array) },
      ],
    });
  });

  it('refuses to compare a game with itself', () => {
    expect(service.compareGames('Lantern', 'Lantern Drift', 'revenue')).toEqual({
      error: 'Both titles refer to the same game: Lantern Drift',
    });
  });
});
