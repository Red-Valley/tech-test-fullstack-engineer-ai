import { getToolName, isToolUIPart } from "ai";
import type { ChatMessage } from "./agent";

type GameRef = { id: number };

/**
 * Ids of the games an assistant message is about, taken from its finished lookups:
 * a ranking contributes only its first result (the answer's subject); counts, comparisons
 * and searches contribute every game they returned. Unique, in first-seen order.
 */
export function referencedGameIds(message: ChatMessage): number[] {
  const ids: number[] = [];
  for (const part of message.parts) {
    if (!isToolUIPart(part) || part.state !== "output-available") continue;
    const output = part.output as Record<string, unknown> | undefined;
    if (!output || "error" in output) continue;
    const games = (key: string) => (Array.isArray(output[key]) ? (output[key] as GameRef[]) : []);
    switch (getToolName(part)) {
      case "rank_games":
        ids.push(...games("games").slice(0, 1).map((game) => game.id));
        break;
      case "count_games":
      case "search_games":
        ids.push(...games("games").map((game) => game.id));
        break;
      case "get_games":
        ids.push(...games("found").map((game) => game.id));
        break;
    }
  }
  return [...new Set(ids)];
}
