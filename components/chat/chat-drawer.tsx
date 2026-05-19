"use client";

import { useEffect, useRef } from "react";
import ChatScaffold from "@/components/chat/chat-scaffold";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ChatDrawer({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      id="chat-drawer"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      className="inset-0 m-0 h-dvh w-full border-0 bg-transparent p-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-96 backdrop:bg-black/40"
    >
      <div className="flex h-full w-full flex-col bg-white shadow-2xl sm:w-96 sm:rounded-l-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 className="text-base font-semibold text-neutral-900">
            Ask about your catalog
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex h-11 w-11 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            ✕
          </button>
        </div>
        <ChatScaffold />
      </div>
    </dialog>
  );
}
