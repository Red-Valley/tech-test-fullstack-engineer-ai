import { and, asc, count, desc, eq, gt, gte, like, lt, lte, max, or, sql, type SQL } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { games, type Game, type GameInput, type Metric } from "@/lib/db/schema";
import type { CatalogView, SortKey } from "./catalog-view";

export type Comparison = "gt" | "gte" | "lt" | "lte" | "eq";

export type GameFilter = {
  metric?: Metric;
  op?: Comparison;
  value?: number;
  genre?: string;
  developer?: string;
};

export type TitleLookup = {
  found: Game[];
  notFound: string[];
  ambiguous: Record<string, string[]>;
};

const COMPARATORS = { gt, gte, lt, lte, eq };

type TextColumn = typeof games.title | typeof games.developer | typeof games.genre;

const SORT_COLUMNS = {
  title: games.title,
  revenue: games.monthly_revenue_usd,
  downloads: games.monthly_downloads,
  rating: games.average_rating,
} satisfies Record<SortKey, unknown>;

/** Escapes LIKE wildcards so user text is matched literally. */
function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function containsIgnoringCase(column: TextColumn, text: string): SQL {
  return sql`${like(column, containsPattern(text))} ESCAPE '\\'`;
}

function equalsIgnoringCase(column: TextColumn, text: string): SQL {
  return sql`lower(${column}) = ${text.trim().toLowerCase()}`;
}

/**
 * All catalog reads and writes. The only module that touches the database, so the UI,
 * REST routes and AI tools always agree. Takes a Db so tests can pass an in-memory one.
 */
export function createRepository(db: Db) {
  function getGame(id: number): Game | undefined {
    return db.select().from(games).where(eq(games.id, id)).get();
  }

  function matchTitle(title: string): Game[] {
    const exact = db.select().from(games).where(equalsIgnoringCase(games.title, title)).all();
    if (exact.length > 0) return exact;
    return db.select().from(games).where(containsIgnoringCase(games.title, title.trim())).orderBy(asc(games.title)).all();
  }

  return {
    listGames(): Game[] {
      return db.select().from(games).orderBy(asc(games.created_at), asc(games.id)).all();
    },

    getGame,

    createGame(input: GameInput): Game {
      const now = new Date().toISOString();
      return db.insert(games).values({ ...input, created_at: now, updated_at: now }).returning().get();
    },

    updateGame(id: number, input: GameInput): Game | undefined {
      return db
        .update(games)
        .set({ ...input, updated_at: new Date().toISOString() })
        .where(eq(games.id, id))
        .returning()
        .get();
    },

    deleteGame(id: number): boolean {
      return db.delete(games).where(eq(games.id, id)).run().changes > 0;
    },

    /** The dashboard's filtered, sorted view of the catalog (see catalog-view.ts). */
    queryCatalog(view: CatalogView): Game[] {
      const conditions: SQL[] = [];
      const text = view.q.trim();
      if (text) conditions.push(or(containsIgnoringCase(games.title, text), containsIgnoringCase(games.developer, text))!);
      if (view.genre) conditions.push(equalsIgnoringCase(games.genre, view.genre));
      const direction = view.dir === "asc" ? asc : desc;
      return db
        .select()
        .from(games)
        .where(and(...conditions))
        .orderBy(direction(SORT_COLUMNS[view.sort]), asc(games.title))
        .all();
    },

    listGenres(): string[] {
      return db
        .selectDistinct({ genre: games.genre })
        .from(games)
        .orderBy(sql`lower(${games.genre})`)
        .all()
        .map((row) => row.genre);
    },

    /** Highest revenue across the whole catalog, so revenue bars don't rescale when filtering. */
    maxRevenue(): number {
      return db.select({ top: max(games.monthly_revenue_usd) }).from(games).get()?.top ?? 0;
    },

    countGames(): number {
      return db.select({ total: count() }).from(games).get()?.total ?? 0;
    },

    searchGames(query: string, limit: number): { games: Game[]; totalMatches: number } {
      const text = query.trim();
      const where = or(containsIgnoringCase(games.title, text), containsIgnoringCase(games.developer, text));
      const totalMatches = db.select({ total: count() }).from(games).where(where).get()?.total ?? 0;
      const matches = db.select().from(games).where(where).orderBy(asc(games.title)).limit(limit).all();
      return { games: matches, totalMatches };
    },

    rankGames(metric: Metric, order: "asc" | "desc", limit: number): Game[] {
      const direction = order === "asc" ? asc : desc;
      return db.select().from(games).orderBy(direction(games[metric]), asc(games.title)).limit(limit).all();
    },

    filterGames(filter: GameFilter): Game[] {
      const conditions: SQL[] = [];
      if (filter.metric && filter.op && filter.value !== undefined) {
        conditions.push(COMPARATORS[filter.op](games[filter.metric], filter.value));
      }
      if (filter.genre) conditions.push(equalsIgnoringCase(games.genre, filter.genre));
      if (filter.developer) conditions.push(equalsIgnoringCase(games.developer, filter.developer));
      return db.select().from(games).where(and(...conditions)).orderBy(asc(games.title)).all();
    },

    /**
     * Resolves each title to exactly one game: exact (case-insensitive) match first, then a
     * unique partial match. Titles matching several games are reported as ambiguous.
     */
    findGamesByTitles(titles: string[]): TitleLookup {
      const result: TitleLookup = { found: [], notFound: [], ambiguous: {} };
      for (const title of titles) {
        const matches = matchTitle(title);
        if (matches.length === 1) {
          result.found.push(matches[0]);
        } else {
          result.notFound.push(title);
          if (matches.length > 1) result.ambiguous[title] = matches.map((game) => game.title);
        }
      }
      return result;
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;

export function getRepository(): Repository {
  return createRepository(getDb());
}
