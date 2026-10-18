import { beforeEach, describe, expect, it } from "vitest";
import { createDb, seedGames } from "@/lib/db/client";
import { gameInputSchema, type GameInput } from "@/lib/db/schema";
import { DEFAULT_VIEW, type CatalogView } from "@/lib/games/catalog-view";
import { createRepository, type Repository } from "@/lib/games/repository";

const newGame: GameInput = {
  title: "Test Game",
  developer: "Me",
  genre: "Puzzle",
  monthly_revenue_usd: 1000,
  monthly_downloads: 50,
  average_rating: 4.2,
};

let repo: Repository;

beforeEach(() => {
  const db = createDb(":memory:");
  seedGames(db);
  repo = createRepository(db);
});

describe("CRUD", () => {
  it("lists the 12 seed games", () => {
    expect(repo.listGames()).toHaveLength(12);
  });

  it("creates, reads, updates and deletes a game", () => {
    const created = repo.createGame(newGame);
    expect(created).toMatchObject({ ...newGame, id: 13 });
    expect(repo.getGame(created.id)).toEqual(created);

    const updated = repo.updateGame(created.id, { ...newGame, monthly_revenue_usd: 2000 });
    expect(updated?.monthly_revenue_usd).toBe(2000);

    expect(repo.deleteGame(created.id)).toBe(true);
    expect(repo.getGame(created.id)).toBeUndefined();
    expect(repo.deleteGame(created.id)).toBe(false);
  });

  it("returns undefined when updating a missing game", () => {
    expect(repo.updateGame(999, newGame)).toBeUndefined();
  });
});

describe("queries", () => {
  it("ranks by revenue", () => {
    expect(repo.rankGames("monthly_revenue_usd", "desc", 1)[0].title).toBe("Hollow Depths");
    expect(repo.rankGames("monthly_revenue_usd", "asc", 1)[0].title).toBe("Moth & Lantern");
  });

  it("distinguishes 'above' from 'at least' a threshold", () => {
    expect(repo.filterGames({ metric: "average_rating", op: "gt", value: 4 })).toHaveLength(7);
    expect(repo.filterGames({ metric: "average_rating", op: "gte", value: 4 })).toHaveLength(8);
  });

  it("filters by developer ignoring case", () => {
    expect(repo.filterGames({ developer: "mossgrove studio" })).toHaveLength(2);
  });

  it("searches title and developer ignoring case", () => {
    const { games, totalMatches } = repo.searchGames("lantern", 10);
    expect(totalMatches).toBe(2);
    expect(games.map((g) => g.title)).toEqual(["Cinder & Salt", "Moth & Lantern"]);
  });

  it("treats LIKE wildcards in search text literally", () => {
    expect(repo.searchGames("%", 10).totalMatches).toBe(0);
  });

  it("resolves titles and reports missing ones", () => {
    const { found, notFound } = repo.findGamesByTitles(["hollow depths", "Nope"]);
    expect(found.map((g) => g.title)).toEqual(["Hollow Depths"]);
    expect(notFound).toEqual(["Nope"]);
  });

  it("reports titles matching several games as ambiguous", () => {
    repo.createGame({ ...newGame, title: "Hollow Depths II" });
    const { found, ambiguous } = repo.findGamesByTitles(["hollow"]);
    expect(found).toHaveLength(0);
    expect(ambiguous.hollow).toEqual(["Hollow Depths", "Hollow Depths II"]);
  });
});

describe("validation", () => {
  it("reports every invalid field with its rule", () => {
    const result = gameInputSchema.safeParse({
      title: " ",
      developer: "Me",
      genre: "Puzzle",
      monthly_revenue_usd: -5,
      monthly_downloads: 1.5,
      average_rating: 4.25,
    });
    expect(result.success).toBe(false);
    expect(Object.keys(result.error!.flatten().fieldErrors).sort()).toEqual([
      "average_rating",
      "monthly_downloads",
      "monthly_revenue_usd",
      "title",
    ]);
  });

  it("strips unknown and system keys", () => {
    const parsed = gameInputSchema.parse({ ...newGame, id: 99, created_at: "x", extra: true });
    expect(parsed).toEqual(newGame);
  });
});

describe("catalog view queries", () => {
  const view = (overrides: Partial<CatalogView> = {}): CatalogView => ({ ...DEFAULT_VIEW, ...overrides });

  it("defaults to revenue, highest first", () => {
    const titles = repo.queryCatalog(view()).map((g) => g.title);
    expect(titles).toHaveLength(12);
    expect(titles[0]).toBe("Hollow Depths");
    expect(titles.at(-1)).toBe("Moth & Lantern");
  });

  it("searches title or developer", () => {
    expect(repo.queryCatalog(view({ q: "lantern" })).map((g) => g.title).sort()).toEqual(["Cinder & Salt", "Moth & Lantern"]);
  });

  it("filters by genre ignoring case and combines with search", () => {
    expect(repo.queryCatalog(view({ genre: "racing" })).map((g) => g.title)).toEqual(["Neon Drift"]);
    expect(repo.queryCatalog(view({ genre: "racing", q: "lantern" }))).toHaveLength(0);
  });

  it("sorts by any column in either direction", () => {
    expect(repo.queryCatalog(view({ sort: "rating", dir: "desc" }))[0].title).toBe("Cinder & Salt");
    expect(repo.queryCatalog(view({ sort: "rating", dir: "asc" }))[0].title).toBe("Skyline Siege");
    expect(repo.queryCatalog(view({ sort: "title", dir: "asc" }))[0].title).toBe("Cinder & Salt");
    expect(repo.queryCatalog(view({ sort: "downloads", dir: "desc" }))[0].title).toBe("Stardust Farm");
  });

  it("treats LIKE wildcards literally", () => {
    expect(repo.queryCatalog(view({ q: "%" }))).toHaveLength(0);
  });

  it("lists distinct genres A–Z", () => {
    const genres = repo.listGenres();
    expect(genres).toHaveLength(12);
    expect(genres[0]).toBe("Adventure");
    expect([...genres].sort((a, b) => a.localeCompare(b))).toEqual(genres);
  });

  it("reports the highest revenue, or 0 when empty", () => {
    expect(repo.maxRevenue()).toBe(142500);
    expect(createRepository(createDb(":memory:")).maxRevenue()).toBe(0);
  });
});
