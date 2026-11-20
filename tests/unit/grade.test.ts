import { describe, expect, it } from 'vitest';
import { openDatabase } from '@/server/db/client';
import { createGamesRepository } from '@/server/repositories/games.repository';
import { createGamesService } from '@/server/services/games.service';
import { CASES, NONE, NOT_FOUND } from '../../evals/cases';
import { contains, extractNumbers, grade } from '../../evals/grade';
import { GAMES_FIXTURE } from '../fixtures/games.fixture';

describe('extractNumbers', () => {
  it.each([
    ['$1,665,000', 1_665_000],
    ['1665000', 1_665_000],
    ['$1.7M', 1_700_000],
    ['412K', 412_000],
    ['$310k', 310_000],
    ['rated 3.8 out of 5', 3.8],
    ['about 1.16× more', 1.16],
    ['nine games', 9],
  ])('reads %s as %s', (text, value) => {
    expect(extractNumbers(text)).toContain(value);
  });

  it('does not read digits inside words or ids', () => {
    expect(extractNumbers('gpt-oss-120b')).not.toContain(120);
  });
});

describe('contains', () => {
  it('matches large amounts within 1%, written any common way', () => {
    for (const text of ['$1,665,000', '1665000 dollars', '$1.67M', 'USD 1,665,000']) {
      expect(contains(text, 1_665_000)).toBe(true);
    }
    expect(contains('$1.5M', 1_665_000)).toBe(false);
  });

  it('matches counts exactly and ratings within rounding', () => {
    expect(contains('There are 9 games', 9)).toBe(true);
    expect(contains('There are 19 games', 9)).toBe(false);
    expect(contains('an average of 3.80', 3.8)).toBe(true);
    expect(contains('an average of 3.9', 3.8)).toBe(false);
  });

  it('matches text ignoring case and typographic quotes', () => {
    expect(contains('Wayfarer’s Map leads', "wayfarer's map")).toBe(true);
  });
});

describe('grade', () => {
  const lantern = {
    name: 'query_games',
    output: { games: [{ id: 1, title: 'Lantern Drift' }], total: 18 },
  };

  it('passes a correct answer that used the right tool', () => {
    expect(
      grade(
        'Lantern Drift made the most: $310,000.',
        [lantern],
        { includes: ['Lantern Drift', 310_000] },
        ['query_games'],
      ),
    ).toEqual({ pass: true, failures: [] });
  });

  it('fails when the runner-up is named, a value is missing, or the tool was not used', () => {
    const result = grade(
      'Iron Psalm made the most.',
      [],
      { includes: ['Lantern Drift', 310_000], excludes: ['Iron Psalm'] },
      ['query_games'],
    );
    expect(result.pass).toBe(false);
    expect(result.failures).toEqual([
      'missing "Lantern Drift"',
      'missing 310000',
      'should not mention "Iron Psalm"',
      'expected tool query_games',
    ]);
  });

  it('accepts any listed alternative tool, and requires no tools for out-of-scope', () => {
    expect(
      grade('9', [{ name: 'query_games', output: {} }], { includes: [9] }, [
        ['aggregate_games', 'query_games'],
      ]).pass,
    ).toBe(true);
    expect(
      grade('I can only help with the catalog.', [lantern], { includes: [] }, []).failures,
    ).toEqual(['expected no tool calls, got query_games']);
  });

  it('fails any tool that returned more than 10 games', () => {
    const big = {
      name: 'query_games',
      output: { games: Array.from({ length: 11 }, (_, i) => ({ id: i })) },
    };
    expect(grade('ok', [big], { includes: [] }, ['query_games']).failures).toContain(
      'query_games returned 11 games (max 10)',
    );
  });
});

describe('eval cases', () => {
  const repo = createGamesRepository(openDatabase(':memory:'));
  repo.createMany(GAMES_FIXTURE);
  const service = createGamesService(repo);

  it('has about 20 cases with unique ids, covering every §7.3 category', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(18);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
    expect(new Set(CASES.map((c) => c.category))).toEqual(
      new Set([
        'ranking',
        'counting',
        'aggregates',
        'comparison',
        'fuzzy',
        'not-found',
        'empty',
        'multi-step',
        'out-of-scope',
        'injection',
      ]),
    );
  });

  it('computes expected answers from the fixture (spot checks)', () => {
    const byId = Object.fromEntries(CASES.map((c) => [c.id, c.expected(service)]));
    expect(byId['top-revenue']).toEqual({
      includes: ['Lantern Drift', 310_000],
      excludes: ['Iron Psalm'],
    });
    expect(byId['count-above-4'].includes).toEqual([9]);
    expect(byId['avg-rating-roguelike'].includes).toEqual([3.8]);
    expect(byId['genre-highest-avg-revenue'].includes).toEqual(['RPG']);
    expect(byId['injection-rating'].includes).toEqual([2.1]);
  });

  it('every case computes its expectation without throwing', () => {
    for (const evalCase of CASES) expect(() => evalCase.expected(service)).not.toThrow();
  });
});

describe('written-out magnitudes', () => {
  it.each([
    ['$1.7 million', 1_700_000],
    ['310 thousand dollars', 310_000],
    ['1.665 million', 1_665_000],
  ])('reads %s as %s', (text, value) => {
    expect(extractNumbers(text)).toContain(value);
  });
});

describe('phrase lists do not match unrelated or invented answers', () => {
  const matchesAny = (phrases: string[], text: string) => phrases.some((p) => contains(text, p));

  it('NOT_FOUND rejects an invented answer and accepts real "not found" wording', () => {
    expect(matchesAny(NOT_FOUND, 'Shadow Keep Arena made $120,000, which is not bad.')).toBe(false);
    expect(matchesAny(NOT_FOUND, "Shadow Keep Arena isn't a casino game, it made $5,000.")).toBe(
      false,
    );
    expect(matchesAny(NOT_FOUND, "I couldn't find a game called Shadow Keep Arena.")).toBe(true);
    expect(matchesAny(NOT_FOUND, 'There is no game titled Shadow Keep Arena in the catalog.')).toBe(
      true,
    );
  });

  it('NONE ignores "no" inside other words', () => {
    expect(matchesAny(NONE, 'Velvet Abyss has a techno soundtrack and a casino level.')).toBe(
      false,
    );
    expect(matchesAny(NONE, 'There are no Horror games rated above 4.5.')).toBe(true);
  });

  it('the not-found-revenue case fails an invented dollar figure', () => {
    const evalCase = CASES.find((c) => c.id === 'not-found-revenue');
    if (!evalCase) throw new Error('missing case');
    const expectation = evalCase.expected(undefined as never); // this case uses no data
    const invented = grade(
      "I couldn't find it, but it probably made $50,000.",
      [{ name: 'find_game', output: { notFound: true } }],
      expectation,
      evalCase.expectTools,
    );
    expect(invented.failures).toContain('should not mention "$"');
  });
});
