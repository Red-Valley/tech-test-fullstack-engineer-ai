import type { Db } from "@/lib/db";
import {
  NUMERIC_METRICS,
  SORT_FIELDS,
  type Game,
  type GameInput,
  type GameUpdate,
  type NumericMetric,
  type SortField,
} from "./schema";

/**
 * The single query layer for the catalog. The REST routes and the AI chat tools both go through it,
 * so a number shown on the dashboard and a number quoted by the assistant come from the same SQL.
 *
 * All user- or model-supplied *values* are bound as parameters. The only things interpolated into SQL
 * are column names and operators, and those are checked against closed lists first.
 */

export const NUMERIC_OPERATORS = ["gt", "gte", "lt", "lte", "eq"] as const;
export type NumericOperator = (typeof NUMERIC_OPERATORS)[number];

const SQL_OPERATORS: Record<NumericOperator, string> = { gt: ">", gte: ">=", lt: "<", lte: "<=", eq: "=" };

export const AGGREGATE_FUNCTIONS = ["count", "sum", "avg", "min", "max"] as const;
export type AggregateFn = (typeof AGGREGATE_FUNCTIONS)[number];

export const GROUP_FIELDS = ["genre", "developer"] as const;
export type GroupField = (typeof GROUP_FIELDS)[number];

export interface NumericFilter {
  field: NumericMetric;
  op: NumericOperator;
  value: number;
}

export interface GameFilter {
  /** Case-insensitive text matched against the title OR the developer. */
  search?: string;
  /** Case-insensitive exact genre. */
  genre?: string;
  /** All of these must hold. */
  numeric?: NumericFilter[];
}

export interface ListOptions extends GameFilter {
  sortBy?: SortField;
  order?: "asc" | "desc";
  limit?: number;
}

export interface AggregateOptions extends GameFilter {
  fn: AggregateFn;
  /** Required for every function except "count". */
  metric?: NumericMetric;
  groupBy?: GroupField;
}

export interface AggregateRow {
  /** The genre / developer, or null when the result is not grouped. */
  group: string | null;
  /** The aggregated value; null when no game matched (e.g. the average of nothing). */
  value: number | null;
  /** How many games went into this row. */
  games: number;
}

export type TitleMatch =
  | { query: string; status: "exact" | "partial"; game: Game }
  | { query: string; status: "ambiguous"; candidates: string[] }
  | { query: string; status: "not_found" };

export interface CatalogSummary {
  totalGames: number;
  genres: string[];
}

export class DuplicateTitleError extends Error {
  constructor(public readonly title: string) {
    super(`A game titled "${title}" already exists`);
    this.name = "DuplicateTitleError";
  }
}

/** A grouped aggregate returns at most this many rows. */
export const MAX_AGGREGATE_GROUPS = 50;
const MAX_TITLE_CANDIDATES = 5;

function assertOneOf<T extends string>(allowed: readonly T[], value: string, what: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`Invalid ${what}: ${value}`);
  }
  return value as T;
}

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * Case-insensitive text matching goes through `lower_unicode` (registered in db.ts) rather than SQLite's
 * LIKE / NOCASE, which only fold plain ASCII. That keeps "édition" and "ÉDITION" equal here exactly as the
 * dashboard's own search treats them. Both sides are lower-cased in JS: the pattern before it is bound,
 * the column by the SQL function.
 */
const fold = (text: string) => text.trim().toLowerCase();

