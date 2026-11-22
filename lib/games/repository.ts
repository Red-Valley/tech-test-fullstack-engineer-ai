import type Database from "better-sqlite3";
import type { Game, GameInput, GameUpdate } from "./schema";

// Whitelists. Every identifier that reaches SQL is looked up here first, and
// every value is passed as a bound parameter, so callers (including LLM tool
// arguments) can never inject SQL.

export const NUMERIC_FIELDS = ["monthly_revenue_usd", "monthly_downloads", "average_rating"] as const;
export const TEXT_FIELDS = ["title", "developer", "genre"] as const;
export const SORT_FIELDS = ["id", ...TEXT_FIELDS, ...NUMERIC_FIELDS, "created_at", "updated_at"] as const;
export const OPERATORS = [">", ">=", "<", "<=", "="] as const;
export const METRICS = ["count", "sum", "avg", "min", "max"] as const;
export const GROUP_FIELDS = ["genre", "developer"] as const;

export type NumericField = (typeof NUMERIC_FIELDS)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type Operator = (typeof OPERATORS)[number];
export type Metric = (typeof METRICS)[number];
export type GroupField = (typeof GROUP_FIELDS)[number];

export interface NumericFilter {
  field: NumericField;
  op: Operator;
  value: number;
}

/** Shared by `query` and `aggregate`. All provided filters are AND-combined. */
export interface GameFilters {
  /** Case-insensitive partial title matches, OR-combined. */
  titles?: string[];
  /** Case-insensitive exact genre. */
  genre?: string;
  /** Case-insensitive exact developer. */
  developer?: string;
  numeric?: NumericFilter[];
}

export interface QueryParams {
  filters?: GameFilters;
  /** Defaults to `title`. */
  sort_by?: SortField;
  /** Defaults to `asc`. */
  order?: "asc" | "desc";
  /** Clamped to 1..50. Defaults to 10. */
  limit?: number;
}

export interface QueryResult {
  /** Rows matching the filters before `limit` is applied. */
  total_matching: number;
  games: Game[];
}

export interface AggregateParams {
  metric: Metric;
  /** Required unless `metric` is `count`. */
  field?: NumericField;
  group_by?: GroupField;
  filters?: GameFilters;
}

export interface AggregateRow {
  /** The genre or developer. Present only when `group_by` is set. */
  group?: string;
  /** The metric result. `null` for avg, min, or max over zero rows. */
  value: number | null;
}

export interface AggregateResult {
  rows: AggregateRow[];
}

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

/** Raised when a title collides (case-insensitively) with an existing game. */
export class DuplicateTitleError extends Error {
  constructor(public readonly title: string) {
    super(`A game titled "${title}" already exists`);
    this.name = "DuplicateTitleError";
  }
}

/** Returns `value` when it is in `allowed`, otherwise throws naming the label. */
function oneOf<T extends string>(allowed: readonly T[], value: unknown, label: string): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new Error(`Invalid ${label}: ${String(value)}. Expected one of: ${allowed.join(", ")}`);
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && (err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE";
}

