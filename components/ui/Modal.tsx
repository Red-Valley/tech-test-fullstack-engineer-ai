'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  /** While busy, Esc does not close the dialog. */
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Mount it to open it, unmount it to close it. */
export function Modal({ title, busy = false, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Strict Mode runs effects twice. The ref and the open check keep the first opener
    // and avoid a second showModal. Calling close() in the cleanup would be a bug: its
    // queued close event would fire after the re-run and dismiss the dialog.
    if (!dialog.open) {
      if (document.activeElement instanceof HTMLElement) openerRef.current = document.activeElement;
      dialog.showModal();
    }
    return () => openerRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // The browser ignores a repeated preventDefault on cancel and closes anyway, which
      // would leave React with a closed dialog it still considers open.
      closedby={busy ? 'none' : 'closerequest'}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        if (!busy) onClose();
      }}
      // Close requests that skip the keydown above, such as the back gesture on Android.
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-xl border border-border bg-surface p-6 text-foreground backdrop:bg-black/50"
    >
      <h2 id={titleId} className="mb-4 text-lg font-semibold [overflow-wrap:anywhere]">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
