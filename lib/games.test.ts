import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, resetDb } from './db';
import {
  createGame,
  deleteGame,
  findGamesByTitles,
  getGame,
  getStats,
  listGames,
  listGenres,
  updateGame,
  type SortField,
} from './games';
import { makeGameInput } from '@/test/game-factory';

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const titles = (games: { title: string }[]) => games.map((game) => game.title);

beforeEach(() => resetDb());

describe('resetDb', () => {
  it('leaves the table empty, without re-seeding, and restarts ids', () => {
    createGame(makeGameInput());
    resetDb();
    expect(listGames()).toEqual([]);
    expect(createGame(makeGameInput()).id).toBe(1);
  });
});

describe('createGame / getGame', () => {
  it('returns the stored game with id and ISO-8601 timestamps', () => {
    const game = createGame(makeGameInput({ title: 'Alpha', monthly_revenue_usd: 12.5 }));
    expect(game).toMatchObject({ id: 1, title: 'Alpha', monthly_revenue_usd: 12.5 });
    expect(game.created_at).toMatch(ISO_8601);
    expect(game.updated_at).toMatch(ISO_8601);
    expect(getGame(game.id)).toEqual(game);
  });

  it('returns null for an unknown id', () => {
    expect(getGame(999)).toBeNull();
  });

  it('stores SQL metacharacters as plain text', () => {
    const title = `'); DROP TABLE games; --`;
    expect(createGame(makeGameInput({ title })).title).toBe(title);
    expect(listGames()).toHaveLength(1);
  });

  it('does not reuse the id of a deleted game', () => {
    const first = createGame(makeGameInput());
    deleteGame(first.id);
    expect(createGame(makeGameInput()).id).toBe(first.id + 1);
  });
});

describe('updateGame', () => {
  it('changes only the given fields', () => {
    const game = createGame(makeGameInput({ title: 'Before', average_rating: 2 }));
    expect(updateGame(game.id, { average_rating: 0 })).toMatchObject({ title: 'Before', average_rating: 0 });
  });

  it('refreshes updated_at as ISO-8601 and keeps created_at', () => {
    const game = createGame(makeGameInput());
    const old = '2000-01-01T00:00:00.000Z';
    getDb().prepare('UPDATE games SET created_at = ?, updated_at = ? WHERE id = ?').run(old, old, game.id);

    const updated = updateGame(game.id, { title: 'After' });

    expect(updated?.created_at).toBe(old);
    expect(updated?.updated_at).toMatch(ISO_8601);
    expect(updated?.updated_at).not.toBe(old);
  });

  it('returns null for an unknown id, also with no fields', () => {
    expect(updateGame(999, { title: 'Nope' })).toBeNull();
    expect(updateGame(999, {})).toBeNull();
  });

  it('leaves the game untouched with no effective fields', () => {
    const game = createGame(makeGameInput());
    expect(updateGame(game.id, {})).toEqual(game);
    expect(updateGame(game.id, { title: undefined })).toEqual(game);
  });

  it('ignores keys that are not game fields', () => {
    const game = createGame(makeGameInput());
    const input = { 'title = 1; --': 'x', id: 50, title: 'Safe' };
    expect(updateGame(game.id, input)).toMatchObject({ id: game.id, title: 'Safe' });
  });
});

describe('deleteGame', () => {
  it('removes the game and reports it', () => {
    const game = createGame(makeGameInput());
    expect(deleteGame(game.id)).toBe(true);
    expect(getGame(game.id)).toBeNull();
  });

  it('returns false for an unknown id', () => {
    expect(deleteGame(999)).toBe(false);
  });
});

