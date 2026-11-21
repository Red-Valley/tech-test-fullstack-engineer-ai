import { z } from "zod";

/** Trimmed, non-empty string. */
const text = z.string().trim().min(1, "Must not be empty");

/** Payload for creating a game. All six brief fields are required. */
export const GameInput = z.object({
  title: text,
  developer: text,
  genre: text,
  monthly_revenue_usd: z.number().min(0, "Must be 0 or more"),
  monthly_downloads: z.number().int("Must be a whole number").min(0, "Must be 0 or more"),
  average_rating: z.number().min(0, "Must be between 0 and 5").max(5, "Must be between 0 and 5"),
});
export type GameInput = z.infer<typeof GameInput>;

/** Payload for updating a game. Any subset of fields, but at least one. */
export const GameUpdate = GameInput.partial().refine(
  (patch) => Object.keys(patch).length > 0,
  { message: "Provide at least one field to update" },
);
export type GameUpdate = z.infer<typeof GameUpdate>;

/** A stored game row. Timestamps are SQLite `CURRENT_TIMESTAMP` strings (UTC). */
export type Game = GameInput & {
  id: number;
  created_at: string;
  updated_at: string;
};
