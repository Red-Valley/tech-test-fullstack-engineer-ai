import type { Statement } from 'better-sqlite3';
import { getDb, type Db } from '@/server/db/client';
import { ConflictError } from '@/server/http/errors';
import type { GameDto, GameInputDto } from '@/shared/types/game.dto';

export const GAME_SORT_FIELDS = ['revenue', 'downloads', 'rating', 'title', 'genre'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type GameSortBy = (typeof GAME_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export type GameFilters = {
  genre?: string;
  minRating?: number;
  maxRating?: number;
  /** Case-insensitive substring of the title. */
  q?: string;
  sortBy?: GameSortBy;
  order?: SortOrder;
};

// better-sqlite3 returns rows as `unknown`; this mirrors schema.sql, which is why the
// `as GameRow` casts below are safe.
type GameRow = {
  id: number;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;
  monthly_downloads: number;
  average_rating: number;
};

const COLUMNS =
  'id, title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating';

const SORT_COLUMNS: Record<GameSortBy, string> = {
  revenue: 'monthly_revenue_usd',
  downloads: 'monthly_downloads',
  rating: 'average_rating',
  title: 'title',
  genre: 'genre',
};

// Every filter is a bound parameter that is ignored when NULL, so a single static WHERE
// covers every combination. Column names can't be bound, so ORDER BY comes from the fixed
// map above (one prepared statement per sort/order pair), never from user input. Games in
// the same genre are listed by title so a genre sort reads naturally.
const LIST_WHERE = `
  WHERE (@genre IS NULL OR genre = @genre)
    AND (@minRating IS NULL OR average_rating >= @minRating)
    AND (@maxRating IS NULL OR average_rating <= @maxRating)
    AND (@q IS NULL OR title LIKE '%' || @q || '%' ESCAPE '\\')`;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

const isUniqueViolation = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'SQLITE_CONSTRAINT_UNIQUE';

const toDto = (row: GameRow): GameDto => ({
  id: row.id,
  title: row.title,
  developer: row.developer,
  genre: row.genre as GameDto['genre'], // only Zod-validated genres are ever written
  monthly_revenue_usd: row.monthly_revenue_usd,
  monthly_downloads: row.monthly_downloads,
  average_rating: row.average_rating,
});

export function createGamesRepository(db: Db) {
  const listStatements = new Map<string, Statement>();
  const listStatement = (sortBy: GameSortBy, order: SortOrder) => {
    const key = `${sortBy}:${order}`;
    let statement = listStatements.get(key);
    if (!statement) {
      // Callers validate sortBy, but fail loudly here rather than build "ORDER BY undefined".
      if (!Object.hasOwn(SORT_COLUMNS, sortBy)) throw new Error(`Unknown sort field: ${sortBy}`);
      const direction = order === 'asc' ? 'ASC' : 'DESC';
      statement = db.prepare(
        `SELECT ${COLUMNS} FROM games ${LIST_WHERE} ORDER BY ${SORT_COLUMNS[sortBy]} ${direction}${sortBy === 'genre' ? ', title ASC' : ''}, id ASC`,
      );
      listStatements.set(key, statement);
    }
    return statement;
  };

  const byId = db.prepare(`SELECT ${COLUMNS} FROM games WHERE id = ?`);
  const insert = db.prepare(
    `INSERT INTO games (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating)
     VALUES (@title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating)`,
  );
  const replace = db.prepare(
    `UPDATE games SET title = @title, developer = @developer, genre = @genre,
       monthly_revenue_usd = @monthly_revenue_usd, monthly_downloads = @monthly_downloads,
       average_rating = @average_rating
     WHERE id = @id`,
  );
  const remove = db.prepare('DELETE FROM games WHERE id = ?');
  const deleteEverything = db.prepare('DELETE FROM games');
  // AUTOINCREMENT keeps its counter in sqlite_sequence; clearing it restarts ids at 1.
  const resetIds = db.prepare("DELETE FROM sqlite_sequence WHERE name = 'games'");

  const conflict = (title: string) => new ConflictError(`A game titled "${title}" already exists`);

  return {
    list(filters: GameFilters = {}): GameDto[] {
      const rows = listStatement(filters.sortBy ?? 'title', filters.order ?? 'asc').all({
        genre: filters.genre ?? null,
        minRating: filters.minRating ?? null,
        maxRating: filters.maxRating ?? null,
        q: filters.q ? escapeLike(filters.q) : null,
      }) as GameRow[];
      return rows.map(toDto);
    },

    findById(id: number): GameDto | null {
      const row = byId.get(id) as GameRow | undefined;
      return row ? toDto(row) : null;
    },

    create(input: GameInputDto): GameDto {
      try {
        const { lastInsertRowid } = insert.run(input);
        const created = byId.get(lastInsertRowid) as GameRow;
        return toDto(created);
      } catch (error) {
        if (isUniqueViolation(error)) throw conflict(input.title);
        throw error;
      }
    },

    /** Full replacement (PUT semantics). Returns null if the id doesn't exist. */
    update(id: number, input: GameInputDto): GameDto | null {
      try {
        const { changes } = replace.run({ ...input, id });
        return changes === 0 ? null : toDto(byId.get(id) as GameRow);
      } catch (error) {
        if (isUniqueViolation(error)) throw conflict(input.title);
        throw error;
      }
    },

    /** Returns false if the id doesn't exist. */
    delete(id: number): boolean {
      return remove.run(id).changes > 0;
    },

    /** Inserts all games or none (single transaction). */
    createMany(inputs: GameInputDto[]): GameDto[] {
      return db.transaction(() => inputs.map((input) => this.create(input)))();
    },

    /**
     * Empties the table and restarts ids at 1. Used by db:reset instead of deleting the file,
     * so a running dev server keeps a valid connection and sees the new data immediately.
     */
    deleteAll(): void {
      db.transaction(() => {
        deleteEverything.run();
        resetIds.run();
      })();
    },
  };
}

export type GamesRepository = ReturnType<typeof createGamesRepository>;

// Cached per module, NOT on globalThis: `next dev` re-evaluates this module when it changes,
// and a globalThis cache would keep serving the old code (it once kept a sort map without
// 'genre' and produced "ORDER BY undefined"). The connection itself stays on globalThis.
let repository: GamesRepository | undefined;

export function getGamesRepository(): GamesRepository {
  repository ??= createGamesRepository(getDb());
  return repository;
}
