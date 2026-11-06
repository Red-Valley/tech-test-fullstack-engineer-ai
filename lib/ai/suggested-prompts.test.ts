import { afterEach, describe, expect, it, vi } from 'vitest';
import { listGames } from '@/lib/games';
import type { Game } from '@/lib/types';
import { getAskDraft, getSuggestedPrompts } from './suggested-prompts';

vi.mock('@/lib/games', () => ({ listGames: vi.fn() }));

const game = (title: string) => ({ title }) as Game;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getAskDraft', () => {
  it('builds a question from a title', () => {
    expect(getAskDraft(' Moss & Marrow ')).toBe('Tell me about Moss & Marrow: its revenue, downloads and rating.');
  });

  it.each([
    ['no param', undefined],
    ['a repeated param', ['A', 'B']],
    ['a blank param', '   '],
    ['an oversized param', 'x'.repeat(121)],
  ])('gives no draft for %s', (_name, value) => {
    expect(getAskDraft(value)).toBeUndefined();
  });
});

describe('getSuggestedPrompts', () => {
  it('compares the two top-earning games by name', () => {
    vi.mocked(listGames).mockReturnValue([game('Starfall'), game('Hollow Pines')]);

    const prompts = getSuggestedPrompts();

    expect(prompts).toHaveLength(3);
    expect(prompts[2]).toBe('Compare revenue of Starfall vs Hollow Pines.');
    expect(listGames).toHaveBeenCalledWith({ sortBy: 'monthly_revenue_usd', order: 'desc', limit: 2 });
  });

  it('falls back to a generic comparison when the catalog has fewer than two games', () => {
    vi.mocked(listGames).mockReturnValue([game('Starfall')]);
    expect(getSuggestedPrompts()[2]).toBe('Compare revenue of the two top-earning games.');
  });

  it('still renders the prompts and logs the cause when the catalog cannot be read', () => {
    const cause = new Error('db down');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listGames).mockImplementation(() => {
      throw cause;
    });

    expect(getSuggestedPrompts()[2]).toBe('Compare revenue of the two top-earning games.');
    expect(log).toHaveBeenCalledWith(expect.any(String), cause);
  });
});
