import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { getDb } from '@/lib/db';
import type {
    CatalogStats,
    CreateGameInput,
    Game,
    GameListFilter,
    UpdateGameInput,
} from '@/types/game';

const ALLOWED_SORT_COLUMNS = new Set([
    'title',
    'developer',
    'genre',
    'monthly_revenue_usd',
    'monthly_downloads',
    'average_rating',
    'updated_at',
]);

function normalizeRow<T extends Record<string, unknown>>(row: T): T {
    return { ...row };
}

export function listGames(filter: GameListFilter = {}, database: DatabaseSync = getDb()): Game[] {
    const conditions: string[] = [];
    const params: Record<string, SQLInputValue> = {};

    if (filter.search?.trim()) {
        conditions.push(
            '(LOWER(title) LIKE :search OR LOWER(developer) LIKE :search OR LOWER(genre) LIKE :search OR LOWER(description) LIKE :search)',
        );
        params.search = `%${filter.search.trim().toLowerCase()}%`;
    }

    if (filter.genre?.trim() && filter.genre.trim().toLowerCase() !== 'all') {
        conditions.push('LOWER(genre) = :genre');
        params.genre = filter.genre.trim().toLowerCase();
    }

    if (typeof filter.minRating === 'number' && !Number.isNaN(filter.minRating)) {
        conditions.push('average_rating >= :minRating');
        params.minRating = filter.minRating;
    }

    if (typeof filter.maxRating === 'number' && !Number.isNaN(filter.maxRating)) {
        conditions.push('average_rating <= :maxRating');
        params.maxRating = filter.maxRating;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortBy =
        filter.sortBy && ALLOWED_SORT_COLUMNS.has(filter.sortBy)
            ? filter.sortBy
            : 'monthly_revenue_usd';
    const sortOrder = filter.sortOrder === 'asc' ? 'ASC' : 'DESC';

    let limitClause = '';
    if (typeof filter.limit === 'number' && filter.limit > 0) {
        limitClause = 'LIMIT :limit';
        params.limit = Math.floor(filter.limit);
    }

    const sql = `
    SELECT * FROM games
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}, id ASC
    ${limitClause}
  `;

    const rows = database.prepare(sql).all(params) as Game[];
    return rows.map((r) => normalizeRow(r));
}

export function getGameById(id: number, database: DatabaseSync = getDb()): Game | null {
    const row = database.prepare('SELECT * FROM games WHERE id = ?').get(id) as Game | undefined;
    return row ? normalizeRow(row) : null;
}

export function findGamesByTitle(query: string, database: DatabaseSync = getDb()): Game[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    const rows = database
        .prepare(
            `SELECT * FROM games
       WHERE LOWER(title) = :exact
          OR LOWER(title) LIKE :partial
       ORDER BY
         CASE WHEN LOWER(title) = :exact THEN 0 ELSE 1 END,
         monthly_revenue_usd DESC`,
        )
        .all({ exact: trimmed, partial: `%${trimmed}%` }) as Game[];
    return rows.map((r) => normalizeRow(r));
}

export function createGame(input: CreateGameInput, database: DatabaseSync = getDb()): Game {
    const result = database
        .prepare(
            `INSERT INTO games (
        title, developer, genre, description, monthly_revenue_usd, monthly_downloads, average_rating
      ) VALUES (
        :title, :developer, :genre, :description, :monthly_revenue_usd, :monthly_downloads, :average_rating
      )`,
        )
        .run({
            title: input.title,
            developer: input.developer,
            genre: input.genre,
            description: input.description ?? '',
            monthly_revenue_usd: input.monthly_revenue_usd,
            monthly_downloads: input.monthly_downloads,
            average_rating: input.average_rating,
        });

    const created = getGameById(Number(result.lastInsertRowid), database);
    if (!created) {
        throw new Error('Failed to retrieve newly created game');
    }
    return created;
}

export function updateGame(
    id: number,
    input: UpdateGameInput,
    database: DatabaseSync = getDb(),
): Game | null {
    const existing = getGameById(id, database);
    if (!existing) return null;

    const fields = Object.keys(input) as Array<keyof UpdateGameInput>;
    if (fields.length === 0) return existing;

    const setClauses = fields.map((field) => `${field} = :${field}`);
    setClauses.push("updated_at = datetime('now')");

    const params: Record<string, SQLInputValue> = { id };
    for (const field of fields) {
        const val = input[field];
        if (val !== undefined) {
            params[field] = val;
        }
    }

    database.prepare(`UPDATE games SET ${setClauses.join(', ')} WHERE id = :id`).run(params);

    return getGameById(id, database);
}

export function deleteGame(id: number, database: DatabaseSync = getDb()): boolean {
    const result = database.prepare('DELETE FROM games WHERE id = ?').run(id);
    return Number(result.changes) > 0;
}

export function getCatalogStats(database: DatabaseSync = getDb()): CatalogStats {
    const summary = database
        .prepare(
            `SELECT
        COUNT(*) as total_games,
        COALESCE(SUM(monthly_revenue_usd), 0) as total_monthly_revenue_usd,
        COALESCE(SUM(monthly_downloads), 0) as total_monthly_downloads,
        COALESCE(AVG(average_rating), 0) as average_rating
       FROM games`,
        )
        .get() as {
        total_games: number;
        total_monthly_revenue_usd: number;
        total_monthly_downloads: number;
        average_rating: number;
    };

    const highestRevenue =
        (database
            .prepare('SELECT * FROM games ORDER BY monthly_revenue_usd DESC, id ASC LIMIT 1')
            .get() as Game | undefined) ?? null;

    const highestRated =
        (database
            .prepare(
                'SELECT * FROM games ORDER BY average_rating DESC, monthly_revenue_usd DESC LIMIT 1',
            )
            .get() as Game | undefined) ?? null;

    const genres = database
        .prepare(
            `SELECT
        genre,
        COUNT(*) as count,
        COALESCE(SUM(monthly_revenue_usd), 0) as total_revenue_usd,
        COALESCE(SUM(monthly_downloads), 0) as total_downloads,
        COALESCE(AVG(average_rating), 0) as avg_rating
       FROM games
       GROUP BY genre
       ORDER BY total_revenue_usd DESC`,
        )
        .all() as CatalogStats['genres'];

    return {
        total_games: Number(summary.total_games),
        total_monthly_revenue_usd: Number(summary.total_monthly_revenue_usd),
        total_monthly_downloads: Number(summary.total_monthly_downloads),
        average_rating: Number(Number(summary.average_rating).toFixed(2)),
        highest_revenue_game: highestRevenue ? normalizeRow(highestRevenue) : null,
        highest_rated_game: highestRated ? normalizeRow(highestRated) : null,
        genres: genres.map((g) => ({
            genre: g.genre,
            count: Number(g.count),
            total_revenue_usd: Number(g.total_revenue_usd),
            total_downloads: Number(g.total_downloads),
            avg_rating: Number(Number(g.avg_rating).toFixed(2)),
        })),
    };
}
