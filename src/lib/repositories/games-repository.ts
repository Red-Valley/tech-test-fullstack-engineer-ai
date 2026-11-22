import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/db';
import type { Game, CreateGameInput, UpdateGameInput, GameFilter, CatalogStats } from '@/lib/types';

interface RawGameRow {
  id: string;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;
  monthly_downloads: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

function mapRowToGame(row: RawGameRow): Game {
  return {
    id: String(row.id),
    title: String(row.title),
    developer: String(row.developer),
    genre: String(row.genre),
    monthly_revenue_usd: Number(row.monthly_revenue_usd),
    monthly_downloads: Number(row.monthly_downloads),
    average_rating: Number(row.average_rating),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * GamesRepository provides parameterized, injection-safe SQL operations over the games catalog.
 * Accepts an optional DatabaseSync instance for test isolation.
 */
export class GamesRepository {
  private db: DatabaseSync;

  constructor(customDb?: DatabaseSync) {
    this.db = customDb || getDatabase();
  }

  /**
   * Retrieves games matching optional search, genre, rating, and revenue filters.
   */
  findAll(filters: GameFilter = {}): Game[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.search) {
      conditions.push('(title LIKE ? OR developer LIKE ?)');
      const pattern = `%${filters.search}%`;
      params.push(pattern, pattern);
    }

    if (filters.genre) {
      conditions.push('genre = ?');
      params.push(filters.genre);
    }

    // Strict inequality: average_rating > rating_above
    if (filters.rating_above !== undefined) {
      conditions.push('average_rating > ?');
      params.push(filters.rating_above);
    }

    if (filters.min_rating !== undefined) {
      conditions.push('average_rating >= ?');
      params.push(filters.min_rating);
    }

    if (filters.max_rating !== undefined) {
      conditions.push('average_rating <= ?');
      params.push(filters.max_rating);
    }

    if (filters.min_revenue !== undefined) {
      conditions.push('monthly_revenue_usd >= ?');
      params.push(filters.min_revenue);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortFields = [
      'title',
      'developer',
      'genre',
      'monthly_revenue_usd',
      'monthly_downloads',
      'average_rating',
      'created_at',
    ];
    const sortBy = filters.sort_by && allowedSortFields.includes(filters.sort_by)
      ? filters.sort_by
      : 'created_at';
    const order = filters.order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let sql = `SELECT * FROM games ${whereClause} ORDER BY ${sortBy} ${order}`;

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as unknown as RawGameRow[];
    return rows.map(mapRowToGame);
  }

  /**
   * Finds a game by its primary key ID.
   */
  findById(id: string): Game | null {
    const stmt = this.db.prepare('SELECT * FROM games WHERE id = ? LIMIT 1');
    const row = stmt.get(id) as unknown as RawGameRow | undefined;
    return row ? mapRowToGame(row) : null;
  }

  /**
   * Finds a game by title (case-insensitive fuzzy or exact).
   */
  findByTitle(title: string): Game | null {
    const stmt = this.db.prepare('SELECT * FROM games WHERE LOWER(title) = LOWER(?) LIMIT 1');
    const row = stmt.get(title.trim()) as unknown as RawGameRow | undefined;
    return row ? mapRowToGame(row) : null;
  }

  /**
   * Inserts a new game record with all required fields.
   */
  create(input: CreateGameInput & { id?: string }): Game {
    const id = input.id || randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO games (
        id, title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.title.trim(),
      input.developer.trim(),
      input.genre.trim(),
      input.monthly_revenue_usd,
      input.monthly_downloads,
      input.average_rating,
      now,
      now
    );

    const created = this.findById(id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created game with id: ${id}`);
    }
    return created;
  }

  /**
   * Updates an existing game record partially.
   */
  update(id: string, input: UpdateGameInput): Game | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title.trim());
    }
    if (input.developer !== undefined) {
      updates.push('developer = ?');
      params.push(input.developer.trim());
    }
    if (input.genre !== undefined) {
      updates.push('genre = ?');
      params.push(input.genre.trim());
    }
    if (input.monthly_revenue_usd !== undefined) {
      updates.push('monthly_revenue_usd = ?');
      params.push(input.monthly_revenue_usd);
    }
    if (input.monthly_downloads !== undefined) {
      updates.push('monthly_downloads = ?');
      params.push(input.monthly_downloads);
    }
    if (input.average_rating !== undefined) {
      updates.push('average_rating = ?');
      params.push(input.average_rating);
    }

    if (updates.length === 0) {
      return existing;
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    params.push(now);

    params.push(id);
    const sql = `UPDATE games SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...params);

    return this.findById(id);
  }

  /**
   * Deletes a game by ID.
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM games WHERE id = ?');
    stmt.run(id);
    return this.findById(id) === null;
  }

  /**
   * Counts games satisfying filter criteria.
   * Crucial for question: "How many games are rated above 4?" (strict > 4.0).
   */
  count(filters: {
    genre?: string;
    rating_above?: number;
    min_rating?: number;
    max_rating?: number;
    min_revenue?: number;
  } = {}): number {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.genre) {
      conditions.push('genre = ?');
      params.push(filters.genre);
    }

    // Strict inequality: average_rating > rating_above
    if (filters.rating_above !== undefined) {
      conditions.push('average_rating > ?');
      params.push(filters.rating_above);
    }

    if (filters.min_rating !== undefined) {
      conditions.push('average_rating >= ?');
      params.push(filters.min_rating);
    }

    if (filters.max_rating !== undefined) {
      conditions.push('average_rating <= ?');
      params.push(filters.max_rating);
    }

    if (filters.min_revenue !== undefined) {
      conditions.push('monthly_revenue_usd >= ?');
      params.push(filters.min_revenue);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*) as count FROM games ${whereClause}`;
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as { count: number };
    return Number(result.count || 0);
  }

  /**
   * Retrieves top ranked games by specified metric.
   */
  getTop(
    metric: 'monthly_revenue_usd' | 'monthly_downloads' | 'average_rating',
    order: 'asc' | 'desc' = 'desc',
    limit: number = 5
  ): Game[] {
    const allowedMetrics = ['monthly_revenue_usd', 'monthly_downloads', 'average_rating'];
    const safeMetric = allowedMetrics.includes(metric) ? metric : 'monthly_revenue_usd';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';
    const safeLimit = Math.max(1, Math.min(50, limit));

    const sql = `SELECT * FROM games ORDER BY ${safeMetric} ${safeOrder} LIMIT ?`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(safeLimit) as unknown as RawGameRow[];
    return rows.map(mapRowToGame);
  }

  /**
   * Retrieves multiple games by titles or IDs for comparison.
   */
  compare(titlesOrIds: string[]): Game[] {
    if (!titlesOrIds || titlesOrIds.length === 0) {
      return [];
    }

    const games: Game[] = [];
    const seenIds = new Set<string>();

    for (const item of titlesOrIds) {
      const clean = item.trim();
      if (!clean) continue;

      let game = this.findById(clean);
      if (!game) {
        game = this.findByTitle(clean);
      }
      if (!game) {
        // Try substring match on title
        const stmt = this.db.prepare('SELECT * FROM games WHERE LOWER(title) LIKE ? LIMIT 1');
        const row = stmt.get(`%${clean.toLowerCase()}%`) as unknown as RawGameRow | undefined;
        if (row) game = mapRowToGame(row);
      }

      if (game && !seenIds.has(game.id)) {
        seenIds.add(game.id);
        games.push(game);
      }
    }

    return games;
  }

  /**
   * Computes aggregate catalog metrics.
   */
  getStats(): CatalogStats {
    const totalStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_games,
        COALESCE(SUM(monthly_revenue_usd), 0) as total_revenue,
        COALESCE(AVG(monthly_downloads), 0) as avg_downloads,
        COALESCE(AVG(average_rating), 0) as avg_rating
      FROM games
    `);
    const totalResult = totalStmt.get() as {
      total_games: number;
      total_revenue: number;
      avg_downloads: number;
      avg_rating: number;
    };

    const genreStmt = this.db.prepare(`
      SELECT genre, COUNT(*) as count 
      FROM games 
      GROUP BY genre 
      ORDER BY count DESC
    `);
    const genreRows = genreStmt.all() as { genre: string; count: number }[];

    return {
      total_games: Number(totalResult.total_games || 0),
      total_monthly_revenue_usd: Number(totalResult.total_revenue || 0),
      average_monthly_downloads: Math.round(Number(totalResult.avg_downloads || 0)),
      average_rating: Number(Number(totalResult.avg_rating || 0).toFixed(2)),
      genre_breakdown: genreRows.map((r) => ({ genre: String(r.genre), count: Number(r.count) })),
    };
  }
}
