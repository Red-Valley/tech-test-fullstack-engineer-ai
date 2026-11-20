import { beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase } from "@/lib/db";
import { NUMERIC_OPERATORS, createGamesRepository, type GamesRepository } from "@/lib/games/repository";
import { SEED_GAMES } from "@/lib/games/seed-data";
import { createToolBox, type ToolBox } from "./tools";

let games: GamesRepository;
let tools: ToolBox;
beforeEach(() => {
  games = createGamesRepository(openDatabase(":memory:"));
  tools = createToolBox(games);
});

// Loosely typed on purpose: these are JSON payloads handed to the model.
/* eslint-disable @typescript-eslint/no-explicit-any */
const ok = (name: string, input: unknown): any => {
  const outcome = tools.run(name, input);
  expect(outcome.ok, JSON.stringify(outcome.output)).toBe(true);
  return outcome.output;
};
const fails = (name: string, input: unknown): string => {
  const outcome = tools.run(name, input);
  expect(outcome.ok).toBe(false);
  return (outcome.output as { error: string }).error;
};

describe("tool definitions (what the model sees)", () => {
  it("exposes the three tools with usable JSON schemas", () => {
    expect(tools.definitions.map((tool) => tool.name)).toEqual(["search_games", "aggregate_games", "compare_games"]);

    for (const tool of tools.definitions) {
      expect(tool.description!.length, tool.name).toBeGreaterThan(80);
      expect(tool.input_schema.type).toBe("object");
      expect(tool.input_schema, "zod's $schema meta keyword is stripped").not.toHaveProperty("$schema");
      // Must survive being serialised for the API.
      expect(JSON.parse(JSON.stringify(tool))).toEqual(tool);
    }
  });

  it("spells out the comparison operators and the required fields", () => {
    const [search, aggregate, compare] = tools.definitions.map((tool) => tool.input_schema as any);

    expect(search.properties.conditions.items.properties.operator.enum).toEqual([...NUMERIC_OPERATORS]);
    expect(search.properties.conditions.items.properties.operator.description).toMatch(/strictly greater than/);
    expect(search.required ?? []).toEqual([]); // every search parameter is optional

    expect(aggregate.required).toEqual(["function"]);
    expect(aggregate.properties.function.enum).toEqual(["count", "sum", "avg", "min", "max"]);
    expect(aggregate.properties.group_by.enum).toEqual(["genre", "developer"]);

    expect(compare.required).toEqual(["titles"]);
    expect(compare.properties.titles).toMatchObject({ type: "array", minItems: 2, maxItems: 5 });
  });
});

describe("search_games", () => {
  it("finds the top earner and reports that the list was cut", () => {
    const result = ok("search_games", { sort_by: "monthly_revenue_usd", sort_order: "desc", limit: 3 });

    expect(result.games[0].title).toBe("Echoes of Halcyon");
    expect(result.games).toHaveLength(3);
    expect(result.total_matches).toBe(SEED_GAMES.length);
    expect(result.returned).toBe(3);
    expect(result.note).toMatch(/first 3 of 24/);
  });

  it("does not leak internal ids to the model", () => {
    const [game] = ok("search_games", { limit: 1 }).games;
    expect(Object.keys(game).sort()).toEqual(
      ["average_rating", "developer", "genre", "monthly_downloads", "monthly_revenue_usd", "title"].sort(),
    );
  });

  it("treats 'above 4' as strictly greater: operator gt excludes games rated exactly 4.0", () => {
    const above = ok("search_games", { conditions: [{ field: "average_rating", operator: "gt", value: 4 }], limit: 25 });
    const atLeast = ok("search_games", { conditions: [{ field: "average_rating", operator: "gte", value: 4 }], limit: 25 });

    expect(above.total_matches).toBe(SEED_GAMES.filter((g) => g.average_rating > 4).length);
    expect(atLeast.total_matches).toBe(SEED_GAMES.filter((g) => g.average_rating >= 4).length);
    expect(above.games.every((g: { average_rating: number }) => g.average_rating > 4)).toBe(true);
    expect(atLeast.total_matches).toBeGreaterThan(above.total_matches);
  });

  it("filters by genre (case-insensitively) and by developer / title text", () => {
    expect(ok("search_games", { genre: "rpg" }).games.map((g: { title: string }) => g.title).sort()).toEqual([
      "Echoes of Halcyon",
      "Rune Cartographer",
    ]);
    expect(ok("search_games", { search: "ironbark" }).total_matches).toBe(3);
  });

  it("explains an unknown genre by listing the real ones", () => {
    const result = ok("search_games", { genre: "Strategi" });
    expect(result.total_matches).toBe(0);
    expect(result.note).toContain('No game has the genre "Strategi"');
    expect(result.note).toContain("Strategy");
  });

  it("rejects invalid input with a message the model can act on", () => {
    expect(fails("search_games", { sort_by: "id; DROP TABLE games" })).toMatch(/Invalid input for search_games - sort_by/);
    expect(fails("search_games", { limit: 0 })).toMatch(/limit/);
    expect(fails("search_games", { conditions: [{ field: "title", operator: "gt", value: 1 }] })).toMatch(/conditions/);
    expect(fails("search_games", "not an object")).toMatch(/Invalid input/);
  });
});

