import { z } from "zod";

/**
 * Game shape, validation rules and shared constants.
 * Pure (no server-only imports) so the API routes and the browser form validate with the same rules.
 */

/** Numeric columns that can be sorted, filtered and aggregated. */
export const NUMERIC_METRICS = ["monthly_revenue_usd", "monthly_downloads", "average_rating"] as const;
export type NumericMetric = (typeof NUMERIC_METRICS)[number];

export const SORT_FIELDS = ["title", "developer", "genre", ...NUMERIC_METRICS] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const MAX_MONTHLY_REVENUE_USD = 1_000_000_000;
export const MAX_MONTHLY_DOWNLOADS = 1_000_000_000;
export const MAX_RATING = 5;

const roundToCents = (value: number) => Math.round(value * 100) / 100;

const text = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

const number = (label: string) => z.number({ error: `${label} must be a number` });

export const gameInputSchema = z.object({
  title: text("Title", 100),
  developer: text("Developer", 100),
  genre: text("Genre", 40),
  monthly_revenue_usd: number("Monthly revenue")
    .min(0, "Monthly revenue can't be negative")
    .max(MAX_MONTHLY_REVENUE_USD, "Monthly revenue is unrealistically large")
    .transform(roundToCents),
  monthly_downloads: number("Monthly downloads")
    .int("Monthly downloads must be a whole number")
    .min(0, "Monthly downloads can't be negative")
    .max(MAX_MONTHLY_DOWNLOADS, "Monthly downloads is unrealistically large"),
  average_rating: number("Average rating")
    .min(0, `Average rating must be between 0 and ${MAX_RATING}`)
    .max(MAX_RATING, `Average rating must be between 0 and ${MAX_RATING}`)
    .transform(roundToCents),
});

/** Partial update (PATCH): any subset of the fields, but not an empty object. */
export const gameUpdateSchema = gameInputSchema
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, "Provide at least one field to update");

export type GameInput = z.infer<typeof gameInputSchema>;
export type GameUpdate = z.infer<typeof gameUpdateSchema>;
export type Game = GameInput & { id: number };
