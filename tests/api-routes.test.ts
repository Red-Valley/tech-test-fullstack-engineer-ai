import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as postChat } from "../app/api/chat/route";
import { DELETE, GET as getOne, PATCH } from "../app/api/games/[id]/route";
import { GET as getAll, POST as postGame } from "../app/api/games/route";
import { SEED_GAMES } from "../lib/games/seed";

// `connection()` only works inside a running Next.js request. The handlers call it before reading the
// database, so the tests replace it with a no-op and keep everything else from `next/server`.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

const URL_BASE = "http://localhost/api/games";
const game = {
  title: "Route Test Game",
  developer: "Test Studio",
  genre: "Puzzle",
  monthly_revenue_usd: 1234.5,
  monthly_downloads: 999,
  average_rating: 4.5,
};

const request = (method: string, body?: unknown, url = URL_BASE) =>
  new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

// The database module caches its connection on `globalThis`. These hooks point it at a temporary file for this
// file's tests, then close it and restore everything, so no state leaks into other test files.
const globals = globalThis as { gamesDb?: { close(): void } };
const previousPath = process.env.DATABASE_PATH;
const previousDb = globals.gamesDb;
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "games-routes-"));
  process.env.DATABASE_PATH = join(dir, "games.db");
  delete globals.gamesDb;
});
afterAll(() => {
  globals.gamesDb?.close();
  if (previousDb) globals.gamesDb = previousDb;
  else delete globals.gamesDb;
  if (previousPath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousPath;
  rmSync(dir, { recursive: true, force: true });
});
afterEach(() => vi.unstubAllEnvs());

describe("/api/games", () => {
  it("lists the seeded games", async () => {
    const response = await getAll();
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(SEED_GAMES.length);
  });

  it("creates a game, then rejects invalid input and a duplicate title", async () => {
    const created = await postGame(request("POST", game));
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ ...game, id: expect.any(Number) });

    const invalid = await postGame(request("POST", { ...game, title: "", average_rating: 9 }));
    expect(invalid.status).toBe(400);
    const { issues } = await invalid.json();
    expect(issues.map((i: { path: string[] }) => i.path[0]).sort()).toEqual(["average_rating", "title"]);

    expect((await postGame(request("POST", "{nope"))).status).toBe(400);
    expect((await postGame(request("POST", { ...game, title: game.title.toUpperCase() }))).status).toBe(409);
  });
});

describe("/api/games/:id", () => {
  it("gets, patches, and deletes a game, answering 400 and 404 where they apply", async () => {
    const { id } = await (await postGame(request("POST", { ...game, title: "Lifecycle Game" }))).json();

    expect((await getOne(request("GET"), ctx(String(id)))).status).toBe(200);
    expect((await getOne(request("GET"), ctx("abc"))).status).toBe(400);
    expect((await getOne(request("GET"), ctx("999999"))).status).toBe(404);

    const patched = await PATCH(request("PATCH", { average_rating: 3.25 }), ctx(String(id)));
    expect(patched.status).toBe(200);
    expect(await patched.json()).toMatchObject({ id, average_rating: 3.25, title: "Lifecycle Game" });
    expect((await PATCH(request("PATCH", {}), ctx(String(id)))).status).toBe(400);
    expect((await PATCH(request("PATCH", { title: "Ember Reach" }), ctx(String(id)))).status).toBe(409);
    expect((await PATCH(request("PATCH", { average_rating: 1 }), ctx("999999"))).status).toBe(404);

    expect((await DELETE(request("DELETE"), ctx(String(id)))).status).toBe(204);
    expect((await DELETE(request("DELETE"), ctx(String(id)))).status).toBe(404);
    expect((await getOne(request("GET"), ctx(String(id)))).status).toBe(404);
  });
});

describe("POST /api/chat (request validation, no model call)", () => {
  const chat = (body: unknown) => postChat(request("POST", body, "http://localhost/api/chat"));
  const user = { role: "user", content: "How many games are rated above 4?" };

  it("answers 503 with a clear message when no API key is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const response = await chat({ messages: [user] });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("rejects bad requests before calling the model", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    expect((await chat("{nope")).status).toBe(400);
    expect((await chat({ messages: [] })).status).toBe(400);
    expect((await chat({ messages: [{ role: "assistant", content: "hi" }] })).status).toBe(400);
    expect((await chat({ messages: [{ role: "system", content: "x" }] })).status).toBe(400);
    expect((await chat({ messages: [{ role: "assistant", content: [{ type: "image" }] }, user] })).status).toBe(400);

    const tooMany = await chat({ messages: Array.from({ length: 201 }, () => user) });
    expect(tooMany.status).toBe(400);
    expect((await tooMany.json()).error).toMatch(/too long/);

    const tooBig = await chat({ messages: [{ role: "user", content: "x".repeat(600_000) }] });
    expect(tooBig.status).toBe(413);
  });
});
