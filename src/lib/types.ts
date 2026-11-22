import { z } from 'zod';

/**
 * Core Game Catalog entity representing an indie game record.
 * Stored locally in SQLite.
 */
export interface Game {
  id: string;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;
  monthly_downloads: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

/**
 * Zod validation schema for creating a new game record.
 * Validates all six required assessment fields.
 */
export const createGameSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or fewer'),
  developer: z
    .string()
    .trim()
    .min(1, 'Developer is required')
    .max(100, 'Developer must be 100 characters or fewer'),
  genre: z
    .string()
    .trim()
    .min(1, 'Genre is required')
    .max(50, 'Genre must be 50 characters or fewer'),
  monthly_revenue_usd: z
    .number({ invalid_type_error: 'Monthly revenue must be a number' })
    .nonnegative('Monthly revenue cannot be negative'),
  monthly_downloads: z
    .number({ invalid_type_error: 'Monthly downloads must be a number' })
    .int('Monthly downloads must be an integer')
    .nonnegative('Monthly downloads cannot be negative'),
  average_rating: z
    .number({ invalid_type_error: 'Average rating must be a number' })
    .min(0, 'Rating cannot be less than 0.0')
    .max(5, 'Rating cannot exceed 5.0'),
});

/**
 * Zod validation schema for updating an existing game record.
 * All fields are optional, but any provided field must satisfy the domain constraints.
 */
export const updateGameSchema = createGameSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * Zod validation schema for query filters and pagination.
 */
export const gameFilterSchema = z.object({
  search: z.string().optional(),
  genre: z.string().optional(),
  /**
   * Strict inequality filter: average_rating > rating_above.
   * Required for questions like "How many games are rated above 4?"
   */
  rating_above: z.coerce.number().min(0).max(5).optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  max_rating: z.coerce.number().min(0).max(5).optional(),
  min_revenue: z.coerce.number().nonnegative().optional(),
  sort_by: z
    .enum([
      'title',
      'developer',
      'genre',
      'monthly_revenue_usd',
      'monthly_downloads',
      'average_rating',
      'created_at',
    ])
    .optional(),
  order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
export type GameFilter = z.infer<typeof gameFilterSchema>;

/**
 * Aggregate catalog metrics returned by getCatalogStats
 */
export interface CatalogStats {
  total_games: number;
  total_monthly_revenue_usd: number;
  average_monthly_downloads: number;
  average_rating: number;
  genre_breakdown: { genre: string; count: number }[];
}
