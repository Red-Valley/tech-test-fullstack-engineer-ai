import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Game } from '@/client/domain/game';
import {
  emptyFormValues,
  formValuesToInput,
  toFormErrors,
  toFormValues,
  toGame,
} from '@/client/transformers/game.transformer';
import { gameInputSchema } from '@/shared/schemas/game.schema';
import type { GameDto } from '@/shared/types/game.dto';

const dto: GameDto = {
  id: 7,
  title: 'Lantern Drift',
  developer: 'Moth & Key',
  genre: 'Roguelike',
  monthly_revenue_usd: 310000,
  monthly_downloads: 64000,
  average_rating: 4.7,
};

const game: Game = {
  id: 7,
  title: 'Lantern Drift',
  developer: 'Moth & Key',
  genre: 'Roguelike',
  monthlyRevenueUsd: 310000,
  monthlyDownloads: 64000,
  averageRating: 4.7,
};

describe('DTO ⇄ domain', () => {
  it('maps every snake_case field to camelCase', () => {
    expect(toGame(dto)).toEqual(game);
  });

  it('round-trips a game through the form and back to the same input', () => {
    const { id, ...input } = dto;
    expect(id).toBe(game.id);
    expect(formValuesToInput(toFormValues(game))).toEqual(input);
  });
});

describe('formValuesToInput', () => {
  it('keeps empty numeric fields undefined, never 0', () => {
    const draft = formValuesToInput(emptyFormValues());
    expect(draft.monthly_revenue_usd).toBeUndefined();
    expect(draft.monthly_downloads).toBeUndefined();
    expect(draft.average_rating).toBeUndefined();
    expect(draft.genre).toBeUndefined();
  });

  it('treats whitespace-only as empty', () => {
    expect(
      formValuesToInput({ ...toFormValues(game), monthlyRevenueUsd: '   ' }).monthly_revenue_usd,
    ).toBeUndefined();
  });

  it('accepts thousands separators and keeps "0" as a real zero', () => {
    const draft = formValuesToInput({
      ...toFormValues(game),
      monthlyRevenueUsd: '1,200,000',
      monthlyDownloads: '0',
    });
    expect(draft.monthly_revenue_usd).toBe(1_200_000);
    expect(draft.monthly_downloads).toBe(0);
  });

  it('turns non-numeric text into NaN so validation rejects it', () => {
    expect(
      formValuesToInput({ ...toFormValues(game), averageRating: 'great' }).average_rating,
    ).toBeNaN();
  });

  it('an empty form fails the shared schema on every field (end to end with §4.4)', () => {
    const result = gameInputSchema.safeParse(formValuesToInput(emptyFormValues()));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(toFormErrors(z.flattenError(result.error).fieldErrors)).sort()).toEqual([
        'averageRating',
        'developer',
        'genre',
        'monthlyDownloads',
        'monthlyRevenueUsd',
        'title',
      ]);
    }
  });
});

describe('toFormErrors', () => {
  it('maps API field names to form fields and keeps the first message', () => {
    expect(
      toFormErrors({ monthly_revenue_usd: ['must be a number', 'other'], title: ['taken'] }),
    ).toEqual({ monthlyRevenueUsd: 'must be a number', title: 'taken' });
  });

  it('ignores unknown fields and empty message lists', () => {
    expect(toFormErrors({ id: ['nope'], genre: [], developer: undefined })).toEqual({});
  });
});
