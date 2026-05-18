import Database from "better-sqlite3";
import path from "path";
import type { Game, GameInput } from "./types";

const DB_PATH = path.join(process.cwd(), "games.db");

let _db: ReturnType<typeof Database> | null = null;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: ReturnType<typeof Database>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      title               TEXT    NOT NULL,
      developer           TEXT    NOT NULL,
      genre               TEXT    NOT NULL,
      monthly_revenue_usd REAL    NOT NULL DEFAULT 0,
      monthly_downloads   INTEGER NOT NULL DEFAULT 0,
      average_rating      REAL    NOT NULL DEFAULT 0,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const count = (db.prepare("SELECT COUNT(*) as c FROM games").get() as { c: number }).c;
  if (count === 0) seedGames(db);
}

function seedGames(db: ReturnType<typeof Database>) {
  const insert = db.prepare(`
    INSERT INTO games (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating)
    VALUES (@title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating)
  `);

  const seeds = [
    { title: "Hollow Knight", developer: "Team Cherry", genre: "Metroidvania", monthly_revenue_usd: 42000, monthly_downloads: 15000, average_rating: 4.8 },
    { title: "Celeste", developer: "Maddy Makes Games", genre: "Platformer", monthly_revenue_usd: 31500, monthly_downloads: 12000, average_rating: 4.9 },
    { title: "Stardew Valley", developer: "ConcernedApe", genre: "Simulation", monthly_revenue_usd: 98000, monthly_downloads: 45000, average_rating: 4.9 },
    { title: "Undertale", developer: "Toby Fox", genre: "RPG", monthly_revenue_usd: 27000, monthly_downloads: 9500, average_rating: 4.7 },
    { title: "Shovel Knight", developer: "Yacht Club Games", genre: "Platformer", monthly_revenue_usd: 18500, monthly_downloads: 7200, average_rating: 4.6 },
    { title: "Dead Cells", developer: "Motion Twin", genre: "Roguelite", monthly_revenue_usd: 55000, monthly_downloads: 22000, average_rating: 4.7 },
    { title: "Hades", developer: "Supergiant Games", genre: "Roguelite", monthly_revenue_usd: 87000, monthly_downloads: 38000, average_rating: 4.9 },
    { title: "Cuphead", developer: "Studio MDHR", genre: "Run & Gun", monthly_revenue_usd: 63000, monthly_downloads: 28000, average_rating: 4.6 },
    { title: "Ori and the Blind Forest", developer: "Moon Studios", genre: "Metroidvania", monthly_revenue_usd: 22000, monthly_downloads: 8800, average_rating: 4.8 },
    { title: "Among Us", developer: "Innersloth", genre: "Social Deduction", monthly_revenue_usd: 112000, monthly_downloads: 95000, average_rating: 4.1 },
    { title: "Terraria", developer: "Re-Logic", genre: "Sandbox", monthly_revenue_usd: 76000, monthly_downloads: 33000, average_rating: 4.8 },
    { title: "Spelunky 2", developer: "Mossmouth", genre: "Roguelite", monthly_revenue_usd: 19000, monthly_downloads: 6500, average_rating: 4.5 },
  ];

  const insertMany = db.transaction((rows: typeof seeds) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(seeds);
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export interface GetGamesFilter {
  genre?: string;
  min_rating?: number;
}

export function getGames(filter: GetGamesFilter): Game[] {
  const db = getDb();
  let sql = "SELECT * FROM games WHERE 1=1";
  const params: (string | number)[] = [];

  if (filter.genre) {
    sql += " AND genre = ?";
    params.push(filter.genre);
  }
  if (filter.min_rating !== undefined) {
    sql += " AND average_rating >= ?";
    params.push(filter.min_rating);
  }
  sql += " ORDER BY created_at DESC";

  return db.prepare(sql).all(...params) as Game[];
}

export function getGameById(id: number): Game | undefined {
  return getDb().prepare("SELECT * FROM games WHERE id = ?").get(id) as Game | undefined;
}

export function getGameByTitle(title: string): Game | undefined {
  return getDb()
    .prepare("SELECT * FROM games WHERE LOWER(title) = LOWER(?)")
    .get(title) as Game | undefined;
}

export function createGame(input: GameInput): Game {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO games (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating)
    VALUES (@title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating)
  `).run(input);
  return getGameById(result.lastInsertRowid as number)!;
}

const ALLOWED_UPDATE_FIELDS = new Set<string>([
  "title", "developer", "genre",
  "monthly_revenue_usd", "monthly_downloads", "average_rating",
]);

export function updateGame(id: number, input: Partial<GameInput>): Game | undefined {
  const db = getDb();
  const safe = Object.fromEntries(
    Object.entries(input).filter(([k]) => ALLOWED_UPDATE_FIELDS.has(k))
  );
  const fields = Object.keys(safe).map((k) => `${k} = @${k}`).join(", ");
  if (!fields) return getGameById(id);
  db.prepare(`UPDATE games SET ${fields} WHERE id = @id`).run({ ...safe, id });
  return getGameById(id);
}

export function deleteGame(id: number): boolean {
  const result = getDb().prepare("DELETE FROM games WHERE id = ?").run(id);
  return result.changes > 0;
}

export interface GameStats {
  total_games: number;
  top_revenue: Game | null;
  top_downloads: Game | null;
  avg_rating: number;
  genres: { genre: string; count: number }[];
}

export function getStats(): GameStats {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as c FROM games").get() as { c: number }).c;
  const topRevenue = db.prepare("SELECT * FROM games ORDER BY monthly_revenue_usd DESC LIMIT 1").get() as Game | null;
  const topDownloads = db.prepare("SELECT * FROM games ORDER BY monthly_downloads DESC LIMIT 1").get() as Game | null;
  const avgRating = (db.prepare("SELECT AVG(average_rating) as avg FROM games").get() as { avg: number }).avg;
  const genres = db.prepare("SELECT genre, COUNT(*) as count FROM games GROUP BY genre ORDER BY count DESC").all() as { genre: string; count: number }[];

  return { total_games: total, top_revenue: topRevenue, top_downloads: topDownloads, avg_rating: avgRating, genres };
}
