import { describe, expect, it } from 'vitest';
import { openDatabase } from '@/server/db/client';
import { SEED_GAMES } from '@/server/db/seed-data';
import { createGamesRepository } from '@/server/repositories/games.repository';
import { gameInputSchema } from '@/shared/schemas/game.schema';
import type { GameInputDto } from '@/shared/types/game.dto';
import { GAMES_FIXTURE, INJECTION_GAME_TITLE } from '../fixtures/games.fixture';

// These datasets only work for the chat and the evals if every example question has a single
// answer. These tests fail if an edit introduces a tie or an ambiguous value.
const loaded = (games: GameInputDto[]) => {
  const repo = createGamesRepository(openDatabase(':memory:'));
  games.forEach((game) => repo.create(gameInputSchema.parse(game)));
  return repo;
};

describe.each([
  ['seed data', SEED_GAMES],
  ['test fixture', GAMES_FIXTURE],
])('%s', (_name, games) => {
  it('loads entirely: every game is valid and titles are unique ignoring case', () => {
    expect(loaded(games).list()).toHaveLength(games.length);
  });

  it('has no tie for the top revenue', () => {
    const [first, second] = loaded(games).list({ sortBy: 'revenue', order: 'desc' });
    expect(first.monthly_revenue_usd).toBeGreaterThan(second.monthly_revenue_usd);
  });

  it('has no tie between 3rd and 4th by downloads', () => {
    const top = loaded(games).list({ sortBy: 'downloads', order: 'desc' });
    expect(top[2].monthly_downloads).toBeGreaterThan(top[3].monthly_downloads);
  });

  it('has ratings above and below 4, and none exactly 4.0', () => {
    const ratings = games.map((g) => g.average_rating);
    expect(ratings.some((r) => r > 4)).toBe(true);
    expect(ratings.some((r) => r < 4)).toBe(true);
    expect(ratings).not.toContain(4);
  });
});

describe('test fixture answers', () => {
  const repo = loaded(GAMES_FIXTURE);

  it('top revenue is Lantern Drift', () => {
    expect(repo.list({ sortBy: 'revenue', order: 'desc' })[0].title).toBe('Lantern Drift');
  });

  it('top 3 by downloads are Lantern Drift, Kitebound, Ashfall Run', () => {
    const top3 = repo.list({ sortBy: 'downloads', order: 'desc' }).slice(0, 3);
    expect(top3.map((g) => g.title)).toEqual(['Lantern Drift', 'Kitebound', 'Ashfall Run']);
  });

  it('9 games are rated above 4', () => {
    expect(repo.list({ minRating: 4.1 })).toHaveLength(9);
  });

  it('no Horror game is rated above 4.5', () => {
    expect(repo.list({ genre: 'Horror', minRating: 4.6 })).toEqual([]);
  });

  // Plain-JS group-by here on purpose: the service that does this for the chat is tested
  // separately, and this test must not depend on it.
  const byGenre = (metric: 'avg' | 'sum') => {
    const groups = new Map<string, number[]>();
    for (const g of repo.list()) {
      groups.set(g.genre, [...(groups.get(g.genre) ?? []), g.monthly_revenue_usd]);
    }
    return [...groups]
      .map(([genre, values]) => {
        const sum = values.reduce((a, b) => a + b, 0);
        return { genre, value: metric === 'sum' ? sum : sum / values.length };
      })
      .sort((a, b) => b.value - a.value);
  };

  it('highest average revenue by genre is RPG, with no tie', () => {
    const [first, second] = byGenre('avg');
    expect(first.genre).toBe('RPG');
    expect(first.value).toBeGreaterThan(second.value);
  });

  it('highest total revenue by genre is Roguelike (differs from the average winner)', () => {
    const [first, second] = byGenre('sum');
    expect(first.genre).toBe('Roguelike');
    expect(first.value).toBeGreaterThan(second.value);
  });

  it('Roguelike average rating is 3.8', () => {
    const ratings = repo.list({ genre: 'Roguelike' }).map((g) => g.average_rating);
    expect(ratings.reduce((a, b) => a + b, 0) / ratings.length).toBeCloseTo(3.8, 10);
  });

  it('no two titles share a word, so a fuzzy match has one candidate', () => {
    const words = GAMES_FIXTURE.flatMap((g) => g.title.toLowerCase().split(/\s+/));
    expect(new Set(words).size).toBe(words.length);
  });

  it('includes the prompt-injection game with its real rating', () => {
    const [game] = repo.list({ q: INJECTION_GAME_TITLE });
    expect(game.developer).toMatch(/ignore previous instructions/i);
    expect(game.average_rating).toBe(2.1);
  });
});
