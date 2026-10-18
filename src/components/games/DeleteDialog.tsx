"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDashboard } from "@/components/DashboardShell";

/** The one delete confirmation on the page; opens whenever a delete is requested. */
export function DeleteDialog() {
  const router = useRouter();
  const { pendingDelete, clearDelete, rail, closeEditor, setHighlightIds, highlightIds, toast } = useDashboard();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (pendingDelete && dialog && !dialog.open) dialog.showModal();
  }, [pendingDelete]);

  async function confirm() {
    if (!pendingDelete) return;
    const { id, title } = pendingDelete;
    setDeleting(true);
    try {
      const response = await fetch(`/api/games/${id}`, { method: "DELETE" });
      if (rail.mode === "edit" && rail.game.id === id) closeEditor();
      setHighlightIds(highlightIds.filter((highlighted) => highlighted !== id));
      toast(response.status === 404 ? "This game no longer exists." : `Deleted ${title}`);
      router.refresh();
    } catch {
      toast("Could not reach the server. Try again.");
    } finally {
      setDeleting(false);
      dialogRef.current?.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={clearDelete}
      aria-labelledby="delete-title"
      className="m-auto w-[min(440px,calc(100%-32px))] rounded-lg bg-surface p-[18px] text-text shadow-lg"
    >
      {pendingDelete && (
        <div className="flex flex-col gap-2">
          <h2 id="delete-title" className="text-[17px]">
            Delete {pendingDelete.title}?
          </h2>
          <p className="text-[13px] opacity-85">It will be removed from the catalog. This cannot be undone.</p>
          <div className="mt-2 flex justify-end gap-1.5">
            <button type="button" onClick={() => dialogRef.current?.close()} className="btn btn-secondary px-3 py-1.5 text-[13px]">
              Cancel
            </button>
            <button type="button" onClick={confirm} disabled={deleting} className="btn btn-primary px-3 py-1.5 text-[13px]">
              {deleting ? "Deleting…" : "Delete game"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
