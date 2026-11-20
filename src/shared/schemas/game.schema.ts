import { z } from 'zod';
import { GENRES } from '@/shared/constants/genres';

const name = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(100, `${label} must be at most 100 characters`);

const nonNegativeInt = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} can't be negative`);

// Floating point: 4.1 * 10 is 40.99999999999999, so compare with a tolerance instead of ===.
const hasOneDecimalAtMost = (value: number) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;

export const gameInputSchema = z.object({
  title: name('Title'),
  developer: name('Developer'),
  genre: z.enum(GENRES, { error: `Genre must be one of: ${GENRES.join(', ')}` }),
  monthly_revenue_usd: nonNegativeInt('Monthly revenue'),
  monthly_downloads: nonNegativeInt('Monthly downloads'),
  average_rating: z
    .number({ error: 'Rating must be a number' })
    .min(0, 'Rating must be between 0 and 5')
    .max(5, 'Rating must be between 0 and 5')
    .refine(hasOneDecimalAtMost, 'Rating can have at most one decimal')
    // Drops float noise the tolerance lets through (0.1 + 0.2 → 0.3) before it reaches the DB.
    .transform((value) => Math.round(value * 10) / 10),
});

export const gameSchema = gameInputSchema.extend({
  id: z.number().int().positive(),
});

// Partial update: any subset of fields, but at least one with a value. Not for PUT: the API
// contract (ARCHITECTURE.md §5.2) makes PUT a full replacement, validated with gameInputSchema.
export const gameUpdateSchema = gameInputSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'Provide at least one field to update',
  );