describe('listGames filters', () => {
  it('returns [] for an empty catalog', () => {
    expect(listGames()).toEqual([]);
  });

  it('matches genre exactly, ignoring case', () => {
    createGame(makeGameInput({ title: 'A', genre: 'Puzzle' }));
    createGame(makeGameInput({ title: 'B', genre: 'Puzzle Platformer' }));
    expect(titles(listGames({ genre: 'pUZZLE' }))).toEqual(['A']);
  });

  it('matches part of the developer name, ignoring case', () => {
    createGame(makeGameInput({ title: 'A', developer: 'Nimbus' }));
    createGame(makeGameInput({ title: 'B', developer: 'Nimbus Forge' }));
    createGame(makeGameInput({ title: 'C', developer: 'Other' }));
    expect(titles(listGames({ developer: 'NIMBUS' }))).toEqual(['A', 'B']);
  });

  it('treats a percent sign in the developer filter as text', () => {
    createGame(makeGameInput({ title: 'A', developer: 'Nimbus' }));
    expect(listGames({ developer: '%' })).toEqual([]);
  });

  it('treats minRating as exclusive: 4.0 is out, 4.1 is in', () => {
    createGame(makeGameInput({ title: 'Four', average_rating: 4.0 }));
    createGame(makeGameInput({ title: 'FourOne', average_rating: 4.1 }));
    expect(titles(listGames({ minRating: 4 }))).toEqual(['FourOne']);
  });

  it('applies minRating 0 instead of treating it as absent', () => {
    createGame(makeGameInput({ title: 'Zero', average_rating: 0 }));
    createGame(makeGameInput({ title: 'One', average_rating: 1 }));
    expect(titles(listGames({ minRating: 0 }))).toEqual(['One']);
  });

  it('treats maxRating as inclusive: 4.0 is in, 4.1 is out', () => {
    createGame(makeGameInput({ title: 'Four', average_rating: 4.0 }));
    createGame(makeGameInput({ title: 'FourOne', average_rating: 4.1 }));
    expect(titles(listGames({ maxRating: 4 }))).toEqual(['Four']);
  });

  it('treats minRevenue as inclusive', () => {
    createGame(makeGameInput({ title: 'Below', monthly_revenue_usd: 99.99 }));
    createGame(makeGameInput({ title: 'Exact', monthly_revenue_usd: 100 }));
    expect(titles(listGames({ minRevenue: 100 }))).toEqual(['Exact']);
  });

  it('searches inside the title, ignoring case', () => {
    createGame(makeGameInput({ title: 'Hollow Lantern' }));
    createGame(makeGameInput({ title: 'Other' }));
    expect(titles(listGames({ search: 'LANT' }))).toEqual(['Hollow Lantern']);
  });

  it('treats % and _ and \\ in search as literal characters', () => {
    createGame(makeGameInput({ title: '100% Fun' }));
    createGame(makeGameInput({ title: 'snake_case' }));
    createGame(makeGameInput({ title: 'back\\slash' }));
    createGame(makeGameInput({ title: 'Plain' }));
    expect(titles(listGames({ search: '%' }))).toEqual(['100% Fun']);
    expect(titles(listGames({ search: '_' }))).toEqual(['snake_case']);
    expect(titles(listGames({ search: '\\' }))).toEqual(['back\\slash']);
  });

  it('combines filters with AND', () => {
    createGame(makeGameInput({ title: 'Match', genre: 'Horror', average_rating: 4.5 }));
    createGame(makeGameInput({ title: 'WrongGenre', genre: 'Puzzle', average_rating: 4.5 }));
    createGame(makeGameInput({ title: 'WrongRating', genre: 'Horror', average_rating: 1 }));
    expect(titles(listGames({ genre: 'Horror', minRating: 4 }))).toEqual(['Match']);
  });
});

describe('listGames sorting and limit', () => {
  beforeEach(() => {
    createGame(makeGameInput({ title: 'banana', monthly_revenue_usd: 20, monthly_downloads: 1, average_rating: 3 }));
    createGame(makeGameInput({ title: 'Apple', monthly_revenue_usd: 30, monthly_downloads: 3, average_rating: 1 }));
    createGame(makeGameInput({ title: 'cherry', monthly_revenue_usd: 10, monthly_downloads: 2, average_rating: 2 }));
  });

  it.each<[SortField, string[]]>([
    ['monthly_revenue_usd', ['cherry', 'banana', 'Apple']],
    ['monthly_downloads', ['banana', 'cherry', 'Apple']],
    ['average_rating', ['Apple', 'cherry', 'banana']],
    ['title', ['Apple', 'banana', 'cherry']],
  ])('sorts by %s in both directions', (sortBy, ascending) => {
    expect(titles(listGames({ sortBy, order: 'asc' }))).toEqual(ascending);
    expect(titles(listGames({ sortBy, order: 'desc' }))).toEqual([...ascending].reverse());
  });

  it('sorts ascending when only sortBy is given', () => {
    expect(titles(listGames({ sortBy: 'monthly_revenue_usd' }))).toEqual(['cherry', 'banana', 'Apple']);
  });

  it('breaks ties by id so the order is stable', () => {
    createGame(makeGameInput({ title: 'tie1', monthly_revenue_usd: 99 }));
    createGame(makeGameInput({ title: 'tie2', monthly_revenue_usd: 99 }));
    expect(titles(listGames({ sortBy: 'monthly_revenue_usd', order: 'desc', limit: 2 }))).toEqual(['tie1', 'tie2']);
  });

  it.each(['title; DROP TABLE games', 'constructor', '__proto__'])('ignores the non-whitelisted sortBy %s', (sortBy) => {
    const games = listGames({ sortBy: sortBy as SortField });
    expect(titles(games)).toEqual(['banana', 'Apple', 'cherry']);
  });

  it('falls back to ascending for an unknown order', () => {
    const order = 'desc; DROP TABLE games' as 'desc';
    expect(titles(listGames({ sortBy: 'title', order }))).toEqual(['Apple', 'banana', 'cherry']);
  });

  it('applies the limit after sorting', () => {
    expect(titles(listGames({ sortBy: 'monthly_revenue_usd', order: 'desc', limit: 1 }))).toEqual(['Apple']);
  });

  it('caps the limit at 100, by default too', () => {
    for (let i = 0; i < 101; i += 1) createGame(makeGameInput());
    expect(listGames()).toHaveLength(100);
    expect(listGames({ limit: 1000 })).toHaveLength(100);
  });

  it('raises a zero or negative limit to 1', () => {
    expect(listGames({ limit: 0 })).toHaveLength(1);
    expect(listGames({ limit: -5 })).toHaveLength(1);
  });
});

