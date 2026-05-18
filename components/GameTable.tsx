"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Game, GameInput } from "@/lib/types";

const PAGE_SIZE = 10;

interface GameFormState {
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number | "";
  monthly_downloads: number | "";
  average_rating: number | "";
}

const EMPTY_FORM: GameFormState = {
  title: "",
  developer: "",
  genre: "",
  monthly_revenue_usd: "",
  monthly_downloads: "",
  average_rating: "",
};

type NumericField = "monthly_revenue_usd" | "monthly_downloads" | "average_rating";

export default function GameTable({ initialGames }: { initialGames: Game[] }) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState<GameFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
  const pageGames = games.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const refresh = async () => {
    const res = await fetch("/api/games");
    const updated: Game[] = await res.json();
    setGames(updated);
    setPage((p) => Math.min(p, Math.max(1, Math.ceil(updated.length / PAGE_SIZE))));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (game: Game) => {
    setEditing(game);
    setForm({
      title: game.title,
      developer: game.developer,
      genre: game.genre,
      monthly_revenue_usd: game.monthly_revenue_usd,
      monthly_downloads: game.monthly_downloads,
      average_rating: game.average_rating,
    });
    setShowForm(true);
  };

  const handleNumericFocus = (field: NumericField) => {
    if (form[field] === 0) setForm((prev) => ({ ...prev, [field]: "" }));
  };

  const handleNumericChange = (field: NumericField, raw: string) => {
    setForm((prev) => ({ ...prev, [field]: raw === "" ? "" : Number(raw) }));
  };

  const buildPayload = (): GameInput => ({
    title: form.title,
    developer: form.developer,
    genre: form.genre,
    monthly_revenue_usd: form.monthly_revenue_usd === "" ? 0 : Number(form.monthly_revenue_usd),
    monthly_downloads: form.monthly_downloads === "" ? 0 : Number(form.monthly_downloads),
    average_rating: form.average_rating === "" ? 0 : Math.min(5, Math.max(0, Number(form.average_rating))),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = buildPayload();
      if (editing) {
        const res = await fetch(`/api/games/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update game");
        toast.success("Game updated successfully");
      } else {
        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create game");
        toast.success("Game created successfully");
      }
      await refresh();
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (game: Game) => {
    toast(`Delete "${game.title}"?`, {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const res = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete game");
            await refresh();
            toast("Game deleted", { description: game.title });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete game");
          }
        },
      },
    });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Game
        </button>
      </div>

      {/* Mobile: Cards (< sm) */}
      <div className="sm:hidden space-y-3">
        {pageGames.map((g) => (
          <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{g.title}</h3>
                <p className="text-sm text-gray-400 truncate">{g.developer}</p>
              </div>
              <span className="shrink-0 bg-indigo-900/40 text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                {g.genre}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Revenue</p>
                <p className="text-green-400 font-medium">${g.monthly_revenue_usd.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Downloads</p>
                <p className="text-gray-300">{g.monthly_downloads.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Rating</p>
                <p className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-gray-200">{g.average_rating.toFixed(1)}</span>
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-4 border-t border-gray-800 pt-3">
              <button onClick={() => openEdit(g)} className="text-xs text-gray-400 hover:text-white transition-colors">
                Edit
              </button>
              <button onClick={() => handleDelete(g)} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                Delete
              </button>
            </div>
          </div>
        ))}
        {games.length === 0 && <p className="text-center text-gray-500 py-12">No games found.</p>}
      </div>

      {/* Tablet + Desktop: Table (>= sm) */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Developer</th>
              <th className="px-4 py-3 text-left font-medium">Genre</th>
              <th className="px-4 py-3 text-left font-medium">Revenue/mo</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Downloads/mo</th>
              <th className="px-4 py-3 text-left font-medium">Rating</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {pageGames.map((g) => (
              <tr key={g.id} className="hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{g.title}</td>
                <td className="px-4 py-3 text-gray-300">{g.developer}</td>
                <td className="px-4 py-3">
                  <span className="bg-indigo-900/40 text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                    {g.genre}
                  </span>
                </td>
                <td className="px-4 py-3 text-green-400">${g.monthly_revenue_usd.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">
                  {g.monthly_downloads.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-gray-200">{g.average_rating.toFixed(1)}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(g)} className="text-xs text-gray-400 hover:text-white transition-colors">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(g)} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {games.length === 0 && <p className="text-center text-gray-500 py-12">No games found.</p>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <span>
            Page {page} of {totalPages} &mdash; {games.length} games
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-5">
              {editing ? "Edit Game" : "Add Game"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(["title", "developer", "genre"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs text-gray-400 mb-1 capitalize">{field}</label>
                  <input
                    required
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Revenue (USD)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.monthly_revenue_usd}
                    onFocus={() => handleNumericFocus("monthly_revenue_usd")}
                    onChange={(e) => handleNumericChange("monthly_revenue_usd", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Downloads</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.monthly_downloads}
                    onFocus={() => handleNumericFocus("monthly_downloads")}
                    onChange={(e) => handleNumericChange("monthly_downloads", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Rating (0–5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="0.0"
                    value={form.average_rating}
                    onFocus={() => handleNumericFocus("average_rating")}
                    onChange={(e) => handleNumericChange("average_rating", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {loading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
