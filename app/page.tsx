"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import type { Game } from "../lib/games";
import type { GameFormState } from "../components/GameForModal";
import { GameCard } from "../components/GameCard";
import { CreateGameModal } from "../components/CreateGameModal";
import { EditGameModal } from "../components/EditGameModal";
import { ChatPanel } from "../components/ChatPanel";

const emptyForm: GameFormState = {
  title: "",
  developer: "",
  genre: "",
  monthly_revenue_usd: "",
  monthly_downloads: "",
  average_rating: "",
};

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isGamesLoading, setIsGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState<GameFormState>(emptyForm);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  useEffect(() => {
    void loadGames();
  }, []);

  function buildPayload(formState: GameFormState) {
  return {
    ...formState,
    monthly_revenue_usd: Number(formState.monthly_revenue_usd),
    monthly_downloads: Number(formState.monthly_downloads),
    average_rating: Number(formState.average_rating),
  };
}

  async function loadGames() {
    try {
      setIsGamesLoading(true);
      setGamesError(null);
      const response = await fetch("/api/games");
      if (!response.ok) throw new Error("Failed to load the catalog.");
      const data = (await response.json()) as Game[];
      setGames(data);
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsGamesLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingGame(null);
    setFormState(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(game: Game) {
    setEditingGame(game);
    setFormState({
      title: game.title,
      developer: game.developer,
      genre: game.genre,
      monthly_revenue_usd: String(game.monthly_revenue_usd),
      monthly_downloads: String(game.monthly_downloads),
      average_rating: String(game.average_rating),
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setFormError(null);
    setEditingGame(null);
    setFormState(emptyForm);
  }

async function handleCreateGame(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setFormError(null);
  setIsSubmitting(true);

  try {
    const payload = buildPayload(formState);

    const response = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to create the game.");
    const createdGame = (await response.json()) as Game;
    setGames((current) => [createdGame, ...current]);
    handleCloseModal();
  } catch (err) {
    setFormError(err instanceof Error ? err.message : "Unexpected error.");
  } finally {
    setIsSubmitting(false);
  }
}

async function handleEditGame(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!editingGame) return;
  setFormError(null);
  setIsSubmitting(true);

  try {
    const payload = buildPayload(formState);

    const response = await fetch(`/api/games?id=${editingGame.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to update the game.");
    const updatedGame = (await response.json()) as Game;
    setGames((current) =>
      current.map((g) => (g.id === updatedGame.id ? updatedGame : g))
    );
    handleCloseModal();
  } catch (err) {
    setFormError(err instanceof Error ? err.message : "Unexpected error.");
  } finally {
    setIsSubmitting(false);
  }
}

  async function handleDeleteGame(id: string) {
    try {
      const response = await fetch(`/api/games?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete the game.");
      setGames((current) => current.filter((g) => g.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.15),_transparent_30%),linear-gradient(135deg,_#020617,_#0f172a)] text-slate-100">
      <div className="mx-auto flex h-screen max-w-7xl flex-col overflow-hidden px-4 py-4 sm:px-6 lg:flex-row lg:gap-6 lg:px-8 lg:py-6">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur lg:w-[60%]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Indie Catalog
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Indie Games Management
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400 sm:text-base">
                Check the status of the catalog, add new releases, and view key metrics from a single panel.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Game
            </button>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto pr-2">
            {isGamesLoading ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-3 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading catalog...
                </div>
              </div>
            ) : gamesError ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
                {gamesError}
              </div>
            ) : games.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-8 text-center text-slate-400">
                There are no games in the catalog yet.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {games.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onDelete={handleDeleteGame}
                    onEdit={handleOpenEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <ChatPanel />
      </div>

      {isModalOpen && !editingGame && (
        <CreateGameModal
          formState={formState}
          isCreating={isSubmitting}
          error={formError}
          onChange={(field, value) =>
            setFormState((current) => ({ ...current, [field]: value }))
          }
          onSubmit={handleCreateGame}
          onClose={handleCloseModal}
        />
      )}

      {isModalOpen && editingGame && (
        <EditGameModal
          formState={formState}
          isEditing={isSubmitting}
          error={formError}
          onChange={(field, value) =>
            setFormState((current) => ({ ...current, [field]: value }))
          }
          onSubmit={handleEditGame}
          onClose={handleCloseModal}
        />
      )}
    </main>
  );
}