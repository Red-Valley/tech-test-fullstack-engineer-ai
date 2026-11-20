import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  AGGREGATE_FUNCTIONS,
  GROUP_FIELDS,
  MAX_AGGREGATE_GROUPS,
  NUMERIC_OPERATORS,
  type GameFilter,
  type GamesRepository,
} from "@/lib/games/repository";
import { NUMERIC_METRICS, SORT_FIELDS, type Game } from "@/lib/games/schema";

/**
 * The tools the assistant can call. Each one is read-only and maps onto the same repository the REST API
 * uses, so the chat never sees data the dashboard can't, and cannot change anything.
 *
 * The model never writes SQL: it fills in the typed parameters below, they are validated, and the
 * repository turns them into parameterised queries.
 */

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

const round2 = (value: number) => Math.round(value * 100) / 100;
const round1 = (value: number) => Math.round(value * 10) / 10;

// --- Shared parameter descriptions ------------------------------------------------------------------

const metric = z
  .enum(NUMERIC_METRICS)
  .describe(
    "monthly_revenue_usd = revenue in USD for the most recent month; monthly_downloads = downloads in the " +
      "most recent month; average_rating = average user rating from 0 to 5.",
  );

const condition = z.object({
  field: metric,
  operator: z
    .enum(NUMERIC_OPERATORS)
    .describe(
      "gt = strictly greater than ('above', 'over', 'more than', 'better than'); gte = greater than or equal " +
        "('at least'); lt = strictly less than ('below', 'under'); lte = less than or equal ('at most'); eq = exactly equal.",
    ),
  value: z.number(),
});

const filterShape = {
  search: z.string().optional().describe("Text to look for in the title OR the developer name (case-insensitive, partial match)."),
  genre: z.string().optional().describe("Only games of this genre (case-insensitive, exact name)."),
  conditions: z
    .array(condition)
    .max(6)
    .optional()
    .describe("Numeric conditions. A game must satisfy ALL of them."),
};

type FilterInput = { search?: string; genre?: string; conditions?: z.infer<typeof condition>[] };

const toRepositoryFilter = ({ search, genre, conditions }: FilterInput): GameFilter => ({
  search,
  genre,
  numeric: conditions?.map(({ field, operator, value }) => ({ field, op: operator, value })),
});

/** What the model gets to see of a game: everything useful, no internal id. */
const present = ({ title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating }: Game) => ({
  title,
  developer,
  genre,
  monthly_revenue_usd,
  monthly_downloads,
  average_rating,
});

// --- Tool plumbing -----------------------------------------------------------------------------------

interface ToolSpec {
  name: string;
  description: string;
  schema: z.ZodType;
  /** Validates the raw input and runs the tool. Throws a ZodError for bad input. */
  run: (rawInput: unknown) => unknown;
}

function defineTool<Schema extends z.ZodType>(
  name: string,
  description: string,
  schema: Schema,
  execute: (input: z.output<Schema>) => unknown,
): ToolSpec {
  return { name, description, schema, run: (rawInput) => execute(schema.parse(rawInput)) };
}

export interface ToolOutcome {
  ok: boolean;
  /** The tool's result, or `{ error }` when it failed. Always JSON-serialisable. */
  output: unknown;
}

export interface ToolBox {
  /** Tool definitions in the shape the Messages API expects. */
  definitions: Anthropic.Tool[];
  run: (name: string, rawInput: unknown) => ToolOutcome;
}

// --- The tools ---------------------------------------------------------------------------------------

