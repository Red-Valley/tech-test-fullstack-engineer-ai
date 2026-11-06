import { z } from 'zod';

// Numbers are strict on purpose: z.coerce would turn null and "" into 0 and
// silently overwrite a game's values. Forms and query params coerce on their side.
export const gameInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  developer: z.string().trim().min(1).max(120),
  genre: z.string().trim().min(1).max(60),
  monthly_revenue_usd: z.number().nonnegative(),
  monthly_downloads: z.number().int().nonnegative(),
  average_rating: z.number().min(0).max(5),
});

export const gameUpdateSchema = gameInputSchema
  .partial()
  .refine((update) => Object.keys(update).length > 0, { message: 'Provide at least one field to update' });

export const idParamSchema = z.coerce.number().int().positive();

export const sortFieldSchema = z.enum(['monthly_revenue_usd', 'monthly_downloads', 'average_rating', 'title']);
export const sortOrderSchema = z.enum(['asc', 'desc']);

// Mirrors GameFilters. minRating is exclusive so "rated above 4" excludes 4.0.
export const gameFiltersSchema = z.object({
  genre: z.string().trim().min(1).optional().describe('Exact genre name, case-insensitive'),
  developer: z.string().trim().min(1).optional().describe('Exact developer name, case-insensitive'),
  minRating: z.number().min(0).max(5).optional().describe('Only games rated strictly above this value'),
  maxRating: z.number().min(0).max(5).optional().describe('Only games rated at or below this value'),
  minRevenue: z.number().nonnegative().optional().describe('Only games with at least this monthly revenue in USD'),
  search: z.string().trim().min(1).optional().describe('Case-insensitive text to match inside the game title'),
  sortBy: sortFieldSchema.optional().describe('Field to sort results by'),
  order: sortOrderSchema.optional().describe('Sort direction'),
  limit: z.number().int().positive().max(100).optional().describe('Maximum number of games to return'),
});
