/** Catalog search, filter and sort as kept in the page URL (`?q=&genre=&sort=&dir=`). */

export const SORT_KEYS = ["title", "revenue", "downloads", "rating"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";

export type CatalogView = { q: string; genre: string; sort: SortKey; dir: SortDir };

const MAX_QUERY = 100;
const DEFAULT_SORT: SortKey = "revenue";

/** Text sorts A→Z first; numbers sort highest first. */
export const defaultDir = (sort: SortKey): SortDir => (sort === "title" ? "asc" : "desc");

export const DEFAULT_VIEW: CatalogView = { q: "", genre: "", sort: DEFAULT_SORT, dir: defaultDir(DEFAULT_SORT) };

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Lenient: unknown or malformed values fall back to defaults instead of failing. */
export function parseCatalogView(params: RawParams): CatalogView {
  const sortParam = first(params.sort);
  const sort = (SORT_KEYS as readonly string[]).includes(sortParam) ? (sortParam as SortKey) : DEFAULT_SORT;
  const dirParam = first(params.dir);
  const dir = dirParam === "asc" || dirParam === "desc" ? dirParam : defaultDir(sort);
  return {
    q: first(params.q).trim().slice(0, MAX_QUERY),
    genre: first(params.genre).trim(),
    sort,
    dir,
  };
}

/** Returns "" for the default view, else "?…" with defaults omitted and keys in a fixed order. */
export function serializeCatalogView(view: CatalogView): string {
  const params = new URLSearchParams();
  if (view.q) params.set("q", view.q);
  if (view.genre) params.set("genre", view.genre);
  if (view.sort !== DEFAULT_SORT) params.set("sort", view.sort);
  if (view.dir !== defaultDir(view.sort)) params.set("dir", view.dir);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Header click: same column flips direction; a new column starts at its default direction. */
export function toggleSort(view: CatalogView, sort: SortKey): CatalogView {
  if (view.sort === sort) return { ...view, dir: view.dir === "asc" ? "desc" : "asc" };
  return { ...view, sort, dir: defaultDir(sort) };
}

/** URL for a view, suitable for router.replace (the bare path for the default view). */
export const viewHref = (view: CatalogView) => serializeCatalogView(view) || "/";
