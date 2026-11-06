import { z } from 'zod';
import { gameInputSchema } from '@/lib/schema';
import type { Game, GameInput } from '@/lib/types';

// Inputs hold raw strings: a controlled number would turn "" into 0 and show NaN mid-typing.
export type GameFormValues = Record<keyof GameInput, string>;
export type GameFormErrors = Partial<Record<keyof GameInput, string[]>>;

export type ParsedGameForm = { ok: true; data: GameInput } | { ok: false; errors: GameFormErrors };

export const EMPTY_FORM: GameFormValues = {
  title: '',
  developer: '',
  genre: '',
  monthly_revenue_usd: '',
  monthly_downloads: '',
  average_rating: '',
};

const FIELDS = Object.keys(EMPTY_FORM) as (keyof GameInput)[];
const NUMERIC_FIELDS = ['monthly_revenue_usd', 'monthly_downloads', 'average_rating'] as const;
// Stricter than Number(), which accepts "0x10" and "1e3". "1,000" stays invalid instead of guessing.
const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)$/;

export function isGameField(key: string): key is keyof GameInput {
  return (FIELDS as string[]).includes(key);
}

export function toFormValues(game: Game): GameFormValues {
  return {
    title: game.title,
    developer: game.developer,
    genre: game.genre,
    monthly_revenue_usd: String(game.monthly_revenue_usd),
    monthly_downloads: String(game.monthly_downloads),
    average_rating: String(game.average_rating),
  };
}

const toNumber = (raw: string): number => (DECIMAL.test(raw.trim()) ? Number(raw.trim()) : Number.NaN);

/** Converts the raw strings and validates them with the same schema as the API. */
export function parseGameForm(values: GameFormValues): ParsedGameForm {
  const result = gameInputSchema.safeParse({
    title: values.title,
    developer: values.developer,
    genre: values.genre,
    monthly_revenue_usd: toNumber(values.monthly_revenue_usd),
    monthly_downloads: toNumber(values.monthly_downloads),
    average_rating: toNumber(values.average_rating),
  });
  if (result.success) return { ok: true, data: result.data };

  const errors: GameFormErrors = z.flattenError(result.error).fieldErrors;
  // The schema's wording for these cases ("received NaN") means nothing to a user.
  for (const field of NUMERIC_FIELDS) {
    if (!DECIMAL.test(values[field].trim())) errors[field] = ['Must be a number'];
  }
  for (const field of FIELDS) {
    if (values[field].trim() === '') errors[field] = ['Required'];
  }
  return { ok: false, errors };
}