describe("aggregate_games", () => {
  it("counts games matching a condition", () => {
    const expected = SEED_GAMES.filter((g) => g.average_rating > 4).length;
    const result = ok("aggregate_games", {
      function: "count",
      conditions: [{ field: "average_rating", operator: "gt", value: 4 }],
    });
    expect(result.results).toEqual([{ group: null, value: expected, games: expected }]);
  });

  it("averages a metric per genre", () => {
    const result = ok("aggregate_games", { function: "avg", metric: "average_rating", group_by: "genre" });
    const rpg = result.results.find((row: { group: string }) => row.group === "RPG");
    expect(rpg).toEqual({ group: "RPG", value: 4.8, games: 2 });
    expect(result.group_by).toBe("genre");
  });

  it("sums revenue for one developer", () => {
    const expected = SEED_GAMES.filter((g) => g.developer === "Tiny Comet").reduce((sum, g) => sum + g.monthly_revenue_usd, 0);
    const result = ok("aggregate_games", { function: "sum", metric: "monthly_revenue_usd", search: "Tiny Comet" });
    expect(result.results[0].value).toBeCloseTo(expected, 2);
  });

  it("insists on a metric for anything but count", () => {
    expect(fails("aggregate_games", { function: "avg" })).toMatch(/metric is required unless function is count/);
  });

  it("tells the model when a grouped result was cut off", () => {
    for (let i = 0; i < 60; i++) {
      games.create({ title: `Bulk ${i}`, developer: `Dev ${i}`, genre: "Puzzle", monthly_revenue_usd: 1, monthly_downloads: 1, average_rating: 3 });
    }
    const result = ok("aggregate_games", { function: "count", group_by: "developer" });
    expect(result.results).toHaveLength(50);
    expect(result.note).toMatch(/first 50 groups/);
  });

  it("says nothing about cutting off when every group fits", () => {
    expect(ok("aggregate_games", { function: "count", group_by: "genre" }).note).toBeUndefined();
  });

  it("says so when nothing matched", () => {
    const result = ok("aggregate_games", {
      function: "avg",
      metric: "average_rating",
      conditions: [{ field: "average_rating", operator: "gt", value: 5 }],
    });
    expect(result.results).toEqual([{ group: null, value: null, games: 0 }]);
    expect(result.note).toBe("No games matched these conditions.");
  });
});

