const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const integer = new Intl.NumberFormat("en-US");
const rating = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

/** Whole dollars when the amount is whole, otherwise dollars and cents, so no stored value is rounded away. */
export function formatUsd(value: number): string {
  return Number.isInteger(value) ? usdWhole.format(value) : usdCents.format(value);
}

export function formatInteger(value: number): string {
  return integer.format(value);
}

/** One decimal at least, two at most: 4 shows as 4.0 and 4.25 as 4.25. */
export function formatRating(value: number): string {
  return rating.format(value);
}
