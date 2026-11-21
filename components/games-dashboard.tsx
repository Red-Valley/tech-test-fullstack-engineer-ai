"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInteger, formatRating, formatUsd } from "@/lib/format";
import type { Game } from "@/lib/games/schema";
import { GameFormDialog } from "./game-form-dialog";

type SortKey = "title" | "developer" | "genre" | "monthly_revenue_usd" | "monthly_downloads" | "average_rating";

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "title", label: "Title" },
  { key: "developer", label: "Developer" },
  { key: "genre", label: "Genre" },
  { key: "monthly_revenue_usd", label: "Revenue", numeric: true },
  { key: "monthly_downloads", label: "Downloads", numeric: true },
  { key: "average_rating", label: "Rating", numeric: true },
];

/** Folds ASCII letters only: the same case-insensitivity as SQLite's NOCASE, which the database and chat tools use. */
const genreKey = (genre: string) => genre.replace(/[A-Z]/g, (c) => c.toLowerCase());

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function GamesDashboard({ games }: { games: Game[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "title", dir: "asc" });
  // `undefined` = dialog closed, `null` = adding a game, a Game = editing it.
  const [editing, setEditing] = useState<Game | null | undefined>(undefined);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Genres are matched ignoring case, as the chat tools and the database do, so "puzzle" and "Puzzle" are one
  // genre. The option value is the folded key and the label is the first spelling seen.
  const genres = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const g of games) if (!byKey.has(genreKey(g.genre))) byKey.set(genreKey(g.genre), g.genre);
    return [...byKey].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [games]);
  // The selected genre can disappear (its last game is deleted or renamed): fall back to all genres.
  const activeGenre = genres.some((g) => g.key === genre) ? genre : "";

  const stats = useMemo(() => {
    const revenue = games.reduce((sum, g) => sum + g.monthly_revenue_usd, 0);
    const downloads = games.reduce((sum, g) => sum + g.monthly_downloads, 0);
    const rating = games.length ? games.reduce((sum, g) => sum + g.average_rating, 0) / games.length : 0;
    return { revenue, downloads, rating };
  }, [games]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = games.filter(
      (g) =>
        (!activeGenre || genreKey(g.genre) === activeGenre) &&
        (!needle || g.title.toLowerCase().includes(needle) || g.developer.toLowerCase().includes(needle)),
    );
    const direction = sort.dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * direction;
    });
  }, [games, search, activeGenre, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  }

  async function deleteGame(id: number) {
    setError(null);
    try {
      const response = await fetch(`/api/games/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error(`Request failed (${response.status})`);
      setConfirmingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? `Could not delete the game: ${err.message}` : "Could not delete the game.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Games" value={formatInteger(games.length)} />
        <StatCard label="Monthly revenue" value={formatUsd(stats.revenue)} />
        <StatCard label="Monthly downloads" value={formatInteger(stats.downloads)} />
        <StatCard label="Average rating" value={games.length ? formatRating(stats.rating) : "n/a"} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or developer"
            aria-label="Search games"
            className="min-w-48 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <select
            value={activeGenre}
            onChange={(event) => setGenre(event.target.value)}
            aria-label="Filter by genre"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Add game
          </button>
        </div>

        {error && (
          <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {/* `relative` makes this wrapper the containing block of the absolutely positioned sr-only header cell. */}
        <div className="relative overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {COLUMNS.map(({ key, label, numeric }) => (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={`px-4 py-3 font-medium ${numeric ? "text-right" : ""}`}
                  >
                    <button type="button" onClick={() => toggleSort(key)} className="uppercase hover:text-slate-900">
                      {label}
                      {sort.key === key && <span aria-hidden="true">{sort.dir === "asc" ? " ↑" : " ↓"}</span>}
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((game) => (
                <tr key={game.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{game.title}</td>
                  <td className="px-4 py-3 text-slate-600">{game.developer}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{game.genre}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatUsd(game.monthly_revenue_usd)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatInteger(game.monthly_downloads)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRating(game.average_rating)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {confirmingId === game.id ? (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="text-slate-600">Delete?</span>
                        <button
                          type="button"
                          onClick={() => deleteGame(game.id)}
                          aria-label={`Yes, delete ${game.title}`}
                          className="font-medium text-red-600 hover:text-red-700"
                        >
                          Yes
                        </button>
                        {/* The Delete button unmounts, so move keyboard focus to the safe choice. */}
                        <button
                          type="button"
                          autoFocus
                          onClick={() => setConfirmingId(null)}
                          aria-label={`No, keep ${game.title}`}
                          className="font-medium text-slate-600 hover:text-slate-900"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditing(game)}
                          aria-label={`Edit ${game.title}`}
                          className="font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(game.id)}
                          aria-label={`Delete ${game.title}`}
                          className="font-medium text-slate-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-4 py-12 text-center text-sm text-slate-500">
                    {games.length === 0 ? "No games yet. Add the first one." : "No games match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== undefined && (
        <GameFormDialog
          key={editing?.id ?? "new"}
          game={editing}
          genres={genres.map((g) => g.label)}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
