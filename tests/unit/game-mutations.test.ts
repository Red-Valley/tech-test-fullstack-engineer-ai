import { describe, expect, it } from 'vitest';
import { ApiError } from '@/client/api/http-client';
import type { GameFormValues } from '@/client/domain/game';
import { toMutationFailure, validateGameForm } from '@/client/hooks/use-game-mutations';

const valid: GameFormValues = {
  title: 'Lantern Drift',
  developer: 'Moth & Key',
  genre: 'Roguelike',
  monthlyRevenueUsd: '310,000',
  monthlyDownloads: '64000',
  averageRating: '4.7',
};

describe('validateGameForm', () => {
  it('returns the numeric input DTO for valid values', () => {
    expect(validateGameForm(valid)).toEqual({
      ok: true,
      input: {
        title: 'Lantern Drift',
        developer: 'Moth & Key',
        genre: 'Roguelike',
        monthly_revenue_usd: 310000,
        monthly_downloads: 64000,
        average_rating: 4.7,
      },
    });
  });

  it('reports form-field errors (camelCase) without sending anything', () => {
    const result = validateGameForm({ ...valid, monthlyRevenueUsd: '', averageRating: '7' });
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        monthlyRevenueUsd: 'Monthly revenue must be a number',
        averageRating: 'Rating must be between 0 and 5',
      },
    });
  });
});

describe('toMutationFailure', () => {
  it('puts a 409 duplicate-title message on the title field', () => {
    const failure = toMutationFailure(new ApiError(409, 'A game titled "X" already exists'));
    expect(failure).toEqual({
      ok: false,
      message: 'A game titled "X" already exists',
      fieldErrors: { title: 'A game titled "X" already exists' },
    });
  });

  it('maps 400 field errors from the API to form fields', () => {
    const failure = toMutationFailure(
      new ApiError(400, 'Invalid request', { monthly_downloads: ['bad'] }),
    );
    expect(failure).toEqual({
      ok: false,
      message: 'Invalid request',
      fieldErrors: { monthlyDownloads: 'bad' },
    });
  });

  it('hides unexpected errors behind a generic message', () => {
    expect(toMutationFailure(new Error('boom'))).toEqual({
      ok: false,
      message: 'Something went wrong. Please try again.',
      fieldErrors: {},
    });
  });
});
