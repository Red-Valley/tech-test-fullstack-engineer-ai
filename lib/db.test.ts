import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDb } from './db';
import { findGamesByTitles, getStats, listGames } from './games';
import { gameInputSchema } from './schema';
import { SEED_GAMES } from './seed-data';

const tempDirs: string[] = [];

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'games-db-'));
  tempDirs.push(dir);
  return path.join(dir, 'nested', 'folder', 'games.db');
}

const countGames = (db: ReturnType<typeof openDb>) =>
  db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM games').get()?.count;

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('openDb', () => {
  it('creates the missing folder, the schema and the seed for a new file', () => {
    const location = tempDbPath();
    const db = openDb(location);
    expect(fs.existsSync(location)).toBe(true);
    expect(countGames(db)).toBe(SEED_GAMES.length);
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    db.close();
  });

  it('recreates the seeded database after its file is deleted', () => {
    const location = tempDbPath();
    openDb(location).close();
    fs.rmSync(path.dirname(location), { recursive: true });
    const db = openDb(location);
    expect(countGames(db)).toBe(SEED_GAMES.length);
    db.close();
  });

  it('keeps existing rows and does not seed twice when reopened', () => {
    const location = tempDbPath();
    const first = openDb(location);
    first.prepare('DELETE FROM games WHERE id > 1').run();
    first.close();
    const second = openDb(location);
    expect(countGames(second)).toBe(1);
    second.close();
  });

  it('writes default timestamps as ISO-8601 UTC', () => {
    const db = openDb(':memory:');
    const row = db.prepare<[], { created_at: string; updated_at: string }>('SELECT created_at, updated_at FROM games LIMIT 1').get();
    expect(row?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(row?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    db.close();
  });

  it('rejects out-of-range values through the CHECK constraints', () => {
    const db = openDb(':memory:');
    const insert = db.prepare(
      `INSERT INTO games (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating) VALUES ('x', 'x', 'x', ?, ?, ?)`,
    );
    expect(() => insert.run(-1, 0, 0)).toThrow(/CHECK/);
    expect(() => insert.run(0, -1, 0)).toThrow(/CHECK/);
    expect(() => insert.run(0, 0, 5.1)).toThrow(/CHECK/);
    db.close();
  });
});

describe('seed data', () => {
  it('holds 12 to 15 games that pass the API validation', () => {
    expect(SEED_GAMES.length).toBeGreaterThanOrEqual(12);
    expect(SEED_GAMES.length).toBeLessThanOrEqual(15);
    for (const game of SEED_GAMES) expect(gameInputSchema.safeParse(game).success).toBe(true);
  });

  it('has unique titles', () => {
    expect(new Set(SEED_GAMES.map((game) => game.title)).size).toBe(SEED_GAMES.length);
  });

  // This file never calls resetDb, so the repository below reads the seeded singleton.
  it('answers the sample questions through the repository', () => {
    expect(listGames({ sortBy: 'monthly_revenue_usd', order: 'desc', limit: 1 }).map((game) => game.title)).toEqual(['Starfall Tactics']);
    expect(getStats({ minRating: 4 }).count).toBe(5);
    expect(findGamesByTitles(['hollow', 'STAR']).map((game) => game.title)).toEqual(['Starfall Tactics', 'Hollow Lantern']);
  });
});
