import type { Game } from "@/lib/games/types";

export type CatalogAnswer = {
  summary: string;
  data:
    | { kind: "text" }
    | { kind: "game"; game: Game }
    | { kind: "games"; games: Game[]; context: string }
    | {
        kind: "comparison";
        games: [Game, Game];
        metric: "revenue" | "downloads" | "rating";
        winnerId: string | null;
      }
    | { kind: "count"; value: number; context: string }
    | {
        kind: "stats";
        totalGames: number;
        genres: string[];
        developers: string[];
        averageRating: number | null;
        totalMonthlyRevenue: number;
      };
};
