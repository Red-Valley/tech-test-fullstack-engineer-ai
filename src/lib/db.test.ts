import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db";
import { createGamesRepository } from "./games/repository";
import { SEED_GAMES } from "./games/seed-data";

describe("openDatabase", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "games-db-test-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("seeds a new file once; deleting every game does not bring the samples back", () => {
    const file = path.join(dir, "nested", "games.db"); // also proves missing parent folders are created

    const first = openDatabase(file);
    const games = createGamesRepository(first);
    expect(games.list().total).toBe(SEED_GAMES.length);
    for (const game of games.list().games) games.remove(game.id);
    first.close();

    const second = openDatabase(file);
    expect(createGamesRepository(second).list().total).toBe(0);
    second.close();
  });

  it("does not seed over a database that already holds games (e.g. one it did not create)", () => {
    const file = path.join(dir, "existing.db");
    const existing = openDatabase(file, { seed: false });
    createGamesRepository(existing).create({
      title: "Lanternfall", // would collide with a sample title
      developer: "Someone Else",
      genre: "RPG",
      monthly_revenue_usd: 1,
      monthly_downloads: 1,
      average_rating: 5,
    });
    existing.pragma("user_version = 0"); // as if the file was made by something else and never stamped
    existing.close();

    const reopened = openDatabase(file); // must neither throw on the duplicate title nor add samples
    expect(createGamesRepository(reopened).list().games.map((g) => g.developer)).toEqual(["Someone Else"]);
    reopened.close();
  });

  it("refuses a database written by a newer version of the app", () => {
    const file = path.join(dir, "future.db");
    const future = openDatabase(file, { seed: false });
    future.pragma("user_version = 99");
    future.close();

    expect(() => openDatabase(file)).toThrow(/newer version/);
  });

  it("persists changes across reopen", () => {
    const file = path.join(dir, "games.db");
    const first = openDatabase(file, { seed: false });
    createGamesRepository(first).create({
      title: "Persisted",
      developer: "Studio",
      genre: "RPG",
      monthly_revenue_usd: 1,
      monthly_downloads: 1,
      average_rating: 5,
    });
    first.close();

    const second = openDatabase(file, { seed: false });
    expect(createGamesRepository(second).list().games.map((g) => g.title)).toEqual(["Persisted"]);
    second.close();
  });
});
