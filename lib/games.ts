import 'server-only';
import { getDb, SQL_NOW } from './db';
import type { Game, GameInput } from './types';

export type SortField = 'monthly_revenue_usd' | 'monthly_downloads' | 'average_rating' | 'title';

export interface GameFilters {
  genre?: string;
  developer?: string;
  minRating?: number;
  maxRating?: number;
  minRevenue?: number;
  search?: string; // LIKE sobre title
  sortBy?: SortField;
  order?: 'asc' | 'desc';
  limit?: number;
}

export interface GameStats {
  count: number;
  total_revenue_usd: number;
  avg_revenue_usd: number;
  total_downloads: number;
  avg_rating: number;
}

type StatsFilters = Omit<GameFilters, 'sortBy' | 'order' | 'limit'>;
type SqlParam = string | number;

const COLUMNS = 'id, title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating, created_at, updated_at';
const MAX_LIMIT = 100;

// Column names cannot be bound, so ORDER BY only ever takes values from this map.
const SORT_COLUMNS: Record<SortField, string> = {
  monthly_revenue_usd: 'monthly_revenue_usd',
  monthly_downloads: 'monthly_downloads',
  average_rating: 'average_rating',
  title: 'title COLLATE NOCASE',
};

const UPDATABLE_FIELDS = [
  'title',
  'developer',
  'genre',
  'monthly_revenue_usd',
  'monthly_downloads',
  'average_rating',
] as const satisfies readonly (keyof GameInput)[];

function toGame(row: Game): Game {
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

/** LIKE pattern matching `text` literally anywhere. Pair it with ESCAPE '\'. */
function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`;
}

function buildWhere(filters: StatsFilters): { where: string; params: SqlParam[] } {
  const conditions: string[] = [];
  const params: SqlParam[] = [];
  const add = (condition: string, param: SqlParam) => {
    conditions.push(condition);
    params.push(param);
  };

  if (filters.genre !== undefined) add('genre = ? COLLATE NOCASE', filters.genre);
  // Partial on purpose: people and the LLM rarely write the full studio name.
  if (filters.developer !== undefined) add(`developer LIKE ? ESCAPE '\\'`, containsPattern(filters.developer));
  // Exclusive on purpose: "rated above 4" must not include 4.0.
  if (filters.minRating !== undefined) add('average_rating > ?', filters.minRating);
  if (filters.maxRating !== undefined) add('average_rating <= ?', filters.maxRating);
  if (filters.minRevenue !== undefined) add('monthly_revenue_usd >= ?', filters.minRevenue);
  // SQLite's LIKE is already case-insensitive for ASCII.
  if (filters.search !== undefined) add(`title LIKE ? ESCAPE '\\'`, containsPattern(filters.search));

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function resolveLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return MAX_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

export function listGames(filters: GameFilters = {}): Game[] {
  const { where, params } = buildWhere(filters);
  // Object.hasOwn stops names like "constructor" from resolving through the prototype.
  const sortColumn = filters.sortBy && Object.hasOwn(SORT_COLUMNS, filters.sortBy) ? SORT_COLUMNS[filters.sortBy] : null;
  const direction = filters.order === 'desc' ? 'DESC' : 'ASC';
  const orderBy = sortColumn ? `${sortColumn} ${direction}, id ASC` : 'id ASC';

  return getDb()
    .prepare<SqlParam[], Game>(`SELECT ${COLUMNS} FROM games ${where} ORDER BY ${orderBy} LIMIT ?`)
    .all(...params, resolveLimit(filters.limit))
    .map(toGame);
}

export function getGame(id: number): Game | null {
  const row = getDb().prepare<[number], Game>(`SELECT ${COLUMNS} FROM games WHERE id = ?`).get(id);
  return row ? toGame(row) : null;
}

export function createGame(input: GameInput): Game {
  const row = getDb()
    .prepare<[GameInput], Game>(
      `INSERT INTO games (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating)
       VALUES (@title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating)
       RETURNING ${COLUMNS}`,
    )
    .get({
      title: input.title,
      developer: input.developer,
      genre: input.genre,
      monthly_revenue_usd: input.monthly_revenue_usd,
      monthly_downloads: input.monthly_downloads,
      average_rating: input.average_rating,
    });
  if (!row) throw new Error('INSERT ... RETURNING produced no row');
  return toGame(row);
}

export function updateGame(id: number, input: Partial<GameInput>): Game | null {
  const fields = UPDATABLE_FIELDS.filter((field) => input[field] !== undefined);
  if (fields.length === 0) return getGame(id);

  const assignments = fields.map((field) => `${field} = @${field}`).join(', ');
  const params: Record<string, SqlParam> = { id };
  for (const field of fields) {
    const value = input[field];
    if (value !== undefined) params[field] = value;
  }

  const row = getDb()
    .prepare<[Record<string, SqlParam>], Game>(
      `UPDATE games SET ${assignments}, updated_at = ${SQL_NOW} WHERE id = @id RETURNING ${COLUMNS}`,
    )
    .get(params);
  return row ? toGame(row) : null;
}

export function deleteGame(id: number): boolean {
  return getDb().prepare('DELETE FROM games WHERE id = ?').run(id).changes > 0;
}

export function getStats(filters: StatsFilters = {}): GameStats {
  const { where, params } = buildWhere(filters);
  // SUM and AVG are NULL without rows, hence COALESCE. Revenue totals are rounded too,
  // so floating point noise (0.30000000000000004) never reaches the UI or the chat.
  const row = getDb()
    .prepare<SqlParam[], GameStats>(
      `SELECT
         COUNT(*) AS count,
         ROUND(COALESCE(SUM(monthly_revenue_usd), 0), 2) AS total_revenue_usd,
         ROUND(COALESCE(AVG(monthly_revenue_usd), 0), 2) AS avg_revenue_usd,
         COALESCE(SUM(monthly_downloads), 0) AS total_downloads,
         ROUND(COALESCE(AVG(average_rating), 0), 2) AS avg_rating
       FROM games ${where}`,
    )
    .get(...params);
  if (!row) throw new Error('Aggregate query produced no row');
  return row;
}

export function findGamesByTitles(titles: string[]): Game[] {
  // A blank title would become '%%' and match the whole catalog.
  const patterns = titles.map((title) => title.trim()).filter(Boolean).map(containsPattern);
  if (patterns.length === 0) return [];

  const conditions = patterns.map(() => `title LIKE ? ESCAPE '\\'`).join(' OR ');
  return getDb()
    .prepare<string[], Game>(`SELECT ${COLUMNS} FROM games WHERE ${conditions} ORDER BY id ASC`)
    .all(...patterns)
    .map(toGame);
}

export function listGenres(): string[] {
  // Grouped NOCASE to match the genre filter: "Puzzle" and "puzzle" are one genre.
  return getDb()
    .prepare<[], { genre: string }>('SELECT MIN(genre) AS genre FROM games GROUP BY genre COLLATE NOCASE ORDER BY 1 COLLATE NOCASE')
    .all()
    .map((row) => row.genre);
}
