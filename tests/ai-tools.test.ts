/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, closeDatabase } from '../src/lib/db.js';
import { GamesRepository } from '../src/lib/repositories/games-repository.js';
import { GamesService } from '../src/lib/services/games-service.js';
import { seedDatabase } from '../src/lib/seed.js';
import { createCatalogTools } from '../src/lib/ai/tools.js';

describe('AI Tools - Deterministic Database-Backed Execution Tests', () => {
  let memoryDb: ReturnType<typeof createDatabase>;
  let repo: GamesRepository;
  let service: GamesService;
  let tools: ReturnType<typeof createCatalogTools>;

  before(() => {
    // Isolated in-memory database with standard 15 seeded indie games
    memoryDb = createDatabase(':memory:');
    seedDatabase(memoryDb);
    repo = new GamesRepository(memoryDb);
    service = new GamesService(repo);
    tools = createCatalogTools(service);
  });

  after(() => {
    closeDatabase(memoryDb);
  });

  it('Tool 1: search_games executes search by keyword and genre filter', async () => {
    const execute = tools.search_games.execute as any;
    const result = await execute({ query: 'Hades' });

    assert.equal(result.count, 1);
    assert.equal(result.games[0].title, 'Hades');
    assert.equal(result.games[0].developer, 'Supergiant Games');
    assert.equal(result.games[0].genre, 'Roguelike');
  });

  it('Tool 2: count_games enforces strict rating semantics (average_rating > 4.0 excludes Animal Well)', async () => {
    const execute = tools.count_games.execute as any;
    const result = await execute({ rating_above: 4.0 });

    assert.equal(
      result.matching_games_count,
      13,
      'Count for rating_above: 4.0 must strictly exclude Animal Well (4.0) and Pizza Tower (3.8)'
    );
    assert.equal(result.applied_filters.rating_above, 4.0);
  });

  it('Tool 2: count_games filters by genre accurately', async () => {
    const execute = tools.count_games.execute as any;
    const result = await execute({ genre: 'Deckbuilder' });

    // Balatro, Slay the Spire, Inscryption
    assert.equal(result.matching_games_count, 3);
  });

  it('Tool 3: get_top_games ranks by monthly_revenue_usd and includes data limitation notice', async () => {
    const execute = tools.get_top_games.execute as any;
    const result = await execute({ metric: 'monthly_revenue_usd', order: 'desc', limit: 1 });

    assert.equal(result.total_returned, 1);
    assert.equal(result.games[0].rank, 1);
    assert.equal(result.games[0].title, 'Celeste');
    assert.equal(result.games[0].monthly_revenue_usd, 1250000);
    assert.ok(
      result.data_limitation_notice.includes('monthly_revenue_usd reflects recorded catalog numbers')
    );
  });

  it('Tool 4: compare_games executes side-by-side comparison with calculated deltas', async () => {
    const execute = tools.compare_games.execute as any;
    const result = await execute({ titles_or_ids: ['Celeste', 'Hollow Knight'] });

    assert.equal(result.games_found_count, 2);
    assert.equal(result.games[0].title, 'Celeste');
    assert.equal(result.games[1].title, 'Hollow Knight');

    // Celeste ($1,250,000) vs Hollow Knight ($980,000) -> Delta: $270,000
    assert.equal(result.revenue_difference_usd, 270000);
    // Celeste (320,000) vs Hollow Knight (290,000) -> Delta: 30,000
    assert.equal(result.downloads_difference, 30000);
    // Celeste (4.8) vs Hollow Knight (4.9) -> Delta: -0.1
    assert.equal(result.rating_difference, -0.1);
  });

  it('Tool 5: get_catalog_stats returns aggregate metrics without prompt dumping', async () => {
    const execute = tools.get_catalog_stats.execute as any;
    const result = await execute({});

    assert.equal(result.total_games, 15);
    assert.ok(result.total_monthly_revenue_usd > 5000000);
    assert.ok(result.average_rating >= 4.0 && result.average_rating <= 5.0);
    assert.ok(Array.isArray(result.top_genres));
    assert.ok(result.top_genres.length > 0);
  });

  it('Multi-step workflow simulation: searches games then compares top matching results', async () => {
    const searchExec = tools.search_games.execute as any;
    const compareExec = tools.compare_games.execute as any;

    // Step 1: Search for Roguelike games
    const step1 = await searchExec({ genre: 'Roguelike' });
    assert.equal(step1.count, 2);
    const titles = step1.games.map((g: { title: string }) => g.title);
    assert.deepEqual(titles.sort(), ['Dead Cells', 'Hades'].sort());

    // Step 2: Compare the two discovered Roguelike games
    const step2 = await compareExec({ titles_or_ids: titles });
    assert.equal(step2.games_found_count, 2);
    assert.ok(step2.revenue_difference_usd !== undefined);
  });
});
