import { describe, expect, it } from 'vitest';
import { gameFiltersSchema, gameInputSchema, gameUpdateSchema, idParamSchema } from './schema';

const validGame = {
  title: 'Starfall Tactics',
  developer: 'Nimbus Forge',
  genre: 'Strategy',
  monthly_revenue_usd: 182500.5,
  monthly_downloads: 48210,
  average_rating: 4.6,
};

describe('gameInputSchema', () => {
  it('accepts a valid game and trims its text fields', () => {
    const parsed = gameInputSchema.parse({ ...validGame, title: '  Starfall Tactics  ' });
    expect(parsed).toEqual(validGame);
  });

  it.each([
    ['whitespace-only title', { title: '   ' }, 'title'],
    ['negative revenue', { monthly_revenue_usd: -1 }, 'monthly_revenue_usd'],
    ['fractional downloads', { monthly_downloads: 1.5 }, 'monthly_downloads'],
    ['rating above 5', { average_rating: 7 }, 'average_rating'],
    ['revenue above the cap', { monthly_revenue_usd: 1e21 }, 'monthly_revenue_usd'],
  ])('rejects %s', (_name, override, field) => {
    const result = gameInputSchema.safeParse({ ...validGame, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  it('accepts revenue at the cap', () => {
    expect(gameInputSchema.safeParse({ ...validGame, monthly_revenue_usd: 1e12 }).success).toBe(true);
  });

  it.each([
    [{ average_rating: 7 }, 'Must be between 0 and 5'],
    [{ monthly_revenue_usd: -1 }, 'Must be 0 or more'],
    [{ monthly_downloads: 1.5 }, 'Must be a whole number'],
    [{ title: '   ' }, 'Required'],
    [{ title: undefined }, 'Required'],
    [{ average_rating: Infinity }, 'Must be a number'],
    [{ monthly_revenue_usd: 1e12 + 1 }, 'Must be 1 trillion or less'],
  ])('explains %j in words a user understands', (override, message) => {
    expect(gameInputSchema.safeParse({ ...validGame, ...override }).error?.issues[0]?.message).toBe(message);
  });

  it('accepts the boundary ratings 0 and 5', () => {
    expect(gameInputSchema.safeParse({ ...validGame, average_rating: 0 }).success).toBe(true);
    expect(gameInputSchema.safeParse({ ...validGame, average_rating: 5 }).success).toBe(true);
  });
});

describe('gameUpdateSchema', () => {
  it('accepts a single field', () => {
    expect(gameUpdateSchema.parse({ average_rating: 4.9 })).toEqual({ average_rating: 4.9 });
  });

  it.each([null, '', '12', true])('does not coerce %j into a number', (value) => {
    expect(gameUpdateSchema.safeParse({ monthly_revenue_usd: value }).success).toBe(false);
  });

  it('rejects an empty update', () => {
    expect(gameUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an update with only unknown keys', () => {
    expect(gameUpdateSchema.safeParse({ nope: 1 }).success).toBe(false);
  });
});

describe('idParamSchema', () => {
  it('parses a positive integer string', () => {
    expect(idParamSchema.parse('12')).toBe(12);
  });

  it.each(['', '0', '-1', '1.5', '12abc'])('rejects %j', (value) => {
    expect(idParamSchema.safeParse(value).success).toBe(false);
  });
});

describe('gameFiltersSchema', () => {
  it('accepts an empty filter set', () => {
    expect(gameFiltersSchema.parse({})).toEqual({});
  });

  it('rejects a sort field outside the whitelist', () => {
    expect(gameFiltersSchema.safeParse({ sortBy: 'id; DROP TABLE games' }).success).toBe(false);
  });
});
