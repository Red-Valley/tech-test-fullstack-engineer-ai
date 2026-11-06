import { z } from 'zod';

// Beyond this, the totals stop being readable and the form can no longer edit the value.
const MAX_REVENUE_USD = 1e12;

// Numbers are strict on purpose: z.coerce would turn null and "" into 0 and
// silently overwrite a game's values. Forms and query params coerce on their side.
export const gameInputSchema = z.object({
  title: z.string('Required').trim().min(1, 'Required').max(120, 'Must be 120 characters or fewer'),
  developer: z.string('Required').trim().min(1, 'Required').max(120, 'Must be 120 characters or fewer'),
  genre: z.string('Required').trim().min(1, 'Required').max(60, 'Must be 60 characters or fewer'),
  monthly_revenue_usd: z.number('Must be a number').nonnegative('Must be 0 or more').max(MAX_REVENUE_USD, 'Must be 1 trillion or less'),
  monthly_downloads: z.number('Must be a number').int('Must be a whole number').nonnegative('Must be 0 or more'),
  average_rating: z.number('Must be a number').min(0, 'Must be between 0 and 5').max(5, 'Must be between 0 and 5'),
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
  developer: z.string().trim().min(1).optional().describe('Case-insensitive text to match inside the developer name'),
  minRating: z.number().min(0).max(5).optional().describe('Only games rated strictly above this value'),
  maxRating: z.number().min(0).max(5).optional().describe('Only games rated at or below this value'),
  minRevenue: z.number().nonnegative().optional().describe('Only games with at least this monthly revenue in USD'),
  search: z.string().trim().min(1).optional().describe('Case-insensitive text to match inside the game title'),
  sortBy: sortFieldSchema.optional().describe('Field to sort results by'),
  order: sortOrderSchema.optional().describe('Sort direction'),
  limit: z.number().int().positive().max(100).optional().describe('Maximum number of games to return'),
});

// A blank query param means "absent". Without this, z.coerce would read ?minRating= as 0.
const blankAsAbsent = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema);

// Query params arrive as strings, so this is the one place besides the form where numbers coerce.
export const gameQuerySchema = z.object({
  genre: blankAsAbsent(gameFiltersSchema.shape.genre),
  developer: blankAsAbsent(gameFiltersSchema.shape.developer),
  minRating: blankAsAbsent(z.coerce.number().min(0).max(5).optional()),
  maxRating: blankAsAbsent(z.coerce.number().min(0).max(5).optional()),
  minRevenue: blankAsAbsent(z.coerce.number().nonnegative().optional()),
  search: blankAsAbsent(gameFiltersSchema.shape.search),
  sortBy: blankAsAbsent(sortFieldSchema.optional()),
  order: blankAsAbsent(sortOrderSchema.optional()),
  limit: blankAsAbsent(z.coerce.number().int().positive().max(100).optional()),
});
