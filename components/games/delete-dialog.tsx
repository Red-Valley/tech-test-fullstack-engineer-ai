"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/games/types";

type Props = {
  game: Game;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DeleteDialog({ game, onClose, onSuccess }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/games/${game.id}`, { method: "DELETE" });
      onSuccess();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      className="inset-x-0 top-auto bottom-0 m-0 w-full border-0 p-0 sm:inset-0 sm:m-auto sm:max-w-sm backdrop:bg-black/40"
    >
      <div className="flex flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-xl">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900">
            Delete {game.title}?
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3 border-t border-neutral-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
