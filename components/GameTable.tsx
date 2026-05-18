"use client";

import { useState } from "react";
import type { Game, GameInput } from "@/lib/types";

const EMPTY_FORM: GameInput = {
  title: "",
  developer: "",
  genre: "",
  monthly_revenue_usd: 0,
  monthly_downloads: 0,
  average_rating: 0,
};

export default function GameTable({ initialGames }: { initialGames: Game[] }) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState<GameInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const res = await fetch("/api/games");
    setGames(await res.json());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await fetch(`/api/games/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      await refresh();
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this game?")) return;
    await fetch(`/api/games/${id}`, { method: "DELETE" });
    await refresh();
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
            <tr>
              {["Title", "Developer", "Genre", "Revenue/mo", "Downloads/mo", "Rating", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {games.map((g) => (
              <tr key={g.id} className="hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{g.title}</td>
                <td className="px-4 py-3 text-gray-300">{g.developer}</td>
                <td className="px-4 py-3">
                  <span className="bg-indigo-900/40 text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                    {g.genre}
                  </span>
                </td>
                <td className="px-4 py-3 text-green-400">${g.monthly_revenue_usd.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300">{g.monthly_downloads.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-gray-200">{g.average_rating.toFixed(1)}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(g)}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="text-xs text-red-500 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {games.length === 0 && (
          <p className="text-center text-gray-500 py-12">No games found.</p>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Revenue (USD)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.monthly_revenue_usd}
                    onChange={(e) => setForm({ ...form, monthly_revenue_usd: Number(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Downloads</label>
                  <input
                    type="number"
                    min="0"
                    value={form.monthly_downloads}
                    onChange={(e) => setForm({ ...form, monthly_downloads: Number(e.target.value) })}
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
                    value={form.average_rating}
                    onChange={(e) => setForm({ ...form, average_rating: Number(e.target.value) })}
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
