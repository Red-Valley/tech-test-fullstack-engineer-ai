import { tool } from "ai";
import { z } from "zod";
import type { GamesRepository } from "@/lib/games/repository";
import type { Game } from "@/lib/games/types";
import type { CatalogAnswer } from "@/lib/games/answer-types";

const SORT_FIELDS = ["revenue", "downloads", "rating", "title"] as const;
type SortField = (typeof SORT_FIELDS)[number];

function sortGames(games: Game[], sortBy: SortField, order: "asc" | "desc"): Game[] {
  const fieldMap: Record<SortField, keyof Game> = {
    revenue: "monthly_revenue_usd",
    downloads: "monthly_downloads",
    rating: "average_rating",
    title: "title",
  };
  const key = fieldMap[sortBy];
  return [...games].sort((a, b) => {
    const av = a[key] as number | string;
    const bv = b[key] as number | string;
    if (typeof av === "string" && typeof bv === "string") {
      return order === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return order === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });
}

function computeCatalogSummary(games: Game[]) {
  if (games.length === 0) {
    return {
      totalGames: 0,
      genres: [] as string[],
      developers: [] as string[],
      averageRating: null,
      totalMonthlyRevenue: 0,
    };
  }
  const genres = [...new Set(games.map((g) => g.genre))].sort();
  const developers = [...new Set(games.map((g) => g.developer))].sort();
  const averageRating =
    Math.round((games.reduce((sum, g) => sum + g.average_rating, 0) / games.length) * 10) / 10;
  const totalMonthlyRevenue = games.reduce((sum, g) => sum + g.monthly_revenue_usd, 0);
  return { totalGames: games.length, genres, developers, averageRating, totalMonthlyRevenue };
}

export function createGamesTools(repository: GamesRepository) {
  return {
    list_games: tool({
      description:
        "List games from the catalog. Supports optional filtering by minimum rating or genre, sorting by revenue, downloads, rating, or title, and limiting results. Returns the matching games and the total count before the limit is applied.",
      inputSchema: z.object({
        minRating: z.number().min(0).max(5).optional().describe("Minimum average_rating (inclusive)"),
        genre: z.string().optional().describe("Exact genre match (case-insensitive)"),
        sortBy: z.enum(SORT_FIELDS).optional().describe("Field to sort by"),
        order: z.enum(["asc", "desc"]).default("desc").describe("Sort direction"),
        limit: z.number().int().min(1).max(50).optional().describe("Maximum number of results to return"),
      }),
      execute: async ({ minRating, genre, sortBy, order, limit }) => {
        let games = repository.list();

        if (minRating !== undefined) {
          games = games.filter((g) => g.average_rating >= minRating);
        }
        if (genre !== undefined) {
          const lower = genre.toLowerCase();
          games = games.filter((g) => g.genre.toLowerCase() === lower);
        }
        if (sortBy !== undefined) {
          games = sortGames(games, sortBy, order);
        }

        const total = games.length;
        if (limit !== undefined) {
          games = games.slice(0, limit);
        }

        return { games, total };
      },
    }),

    find_game_by_title: tool({
      description:
        "Find a game by a partial or full title match (case-insensitive). Returns the matched game if exactly one result is found, or a list of suggestions when multiple games match. Returns null with an empty suggestions array when no match is found.",
      inputSchema: z.object({
        title: z.string().min(1).describe("Title or partial title to search for"),
      }),
      execute: async ({ title }) => {
        const needle = title.toLowerCase();
        const matches = repository.list().filter((g) => g.title.toLowerCase().includes(needle));

        if (matches.length === 1) {
          return { game: matches[0], suggestions: [] };
        }
        if (matches.length === 0) {
          return { game: null, suggestions: [] };
        }
        return { game: null, suggestions: matches };
      },
    }),

    catalog_summary: tool({
      description:
        "Return high-level statistics about the entire game catalog: total number of games, available genres, developers, average rating across all games, and total monthly revenue. Use this for overview questions or to check whether the catalog is empty.",
      inputSchema: z.object({}),
      execute: async () => {
        return computeCatalogSummary(repository.list());
      },
    }),

    respond: tool({
      description:
        "Emit the final structured response. ALWAYS call this exactly once at the end of your turn. Choose the most specific `kind` for the question: 'game' for a single game answer, 'games' for a list, 'comparison' for two games on one metric, 'count' for a numeric answer, 'stats' for a catalog overview, 'text' only when none of the above fit.",
      inputSchema: z.object({
        summary: z.string().min(1).describe("1-2 sentence natural-language answer shown to the user"),
        data: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("text") }),
          z.object({ kind: z.literal("game"), gameId: z.string() }),
          z.object({
            kind: z.literal("games"),
            gameIds: z.array(z.string()).min(1),
            context: z.string().describe("Brief context for the list, e.g. 'rated above 4'"),
          }),
          z.object({
            kind: z.literal("comparison"),
            gameIds: z.tuple([z.string(), z.string()]),
            metric: z.enum(["revenue", "downloads", "rating"]),
            winnerId: z.string().nullable(),
          }),
          z.object({
            kind: z.literal("count"),
            value: z.number().int().min(0),
            context: z.string(),
          }),
          z.object({ kind: z.literal("stats") }),
        ]),
      }),
      execute: async ({ summary, data }): Promise<CatalogAnswer> => {
        const games = repository.list();
        const byId = new Map(games.map((g) => [g.id, g]));

        function resolveId(id: string): Game | null {
          return byId.get(id) ?? null;
        }

        if (data.kind === "game") {
          const game = resolveId(data.gameId);
          if (!game) return { summary, data: { kind: "text" } };
          return { summary, data: { kind: "game", game } };
        }

        if (data.kind === "games") {
          const resolved = data.gameIds.map(resolveId).filter((g): g is Game => g !== null);
          if (resolved.length === 0) return { summary, data: { kind: "text" } };
          return { summary, data: { kind: "games", games: resolved, context: data.context } };
        }

        if (data.kind === "comparison") {
          const [a, b] = data.gameIds.map(resolveId);
          if (!a || !b) return { summary, data: { kind: "text" } };
          return {
            summary,
            data: {
              kind: "comparison",
              games: [a, b],
              metric: data.metric,
              winnerId: data.winnerId,
            },
          };
        }

        if (data.kind === "count") {
          return { summary, data: { kind: "count", value: data.value, context: data.context } };
        }

        if (data.kind === "stats") {
          return { summary, data: { kind: "stats", ...computeCatalogSummary(games) } };
        }

        return { summary, data: { kind: "text" } };
      },
    }),
  };
}
