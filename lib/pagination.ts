export const PAGE_SIZES = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export interface Page<T> {
  /** The rows on this page. */
  items: T[];
  /** The page actually shown: the requested page clamped into `1..pageCount`. */
  page: number;
  pageCount: number;
  /** 1-based number of the first and last row shown. Both are 0 when there are no rows. */
  start: number;
  end: number;
}

/**
 * Slices `items` into one page. `page` and `pageSize` are positive integers. A page outside the range is clamped
 * instead of rejected, so a view that was on the last page when its last row was deleted falls back to the new
 * last page.
 */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(pageCount, Math.max(1, page));
  const offset = (current - 1) * pageSize;
  const slice = items.slice(offset, offset + pageSize);
  return {
    items: slice,
    page: current,
    pageCount,
    start: slice.length ? offset + 1 : 0,
    end: offset + slice.length,
  };
}

/**
 * The page buttons to show: every page when there are few, otherwise the first, the last, and the current page
 * with its neighbours. A hole of one page is filled with that page, because "…" would take as much room.
 */
export function pageNumbers(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const shown = [...new Set([1, current - 1, current, current + 1, count])]
    .filter((n) => n >= 1 && n <= count)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  shown.forEach((n, i) => {
    const previous = shown[i - 1];
    if (previous !== undefined && n - previous === 2) result.push(previous + 1);
    else if (previous !== undefined && n - previous > 2) result.push("gap");
    result.push(n);
  });
  return result;
}
