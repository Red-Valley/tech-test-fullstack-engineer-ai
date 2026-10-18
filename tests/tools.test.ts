import { beforeAll, describe, expect, it } from "vitest";
import { createTools } from "@/lib/ai/tools";
import { createDb, seedGames } from "@/lib/db/client";
import { createRepository } from "@/lib/games/repository";

let tools: ReturnType<typeof createTools>;

beforeAll(() => {
  const db = createDb(":memory:");
  seedGames(db);
  const repository = createRepository(db);
  tools = createTools(() => repository);
});

// Tools are invoked directly, so schema defaults (limit, order) are passed explicitly.
// execute() may return an AsyncIterable for streaming tools; these tools return plain objects.
async function run<I, O>(
  tool: { execute?: (input: I, options: never) => O | PromiseLike<O> | AsyncIterable<O> },
  input: I,
): Promise<O> {
  return (await tool.execute!(input, { toolCallId: "test", messages: [] } as never)) as O;
}

describe("assistant tools against the seed catalog", () => {
  it("rank_games: top revenue is Hollow Depths", async () => {
    const result = await run(tools.rank_games, { metric: "monthly_revenue_usd", order: "desc", limit: 5 });
    expect(result.games[0].title).toBe("Hollow Depths");
    expect(result.total_games).toBe(12);
  });

  it("count_games: 7 rated above 4, 8 rated at least 4", async () => {
    const above = await run(tools.count_games, { metric: "average_rating", op: "gt", value: 4 });
    const atLeast = await run(tools.count_games, { metric: "average_rating", op: "gte", value: 4 });
    expect(above).toMatchObject({ count: 7 });
    expect(atLeast).toMatchObject({ count: 8 });
  });

  it("count_games: 2 by Mossgrove Studio, ignoring case", async () => {
    expect(await run(tools.count_games, { developer: "mossgrove studio" })).toMatchObject({ count: 2 });
  });

  it("count_games: rejects a partial numeric filter", async () => {
    expect(await run(tools.count_games, { metric: "average_rating" })).toHaveProperty("error");
  });

  it("get_games: finds both games for a comparison", async () => {
    const result = await run(tools.get_games, { titles: ["Hollow Depths", "Stardust Farm"] });
    expect(result.found).toHaveLength(2);
    expect(result.not_found).toHaveLength(0);
  });

  it("get_games: reports a missing game instead of guessing", async () => {
    const result = await run(tools.get_games, { titles: ["Nonexistent"] });
    expect(result.found).toHaveLength(0);
    expect(result.not_found).toEqual(["Nonexistent"]);
  });

  it("search_games: 'lantern' matches a title and a developer", async () => {
    const result = await run(tools.search_games, { query: "lantern", limit: 5 });
    expect(result.total_matches).toBe(2);
  });
});
