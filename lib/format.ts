// The locale is fixed so the server and the browser render the same text (no hydration mismatch).
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const count = new Intl.NumberFormat('en-US');

export const formatUSD = (value: number): string => usd.format(value);
export const formatNumber = (value: number): string => count.format(value);
export const formatRating = (value: number): string => `★ ${value.toFixed(1)}`;
