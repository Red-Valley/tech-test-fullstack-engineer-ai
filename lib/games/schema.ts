import { z } from 'zod';

/**
 * Closed set of genres supported by the catalog. Exported as a const tuple
 * so the chat tools in Phase 4 (queryGames.filters.genre,
 * aggregateGames.filters.genre) can filter by a fixed enum rather than
 * free-form strings.
 */
export const GENRES = [
  'Metroidvania',
  'Roguelike',
  'Platformer',
  'RPG',
  'Puzzle',
  'Simulation',
  'Shooter',
  'Strategy',
  'Adventure',
  'Sandbox',
] as const;

export type Genre = (typeof GENRES)[number];

// id is a kebab-case slug: lowercase letters, digits, and hyphens only.
const ID_PATTERN = /^[a-z0-9-]+$/;

export const gameSchema = z.object({
  id: z.string().regex(ID_PATTERN),
  title: z.string().min(1),
  developer: z.string().min(1),
  genre: z.enum(GENRES),
  monthly_revenue_usd: z.number().nonnegative(),
  monthly_downloads: z.number().int().nonnegative(),
  average_rating: z.number().min(0).max(5),
});

export type Game = z.infer<typeof gameSchema>;

export const gameCreateSchema = gameSchema.omit({ id: true });
export type GameCreate = z.infer<typeof gameCreateSchema>;

export const gameUpdateSchema = gameCreateSchema.partial();
export type GameUpdate = z.infer<typeof gameUpdateSchema>;
