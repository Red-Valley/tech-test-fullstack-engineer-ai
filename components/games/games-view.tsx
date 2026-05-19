"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Game } from "@/lib/games/types";
import GameCard from "@/components/games/game-card";
import GameFormDialog from "@/components/games/game-form-dialog";
import DeleteDialog from "@/components/games/delete-dialog";

type DialogState =
  | { kind: "idle" }
  | { kind: "create" }
  | { kind: "edit"; game: Game }
  | { kind: "delete"; game: Game };

type Props = {
  games: Game[];
};

export default function GamesView({ games }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ kind: "idle" });

  function closeDialog() {
    setDialog({ kind: "idle" });
  }

  function handleSuccess() {
    setDialog({ kind: "idle" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Games</h1>
        <button
          type="button"
          onClick={() => setDialog({ kind: "create" })}
          className="flex min-h-11 items-center rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          New game
        </button>
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
          <p className="text-neutral-500">No games yet.</p>
          <button
            type="button"
            onClick={() => setDialog({ kind: "create" })}
            className="mt-4 flex min-h-11 items-center rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Add your first game
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onEdit={(g) => setDialog({ kind: "edit", game: g })}
              onDelete={(g) => setDialog({ kind: "delete", game: g })}
            />
          ))}
        </div>
      )}

      {dialog.kind === "create" && (
        <GameFormDialog
          mode="create"
          onClose={closeDialog}
          onSuccess={handleSuccess}
        />
      )}

      {dialog.kind === "edit" && (
        <GameFormDialog
          mode="edit"
          game={dialog.game}
          onClose={closeDialog}
          onSuccess={handleSuccess}
        />
      )}

      {dialog.kind === "delete" && (
        <DeleteDialog
          game={dialog.game}
          onClose={closeDialog}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
