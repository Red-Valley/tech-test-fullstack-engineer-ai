import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";
import { createGamesRepository, DuplicateTitleError, type GamesRepository } from "./repository";
import type { GameInput } from "./schema";
import { SEED_GAMES } from "./seed-data";

const sample: GameInput = {
  title: "Sample",
  developer: "Studio",
  genre: "Puzzle",
  monthly_revenue_usd: 100,
  monthly_downloads: 10,
  average_rating: 4,
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe("CRUD (empty database)", () => {
  let games: GamesRepository;
  beforeEach(() => {
    games = createGamesRepository(openDatabase(":memory:", { seed: false }));
  });

  it("creates, reads, updates and deletes a game", () => {
    const created = games.create(sample);
    expect(created).toEqual({ id: 1, ...sample });
    expect(games.get(created.id)).toEqual(created);

    const updated = games.update(created.id, { average_rating: 4.5 });
    expect(updated).toEqual({ ...created, average_rating: 4.5 });
    expect(games.get(created.id)).toEqual(updated);

    expect(games.remove(created.id)).toBe(true);
    expect(games.get(created.id)).toBeUndefined();
    expect(games.remove(created.id)).toBe(false);
  });

  it("returns undefined when updating a game that does not exist", () => {
    expect(games.update(999, { genre: "RPG" })).toBeUndefined();
  });

  it("treats titles as unique, ignoring case", () => {
    games.create(sample);
    expect(() => games.create({ ...sample, title: "SAMPLE" })).toThrow(DuplicateTitleError);
  });

  it("rejects renaming a game to another game's title and leaves it unchanged", () => {
    games.create(sample);
    const other = games.create({ ...sample, title: "Other" });
    expect(() => games.update(other.id, { title: "sample" })).toThrow(DuplicateTitleError);
    expect(games.get(other.id)?.title).toBe("Other");
  });

  it("lets the database CHECK constraints backstop the validation layer", () => {
    expect(() => games.create({ ...sample, average_rating: 9 })).toThrow(/CHECK constraint/);
    expect(() => games.create({ ...sample, monthly_revenue_usd: -5 })).toThrow(/CHECK constraint/);
  });
});

describe("queries (seeded database)", () => {
  let games: GamesRepository;
  beforeEach(() => {
    games = createGamesRepository(openDatabase(":memory:"));
  });

  it("is seeded with the sample catalog", () => {
    expect(games.list().total).toBe(SEED_GAMES.length);
  });

  it("sorts by a metric, breaks ties by id and reports the total when limited", () => {
    const { games: top, total } = games.list({ sortBy: "monthly_revenue_usd", order: "desc", limit: 3 });
    const expected = [...SEED_GAMES].sort((a, b) => b.monthly_revenue_usd - a.monthly_revenue_usd).slice(0, 3);
    expect(top.map((game) => game.title)).toEqual(expected.map((game) => game.title));
    expect(total).toBe(SEED_GAMES.length);
  });

  it("sorts text columns case-insensitively", () => {
    const created = games.create({ ...sample, title: "aardvark adventures" });
    expect(games.list({ sortBy: "title" }).games[0].id).toBe(created.id);
  });

  it("treats 'above 4' as strictly greater than 4, and 'at least 4' as inclusive", () => {
    const strictlyAbove = SEED_GAMES.filter((game) => game.average_rating > 4).length;
    const atLeast = SEED_GAMES.filter((game) => game.average_rating >= 4).length;
    expect(atLeast).toBeGreaterThan(strictlyAbove); // the seed deliberately contains games rated exactly 4.0

    const above = games.list({ numeric: [{ field: "average_rating", op: "gt", value: 4 }] });
    const inclusive = games.list({ numeric: [{ field: "average_rating", op: "gte", value: 4 }] });
    expect(above.total).toBe(strictlyAbove);
    expect(inclusive.total).toBe(atLeast);
    expect(above.games.every((game) => game.average_rating > 4)).toBe(true);
  });

  it("combines several filters with AND", () => {
    const result = games.list({
      genre: "puzzle", // case-insensitive
      numeric: [{ field: "monthly_downloads", op: "gte", value: 30000 }],
    });
    const expected = SEED_GAMES.filter((g) => g.genre === "Puzzle" && g.monthly_downloads >= 30000);
    expect(result.games.map((game) => game.title).sort()).toEqual(expected.map((g) => g.title).sort());
  });

  it("searches title or developer, case-insensitively", () => {
    const byDeveloper = games.list({ search: "tiny comet" });
    expect(byDeveloper.games.length).toBe(SEED_GAMES.filter((g) => g.developer === "Tiny Comet").length);
    expect(games.list({ search: "HALCYON" }).games.map((g) => g.title)).toEqual(["Echoes of Halcyon"]);
  });

  it("treats LIKE wildcards in the search text literally", () => {
    expect(games.list({ search: "%" }).total).toBe(0);
    expect(games.list({ search: "_" }).total).toBe(0);
    games.create({ ...sample, title: "100% Orange Juice" });
    expect(games.list({ search: "%" }).games.map((g) => g.title)).toEqual(["100% Orange Juice"]);
  });

  it("never lets values act as SQL", () => {
    const hostile = "'; DROP TABLE games; --";
    expect(games.list({ search: hostile }).total).toBe(0);
    expect(games.list({ genre: hostile }).total).toBe(0);
    expect(games.list().total).toBe(SEED_GAMES.length);
  });

  it("refuses column names and operators outside the allow-lists", () => {
    // @ts-expect-error - deliberately invalid, as a model might send it
    expect(() => games.list({ sortBy: "id; DROP TABLE games" })).toThrow(/Invalid sort field/);
    // @ts-expect-error - deliberately invalid
    expect(() => games.list({ numeric: [{ field: "title", op: "gt", value: 1 }] })).toThrow(/Invalid metric/);
    // @ts-expect-error - deliberately invalid
    expect(() => games.list({ numeric: [{ field: "average_rating", op: "OR 1=1", value: 1 }] })).toThrow(/Invalid operator/);
  });
});

describe("aggregate", () => {
  let games: GamesRepository;
  beforeEach(() => {
    games = createGamesRepository(openDatabase(":memory:"));
  });

  it("counts games matching a filter", () => {
    const [row] = games.aggregate({ fn: "count", numeric: [{ field: "average_rating", op: "gt", value: 4 }] });
    expect(row).toEqual({
      group: null,
      value: SEED_GAMES.filter((g) => g.average_rating > 4).length,
      games: SEED_GAMES.filter((g) => g.average_rating > 4).length,
    });
  });

  it("sums, averages, and finds min / max of a metric", () => {
    const revenue = SEED_GAMES.map((g) => g.monthly_revenue_usd);
    const ratings = SEED_GAMES.map((g) => g.average_rating);

    expect(games.aggregate({ fn: "sum", metric: "monthly_revenue_usd" })[0].value).toBeCloseTo(sum(revenue), 2);
    expect(games.aggregate({ fn: "avg", metric: "average_rating" })[0].value).toBeCloseTo(sum(ratings) / ratings.length, 2);
    expect(games.aggregate({ fn: "max", metric: "monthly_revenue_usd" })[0].value).toBe(Math.max(...revenue));
    expect(games.aggregate({ fn: "min", metric: "average_rating" })[0].value).toBe(Math.min(...ratings));
  });

  it("groups by genre, largest value first", () => {
    const rows = games.aggregate({ fn: "sum", metric: "monthly_revenue_usd", groupBy: "genre" });
    const expected = new Map<string, number>();
    for (const g of SEED_GAMES) expected.set(g.genre, (expected.get(g.genre) ?? 0) + g.monthly_revenue_usd);

    expect(rows).toHaveLength(expected.size);
    for (const row of rows) expect(row.value).toBeCloseTo(expected.get(row.group!)!, 2);
    expect(rows.map((r) => r.value)).toEqual([...rows.map((r) => r.value)].sort((a, b) => b! - a!));
  });

  it("returns an empty aggregate (not an error) when nothing matches", () => {
    const nothing = [{ field: "average_rating", op: "gt", value: 5 }] as const;
    expect(games.aggregate({ fn: "count", numeric: [...nothing] })).toEqual([{ group: null, value: 0, games: 0 }]);
    expect(games.aggregate({ fn: "avg", metric: "average_rating", numeric: [...nothing] })).toEqual([
      { group: null, value: null, games: 0 },
    ]);
  });

  it("requires a metric for everything except count", () => {
    expect(() => games.aggregate({ fn: "avg" })).toThrow(/needs a metric/);
  });
});

describe("aggregate ordering", () => {
  it("lists the smallest value first for min and the largest first for everything else", () => {
    const games = createGamesRepository(openDatabase(":memory:"));
    const values = (fn: "min" | "max" | "avg" | "sum") =>
      games.aggregate({ fn, metric: "average_rating", groupBy: "genre" }).map((row) => row.value as number);

    expect(values("min")).toEqual([...values("min")].sort((a, b) => a - b));
    for (const fn of ["max", "avg", "sum"] as const) {
      expect(values(fn), fn).toEqual([...values(fn)].sort((a, b) => b - a));
    }
  });
});

describe("matching accented text", () => {
  let games: GamesRepository;
  beforeEach(() => {
    games = createGamesRepository(openDatabase(":memory:", { seed: false }));
    games.create({ ...sample, title: "Édition Noire", developer: "Ñandú Studio", genre: "Acción" });
    games.create({ ...sample, title: "Plain Game", developer: "Studio", genre: "Puzzle" });
  });

  it("ignores case in accented letters, like the dashboard's own search does", () => {
    for (const text of ["édition", "ÉDITION", "édition noire", "ñandú", "ÑANDÚ"]) {
      expect(games.list({ search: text }).games.map((g) => g.title), text).toEqual(["Édition Noire"]);
    }
  });

  it("matches genres and titles in any case", () => {
    expect(games.list({ genre: "ACCIÓN" }).total).toBe(1);
    expect(games.resolveTitles(["édition noire"])[0]).toMatchObject({ status: "exact", game: { title: "Édition Noire" } });
    expect(games.resolveTitles(["ÉDITION"])[0]).toMatchObject({ status: "partial" });
  });

  it("treats titles differing only in accented-letter case as duplicates, on create and on rename", () => {
    expect(() => games.create({ ...sample, title: "édition noire" })).toThrow(DuplicateTitleError);

    const other = games.create({ ...sample, title: "Other" });
    expect(() => games.update(other.id, { title: "ÉDITION NOIRE" })).toThrow(DuplicateTitleError);
    expect(games.update(other.id, { title: "Other (renamed)" })?.title).toBe("Other (renamed)");
  });

  it("lets a game keep its own title when saved again with the case changed", () => {
    const [existing] = games.list({ search: "Édition" }).games;
    expect(games.update(existing.id, { title: "ÉDITION NOIRE" })?.title).toBe("ÉDITION NOIRE");
  });

  it("stays accent-sensitive: e is a different letter from é, in the dashboard and here alike", () => {
    expect(games.list({ search: "edition" }).total).toBe(0);
  });

  it("still treats LIKE wildcards literally", () => {
    expect(games.list({ search: "%" }).total).toBe(0);
  });
});

describe("resolveTitles", () => {
  let games: GamesRepository;
  beforeEach(() => {
    games = createGamesRepository(openDatabase(":memory:"));
  });

  it("matches an exact title case-insensitively", () => {
    const [match] = games.resolveTitles(["  echoes of halcyon "]);
    expect(match).toMatchObject({ status: "exact", game: { title: "Echoes of Halcyon" } });
  });

  it("accepts a single partial match", () => {
    expect(games.resolveTitles(["halcyon"])[0]).toMatchObject({ status: "partial", game: { title: "Echoes of Halcyon" } });
  });

  it("reports several partial matches as ambiguous, with candidates", () => {
    const [match] = games.resolveTitles(["lantern"]);
    expect(match.status).toBe("ambiguous");
    expect(match.status === "ambiguous" && match.candidates.sort()).toEqual(["Lanternfall", "Moth & Lantern"]);
  });

  it("reports unknown titles as not found", () => {
    expect(games.resolveTitles(["Nonexistent Game"])).toEqual([{ query: "Nonexistent Game", status: "not_found" }]);
  });
});

describe("summary", () => {
  it("returns the game count and the distinct genres, sorted", () => {
    const games = createGamesRepository(openDatabase(":memory:"));
    const { totalGames, genres } = games.summary();
    expect(totalGames).toBe(SEED_GAMES.length);
    // The genre column is COLLATE NOCASE, so the order is case-insensitive: Racing, Roguelike, RPG.
    const caseInsensitive = (a: string, b: string) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1);
    expect(genres).toEqual([...new Set(SEED_GAMES.map((g) => g.genre))].sort(caseInsensitive));
  });
});
