import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../db";
import { createRepository, DuplicateTitleError } from "./repository";
import { SEED_GAMES } from "./seed";
import { GameInput, GameUpdate } from "./schema";

const fixtures: GameInput[] = [
  { title: "Alpha Quest", developer: "North Studio", genre: "Platformer", monthly_revenue_usd: 1000, monthly_downloads: 500, average_rating: 4.5 },
  { title: "Beta Blocks", developer: "North Studio", genre: "Puzzle", monthly_revenue_usd: 5000, monthly_downloads: 900, average_rating: 4.0 },
  { title: "Gamma Grid", developer: "South Works", genre: "Puzzle", monthly_revenue_usd: 2500, monthly_downloads: 100, average_rating: 3.2 },
  { title: "Delta Dash", developer: "South Works", genre: "Platformer", monthly_revenue_usd: 300, monthly_downloads: 4000, average_rating: 4.9 },
];

/** A fresh in-memory database holding exactly the fixtures above. */
function freshRepo() {
  const db = openDatabase(":memory:");
  db.exec("DELETE FROM games");
  const repo = createRepository(db);
  for (const game of fixtures) repo.create(game);
  return repo;
}

describe("database", () => {
  it("seeds an empty database with varied fictional games", () => {
    const repo = createRepository(openDatabase(":memory:"));
    const games = repo.list();
    expect(games).toHaveLength(SEED_GAMES.length);
    expect(new Set(games.map((g) => g.genre)).size).toBeGreaterThanOrEqual(5);
    expect(games.some((g) => g.average_rating > 4)).toBe(true);
    expect(games.some((g) => g.average_rating < 4)).toBe(true);
  });

  it("ships a large, valid seed: unique titles, no revenue ties", () => {
    // README, PLAN.md, and AI_WORKFLOW.md state this number, so changing the seed should fail here first.
    expect(SEED_GAMES.length).toBe(70);
    // Every seed game must pass the same validation as a game created through the API.
    for (const game of SEED_GAMES) expect(GameInput.safeParse(game).success, game.title).toBe(true);
    // A duplicate title would make the first database open throw (the title column is unique).
    const titles = SEED_GAMES.map((g) => g.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    // Distinct revenues keep "top N by revenue" questions unambiguous.
    const revenues = SEED_GAMES.map((g) => g.monthly_revenue_usd);
    expect(new Set(revenues).size).toBe(revenues.length);
  });

  it("seeds a database file once: deleting every game does not bring the seed back", () => {
    const dir = mkdtempSync(join(tmpdir(), "games-test-"));
    const file = join(dir, "nested", "games.db");
    try {
      const first = openDatabase(file);
      expect(createRepository(first).list()).toHaveLength(SEED_GAMES.length);
      first.exec("DELETE FROM games");
      first.close();

      const reopened = openDatabase(file);
      expect(createRepository(reopened).list()).toHaveLength(0);
      reopened.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("repository CRUD", () => {
  let repo: ReturnType<typeof freshRepo>;
  beforeEach(() => {
    repo = freshRepo();
  });

  it("round-trips create, get, update, remove", () => {
    const created = repo.create({
      title: "Epsilon Echo",
      developer: "East Games",
      genre: "Narrative",
      monthly_revenue_usd: 750.25,
      monthly_downloads: 1200,
      average_rating: 3.8,
    });
    expect(created.id).toBeGreaterThan(0);
    expect(repo.get(created.id)).toEqual(created);
    expect(repo.list()).toHaveLength(fixtures.length + 1);

    const updated = repo.update(created.id, { monthly_revenue_usd: 900, average_rating: 4.1 });
    expect(updated).toMatchObject({ id: created.id, title: "Epsilon Echo", monthly_revenue_usd: 900, average_rating: 4.1 });

    expect(repo.remove(created.id)).toBe(true);
    expect(repo.get(created.id)).toBeUndefined();
    expect(repo.remove(created.id)).toBe(false);
    expect(repo.update(created.id, { genre: "Puzzle" })).toBeUndefined();
  });

  it("rejects a duplicate title case-insensitively on create and update", () => {
    expect(() => repo.create({ ...fixtures[0], title: "alpha quest" })).toThrow(DuplicateTitleError);
    const beta = repo.query({ filters: { titles: ["Beta"] } }).games[0];
    expect(() => repo.update(beta.id, { title: "GAMMA GRID" })).toThrow(DuplicateTitleError);
  });
});

describe("validation", () => {
  it("rejects bad input", () => {
    const bad = [
      { ...fixtures[0], title: "   " },
      { ...fixtures[0], monthly_revenue_usd: -1 },
      { ...fixtures[0], monthly_downloads: 1.5 },
      { ...fixtures[0], monthly_downloads: -3 },
      { ...fixtures[0], average_rating: 5.1 },
      { ...fixtures[0], average_rating: -0.1 },
      { ...fixtures[0], genre: undefined },
    ];
    for (const input of bad) {
      expect(GameInput.safeParse(input).success).toBe(false);
    }
    expect(GameInput.safeParse({ ...fixtures[0], title: "  Padded  " })).toMatchObject({
      success: true,
      data: { title: "Padded" },
    });
  });

  it("requires at least one valid field for updates", () => {
    expect(GameUpdate.safeParse({}).success).toBe(false);
    expect(GameUpdate.safeParse({ average_rating: 9 }).success).toBe(false);
    expect(GameUpdate.safeParse({ average_rating: 4 }).success).toBe(true);
  });
});

describe("repository.query", () => {
  const repo = freshRepo();

  it("filters numerically and reports total_matching before the limit", () => {
    const result = repo.query({
      filters: { numeric: [{ field: "average_rating", op: ">", value: 4 }] },
      limit: 1,
    });
    // 4.5 and 4.9 qualify; 4.0 is not above 4.
    expect(result.total_matching).toBe(2);
    expect(result.games).toHaveLength(1);
  });

  it("sorts by revenue descending and honors limit 1", () => {
    const result = repo.query({ sort_by: "monthly_revenue_usd", order: "desc", limit: 1 });
    expect(result.games.map((g) => g.title)).toEqual(["Beta Blocks"]);
    expect(result.total_matching).toBe(fixtures.length);
  });

  it("matches several titles case-insensitively with partial text", () => {
    const result = repo.query({ filters: { titles: ["alpha", "GAMMA"] } });
    expect(result.total_matching).toBe(2);
    expect(result.games.map((g) => g.title)).toEqual(["Alpha Quest", "Gamma Grid"]);
  });

  it("combines genre and developer filters and clamps the limit", () => {
    const result = repo.query({ filters: { genre: "puzzle", developer: "south works" }, limit: 500 });
    expect(result.games.map((g) => g.title)).toEqual(["Gamma Grid"]);
    expect(repo.query({ limit: 0 }).games).toHaveLength(1);
    expect(repo.query({ limit: 9999 }).games).toHaveLength(fixtures.length);
  });

  it("rejects blank filters instead of silently matching every game", () => {
    expect(() => repo.query({ filters: { titles: [""] } })).toThrow(/titles entry/);
    expect(() => repo.query({ filters: { titles: ["alpha", "  "] } })).toThrow(/titles entry/);
    expect(() => repo.query({ filters: { genre: " " } })).toThrow(/genre/);
    expect(() => repo.aggregate({ metric: "count", filters: { developer: "" } })).toThrow(/developer/);
    // An empty list of titles is "no title filter", not a blank one.
    expect(repo.query({ filters: { titles: [] } }).total_matching).toBe(fixtures.length);
  });

  it("treats LIKE wildcards in titles literally and rejects non-whitelisted identifiers", () => {
    expect(repo.query({ filters: { titles: ["%"] } }).total_matching).toBe(0);
    expect(() => repo.query({ sort_by: "title; DROP TABLE games" as never })).toThrow(/sort_by/);
    expect(() =>
      repo.query({ filters: { numeric: [{ field: "title" as never, op: ">", value: 1 }] } }),
    ).toThrow(/numeric filter field/);
    expect(() =>
      repo.query({ filters: { numeric: [{ field: "average_rating", op: "OR 1=1" as never, value: 1 }] } }),
    ).toThrow(/operator/);
  });
});

describe("repository.aggregate", () => {
  const repo = freshRepo();

  it("counts, with and without filters", () => {
    expect(repo.aggregate({ metric: "count" }).rows).toEqual([{ value: 4 }]);
    const above4 = repo.aggregate({
      metric: "count",
      filters: { numeric: [{ field: "average_rating", op: ">", value: 4 }] },
    });
    expect(above4.rows).toEqual([{ value: 2 }]);
  });

  it("sums revenue grouped by genre", () => {
    const result = repo.aggregate({ metric: "sum", field: "monthly_revenue_usd", group_by: "genre" });
    expect(result.rows).toEqual([
      { group: "Puzzle", value: 7500 },
      { group: "Platformer", value: 1300 },
    ]);
  });

  it("computes avg, min, and max, and requires a field for them", () => {
    expect(repo.aggregate({ metric: "avg", field: "average_rating" }).rows).toEqual([{ value: 4.15 }]);
    expect(repo.aggregate({ metric: "max", field: "monthly_downloads" }).rows).toEqual([{ value: 4000 }]);
    expect(repo.aggregate({ metric: "min", field: "monthly_downloads" }).rows).toEqual([{ value: 100 }]);
    expect(() => repo.aggregate({ metric: "sum" })).toThrow(/field/);
  });
});
