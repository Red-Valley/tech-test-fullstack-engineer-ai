import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createDatabase, closeDatabase } from '../src/lib/db.js';
import { GamesRepository } from '../src/lib/repositories/games-repository.js';
import { seedDatabase } from '../src/lib/seed.js';

describe('GamesRepository - Isolated CRUD & Persistence Tests', () => {
  let memoryDb: ReturnType<typeof createDatabase>;
  let repo: GamesRepository;

  before(() => {
    // Pure in-memory SQLite database isolated completely from development data/games.db
    memoryDb = createDatabase(':memory:');
    repo = new GamesRepository(memoryDb);
  });

  after(() => {
    closeDatabase(memoryDb);
  });

  it('R1.1 / R1.2: creates a game record with all six required fields and valid UUID/timestamps', () => {
    const game = repo.create({
      title: 'Tunic',
      developer: 'TUNIC Team',
      genre: 'Action Adventure',
      monthly_revenue_usd: 380000,
      monthly_downloads: 95000,
      average_rating: 4.3,
    });

    assert.ok(game.id, 'Expected generated UUID');
    assert.equal(game.title, 'Tunic');
    assert.equal(game.developer, 'TUNIC Team');
    assert.equal(game.genre, 'Action Adventure');
    assert.equal(game.monthly_revenue_usd, 380000);
    assert.equal(game.monthly_downloads, 95000);
    assert.equal(game.average_rating, 4.3);
    assert.ok(game.created_at, 'Expected created_at timestamp');
    assert.ok(game.updated_at, 'Expected updated_at timestamp');
  });

  it('R1.2: finds game by ID and returns exact record', () => {
    const created = repo.create({
      title: 'Inscryption',
      developer: 'Daniel Mullins Games',
      genre: 'Deckbuilder',
      monthly_revenue_usd: 610000,
      monthly_downloads: 160000,
      average_rating: 4.6,
    });

    const found = repo.findById(created.id);
    assert.ok(found);
    assert.equal(found.id, created.id);
    assert.equal(found.title, 'Inscryption');
  });

  it('handles missing and non-existent IDs gracefully by returning null', () => {
    const nonExistent = repo.findById('00000000-0000-0000-0000-000000000000');
    assert.equal(nonExistent, null);
  });

  it('R1.2: updates game fields and refreshes updated_at timestamp', () => {
    const game = repo.create({
      title: 'Dave the Diver',
      developer: 'MINTROCKET',
      genre: 'Simulation',
      monthly_revenue_usd: 800000,
      monthly_downloads: 250000,
      average_rating: 4.5,
    });

    const updated = repo.update(game.id, {
      monthly_revenue_usd: 890000,
      average_rating: 4.7,
    });

    assert.ok(updated);
    assert.equal(updated.monthly_revenue_usd, 890000);
    assert.equal(updated.average_rating, 4.7);
    assert.equal(updated.developer, 'MINTROCKET', 'Unchanged field should remain intact');
  });

  it('R1.2: deletes game record and confirms removal', () => {
    const game = repo.create({
      title: 'Temporary Test Game',
      developer: 'Test Dev',
      genre: 'Test',
      monthly_revenue_usd: 1000,
      monthly_downloads: 100,
      average_rating: 3.0,
    });

    const deleted = repo.delete(game.id);
    assert.equal(deleted, true);
    assert.equal(repo.findById(game.id), null);
  });

  it('prevents SQL injection through parameterized queries', () => {
    const injectionTitle = "Hacker Game'; DROP TABLE games; --";
    const game = repo.create({
      title: injectionTitle,
      developer: "Malicious' OR '1'='1",
      genre: 'Action',
      monthly_revenue_usd: 500,
      monthly_downloads: 50,
      average_rating: 2.5,
    });

    assert.ok(game.id);
    const retrieved = repo.findById(game.id);
    assert.ok(retrieved);
    assert.equal(retrieved.title, injectionTitle);

    // Assert the table was NOT dropped
    const count = repo.count();
    assert.ok(count > 0, 'Table should still be intact after SQL injection payload');
  });

  it('R1.3: persists data across database instance closure and reconnection', () => {
    const tempDbPath = path.join(process.cwd(), 'data', 'persistence-test.db');
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);

    // Step 1: Open, write, and close
    const db1 = createDatabase(tempDbPath);
    const repo1 = new GamesRepository(db1);
    const saved = repo1.create({
      title: 'Persistent Hollow Knight',
      developer: 'Team Cherry',
      genre: 'Metroidvania',
      monthly_revenue_usd: 980000,
      monthly_downloads: 290000,
      average_rating: 4.9,
    });
    closeDatabase(db1);

    // Step 2: Open a fresh new connection to the same file
    const db2 = createDatabase(tempDbPath);
    const repo2 = new GamesRepository(db2);
    const restored = repo2.findById(saved.id);
    closeDatabase(db2);

    // Cleanup ephemeral test database file
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    const walFile = `${tempDbPath}-wal`;
    const shmFile = `${tempDbPath}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    assert.ok(restored, 'Expected record to persist after database instance closure');
    assert.equal(restored.title, 'Persistent Hollow Knight');
    assert.equal(restored.monthly_revenue_usd, 980000);
  });

  it('R3.6 / Correctness: strict rating filter (rating_above: 4.0) strictly excludes 4.0 rated games', () => {
    const strictDb = createDatabase(':memory:');
    const strictRepo = new GamesRepository(strictDb);

    // Insert 3 test games: below 4.0, exactly 4.0 (Animal Well), above 4.0 (Celeste)
    strictRepo.create({
      title: 'Below Four Game',
      developer: 'Dev A',
      genre: 'Action',
      monthly_revenue_usd: 10000,
      monthly_downloads: 1000,
      average_rating: 3.8,
    });

    strictRepo.create({
      title: 'Animal Well',
      developer: 'Shared Memory',
      genre: 'Metroidvania',
      monthly_revenue_usd: 450000,
      monthly_downloads: 120000,
      average_rating: 4.0, // Exactly 4.0
    });

    strictRepo.create({
      title: 'Celeste',
      developer: 'Maddy Makes Games',
      genre: 'Platformer',
      monthly_revenue_usd: 1250000,
      monthly_downloads: 320000,
      average_rating: 4.8, // Strictly above 4.0
    });

    const countStrictlyAbove4 = strictRepo.count({ rating_above: 4.0 });
    const gamesStrictlyAbove4 = strictRepo.findAll({ rating_above: 4.0 });

    closeDatabase(strictDb);

    // Must be EXACTLY 1 (Celeste), excluding Animal Well (4.0) and Below Four Game (3.8)
    assert.equal(
      countStrictlyAbove4,
      1,
      'Strict rating above 4.0 must exclude games rated exactly 4.0'
    );
    assert.equal(gamesStrictlyAbove4.length, 1);
    assert.equal(gamesStrictlyAbove4[0].title, 'Celeste');
  });

  it('seeds 15 synthetic indie games idempotently', () => {
    const seedDb = createDatabase(':memory:');
    const result1 = seedDatabase(seedDb);
    assert.equal(result1.seeded, 15);
    assert.equal(result1.total, 15);

    // Re-running seed should be idempotent (0 newly seeded)
    const result2 = seedDatabase(seedDb);
    assert.equal(result2.seeded, 0);
    assert.equal(result2.total, 15);

    const repo = new GamesRepository(seedDb);
    const animalWell = repo.findByTitle('Animal Well');
    assert.ok(animalWell);
    assert.equal(animalWell.average_rating, 4.0, 'Animal Well must be rated exactly 4.0 in seed');

    closeDatabase(seedDb);
  });
});
