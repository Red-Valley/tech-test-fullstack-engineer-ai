"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Game } from "@/lib/games/schema";
import { computeStats, filterGames, nextSort, sortGames, uniqueGenres, type SortState } from "@/lib/games/view";
import { DeleteGameDialog } from "./delete-game-dialog";
import { GameFormDialog } from "./game-form-dialog";
import { GamesTable } from "./games-table";
import { StatsCards } from "./stats-cards";

type Editing = { mode: "closed" } | { mode: "create" } | { mode: "edit"; game: Game };

/**
 * The dashboard. The server page hands over the whole catalog; searching, filtering and sorting happen
 * here, in the browser. Changes go through the REST API and then `router.refresh()` re-reads the catalog.
 */
export function GamesDashboard({ games }: { games: Game[] }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState<SortState>({ field: "title", direction: "asc" });
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });
  const [deleting, setDeleting] = useState<Game | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const genres = uniqueGenres(games);
  // The chosen genre can vanish (its last game was deleted or moved to another genre). Reset it right away, in
  // render, instead of filtering by a genre the dropdown no longer lists: otherwise the table goes empty while
  // the dropdown looks like "All genres", and re-adding that genre would quietly revive the old filter.
  if (genre !== "" && !genres.includes(genre)) setGenre("");

  const visible = sortGames(filterGames(games, { search, genre }), sort);
  const stats = computeStats(visible);
  const filtersActive = search.trim() !== "" || genre !== "";

  function handleChanged(message: string) {
    setEditing({ mode: "closed" });
    setDeleting(null);
    setNotice(message);
    startRefresh(() => router.refresh());
  }

  function clearFilters() {
    setSearch("");
    setGenre("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Games</h1>
          <p className="text-sm text-slate-500">
            Your catalog at a glance.{" "}
            <Link href="/chat" className="font-medium text-indigo-600 hover:underline">
              Ask the AI about it →
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ mode: "create" })}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          + Add game
        </button>
      </div>

      <StatsCards stats={stats} catalogSize={games.length} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title or developer…"
          aria-label="Search games by title or developer"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm sm:w-72"
        />
        <select
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          aria-label="Filter by genre"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="">All genres</option>
          {genres.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="text-sm font-medium text-indigo-600 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      <div aria-busy={isRefreshing} className={isRefreshing ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {games.length === 0 ? (
          <EmptyState
            title="No games yet"
            body="Add your first game to start building the catalog."
            action={{ label: "+ Add game", onClick: () => setEditing({ mode: "create" }) }}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No games match your filters"
            body="Try a different search or genre."
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        ) : (
          <GamesTable
            games={visible}
            sort={sort}
            onSort={(field) => setSort((current) => nextSort(current, field))}
            onEdit={(game) => setEditing({ mode: "edit", game })}
            onDelete={setDeleting}
          />
        )}
      </div>

      {editing.mode !== "closed" && (
        <GameFormDialog
          // A new key per target so switching from one game to another never reuses stale form state.
          key={editing.mode === "edit" ? editing.game.id : "new"}
          game={editing.mode === "edit" ? editing.game : null}
          genres={genres}
          onClose={() => setEditing({ mode: "closed" })}
          onSaved={handleChanged}
        />
      )}
      {deleting && <DeleteGameDialog game={deleting} onClose={() => setDeleting(null)} onDeleted={handleChanged} />}

      {/* Always mounted so screen readers announce the text when it appears. */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50">
        {notice && (
          <p className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{notice}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
      <button
        type="button"
        onClick={action.onClick}
        className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {action.label}
      </button>
    </div>
  );
}
