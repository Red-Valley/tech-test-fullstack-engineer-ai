import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '@/server/db/client';
import { ConflictError } from '@/server/http/errors';
import {
  createGamesRepository,
  type GamesRepository,
} from '@/server/repositories/games.repository';
import type { GameInputDto } from '@/shared/types/game.dto';

const game = (overrides: Partial<GameInputDto>): GameInputDto => ({
  title: 'Untitled',
  developer: 'Studio',
  genre: 'Puzzle',
  monthly_revenue_usd: 1000,
  monthly_downloads: 100,
  average_rating: 3.5,
  ...overrides,
});

const SAMPLE: GameInputDto[] = [
  game({
    title: 'Ember Road',
    genre: 'Roguelike',
    monthly_revenue_usd: 50000,
    average_rating: 4.6,
  }),
  game({
    title: 'Glass Orchard',
    genre: 'Puzzle',
    monthly_revenue_usd: 12000,
    average_rating: 3.8,
  }),
  game({
    title: 'Hollow Signal',
    genre: 'Roguelike',
    monthly_revenue_usd: 90000,
    average_rating: 4.1,
  }),
  game({
    title: 'Tiny Harbor',
    genre: 'Simulation',
    monthly_revenue_usd: 3000,
    average_rating: 2.9,
  }),
];

let repo: GamesRepository;

beforeEach(() => {
  repo = createGamesRepository(openDatabase(':memory:'));
  SAMPLE.forEach((g) => repo.create(g));
});

const titles = (games: { title: string }[]) => games.map((g) => g.title);

describe('list', () => {
  it('returns all games sorted by title by default', () => {
    expect(titles(repo.list())).toEqual([
      'Ember Road',
      'Glass Orchard',
      'Hollow Signal',
      'Tiny Harbor',
    ]);
  });

  it('filters by genre and sorts by revenue descending', () => {
    expect(titles(repo.list({ genre: 'Roguelike', sortBy: 'revenue', order: 'desc' }))).toEqual([
      'Hollow Signal',
      'Ember Road',
    ]);
  });

  it('applies inclusive rating bounds', () => {
    expect(titles(repo.list({ minRating: 3.8, maxRating: 4.1, sortBy: 'rating' }))).toEqual([
      'Glass Orchard',
      'Hollow Signal',
    ]);
  });

  it('searches titles case-insensitively', () => {
    expect(titles(repo.list({ q: 'oRcH' }))).toEqual(['Glass Orchard']);
  });

  it('treats LIKE wildcards in the search as literal characters', () => {
    expect(repo.list({ q: '%' })).toEqual([]);
    expect(repo.list({ q: '_' })).toEqual([]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(repo.list({ genre: 'Horror' })).toEqual([]);
  });
});

describe('create / findById', () => {
  it('returns the created game with its new id, in the DTO shape', () => {
    const created = repo.create(game({ title: 'New One', average_rating: 4.2 }));
    expect(created).toEqual({ id: 5, ...game({ title: 'New One', average_rating: 4.2 }) });
    expect(repo.findById(created.id)).toEqual(created);
  });

  it('returns null for an unknown id', () => {
    expect(repo.findById(999)).toBeNull();
  });

  it('rejects a duplicate title regardless of case with ConflictError', () => {
    expect(() => repo.create(game({ title: 'EMBER ROAD' }))).toThrow(ConflictError);
  });

  it('stores SQL-looking input as plain text', () => {
    const title = "Robert'); DROP TABLE games;--";
    const created = repo.create(game({ title }));
    expect(repo.findById(created.id)?.title).toBe(title);
    expect(repo.list()).toHaveLength(5);
  });
});

describe('update', () => {
  it('replaces every field', () => {
    const changes = game({ title: 'Ember Road II', genre: 'Action', average_rating: 4.9 });
    expect(repo.update(1, changes)).toEqual({ id: 1, ...changes });
  });

  it('allows keeping the same title in a different case', () => {
    expect(repo.update(1, game({ title: 'ember road' }))?.title).toBe('ember road');
  });

  it("rejects taking another game's title", () => {
    expect(() => repo.update(1, game({ title: 'glass orchard' }))).toThrow(ConflictError);
  });

  it('returns null for an unknown id', () => {
    expect(repo.update(999, game({ title: 'Nobody' }))).toBeNull();
  });
});

describe('delete', () => {
  it('removes the game and reports whether it existed', () => {
    expect(repo.delete(1)).toBe(true);
    expect(repo.findById(1)).toBeNull();
    expect(repo.delete(1)).toBe(false);
  });
});

describe('createMany / deleteAll', () => {
  it('inserts all games or none', () => {
    expect(() =>
      repo.createMany([game({ title: 'Fresh One' }), game({ title: 'ember road' })]),
    ).toThrow(ConflictError);
    expect(repo.list().map((g) => g.title)).not.toContain('Fresh One');
  });

  it('empties the table and restarts ids at 1', () => {
    repo.deleteAll();
    expect(repo.list()).toEqual([]);
    expect(repo.createMany([game({ title: 'First Again' })])[0].id).toBe(1);
  });
});

describe('table constraints', () => {
  it('rejects invalid rows even if validation were bypassed', () => {
    expect(() => repo.create(game({ title: 'Bad', monthly_downloads: -1 }))).toThrow(/CHECK/);
    expect(() => repo.create(game({ title: 'Bad', average_rating: 7 }))).toThrow(/CHECK/);
  });
});
