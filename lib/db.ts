import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SEED_GAMES } from "./games/seed";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE COLLATE NOCASE,
  developer TEXT NOT NULL,
  genre TEXT NOT NULL,
  monthly_revenue_usd REAL NOT NULL CHECK (monthly_revenue_usd >= 0),
  monthly_downloads INTEGER NOT NULL CHECK (monthly_downloads >= 0),
  average_rating REAL NOT NULL CHECK (average_rating BETWEEN 0 AND 5),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

/**
 * Opens a SQLite database, creates the schema, and seeds a new database once.
 * Pass `:memory:` for an isolated in-memory database.
 *
 * `PRAGMA user_version` is used only as the "already seeded" flag. If a real
 * schema migration scheme is added later, give it its own version numbering.
 */
export function openDatabase(path: string): Database.Database {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new Database(path);
  db.exec(SCHEMA);

  // Seed once per database file. `user_version` records that seeding happened, so a user who deletes every
  // game does not get the seed games back on the next start. BEGIN IMMEDIATE takes the write lock before the
  // check, so parallel processes (for example build workers) cannot both seed.
  const seed = db.transaction(() => {
    if (db.pragma("user_version", { simple: true }) !== 0) return;
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM games").get() as { n: number };
    if (n === 0) {
      const insert = db.prepare(
        `INSERT INTO games (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating)
         VALUES (@title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating)`,
      );
      for (const game of SEED_GAMES) insert.run(game);
    }
    db.pragma("user_version = 1");
  });
  seed.immediate();

  return db;
}

const globalForDb = globalThis as unknown as { gamesDb?: Database.Database };

/**
 * Process-wide connection. Cached on `globalThis` so dev hot reloads reuse
 * one connection instead of opening a new one per reload.
 */
export function getDb(): Database.Database {
  globalForDb.gamesDb ??= openDatabase(process.env.DATABASE_PATH ?? "data/games.db");
  return globalForDb.gamesDb;
}
