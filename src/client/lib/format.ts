// Fixed 'en-US' so numbers look the same on every machine (and in tests).
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
  trailingZeroDisplay: 'stripIfInteger', // "$412K", not "$412.0K"
});
const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** $1,234,567 */
export const formatUsd = (value: number) => usd.format(value);

/** $1.2M, for KPI cards where space is tight. */
export const formatUsdCompact = (value: number) => usdCompact.format(value);

/** 1,234,567 */
export const formatNumber = (value: number) => integer.format(value);

/** Always one decimal: 4 → "4.0", 3.82 → "3.8". */
export const formatRating = (value: number) => value.toFixed(1);
