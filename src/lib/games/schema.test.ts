import { describe, expect, it } from "vitest";
import { gameInputSchema, gameUpdateSchema } from "./schema";
import { SEED_GAMES } from "./seed-data";

const valid = {
  title: "Test Game",
  developer: "Test Studio",
  genre: "Puzzle",
  monthly_revenue_usd: 1200.5,
  monthly_downloads: 3400,
  average_rating: 4.2,
};

function messagesFor(input: unknown): Record<string, string> {
  const result = gameInputSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("gameInputSchema", () => {
  it("accepts a valid game, trims text and rounds money and rating to 2 decimals", () => {
    const parsed = gameInputSchema.parse({
      ...valid,
      title: "  Padded Title  ",
      monthly_revenue_usd: 10.005 + 0.1234,
      average_rating: 4.333333,
    });
    expect(parsed.title).toBe("Padded Title");
    expect(parsed.monthly_revenue_usd).toBe(10.13);
    expect(parsed.average_rating).toBe(4.33);
  });

  it("reports friendly per-field messages", () => {
    expect(
      messagesFor({
        title: "   ",
        developer: "",
        genre: "x".repeat(41),
        monthly_revenue_usd: -1,
        monthly_downloads: 1.5,
        average_rating: 5.1,
      }),
    ).toEqual({
      title: "Title is required",
      developer: "Developer is required",
      genre: "Genre must be at most 40 characters",
      monthly_revenue_usd: "Monthly revenue can't be negative",
      monthly_downloads: "Monthly downloads must be a whole number",
      average_rating: "Average rating must be between 0 and 5",
    });
  });

  it("rejects wrong types and missing fields with readable messages", () => {
    expect(messagesFor({ ...valid, monthly_revenue_usd: "1200" })).toEqual({
      monthly_revenue_usd: "Monthly revenue must be a number",
    });
    expect(messagesFor({ ...valid, title: undefined })).toEqual({ title: "Title is required" });
    expect(messagesFor({ ...valid, average_rating: Number.NaN })).toEqual({
      average_rating: "Average rating must be a number",
    });
  });

  it("ignores unknown fields instead of failing a round-tripped object", () => {
    const parsed = gameInputSchema.parse({ ...valid, id: 7, extra: "ignored" });
    expect(parsed).not.toHaveProperty("id");
    expect(parsed).not.toHaveProperty("extra");
  });
});

describe("gameUpdateSchema", () => {
  it("accepts any subset of fields", () => {
    expect(gameUpdateSchema.parse({ average_rating: 3.5 })).toEqual({ average_rating: 3.5 });
  });

  it("still validates the fields it is given", () => {
    expect(gameUpdateSchema.safeParse({ average_rating: 9 }).success).toBe(false);
  });

  it("rejects an empty update", () => {
    const result = gameUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Provide at least one field to update");
  });
});

describe("seed data", () => {
  it("is valid against the schema, with unique titles", () => {
    for (const game of SEED_GAMES) {
      expect(gameInputSchema.safeParse(game).success, game.title).toBe(true);
    }
    const titles = SEED_GAMES.map((game) => game.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });
});
