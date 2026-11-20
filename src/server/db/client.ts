import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type Db = Database.Database;

export const DEFAULT_DB_PATH = 'data/games.db';

// Resolved from the repo root, which is the cwd for `next dev`, Vitest and the npm scripts.
const SCHEMA_PATH = path.join(process.cwd(), 'src/server/db/schema.sql');

export function dbPath(): string {
  return process.env.DB_PATH || DEFAULT_DB_PATH;
}

/** Opens a database and creates the table if it's missing. Pass ':memory:' in tests. */
export function openDatabase(file: string = dbPath()): Db {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

// `next dev` re-evaluates modules on every change; keeping the connection on globalThis
// stops each reload from opening another handle to the same file.
const globalForDb = globalThis as typeof globalThis & { __gamesDb?: Db };

export function getDb(): Db {
  globalForDb.__gamesDb ??= openDatabase();
  return globalForDb.__gamesDb;
}
