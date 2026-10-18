import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  developer: text("developer").notNull(),
  genre: text("genre").notNull(),
  monthly_revenue_usd: real("monthly_revenue_usd").notNull(),
  monthly_downloads: integer("monthly_downloads").notNull(),
  average_rating: real("average_rating").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

const MESSAGES = {
  name: "Required, up to 100 characters.",
  genre: "Required, up to 50 characters.",
  revenue: "Must be a number of 0 or more.",
  downloads: "Must be a whole number of 0 or more.",
  rating: "Must be between 0 and 5 with at most one decimal.",
};

const hasAtMostDecimals = (places: number) => (value: number) => {
  const scaled = value * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
};

const requiredText = (max: number, message: string) =>
  z.string({ error: message }).trim().min(1, message).max(max, message);

/** The six user-supplied fields. Shared by the REST API, the form and the AI tools. */
export const gameInputSchema = createInsertSchema(games, {
  title: requiredText(100, MESSAGES.name),
  developer: requiredText(100, MESSAGES.name),
  genre: requiredText(50, MESSAGES.genre),
  monthly_revenue_usd: z
    .number({ error: MESSAGES.revenue })
    .min(0, MESSAGES.revenue)
    .refine(hasAtMostDecimals(2), MESSAGES.revenue),
  monthly_downloads: z.number({ error: MESSAGES.downloads }).int(MESSAGES.downloads).min(0, MESSAGES.downloads),
  average_rating: z
    .number({ error: MESSAGES.rating })
    .min(0, MESSAGES.rating)
    .max(5, MESSAGES.rating)
    .refine(hasAtMostDecimals(1), MESSAGES.rating),
}).omit({ id: true, created_at: true, updated_at: true });

export const gameSchema = createSelectSchema(games);

export type Game = z.infer<typeof gameSchema>;
export type GameInput = z.infer<typeof gameInputSchema>;
export type FieldErrors = Partial<Record<keyof GameInput, string[]>>;

export const METRICS = ["monthly_revenue_usd", "monthly_downloads", "average_rating"] as const;
export type Metric = (typeof METRICS)[number];

export function flattenFieldErrors(error: z.ZodError<GameInput>): FieldErrors {
  return z.flattenError(error).fieldErrors;
}
