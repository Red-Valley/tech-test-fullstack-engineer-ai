import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/ai/agent";
import { referencedGameIds } from "@/lib/ai/references";

const game = (id: number) => ({ id, title: `Game ${id}` });

function message(...parts: object[]): ChatMessage {
  return { id: "m", role: "assistant", parts } as unknown as ChatMessage;
}

const done = (tool: string, output: object) => ({ type: `tool-${tool}`, toolCallId: tool, state: "output-available", input: {}, output });

describe("referencedGameIds", () => {
  it("takes only the subject of a ranking", () => {
    expect(referencedGameIds(message(done("rank_games", { games: [game(1), game(2), game(3)] })))).toEqual([1]);
  });

  it("takes every game a count, search or comparison returned", () => {
    expect(referencedGameIds(message(done("count_games", { count: 2, games: [game(4), game(5)] })))).toEqual([4, 5]);
    expect(referencedGameIds(message(done("search_games", { games: [game(6)] })))).toEqual([6]);
    expect(referencedGameIds(message(done("get_games", { found: [game(7)], not_found: ["Nope"] })))).toEqual([7]);
  });

  it("ignores error outputs and unfinished lookups", () => {
    expect(referencedGameIds(message(done("count_games", { error: "metric, op and value must be given together." })))).toEqual([]);
    expect(
      referencedGameIds(message({ type: "tool-rank_games", toolCallId: "x", state: "input-available", input: {} })),
    ).toEqual([]);
  });

  it("deduplicates across lookups and keeps first-seen order", () => {
    const msg = message(
      done("get_games", { found: [game(2), game(1)], not_found: [] }),
      { type: "text", text: "…" },
      done("count_games", { count: 2, games: [game(1), game(3)] }),
    );
    expect(referencedGameIds(msg)).toEqual([2, 1, 3]);
  });
});
