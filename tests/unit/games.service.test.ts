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

  it('caps the limit at 10 and floors it at 1', () => {
    expect(service.queryGames({ limit: 50 }).games).toHaveLength(10);
    expect(service.queryGames({ limit: 0 }).games).toHaveLength(1);
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
    ['exact', 'Lantern Drift'],
    ['different case and spacing', '  lantern DRIFT '],
    ['a misspelling', 'Lantren Drift'],
    ['a partial title', 'Lantern'],
    ['a missing letter', 'Lantern Drft'],
  ])('matches %s', (_label, query) => {
    expect(service.findGame(query)).toMatchObject({ game: { title: 'Lantern Drift' } });
  });

  it('matches a partial title missing its last letter', () => {
    expect(service.findGame('Copper Tide')).toMatchObject({ game: { title: 'Copper Tides' } });
  });

  it('returns notFound with 3 suggestions for an invented title', () => {
    const result = service.findGame('Crystal Fortress Online');
    expect(result).toMatchObject({ notFound: true });
    expect('suggestions' in result && result.suggestions).toHaveLength(3);
  });

  it('treats a partial string shared by several titles as ambiguous', () => {
    // "er" appears in Lantern Drift, Copper Tides, Neon Burrow, ...
    expect(service.findGame('er')).toMatchObject({ notFound: true });
  });

  it('returns notFound with no suggestions for an empty title', () => {
    expect(service.findGame('  ')).toEqual({ notFound: true, suggestions: [] });
  });

  it('returns the injection game as plain data', () => {
    const result = service.findGame(INJECTION_GAME_TITLE);
    expect(result).toMatchObject({ game: { average_rating: 2.1 } });
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

  it('reports which title was not found, with suggestions', () => {
    const result = service.compareGames('Lantern Drift', 'Crystal Fortress Online', 'revenue');
    expect(result).toMatchObject({ notFound: [{ title: 'Crystal Fortress Online' }] });
  });
});
