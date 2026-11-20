import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGamesRepository, type GamesRepository } from "@/lib/games/repository";
import type { Game } from "@/lib/games/schema";
import { SEED_GAMES } from "@/lib/games/seed-data";

// Only the database accessor is replaced: each test gets a fresh, seeded in-memory database,
// and the real route handlers run against it with real Request objects.
let repo: GamesRepository;
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getGames: () => repo,
}));

import { openDatabase } from "@/lib/db";
import * as itemRoute from "./[id]/route";
import * as collectionRoute from "./route";

const newGame = {
  title: "Brand New Game",
  developer: "Indie Dev",
  genre: "Puzzle",
  monthly_revenue_usd: 1500.5,
  monthly_downloads: 2000,
  average_rating: 4.1,
};

const request = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init);
const withJson = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: typeof body === "string" ? body : JSON.stringify(body),
});
const idContext = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  repo = createGamesRepository(openDatabase(":memory:"));
});

describe("GET /api/games", () => {
  it("lists every game, sorted by title by default", async () => {
    const response = await collectionRoute.GET(request("/api/games"));
    const games: Game[] = await response.json();

    expect(response.status).toBe(200);
    expect(games).toHaveLength(SEED_GAMES.length);
    expect(games.map((g) => g.title)).toEqual(games.map((g) => g.title).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
  });

  it("filters by genre and search text, and sorts by a metric", async () => {
    const response = await collectionRoute.GET(request("/api/games?genre=puzzle&sort=monthly_revenue_usd&order=desc"));
    const games: Game[] = await response.json();
    const expected = SEED_GAMES.filter((g) => g.genre === "Puzzle").sort((a, b) => b.monthly_revenue_usd - a.monthly_revenue_usd);
    expect(games.map((g) => g.title)).toEqual(expected.map((g) => g.title));

    const search: Game[] = await (await collectionRoute.GET(request("/api/games?q=ironbark"))).json();
    expect(search.length).toBe(SEED_GAMES.filter((g) => g.developer === "Ironbark Interactive").length);
  });

  it("rejects an unknown sort field with a 400 naming the field", async () => {
    const response = await collectionRoute.GET(request("/api/games?sort=password"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues[0].field).toBe("sort");
  });
});

describe("POST /api/games", () => {
  it("creates a game, answering 201 with a Location header", async () => {
    const response = await collectionRoute.POST(request("/api/games", withJson("POST", newGame)));
    const created: Game = await response.json();

    expect(response.status).toBe(201);
    expect(created).toEqual({ id: expect.any(Number), ...newGame });
    expect(response.headers.get("Location")).toBe(`/api/games/${created.id}`);
    expect(repo.get(created.id)).toEqual(created);
  });

  it("returns per-field validation issues", async () => {
    const response = await collectionRoute.POST(
      request("/api/games", withJson("POST", { ...newGame, title: "", average_rating: 7 })),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.issues).toEqual([
      { field: "title", message: "Title is required" },
      { field: "average_rating", message: "Average rating must be between 0 and 5" },
    ]);
  });

  it("rejects a body that is not JSON", async () => {
    const response = await collectionRoute.POST(request("/api/games", withJson("POST", "{not json")));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Request body must be valid JSON");
  });

  it("answers 409 for a duplicate title, ignoring case", async () => {
    const response = await collectionRoute.POST(
      request("/api/games", withJson("POST", { ...newGame, title: "lanternfall" })),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).issues[0].field).toBe("title");
  });
});

describe("/api/games/:id", () => {
  it("GET returns the game, 404 when missing, and 400 for a malformed id", async () => {
    const found = await itemRoute.GET(request("/api/games/1"), idContext("1"));
    expect(found.status).toBe(200);
    expect((await found.json()).id).toBe(1);

    expect((await itemRoute.GET(request("/api/games/9999"), idContext("9999"))).status).toBe(404);
    for (const bad of ["abc", "0", "-1", "1.5", "1e3", ""]) {
      expect((await itemRoute.GET(request(`/api/games/${bad}`), idContext(bad))).status, `id "${bad}"`).toBe(400);
    }
  });

  it("PUT replaces the whole game and requires every field", async () => {
    const replaced = await itemRoute.PUT(request("/api/games/1", withJson("PUT", newGame)), idContext("1"));
    expect(replaced.status).toBe(200);
    expect(await replaced.json()).toEqual({ id: 1, ...newGame });

    const partial = await itemRoute.PUT(request("/api/games/1", withJson("PUT", { title: "Only A Title" })), idContext("1"));
    expect(partial.status).toBe(400);

    const missing = await itemRoute.PUT(request("/api/games/9999", withJson("PUT", newGame)), idContext("9999"));
    expect(missing.status).toBe(404);
  });

  it("PATCH changes only the fields that are sent", async () => {
    const before = repo.get(2)!;
    const response = await itemRoute.PATCH(request("/api/games/2", withJson("PATCH", { average_rating: 3.3 })), idContext("2"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...before, average_rating: 3.3 });

    const empty = await itemRoute.PATCH(request("/api/games/2", withJson("PATCH", {})), idContext("2"));
    expect(empty.status).toBe(400);
    expect((await empty.json()).issues[0].message).toBe("Provide at least one field to update");
  });

  it("PATCH and PUT answer 409 when the new title belongs to another game", async () => {
    const taken = repo.get(1)!.title;
    const patch = await itemRoute.PATCH(request("/api/games/2", withJson("PATCH", { title: taken })), idContext("2"));
    expect(patch.status).toBe(409);
    expect(repo.get(2)!.title).not.toBe(taken);
  });

  it("DELETE removes the game: 204, then 404", async () => {
    const first = await itemRoute.DELETE(request("/api/games/3", { method: "DELETE" }), idContext("3"));
    expect(first.status).toBe(204);
    expect(await first.text()).toBe("");
    expect(repo.get(3)).toBeUndefined();

    const second = await itemRoute.DELETE(request("/api/games/3", { method: "DELETE" }), idContext("3"));
    expect(second.status).toBe(404);
  });
});

describe("error handling", () => {
  it("hides internal errors behind a generic 500", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(repo, "list").mockImplementation(() => {
      throw new Error("secret database detail");
    });

    const response = await collectionRoute.GET(request("/api/games"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
    expect(consoleError).toHaveBeenCalled();
  });
});
