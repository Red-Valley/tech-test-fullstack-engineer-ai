import { describe, expect, it } from "vitest";
import type { Game } from "./schema";
import { SEED_GAMES } from "./seed-data";
import { computeStats, filterGames, nextSort, sortGames, uniqueGenres } from "./view";

const games: Game[] = SEED_GAMES.map((game, index) => ({ id: index + 1, ...game }));
const titles = (list: Game[]) => list.map((game) => game.title);

describe("filterGames", () => {
  it("returns everything when no filter is set", () => {
    expect(filterGames(games, { search: "", genre: "" })).toHaveLength(games.length);
    expect(filterGames(games, { search: "   ", genre: "" })).toHaveLength(games.length);
  });

  it("matches title or developer, ignoring case", () => {
    expect(titles(filterGames(games, { search: "HALCYON", genre: "" }))).toEqual(["Echoes of Halcyon"]);
    expect(filterGames(games, { search: "tiny comet", genre: "" })).toHaveLength(
      games.filter((game) => game.developer === "Tiny Comet").length,
    );
  });

  it("filters by genre, ignoring case, and combines with search", () => {
    const puzzles = filterGames(games, { search: "", genre: "puzzle" });
    expect(puzzles.every((game) => game.genre === "Puzzle")).toBe(true);
    expect(titles(filterGames(games, { search: "glass", genre: "Puzzle" }))).toEqual(["Glass Garden"]);
    expect(filterGames(games, { search: "glass", genre: "RPG" })).toEqual([]);
  });
});

describe("sortGames", () => {
  it("sorts numbers in both directions without mutating the input", () => {
    const original = [...games];
    const desc = sortGames(games, { field: "monthly_revenue_usd", direction: "desc" });
    const asc = sortGames(games, { field: "monthly_revenue_usd", direction: "asc" });

    expect(desc[0].title).toBe("Echoes of Halcyon");
    expect(asc[0].title).toBe("Cavern Cuts");
    expect(games).toEqual(original);
  });

  it("sorts text case-insensitively", () => {
    const sorted = sortGames([{ ...games[0], title: "banana" }, { ...games[1], title: "Apple" }, { ...games[2], title: "cherry" }], {
      field: "title",
      direction: "asc",
    });
    expect(titles(sorted)).toEqual(["Apple", "banana", "cherry"]);
  });

  it("breaks ties by title", () => {
    const rated4 = sortGames(
      games.filter((game) => game.average_rating === 4),
      { field: "average_rating", direction: "desc" },
    );
    expect(titles(rated4)).toEqual([...titles(rated4)].sort((a, b) => a.localeCompare(b)));
  });
});

describe("nextSort", () => {
  it("flips direction on the same column", () => {
    expect(nextSort({ field: "title", direction: "asc" }, "title")).toEqual({ field: "title", direction: "desc" });
    expect(nextSort({ field: "title", direction: "desc" }, "title")).toEqual({ field: "title", direction: "asc" });
  });

  it("starts numbers descending and text ascending on a new column", () => {
    const current = { field: "title", direction: "asc" } as const;
    expect(nextSort(current, "monthly_downloads")).toEqual({ field: "monthly_downloads", direction: "desc" });
    expect(nextSort(current, "genre")).toEqual({ field: "genre", direction: "asc" });
  });
});

describe("uniqueGenres", () => {
  it("lists each genre once, ignoring case, sorted", () => {
    const list = [...games, { ...games[0], id: 99, genre: "platformer" }];
    const genres = uniqueGenres(list);
    expect(genres).toEqual([...new Set(SEED_GAMES.map((game) => game.genre))].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
  });
});

describe("computeStats", () => {
  it("summarises the catalog", () => {
    const stats = computeStats(games);
    expect(stats.count).toBe(games.length);
    expect(stats.totalRevenue).toBeCloseTo(games.reduce((sum, g) => sum + g.monthly_revenue_usd, 0), 2);
    expect(stats.totalDownloads).toBe(games.reduce((sum, g) => sum + g.monthly_downloads, 0));
    expect(stats.averageRating).toBeCloseTo(games.reduce((sum, g) => sum + g.average_rating, 0) / games.length, 6);
    expect(stats.topEarner?.title).toBe("Echoes of Halcyon");
  });

  it("copes with an empty list", () => {
    expect(computeStats([])).toEqual({ count: 0, totalRevenue: 0, totalDownloads: 0, averageRating: null, topEarner: null });
  });
});
