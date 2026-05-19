import type Database from "better-sqlite3";
import { getDb } from "@/lib/db/client";
import type { Game, GameUpdate, NewGame } from "@/lib/games/types";

export interface GamesRepository {
  list(): Game[];
  findById(id: string): Game | null;
  create(input: NewGame): Game;
  update(id: string, input: GameUpdate): Game | null;
  delete(id: string): boolean;
}

type GameRow = {
  id: string;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;
  monthly_downloads: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
};

function rowToGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    developer: row.developer,
    genre: row.genre,
    monthly_revenue_usd: row.monthly_revenue_usd,
    monthly_downloads: row.monthly_downloads,
    average_rating: row.average_rating,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class SqliteGamesRepository implements GamesRepository {
  private readonly listStmt: Database.Statement;
  private readonly findByIdStmt: Database.Statement;
  private readonly insertStmt: Database.Statement;
  private readonly updateStmt: Database.Statement;
  private readonly deleteStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.listStmt = db.prepare("SELECT * FROM games ORDER BY created_at DESC");
    this.findByIdStmt = db.prepare("SELECT * FROM games WHERE id = ?");
    this.insertStmt = db.prepare(`
      INSERT INTO games (id, title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating, created_at, updated_at)
      VALUES (@id, @title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating, datetime('now'), datetime('now'))
    `);
    this.updateStmt = db.prepare(`
      UPDATE games
      SET title = @title,
          developer = @developer,
          genre = @genre,
          monthly_revenue_usd = @monthly_revenue_usd,
          monthly_downloads = @monthly_downloads,
          average_rating = @average_rating,
          updated_at = datetime('now')
      WHERE id = @id
    `);
    this.deleteStmt = db.prepare("DELETE FROM games WHERE id = ?");
  }

  list(): Game[] {
    return (this.listStmt.all() as GameRow[]).map(rowToGame);
  }

  findById(id: string): Game | null {
    const row = this.findByIdStmt.get(id) as GameRow | undefined;
    return row ? rowToGame(row) : null;
  }

  create(input: NewGame): Game {
    const id = crypto.randomUUID();
    this.insertStmt.run({ id, ...input });
    return this.findById(id) as Game;
  }

  update(id: string, input: GameUpdate): Game | null {
    const result = this.updateStmt.run({ id, ...input });
    if (result.changes === 0) return null;
    return this.findById(id) as Game;
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}

let repository: GamesRepository | undefined;

export function getGamesRepository(): GamesRepository {
  if (!repository) {
    repository = new SqliteGamesRepository(getDb());
  }
  return repository;
}
