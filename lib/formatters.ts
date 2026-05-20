const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export function formatUSD(value: number): string {
  return usdFormatter.format(value);
}

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

export function formatRating(value: number): string {
  return value.toFixed(1);
}
