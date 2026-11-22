import { describe, expect, it } from "vitest";
import { pageNumbers, paginate } from "./pagination";

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("paginate", () => {
  it("returns one empty page for an empty list", () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageCount: 1, start: 0, end: 0 });
  });

  it("splits an exact multiple of the page size with no empty trailing page", () => {
    const result = paginate(range(20), 2, 10);
    expect(result.pageCount).toBe(2);
    expect(result.items).toEqual(range(20).slice(10));
    expect([result.start, result.end]).toEqual([11, 20]);
  });

  it("shows a partial last page and numbers its rows", () => {
    const result = paginate(range(23), 3, 10);
    expect(result.items).toEqual([21, 22, 23]);
    expect([result.start, result.end]).toEqual([21, 23]);
  });

  it("clamps a page past the end down to the last page", () => {
    const result = paginate(range(23), 9, 10);
    expect(result.page).toBe(3);
    expect(result.items).toEqual([21, 22, 23]);
  });

  it("clamps a page below 1 up to the first page", () => {
    expect(paginate(range(23), 0, 10).page).toBe(1);
    expect(paginate(range(23), -4, 10).items).toEqual(range(10));
  });

  it("falls back to the new last page when its only row is removed", () => {
    expect(paginate(range(21), 3, 10).items).toEqual([21]);
    expect(paginate(range(20), 3, 10)).toMatchObject({ page: 2, start: 11, end: 20 });
  });
});

describe("pageNumbers", () => {
  it("lists every page when there are 7 or fewer", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(4, 7)).toEqual(range(7));
    // These two reach 1..7 only through the early return: the gap logic alone would give [1, 2, "gap", 7] for
    // (1, 7) and [1, "gap", 6, 7] for (7, 7).
    expect(pageNumbers(1, 7)).toEqual(range(7));
    expect(pageNumbers(7, 7)).toEqual(range(7));
  });

  it("starts collapsing at 8 pages", () => {
    expect(pageNumbers(1, 8)).toEqual([1, 2, "gap", 8]);
  });

  it("collapses the end when the current page is near the start", () => {
    expect(pageNumbers(1, 10)).toEqual([1, 2, "gap", 10]);
    expect(pageNumbers(3, 10)).toEqual([1, 2, 3, 4, "gap", 10]);
  });

  it("collapses the start when the current page is near the end", () => {
    expect(pageNumbers(10, 10)).toEqual([1, "gap", 9, 10]);
    expect(pageNumbers(8, 10)).toEqual([1, "gap", 7, 8, 9, 10]);
  });

  it("collapses both sides in the middle", () => {
    expect(pageNumbers(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
  });

  it("fills a hole of one page instead of showing a gap", () => {
    expect(pageNumbers(4, 10)).toEqual([1, 2, 3, 4, 5, "gap", 10]);
    expect(pageNumbers(7, 10)).toEqual([1, "gap", 6, 7, 8, 9, 10]);
  });
});