describe("compare_games", () => {
  it("returns every metric, the ranking, the leader and the exact gap", () => {
    const result = ok("compare_games", { titles: ["Echoes of Halcyon", "Rune Cartographer"] });

    expect(result.games.map((g: { title: string }) => g.title)).toEqual(["Echoes of Halcyon", "Rune Cartographer"]);
    expect(result.unresolved).toEqual([]);

    const revenue = result.comparison.monthly_revenue_usd;
    expect(revenue.leader).toBe("Echoes of Halcyon");
    expect(revenue.ranking).toEqual([
      { title: "Echoes of Halcyon", value: 203300 },
      { title: "Rune Cartographer", value: 98750.25 },
    ]);
    expect(revenue.lead_over_runner_up).toEqual({ difference: 104549.75, percent_higher: 105.9 });

    expect(result.comparison.average_rating.lead_over_runner_up.difference).toBe(0.2);
    expect(result.comparison.monthly_downloads.lead_over_runner_up.difference).toBe(87700);
  });

  it("resolves titles the way people type them: any case, or an unambiguous fragment", () => {
    const result = ok("compare_games", { titles: ["halcyon", "RUNE CARTOGRAPHER"] });
    expect(result.games).toHaveLength(2);
    expect(result.comparison.monthly_revenue_usd.leader).toBe("Echoes of Halcyon");
  });

  it("reports an ambiguous title with candidates instead of guessing", () => {
    const result = ok("compare_games", { titles: ["lantern", "Tidebound"] });
    expect(result.games.map((g: { title: string }) => g.title)).toEqual(["Tidebound"]);
    expect(result.comparison).toBeUndefined(); // only one game resolved
    expect(result.unresolved).toEqual([
      expect.objectContaining({ query: "lantern", candidates: expect.arrayContaining(["Lanternfall", "Moth & Lantern"]) }),
    ]);
  });

  it("reports titles that do not exist", () => {
    const result = ok("compare_games", { titles: ["Echoes of Halcyon", "No Such Game"] });
    expect(result.unresolved).toEqual([{ query: "No Such Game", reason: "No game with this title." }]);
    expect(result.comparison).toBeUndefined();
  });

  it("does not compare a game with itself, and says why there is no comparison", () => {
    const result = ok("compare_games", { titles: ["Tidebound", "tidebound"] });
    expect(result.games).toHaveLength(1);
    expect(result.comparison).toBeUndefined();
    expect(result.note).toMatch(/fewer than two distinct games/i);
  });

  it("rejects blank titles instead of matching the whole catalog", () => {
    expect(fails("compare_games", { titles: ["   ", "Tidebound"] })).toMatch(/titles/);
  });

  it("reports a tie rather than inventing a leader", () => {
    games.create({ title: "Twin A", developer: "X", genre: "Puzzle", monthly_revenue_usd: 10, monthly_downloads: 5, average_rating: 4 });
    games.create({ title: "Twin B", developer: "X", genre: "Puzzle", monthly_revenue_usd: 20, monthly_downloads: 5, average_rating: 3 });
    const result = ok("compare_games", { titles: ["Twin A", "Twin B"] });

    expect(result.comparison.monthly_downloads).toMatchObject({ leader: null, tie: true });
    expect(result.comparison.monthly_revenue_usd.leader).toBe("Twin B");
  });

  it("needs two to five titles", () => {
    expect(fails("compare_games", { titles: ["Only One"] })).toMatch(/titles/);
    expect(fails("compare_games", { titles: ["a", "b", "c", "d", "e", "f"] })).toMatch(/titles/);
  });
});

describe("running tools", () => {
  it("answers an unknown tool name with the list of real ones", () => {
    expect(fails("drop_database", {})).toBe(
      'Unknown tool "drop_database". Available tools: search_games, aggregate_games, compare_games.',
    );
  });

  it("hides unexpected failures behind a generic message and logs the detail", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(games, "list").mockImplementation(() => {
      throw new Error("disk exploded: /secret/path");
    });

    const error = fails("search_games", {});
    expect(error).toBe("The search_games lookup failed unexpectedly.");
    expect(error).not.toContain("secret");
    expect(consoleError).toHaveBeenCalled();
  });
});
