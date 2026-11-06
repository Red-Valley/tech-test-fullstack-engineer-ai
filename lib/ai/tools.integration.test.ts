import type { Tool } from 'ai';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '@/lib/db';
import { createGame } from '@/lib/games';
import { makeGameInput } from '@/test/game-factory';
import { chatTools } from './tools';

/** Runs a tool the way the SDK does, once its input has passed the schema. */
async function run<INPUT, OUTPUT>(definition: Tool<INPUT, OUTPUT>, input: INPUT): Promise<OUTPUT> {
  const output = await definition.execute?.(input, { toolCallId: 'call-1', messages: [], context: {} });
  return output as OUTPUT;
}

// The other tool tests mock the repository; these run against real SQLite.
describe('chat tools on the real repository', () => {
  beforeEach(() => {
    resetDb();
    createGame(makeGameInput({ title: 'Starfall Tactics', genre: 'Strategy', monthly_revenue_usd: 300, average_rating: 4.1 }));
    createGame(makeGameInput({ title: 'Hollow Lantern', genre: 'Horror', monthly_revenue_usd: 200, average_rating: 4 }));
    createGame(makeGameInput({ title: 'Moss & Moons', genre: 'Puzzle', monthly_revenue_usd: 100, average_rating: 3 }));
  });

  it('finds the top game by revenue', async () => {
    const output = await run(chatTools.searchGames, { sortBy: 'monthly_revenue_usd', order: 'desc', limit: 1 });
    expect(output).toMatchObject({ count: 1, truncated: true, results: [{ title: 'Starfall Tactics' }] });
  });

  it('does not flag a list as truncated when it holds every match', async () => {
    expect(await run(chatTools.searchGames, { limit: 3 })).toMatchObject({ count: 3, truncated: false });
  });

  it('counts "rated above 4" without the game rated exactly 4', async () => {
    const output = await run(chatTools.getCatalogStats, { minRating: 4 });
    expect(output.stats.count).toBe(1);
  });

  it('reports an empty result explicitly', async () => {
    expect(await run(chatTools.searchGames, { search: 'nope' })).toEqual({ results: [], note: 'No games matched' });
  });

  it('compares by partial title, ignoring case, and names what it did not find', async () => {
    const output = await run(chatTools.compareGames, { titles: ['STARFALL', 'hollow', 'Zelda'] });
    expect(output.games.map((game) => game.title)).toEqual(['Starfall Tactics', 'Hollow Lantern']);
    expect(output.notFound).toEqual(['Zelda']);
  });

  it('treats % in a title as text, not as a wildcard', async () => {
    const output = await run(chatTools.compareGames, { titles: ['%', 'Moss & Moons'] });
    expect(output.games.map((game) => game.title)).toEqual(['Moss & Moons']);
    expect(output.notFound).toEqual(['%']);
  });

  it('lists the genres of the catalog', async () => {
    expect(await run(chatTools.listGenres, {})).toEqual({ genres: ['Horror', 'Puzzle', 'Strategy'] });
  });
});
