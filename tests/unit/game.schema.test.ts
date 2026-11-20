import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { gameInputSchema, gameSchema, gameUpdateSchema } from '@/shared/schemas/game.schema';
import type { GameInputDto } from '@/shared/types/game.dto';

const valid: GameInputDto = {
  title: 'Lantern Drift',
  developer: 'Moth & Key',
  genre: 'Roguelike',
  monthly_revenue_usd: 120000,
  monthly_downloads: 8400,
  average_rating: 4.5,
};

const fieldErrorsFor = (input: unknown) => {
  const result = gameInputSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
};

describe('gameInputSchema', () => {
  it('accepts a valid game', () => {
    expect(gameInputSchema.safeParse(valid).success).toBe(true);
  });

  it('trims title and developer', () => {
    const parsed = gameInputSchema.parse({ ...valid, title: '  Lantern Drift  ' });
    expect(parsed.title).toBe('Lantern Drift');
  });

  it.each(['title', 'developer'] as const)('rejects empty, blank and 101-character %s', (field) => {
    for (const bad of ['', '   ', 'x'.repeat(101)]) {
      expect(fieldErrorsFor({ ...valid, [field]: bad })[field]).toBeDefined();
    }
  });

  it('drops unknown keys, so a client cannot set the id', () => {
    expect(gameInputSchema.parse({ ...valid, id: 99, extra: 'x' })).not.toHaveProperty('id');
  });

  it('accepts a 100-character title', () => {
    expect(gameInputSchema.safeParse({ ...valid, title: 'x'.repeat(100) }).success).toBe(true);
  });

  it('rejects a genre outside the list', () => {
    expect(fieldErrorsFor({ ...valid, genre: 'Sports' }).genre).toBeDefined();
  });

  it.each(['monthly_revenue_usd', 'monthly_downloads'] as const)(
    'rejects negative, decimal and string %s',
    (field) => {
      for (const bad of [-1, 10.5, '100', NaN, Infinity]) {
        expect(fieldErrorsFor({ ...valid, [field]: bad })[field]).toBeDefined();
      }
    },
  );

  it.each([0, 4.1, 4.5, 5])('accepts rating %s', (average_rating) => {
    expect(gameInputSchema.safeParse({ ...valid, average_rating }).success).toBe(true);
  });

  it.each([-0.1, 5.1, 3.25, NaN])('rejects rating %s', (average_rating) => {
    expect(fieldErrorsFor({ ...valid, average_rating }).average_rating).toBeDefined();
  });

  it('rounds float noise out of the rating', () => {
    expect(gameInputSchema.parse({ ...valid, average_rating: 0.1 + 0.2 }).average_rating).toBe(0.3);
  });

  it('reports every missing field, not just the first', () => {
    expect(Object.keys(fieldErrorsFor({})).sort()).toEqual(
      [
        'average_rating',
        'developer',
        'genre',
        'monthly_downloads',
        'monthly_revenue_usd',
        'title',
      ].sort(),
    );
  });
});

describe('gameSchema', () => {
  it('requires a positive integer id', () => {
    expect(gameSchema.safeParse({ ...valid, id: 1 }).success).toBe(true);
    expect(gameSchema.safeParse({ ...valid, id: 0 }).success).toBe(false);
    expect(gameSchema.safeParse(valid).success).toBe(false);
  });
});

describe('gameUpdateSchema', () => {
  it('accepts a single valid field', () => {
    expect(gameUpdateSchema.safeParse({ average_rating: 3.9 }).success).toBe(true);
  });

  it('still validates the fields it gets', () => {
    expect(gameUpdateSchema.safeParse({ average_rating: 7 }).success).toBe(false);
  });

  it('rejects an empty update, including keys set to undefined', () => {
    expect(gameUpdateSchema.safeParse({}).success).toBe(false);
    expect(gameUpdateSchema.safeParse({ title: undefined }).success).toBe(false);
  });
});
