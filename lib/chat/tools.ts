import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  createRepository,
  GROUP_FIELDS,
  METRICS,
  NUMERIC_FIELDS,
  OPERATORS,
  SORT_FIELDS,
} from "@/lib/games/repository";

// The model never sees the database. It sees these two read-only tools, which call the same repository
// that backs the REST API. Every enum below comes from the repository's whitelists, so the model can only
// ask for columns and operators the repository accepts.

const filters = z
  .object({
    titles: z
      .array(z.string().trim().min(1))
      .max(10)
      .optional()
      .describe(
        "Game titles to look up. Matching ignores letter case (ASCII) and is partial: a game matches if its title contains any of them. Use this to fetch or compare specific games.",
      ),
    genre: z.string().trim().min(1).optional().describe("Exact genre, ignoring letter case, for example Roguelike."),
    developer: z.string().trim().min(1).optional().describe("Exact developer name, ignoring letter case."),
    numeric: z
      .array(
        z.object({
          field: z.enum(NUMERIC_FIELDS),
          op: z.enum(OPERATORS),
          value: z.number(),
        }),
      )
      .max(6)
      .optional()
      .describe("Numeric conditions that must all hold, for example average_rating > 4."),
  })
  .describe("Conditions a game must meet to be included. Omit it to include every game.");

const FIELD_NOTES =
  "monthly_revenue_usd is last month's revenue in US dollars, monthly_downloads is last month's download count, and average_rating is on a 0 to 5 scale.";

export const queryGames = betaZodTool({
  name: "query_games",
  description: `Look up games in the catalog and return their rows. Use it to find specific games (filters.titles), to rank games (sort_by with order and limit), or to list the games that match some conditions. Returns total_matching (every game that matches, before the limit) and games (up to limit rows, each with id, title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating). ${FIELD_NOTES}`,
  inputSchema: z.object({
    filters: filters.optional(),
    sort_by: z.enum(SORT_FIELDS).optional().describe("Column to sort by. Defaults to title."),
    order: z.enum(["asc", "desc"]).optional().describe("Sort direction. Defaults to asc."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum rows to return, 1 to 50. Defaults to 10."),
  }),
  eager_input_streaming: true,
  run: async (input) => {
    const { total_matching, games } = createRepository(getDb()).query(input);
    // Only the catalog fields: timestamps would just cost tokens.
    return JSON.stringify({
      total_matching,
      games: games.map((g) => ({
        id: g.id,
        title: g.title,
        developer: g.developer,
        genre: g.genre,
        monthly_revenue_usd: g.monthly_revenue_usd,
        monthly_downloads: g.monthly_downloads,
        average_rating: g.average_rating,
      })),
    });
  },
});

export const aggregateGames = betaZodTool({
  name: "aggregate_games",
  description: `Compute a statistic over the catalog: the count, or the sum, avg, min, or max of a numeric field, optionally restricted by filters and optionally grouped by genre or developer. Use it for questions such as how many games match, the total revenue, or the average rating per genre. Returns rows: a single { value } row when ungrouped, or one { group, value } row per group, sorted by value descending. value is null when avg, min, or max has no games to work on. ${FIELD_NOTES}`,
  inputSchema: z.object({
    metric: z.enum(METRICS),
    field: z.enum(NUMERIC_FIELDS).optional().describe("Numeric column to aggregate. Required unless metric is count."),
    group_by: z.enum(GROUP_FIELDS).optional().describe("Return one row per genre or developer instead of a single row."),
    filters: filters.optional(),
  }),
  eager_input_streaming: true,
  run: async (input) => JSON.stringify(createRepository(getDb()).aggregate(input)),
});

export const chatTools = [queryGames, aggregateGames];
