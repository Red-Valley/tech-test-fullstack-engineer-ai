import { tool } from "ai";
import { z } from "zod";
import { METRICS } from "@/lib/db/schema";
import type { Repository } from "@/lib/games/repository";

const metric = z.enum(METRICS).describe("monthly_revenue_usd, monthly_downloads or average_rating");
const MAX_LISTED = 20;

function logCall(name: string, input: unknown) {
  console.log(`[chat] tool=${name} input=${JSON.stringify(input)}`);
}

/**
 * Narrow catalog lookups for the assistant. Each returns only the rows it needs, never the
 * whole catalog. The repository is resolved per call so importing this opens no database.
 */
export function createTools(repository: () => Repository) {
  return {
    search_games: tool({
      description:
        "Find games whose title or developer contains a phrase (case-insensitive). Use it to resolve a game name the user typed, including partial names.",
      inputSchema: z.object({
        query: z.string().min(1).max(100),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async (input) => {
        logCall("search_games", input);
        const { games, totalMatches } = repository().searchGames(input.query, input.limit);
        return { games, total_matches: totalMatches };
      },
    }),

    rank_games: tool({
      description:
        "Order the catalog by one metric and return the top (desc) or bottom (asc) games. Use it for 'most', 'least', 'highest', 'lowest' or 'top N' questions.",
      inputSchema: z.object({
        metric,
        order: z.enum(["desc", "asc"]).default("desc"),
        limit: z.number().int().min(1).max(20).default(5),
      }),
      execute: async (input) => {
        logCall("rank_games", input);
        const repo = repository();
        return { games: repo.rankGames(input.metric, input.order, input.limit), total_games: repo.countGames() };
      },
    }),

    count_games: tool({
      description:
        "Count games matching a numeric threshold and/or a genre or developer. 'Above 4' is op gt, 'at least 4' is op gte. With no filters it returns the catalog size.",
      inputSchema: z.object({
        metric: metric.optional(),
        op: z.enum(["gt", "gte", "lt", "lte", "eq"]).optional(),
        value: z.number().optional(),
        genre: z.string().min(1).max(50).optional().describe("Exact genre, case-insensitive"),
        developer: z.string().min(1).max(100).optional().describe("Exact developer, case-insensitive"),
      }),
      execute: async (input) => {
        logCall("count_games", input);
        const numeric = [input.metric, input.op, input.value].filter((part) => part !== undefined).length;
        if (numeric !== 0 && numeric !== 3) {
          return { error: "metric, op and value must be given together." };
        }
        const repo = repository();
        const games = repo.filterGames(input);
        return { count: games.length, games: games.slice(0, MAX_LISTED), total_games: repo.countGames() };
      },
    }),

    get_games: tool({
      description:
        "Fetch specific games by title, e.g. to compare them. Titles that match nothing, or match several games, are returned in not_found (with candidates in ambiguous).",
      inputSchema: z.object({
        titles: z.array(z.string().min(1).max(100)).min(1).max(5),
      }),
      execute: async (input) => {
        logCall("get_games", input);
        const { found, notFound, ambiguous } = repository().findGamesByTitles(input.titles);
        return { found, not_found: notFound, ...(Object.keys(ambiguous).length > 0 && { ambiguous }) };
      },
    }),
  };
}
