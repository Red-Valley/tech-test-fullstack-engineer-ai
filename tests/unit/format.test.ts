import { describe, expect, it } from 'vitest';
import { formatNumber, formatRating, formatUsd, formatUsdCompact } from '@/client/lib/format';

describe('format', () => {
  it('formats USD with thousands separators and no cents', () => {
    expect(formatUsd(2_595_600)).toBe('$2,595,600');
    expect(formatUsd(0)).toBe('$0');
  });

  it('formats compact USD for KPI cards', () => {
    expect(formatUsdCompact(2_595_600)).toBe('$2.6M');
    expect(formatUsdCompact(412_000)).toBe('$412K');
  });

  it('formats counts with thousands separators', () => {
    expect(formatNumber(630_400)).toBe('630,400');
  });

  it('always shows ratings with one decimal', () => {
    expect(formatRating(4)).toBe('4.0');
    expect(formatRating(3.82)).toBe('3.8');
    expect(formatRating(4.75)).toBe('4.8');
  });
});
