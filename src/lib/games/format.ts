/**
 * Display formatting. The locale is pinned to en-US so the server render and the browser agree
 * (otherwise a visitor with a different locale would trigger hydration mismatches).
 */

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const rating = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const formatUsd = (value: number) => usd.format(value);
export const formatUsdCompact = (value: number) => usdCompact.format(value);
export const formatInteger = (value: number) => integer.format(value);
export const formatCompact = (value: number) => compact.format(value);
export const formatRating = (value: number) => rating.format(value);