/** Escapes LIKE wildcards so a title containing `%` or `_` matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function buildWhere(filters: GameFilters = {}): { sql: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  // A filter that is present but blank would match everything and look like a filtered answer, so it is an
  // error. Callers omit a filter to skip it.
  const nonBlank = (value: string, label: string): string => {
    const trimmed = value.trim();
    if (!trimmed) throw new Error(`Invalid ${label}: must not be blank. Omit it to skip the filter`);
    return trimmed;
  };

  if (filters.titles !== undefined) {
    const titles = filters.titles.map((t) => nonBlank(t, "titles entry"));
    if (titles.length > 0) {
      // SQLite LIKE is case-insensitive for ASCII letters only.
      clauses.push(`(${titles.map(() => "title LIKE ? ESCAPE '\\'").join(" OR ")})`);
      params.push(...titles.map((t) => `%${escapeLike(t)}%`));
    }
  }
  if (filters.genre !== undefined) {
    clauses.push("genre = ? COLLATE NOCASE");
    params.push(nonBlank(filters.genre, "genre"));
  }
  if (filters.developer !== undefined) {
    clauses.push("developer = ? COLLATE NOCASE");
    params.push(nonBlank(filters.developer, "developer"));
  }
  for (const f of filters.numeric ?? []) {
    const field = oneOf(NUMERIC_FIELDS, f.field, "numeric filter field");
    const op = oneOf(OPERATORS, f.op, "numeric filter operator");
    if (typeof f.value !== "number" || !Number.isFinite(f.value)) {
      throw new Error(`Invalid numeric filter value for ${field}: ${String(f.value)}`);
    }
    clauses.push(`${field} ${op} ?`);
    params.push(f.value);
  }

  return { sql: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "", params };
}

export function createRepository(db: Database.Database) {
  return {
    list(): Game[] {
      return db.prepare("SELECT * FROM games ORDER BY id").all() as Game[];
    },

    get(id: number): Game | undefined {
      return db.prepare("SELECT * FROM games WHERE id = ?").get(id) as Game | undefined;
    },

    create(input: GameInput): Game {
      try {
        return db
          .prepare(
            `INSERT INTO games (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating)
             VALUES (@title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating)
             RETURNING *`,
          )
          .get({
            title: input.title,
            developer: input.developer,
            genre: input.genre,
            monthly_revenue_usd: input.monthly_revenue_usd,
            monthly_downloads: input.monthly_downloads,
            average_rating: input.average_rating,
          }) as Game;
      } catch (err) {
        if (isUniqueViolation(err)) throw new DuplicateTitleError(input.title);
        throw err;
      }
    },

    /** Returns the updated game, or `undefined` when `id` does not exist. */
    update(id: number, patch: GameUpdate): Game | undefined {
      const sets: string[] = [];
      const params: Record<string, string | number> = { id };
      for (const column of [...TEXT_FIELDS, ...NUMERIC_FIELDS]) {
        const value = patch[column];
        if (value !== undefined) {
          sets.push(`${column} = @${column}`);
          params[column] = value;
        }
      }
      sets.push("updated_at = CURRENT_TIMESTAMP");

      try {
        return db
          .prepare(`UPDATE games SET ${sets.join(", ")} WHERE id = @id RETURNING *`)
          .get(params) as Game | undefined;
      } catch (err) {
        if (isUniqueViolation(err)) throw new DuplicateTitleError(String(patch.title));
        throw err;
      }
    },

    /** Returns `true` when a game was deleted. */
    remove(id: number): boolean {
      return db.prepare("DELETE FROM games WHERE id = ?").run(id).changes > 0;
    },

    query(params: QueryParams = {}): QueryResult {
      const where = buildWhere(params.filters);
      const sortBy = oneOf(SORT_FIELDS, params.sort_by ?? "title", "sort_by");
      const order = oneOf(["asc", "desc"] as const, params.order ?? "asc", "order").toUpperCase();
      const requested = Number.isFinite(params.limit) ? Math.trunc(params.limit as number) : DEFAULT_LIMIT;
      const limit = Math.min(MAX_LIMIT, Math.max(1, requested));
      // Case-insensitive ordering for text columns; id breaks ties.
      const collate = (TEXT_FIELDS as readonly string[]).includes(sortBy) ? " COLLATE NOCASE" : "";

      const { n } = db
        .prepare(`SELECT COUNT(*) AS n FROM games${where.sql}`)
        .get(...where.params) as { n: number };
      const games = db
        .prepare(`SELECT * FROM games${where.sql} ORDER BY ${sortBy}${collate} ${order}, id ASC LIMIT ?`)
        .all(...where.params, limit) as Game[];

      return { total_matching: n, games };
    },

    aggregate(params: AggregateParams): AggregateResult {
      const metric = oneOf(METRICS, params.metric, "metric");
      const groupBy = params.group_by === undefined ? undefined : oneOf(GROUP_FIELDS, params.group_by, "group_by");

      let expression: string;
      if (metric === "count") {
        expression = "COUNT(*)";
      } else {
        const field = oneOf(NUMERIC_FIELDS, params.field, `field for ${metric}`);
        // Sums and averages are rounded to cents to hide floating point noise.
        expression =
          metric === "sum" ? `ROUND(COALESCE(SUM(${field}), 0), 2)`
          : metric === "avg" ? `ROUND(AVG(${field}), 2)`
          : `${metric.toUpperCase()}(${field})`;
      }

      const where = buildWhere(params.filters);
      const sql = groupBy
        ? `SELECT ${groupBy} AS "group", ${expression} AS value FROM games${where.sql}
           GROUP BY ${groupBy} COLLATE NOCASE ORDER BY value DESC, ${groupBy} COLLATE NOCASE ASC`
        : `SELECT ${expression} AS value FROM games${where.sql}`;

      return { rows: db.prepare(sql).all(...where.params) as AggregateRow[] };
    },
  };
}

export type GameRepository = ReturnType<typeof createRepository>;
