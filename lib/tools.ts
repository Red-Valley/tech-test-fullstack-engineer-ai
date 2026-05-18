import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { getGames, getGameById, getGameByTitle, getStats } from "./db";
import type { Game } from "./types";

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_games",
      description: "List all games in the catalog. Optionally filter by genre or minimum rating.",
      parameters: {
        type: "object",
        properties: {
          genre: { type: "string", description: "Filter by genre (e.g. 'RPG', 'Platformer')" },
          min_rating: { type: "number", description: "Minimum average_rating (0–5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_game_by_id",
      description: "Fetch a single game by its numeric ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The game ID" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_games",
      description: "Compare two games side by side by title (revenue, downloads, rating). Use the exact game titles as they appear in the catalog.",
      parameters: {
        type: "object",
        properties: {
          title_a: { type: "string", description: "Title of the first game" },
          title_b: { type: "string", description: "Title of the second game" },
        },
        required: ["title_a", "title_b"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stats",
      description:
        "Get aggregate statistics: top revenue game, top downloads game, average rating, total count, and breakdown by genre.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

type ToolInput = Record<string, unknown>;

export function runTool(name: string, input: ToolInput): string {
  switch (name) {
    case "get_games": {
      const games = getGames({
        genre: input.genre as string | undefined,
        min_rating: input.min_rating as number | undefined,
      });
      return JSON.stringify(games);
    }

    case "get_game_by_id": {
      const game = getGameById(input.id as number);
      if (!game) return JSON.stringify({ error: "Game not found" });
      return JSON.stringify(game);
    }

    case "compare_games": {
      const a = getGameByTitle(input.title_a as string);
      const b = getGameByTitle(input.title_b as string);
      if (!a && !b) return JSON.stringify({ error: `Neither "${input.title_a}" nor "${input.title_b}" found in catalog` });
      if (!a) return JSON.stringify({ error: `Game not found: "${input.title_a}"` });
      if (!b) return JSON.stringify({ error: `Game not found: "${input.title_b}"` });
      const comparison = {
        games: [a, b],
        winner_revenue: a.monthly_revenue_usd >= b.monthly_revenue_usd ? a.title : b.title,
        winner_downloads: a.monthly_downloads >= b.monthly_downloads ? a.title : b.title,
        winner_rating: a.average_rating >= b.average_rating ? a.title : b.title,
      } satisfies { games: Game[]; winner_revenue: string; winner_downloads: string; winner_rating: string };
      return JSON.stringify(comparison);
    }

    case "get_stats": {
      return JSON.stringify(getStats());
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