function buildWhere(filter: GameFilter): { sql: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  const search = fold(filter.search ?? "");
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    clauses.push("(lower_unicode(title) LIKE ? ESCAPE '\\' OR lower_unicode(developer) LIKE ? ESCAPE '\\')");
    params.push(pattern, pattern);
  }

  const genre = fold(filter.genre ?? "");
  if (genre) {
    clauses.push("lower_unicode(genre) = ?");
    params.push(genre);
  }

  for (const { field, op, value } of filter.numeric ?? []) {
    const column = assertOneOf(NUMERIC_METRICS, field, "metric");
    const operator = SQL_OPERATORS[assertOneOf(NUMERIC_OPERATORS, op, "operator")];
    clauses.push(`${column} ${operator} ?`);
    params.push(value);
  }

  return { sql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && (error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE";
}

export function createGamesRepository(db: Db) {
  const insertStatement = db.prepare<GameInput>(
    `INSERT INTO games (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating)
     VALUES (@title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating)`,
  );
  const updateStatement = db.prepare<Game>(
    `UPDATE games SET title = @title, developer = @developer, genre = @genre,
       monthly_revenue_usd = @monthly_revenue_usd, monthly_downloads = @monthly_downloads,
       average_rating = @average_rating
     WHERE id = @id`,
  );
  const getStatement = db.prepare<[number], Game>("SELECT * FROM games WHERE id = ?");
  const deleteStatement = db.prepare<[number]>("DELETE FROM games WHERE id = ?");

  const titleTakenStatement = db.prepare<[string, number], { taken: 1 }>(
    "SELECT 1 AS taken FROM games WHERE lower_unicode(title) = ? AND id != ?",
  );

  /**
   * Runs a write and turns a duplicate title into a typed error. The UNIQUE index only folds ASCII case, so
   * "Édition" and "édition" are caught by the explicit check; the index stays as the backstop.
   */
  function writing<T>(title: string, exceptId: number, write: () => T): T {
    if (titleTakenStatement.get(fold(title), exceptId)) throw new DuplicateTitleError(title);
    try {
      return write();
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateTitleError(title);
      throw error;
    }
  }

  function get(id: number): Game | undefined {
    return getStatement.get(id);
  }

  return {
    get,

    list(options: ListOptions = {}): { games: Game[]; total: number } {
      const { sql: where, params } = buildWhere(options);
      const sortBy = assertOneOf(SORT_FIELDS, options.sortBy ?? "title", "sort field");
      const direction = options.order === "desc" ? "DESC" : "ASC";
      const limit = options.limit === undefined ? "" : "LIMIT ?";

      const games = db
        .prepare<(string | number)[], Game>(`SELECT * FROM games ${where} ORDER BY ${sortBy} ${direction}, id ASC ${limit}`)
        .all(...params, ...(options.limit === undefined ? [] : [options.limit]));
      const { total } = db
        .prepare<(string | number)[], { total: number }>(`SELECT COUNT(*) AS total FROM games ${where}`)
        .get(...params)!;

      return { games, total };
    },

    create(input: GameInput): Game {
      const { lastInsertRowid } = writing(input.title, 0, () => insertStatement.run(input));
      return get(Number(lastInsertRowid))!;
    },

    /** Applies the given fields on top of the stored game. Returns undefined when the id does not exist. */
    update(id: number, changes: GameUpdate): Game | undefined {
      const current = get(id);
      if (!current) return undefined;
      const next: Game = { ...current, ...changes, id };
      writing(next.title, id, () => updateStatement.run(next));
      return next;
    },

    remove(id: number): boolean {
      return deleteStatement.run(id).changes > 0;
    },

    aggregate(options: AggregateOptions): AggregateRow[] {
      const { fn, metric, groupBy } = options;
      if (fn !== "count" && !metric) {
        throw new Error(`The "${fn}" function needs a metric`);
      }
      const column = metric ? assertOneOf(NUMERIC_METRICS, metric, "metric") : "";
      const valueSql = {
        count: "COUNT(*)",
        sum: `ROUND(SUM(${column}), 2)`,
        avg: `ROUND(AVG(${column}), 2)`,
        min: `MIN(${column})`,
        max: `MAX(${column})`,
      }[assertOneOf(AGGREGATE_FUNCTIONS, fn, "function")];

      const groupColumn = groupBy ? assertOneOf(GROUP_FIELDS, groupBy, "group field") : null;
      const { sql: where, params } = buildWhere(options);

      // The smallest first for "min" (that is the group you are asking about), the largest first otherwise.
      const direction = fn === "min" ? "ASC" : "DESC";

      return db
        .prepare<(string | number)[], AggregateRow>(
          `SELECT ${groupColumn ?? "NULL"} AS "group", ${valueSql} AS value, COUNT(*) AS games
           FROM games ${where}
           ${groupColumn ? `GROUP BY ${groupColumn}` : ""}
           ORDER BY value ${direction}, "group" ASC
           LIMIT ${MAX_AGGREGATE_GROUPS}`,
        )
        .all(...params);
    },

    /**
     * Resolves free-text titles the way a person would type them: an exact (case-insensitive) title wins,
     * otherwise a single partial match is accepted, and several partial matches are reported as ambiguous.
     */
    resolveTitles(queries: string[]): TitleMatch[] {
      const exact = db.prepare<[string], Game>("SELECT * FROM games WHERE lower_unicode(title) = ?");
      const partial = db.prepare<[string, number], Game>(
        "SELECT * FROM games WHERE lower_unicode(title) LIKE ? ESCAPE '\\' ORDER BY title LIMIT ?",
      );

      return queries.map((raw): TitleMatch => {
        const query = raw.trim();
        const exactMatch = exact.get(fold(query));
        if (exactMatch) return { query, status: "exact", game: exactMatch };

        const candidates = partial.all(`%${escapeLike(fold(query))}%`, MAX_TITLE_CANDIDATES + 1);
        if (candidates.length === 1) return { query, status: "partial", game: candidates[0] };
        if (candidates.length > 1) {
          return { query, status: "ambiguous", candidates: candidates.slice(0, MAX_TITLE_CANDIDATES).map((g) => g.title) };
        }
        return { query, status: "not_found" };
      });
    },

    summary(): CatalogSummary {
      const { totalGames } = db.prepare<[], { totalGames: number }>("SELECT COUNT(*) AS totalGames FROM games").get()!;
      const genres = db.prepare<[], { genre: string }>("SELECT genre FROM games GROUP BY genre ORDER BY genre").all();
      return { totalGames, genres: genres.map((row) => row.genre) };
    },
  };
}

export type GamesRepository = ReturnType<typeof createGamesRepository>;
