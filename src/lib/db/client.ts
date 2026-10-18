import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { SEED_GAMES } from "./seed";

export type Db = BetterSQLite3Database<typeof schema>;

const DB_FILE = path.join(process.cwd(), "data", "games.db");

// Kept in sync with `games` in schema.ts. No migration tool: one table, created on first open.
const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    developer TEXT NOT NULL,
    genre TEXT NOT NULL,
    monthly_revenue_usd REAL NOT NULL,
    monthly_downloads INTEGER NOT NULL,
    average_rating REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`;

/** Opens (or creates) a database at `filename` and ensures the games table exists. */
export function createDb(filename: string): Db {
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(CREATE_TABLE);
  return drizzle({ client: sqlite, schema });
}

export function seedGames(db: Db): void {
  const now = new Date().toISOString();
  db.insert(schema.games)
    .values(SEED_GAMES.map((game) => ({ ...game, created_at: now, updated_at: now })))
    .run();
}

const globalForDb = globalThis as unknown as { gamesDb?: Db };

/**
 * The app's database. Seeds only when the file did not exist yet, so a catalog the operator
 * has emptied stays empty after a restart. Cached on globalThis to survive dev hot reloads.
 */
export function getDb(): Db {
  if (!globalForDb.gamesDb) {
    const isNew = !existsSync(DB_FILE);
    mkdirSync(path.dirname(DB_FILE), { recursive: true });
    const db = createDb(DB_FILE);
    if (isNew) seedGames(db);
    globalForDb.gamesDb = db;
  }
  return globalForDb.gamesDb;
}
