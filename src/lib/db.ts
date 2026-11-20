import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { createGamesRepository, type GamesRepository } from "@/lib/games/repository";
import { SEED_GAMES } from "@/lib/games/seed-data";

export type Db = Database.Database;

const DEFAULT_DB_PATH = "data/games.db";

/**
 * `PRAGMA user_version` is the schema version. Below the current one means a file this app has not set up
 * yet: create the table and, if it holds no games, insert the samples. Because seeding is tied to that first
 * setup, deleting every game later does not bring the samples back on the next start.
 */
const SCHEMA_VERSION = 1;

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS games (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    developer           TEXT    NOT NULL COLLATE NOCASE,
    genre               TEXT    NOT NULL COLLATE NOCASE,
    monthly_revenue_usd REAL    NOT NULL CHECK (monthly_revenue_usd >= 0),
    monthly_downloads   INTEGER NOT NULL CHECK (monthly_downloads >= 0),
    average_rating      REAL    NOT NULL CHECK (average_rating BETWEEN 0 AND 5)
  )`;

/** Opens (creating if needed) a SQLite database with the catalog schema. Pass ":memory:" for tests. */
export function openDatabase(filename: string, { seed = true }: { seed?: boolean } = {}): Db {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  // SQLite's own LIKE / lower() only fold plain ASCII; text matching uses this instead (see repository.ts).
  db.function("lower_unicode", { deterministic: true }, (text) => (typeof text === "string" ? text.toLowerCase() : text));

  const version = db.pragma("user_version", { simple: true }) as number;
  if (version > SCHEMA_VERSION) {
    db.close();
    throw new Error(
      `${filename} was written by a newer version of this app (schema ${version}; this one understands ${SCHEMA_VERSION}).`,
    );
  }

  if (version < SCHEMA_VERSION) {
    db.transaction(() => {
      db.exec(CREATE_TABLE);
      const games = createGamesRepository(db);
      // Never add samples to a file that already holds games, e.g. one this app did not create.
      if (seed && games.list({ limit: 1 }).total === 0) {
        for (const game of SEED_GAMES) games.create(game);
      }
      db.pragma(`user_version = ${SCHEMA_VERSION}`);
    })();
  }
  return db;
}

// Next.js dev reloads modules on every edit; keep one connection on globalThis instead of leaking one per reload.
const globalForDb = globalThis as typeof globalThis & { __gamesDb?: Db };

/** The app-wide database, opened lazily on first use (never at import or build time). */
export function getDb(): Db {
  globalForDb.__gamesDb ??= openDatabase(process.env.DATABASE_PATH ?? DEFAULT_DB_PATH);
  return globalForDb.__gamesDb;
}

export function getGames(): GamesRepository {
  return createGamesRepository(getDb());
}
