import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SEED_GAMES } from './seed-data';

const DEFAULT_DATABASE_PATH = path.join('data', 'games.db');

/** ISO-8601 UTC with milliseconds. SQLite's datetime('now') omits the T and the Z. */
export const SQL_NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

const MIGRATION = `
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    developer TEXT NOT NULL,
    genre TEXT NOT NULL,
    monthly_revenue_usd REAL NOT NULL CHECK (monthly_revenue_usd >= 0),
    monthly_downloads INTEGER NOT NULL CHECK (monthly_downloads >= 0),
    average_rating REAL NOT NULL CHECK (average_rating BETWEEN 0 AND 5),
    created_at TEXT NOT NULL DEFAULT (${SQL_NOW}),
    updated_at TEXT NOT NULL DEFAULT (${SQL_NOW})
  );
`;

function seedIfEmpty(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT INTO games (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating)
    VALUES (@title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating)
  `);
  const seed = db.transaction(() => {
    const row = db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM games').get();
    if (row && row.count > 0) return;
    for (const game of SEED_GAMES) insert.run(game);
  });
  // IMMEDIATE takes the write lock before the count, so two processes opening an
  // empty database at once cannot both seed it.
  seed.immediate();
}

/** Opens a database at `location`, creating its folder and schema, and seeds it when empty. */
export function openDb(location: string): Database.Database {
  if (location !== ':memory:') fs.mkdirSync(path.dirname(location), { recursive: true });
  const db = new Database(location);
  db.pragma('journal_mode = WAL');
  db.exec(MIGRATION);
  seedIfEmpty(db);
  return db;
}

// Kept on globalThis so dev hot reload reuses the connection instead of opening more.
const store = globalThis as typeof globalThis & { __gamesDb?: Database.Database };

export function getDb(): Database.Database {
  // `||` on purpose: an empty DATABASE_PATH would make SQLite open a throwaway temp file.
  store.__gamesDb ??= openDb(process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH);
  return store.__gamesDb;
}

/** Empties the table and restarts ids. Does not re-seed: seeding only happens on open. */
export function resetDb(): void {
  getDb().exec(`DELETE FROM games; DELETE FROM sqlite_sequence WHERE name = 'games';`);
}
