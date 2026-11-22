import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

function getDefaultDbPath(): string {
  return process.env.GAMES_DB_PATH || path.join(process.cwd(), 'data', 'games.db');
}

/**
 * Initializes and configures a SQLite DatabaseSync instance with the required schema.
 * Supports ':memory:' or custom file paths for test isolation.
 */
export function createDatabase(dbPath: string = getDefaultDbPath()): DatabaseSync {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Enable WAL mode on disk files for higher concurrency and performance
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  // Schema creation: 6 required fields + id + audit timestamps
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      developer TEXT NOT NULL,
      genre TEXT NOT NULL,
      monthly_revenue_usd REAL NOT NULL DEFAULT 0,
      monthly_downloads INTEGER NOT NULL DEFAULT 0,
      average_rating REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
    CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
    CREATE INDEX IF NOT EXISTS idx_games_rating ON games(average_rating);
    CREATE INDEX IF NOT EXISTS idx_games_revenue ON games(monthly_revenue_usd);
  `);

  return db;
}

let defaultDbInstance: DatabaseSync | null = null;

/**
 * Returns the application default database singleton.
 * Isolated from tests which supply their own in-memory or ephemeral databases.
 */
export function getDatabase(): DatabaseSync {
  if (!defaultDbInstance) {
    defaultDbInstance = createDatabase();
  }
  return defaultDbInstance;
}

/**
 * Closes a database instance. Useful in test teardown.
 */
export function closeDatabase(db: DatabaseSync): void {
  try {
    db.close();
  } catch {
    // Ignore close errors if already closed
  }
  if (defaultDbInstance === db) {
    defaultDbInstance = null;
  }
}
