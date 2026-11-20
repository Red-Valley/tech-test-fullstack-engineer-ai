"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ApiRequestError, deleteGame } from "@/lib/games/client";
import type { Game } from "@/lib/games/schema";

interface DeleteGameDialogProps {
  game: Game;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export function DeleteGameDialog({ game, onClose, onDeleted }: DeleteGameDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await deleteGame(game.id);
      onDeleted(`Deleted “${game.title}”`);
    } catch (caught) {
      setPending(false);
      setError(caught instanceof ApiRequestError ? caught.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <Modal title="Delete this game?" onClose={onClose}>
      <p className="mt-2 text-sm text-slate-600">
        <strong className="font-medium text-slate-900">{game.title}</strong> by {game.developer} will be removed from the
        catalog. This can&apos;t be undone.
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        {/* Cancel gets the initial focus so a stray Enter never deletes anything. */}
        <button
          type="button"
          autoFocus
          onClick={onClose}
          disabled={pending}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete game"}
        </button>
      </div>
    </Modal>
  );
}