describe('getStats', () => {
  it('returns zeros instead of NULL for an empty catalog', () => {
    expect(getStats()).toEqual({ count: 0, total_revenue_usd: 0, avg_revenue_usd: 0, total_downloads: 0, avg_rating: 0 });
  });

  it('returns zeros when the filters match nothing', () => {
    createGame(makeGameInput());
    expect(getStats({ genre: 'Nope' })).toEqual({ count: 0, total_revenue_usd: 0, avg_revenue_usd: 0, total_downloads: 0, avg_rating: 0 });
  });

  it('aggregates and rounds to 2 decimals', () => {
    createGame(makeGameInput({ monthly_revenue_usd: 10, monthly_downloads: 1, average_rating: 4 }));
    createGame(makeGameInput({ monthly_revenue_usd: 10, monthly_downloads: 2, average_rating: 4 }));
    createGame(makeGameInput({ monthly_revenue_usd: 20.01, monthly_downloads: 3, average_rating: 5 }));
    expect(getStats()).toEqual({ count: 3, total_revenue_usd: 40.01, avg_revenue_usd: 13.34, total_downloads: 6, avg_rating: 4.33 });
  });

  it('does not leak floating point noise into the revenue total', () => {
    createGame(makeGameInput({ monthly_revenue_usd: 0.1 }));
    createGame(makeGameInput({ monthly_revenue_usd: 0.2 }));
    expect(getStats().total_revenue_usd).toBe(0.3);
  });

  it('counts only games rated strictly above minRating', () => {
    createGame(makeGameInput({ average_rating: 4.0 }));
    createGame(makeGameInput({ average_rating: 4.1 }));
    createGame(makeGameInput({ average_rating: 5 }));
    expect(getStats({ minRating: 4 }).count).toBe(2);
  });

  it('applies the same filters as listGames', () => {
    createGame(makeGameInput({ genre: 'Horror', monthly_revenue_usd: 5 }));
    createGame(makeGameInput({ genre: 'Puzzle', monthly_revenue_usd: 50 }));
    expect(getStats({ genre: 'horror' })).toMatchObject({ count: 1, total_revenue_usd: 5 });
  });
});

describe('findGamesByTitles', () => {
  beforeEach(() => {
    createGame(makeGameInput({ title: 'Hollow Lantern' }));
    createGame(makeGameInput({ title: 'Starfall Tactics' }));
    createGame(makeGameInput({ title: 'Other' }));
  });

  it('finds partial matches regardless of case', () => {
    expect(titles(findGamesByTitles(['hollow', 'STAR']))).toEqual(['Hollow Lantern', 'Starfall Tactics']);
  });

  it('returns [] for an empty list', () => {
    expect(findGamesByTitles([])).toEqual([]);
  });

  it('does not match everything with a blank title', () => {
    expect(findGamesByTitles(['', '   '])).toEqual([]);
  });

  it('returns [] when nothing matches', () => {
    expect(findGamesByTitles(['missing'])).toEqual([]);
  });

  it('treats % and _ as literal characters', () => {
    expect(findGamesByTitles(['%'])).toEqual([]);
    expect(findGamesByTitles(['H_llow'])).toEqual([]);
  });

  it('returns a game once when several titles match it', () => {
    expect(titles(findGamesByTitles(['hollow', 'lantern']))).toEqual(['Hollow Lantern']);
  });
});

describe('listGenres', () => {
  it('returns [] for an empty catalog', () => {
    expect(listGenres()).toEqual([]);
  });

  it('returns sorted genres without case-insensitive duplicates', () => {
    createGame(makeGameInput({ genre: 'Roguelike' }));
    createGame(makeGameInput({ genre: 'horror' }));
    createGame(makeGameInput({ genre: 'Puzzle' }));
    createGame(makeGameInput({ genre: 'puzzle' }));
    expect(listGenres()).toEqual(['horror', 'Puzzle', 'Roguelike']);
  });
});
