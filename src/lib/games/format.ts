const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("en-US");

export const formatUsd = (value: number) => usd.format(value);
export const formatCount = (value: number) => integer.format(value);
export const formatRating = (value: number) => value.toFixed(1);
