import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW, parseCatalogView, serializeCatalogView, toggleSort, type CatalogView } from "@/lib/games/catalog-view";

describe("parseCatalogView", () => {
  it.each([
    [{}, DEFAULT_VIEW],
    [{ q: "lantern" }, { ...DEFAULT_VIEW, q: "lantern" }],
    [{ genre: "racing" }, { ...DEFAULT_VIEW, genre: "racing" }],
    [{ sort: "rating" }, { ...DEFAULT_VIEW, sort: "rating", dir: "desc" }],
    [{ sort: "title", dir: "desc" }, { ...DEFAULT_VIEW, sort: "title", dir: "desc" }],
    [{ sort: "title" }, { ...DEFAULT_VIEW, sort: "title", dir: "asc" }],
    [{ sort: "bogus", dir: "up" }, DEFAULT_VIEW],
  ])("%j", (params, expected) => {
    expect(parseCatalogView(params)).toEqual(expected);
  });

  it("trims and caps the search at 100 characters", () => {
    expect(parseCatalogView({ q: `  ${"x".repeat(101)}  ` }).q).toHaveLength(100);
  });

  it("uses the first of repeated params", () => {
    expect(parseCatalogView({ q: ["a", "b"] }).q).toBe("a");
  });
});

describe("serializeCatalogView", () => {
  it("omits defaults", () => {
    expect(serializeCatalogView(DEFAULT_VIEW)).toBe("");
    expect(serializeCatalogView({ ...DEFAULT_VIEW, sort: "title", dir: "asc" })).toBe("?sort=title");
  });

  it("orders keys q, genre, sort, dir", () => {
    const view: CatalogView = { q: "a b", genre: "Racing", sort: "rating", dir: "asc" };
    expect(serializeCatalogView(view)).toBe("?q=a+b&genre=Racing&sort=rating&dir=asc");
  });

  it("round-trips", () => {
    const view: CatalogView = { q: "moss", genre: "Roguelike", sort: "downloads", dir: "asc" };
    const params = Object.fromEntries(new URLSearchParams(serializeCatalogView(view)));
    expect(parseCatalogView(params)).toEqual(view);
  });
});

describe("toggleSort", () => {
  it("flips the direction on the same column", () => {
    expect(toggleSort(DEFAULT_VIEW, "revenue").dir).toBe("asc");
  });

  it("starts a new column at its default direction", () => {
    expect(toggleSort(DEFAULT_VIEW, "downloads")).toMatchObject({ sort: "downloads", dir: "desc" });
    expect(toggleSort(DEFAULT_VIEW, "title")).toMatchObject({ sort: "title", dir: "asc" });
  });
});