export function createToolBox(games: GamesRepository): ToolBox {
  const searchGames = defineTool(
    "search_games",
    "Look up games in the catalog and return their details. Combine text search, a genre and numeric " +
      "conditions, then sort and limit the result. Use it to look up specific games, list games that match " +
      "conditions, or find the top / bottom games by a metric (sort by that metric and set a small limit). " +
      "Returns total_matches so you can tell when the list was cut off.",
    z.object({
      ...filterShape,
      sort_by: z
        .enum(SORT_FIELDS)
        .optional()
        .describe("Column to sort by (default title). Use a numeric column for 'top' or 'lowest' questions."),
      sort_order: z
        .enum(["asc", "desc"])
        .optional()
        .describe("desc for highest / most / top, asc for lowest / least / A-Z (default asc)."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(MAX_LIMIT)
        .optional()
        .describe(`How many games to return (default ${DEFAULT_LIMIT}, at most ${MAX_LIMIT}).`),
    }),
    (input) => {
      const { games: found, total } = games.list({
        ...toRepositoryFilter(input),
        sortBy: input.sort_by ?? "title",
        order: input.sort_order ?? "asc",
        limit: input.limit ?? DEFAULT_LIMIT,
      });

      const result: Record<string, unknown> = {
        total_matches: total,
        returned: found.length,
        games: found.map(present),
      };
      if (total > found.length) {
        result.note = `Only the first ${found.length} of ${total} matching games are shown. Raise the limit or narrow the conditions if you need more.`;
      }
      if (total === 0 && input.genre) {
        const { genres } = games.summary();
        if (!genres.some((genre) => genre.toLowerCase() === input.genre!.trim().toLowerCase())) {
          result.note = `No game has the genre "${input.genre}". Genres in the catalog: ${genres.join(", ")}.`;
        }
      }
      return result;
    },
  );

  const aggregateGames = defineTool(
    "aggregate_games",
    "Compute a count, sum, average, minimum or maximum over the catalog, optionally restricted by the same " +
      "filters as search_games and optionally broken down by genre or developer. Use it for 'how many ...', " +
      "'total ...' and 'average ...' questions. It returns numbers only, not which game is behind a min / " +
      "max: for 'which game has the most X' use search_games instead.",
    z
      .object({
        function: z.enum(AGGREGATE_FUNCTIONS).describe("count = number of games (no metric needed); sum / avg / min / max need a metric."),
        metric: metric.optional(),
        group_by: z
          .enum(GROUP_FIELDS)
          .optional()
          .describe("Return one row per genre or developer instead of a single overall row."),
        ...filterShape,
      })
      .refine((input) => input.function === "count" || input.metric !== undefined, {
        message: "metric is required unless function is count",
        path: ["metric"],
      }),
    (input) => {
      const rows = games.aggregate({
        ...toRepositoryFilter(input),
        fn: input.function,
        metric: input.metric,
        groupBy: input.group_by,
      });
      const result: Record<string, unknown> = {
        function: input.function,
        metric: input.metric ?? null,
        group_by: input.group_by ?? null,
        results: rows,
      };
      if (rows.every((row) => row.games === 0)) result.note = "No games matched these conditions.";
      if (rows.length >= MAX_AGGREGATE_GROUPS) {
        result.note = `Only the first ${MAX_AGGREGATE_GROUPS} groups are shown (${input.function === "min" ? "smallest" : "largest"} value first); there may be more.`;
      }
      return result;
    },
  );

  const compareGames = defineTool(
    "compare_games",
    "Compare two or more games side by side by title. Titles are matched case-insensitively, and an " +
      "unambiguous partial title is accepted. Returns every metric for each game plus, for each metric, the " +
      "ranking, who leads, and by how much. Use it for 'compare A vs B' and 'which of these is better' questions.",
    z.object({
      titles: z.array(z.string().trim().min(1)).min(2).max(5).describe("The titles of the games to compare (2 to 5)."),
    }),
    ({ titles }) => {
      const matches = games.resolveTitles(titles);

      const resolved = new Map<number, Game>();
      const unresolved: { query: string; reason: string; candidates?: string[] }[] = [];
      for (const match of matches) {
        if (match.status === "exact" || match.status === "partial") resolved.set(match.game.id, match.game);
        else if (match.status === "ambiguous") {
          unresolved.push({ query: match.query, reason: "Several games match this title; ask which one is meant.", candidates: match.candidates });
        } else unresolved.push({ query: match.query, reason: "No game with this title." });
      }

      const found = [...resolved.values()];
      const result: Record<string, unknown> = { games: found.map(present), unresolved };
      if (found.length >= 2) result.comparison = compareMetrics(found);
      else result.note = "Fewer than two distinct games were found, so there is nothing to compare. See unresolved for why.";
      return result;
    },
  );

  const tools = [searchGames, aggregateGames, compareGames];

  return {
    definitions: tools.map(({ name, description, schema }) => {
      const { $schema, ...inputSchema } = z.toJSONSchema(schema, { io: "input" });
      void $schema; // zod adds this meta keyword; the API does not need it
      return { name, description, input_schema: inputSchema as Anthropic.Tool["input_schema"] };
    }),

    run(name, rawInput) {
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) return { ok: false, output: { error: `Unknown tool "${name}". Available tools: ${tools.map((t) => t.name).join(", ")}.` } };

      try {
        return { ok: true, output: tool.run(rawInput) };
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Specific enough for the model to correct its call.
          const problems = error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ");
          return { ok: false, output: { error: `Invalid input for ${name} - ${problems}` } };
        }
        console.error(`Tool ${name} failed:`, error);
        return { ok: false, output: { error: `The ${name} lookup failed unexpectedly.` } };
      }
    },
  };
}

/** Per metric: the ranking, the leader, and how far ahead the leader is of the runner-up. */
function compareMetrics(found: Game[]) {
  return Object.fromEntries(
    NUMERIC_METRICS.map((field) => {
      const ranking = found.map((game) => ({ title: game.title, value: game[field] })).sort((a, b) => b.value - a.value);
      const [first, second] = ranking;
      const tie = first.value === second.value;

      return [
        field,
        {
          ranking,
          leader: tie ? null : first.title,
          ...(tie
            ? { tie: true }
            : {
                lead_over_runner_up: {
                  difference: round2(first.value - second.value),
                  percent_higher: second.value === 0 ? null : round1(((first.value - second.value) / second.value) * 100),
                },
              }),
        },
      ];
    }),
  );
}
