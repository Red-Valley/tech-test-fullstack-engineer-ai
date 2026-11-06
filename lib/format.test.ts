import { describe, expect, it } from 'vitest';
import { formatNumber, formatRating, formatUSD } from './format';

describe('format', () => {
  it('formats revenue as USD with cents', () => {
    expect(formatUSD(182500.5)).toBe('$182,500.50');
    expect(formatUSD(0)).toBe('$0.00');
  });

  it('formats counts with thousands separators', () => {
    expect(formatNumber(48210)).toBe('48,210');
    expect(formatNumber(0)).toBe('0');
  });

  it('formats ratings with a star and one decimal', () => {
    expect(formatRating(4)).toBe('★ 4.0');
    expect(formatRating(4.66)).toBe('★ 4.7');
  });
});
