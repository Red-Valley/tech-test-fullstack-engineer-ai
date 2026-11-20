'use client';

import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/client/ui/components/primitives/button';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons row; rendered below the content. */
  footer?: ReactNode;
  /**
   * While true (a save or delete is in flight), Esc, the backdrop and × don't close the modal,
   * so a late result can't land in a modal the user already left.
   */
  busy?: boolean;
};

/**
 * Built on the native <dialog> with showModal(): the browser makes the rest of the page inert
 * (so focus can't leave the modal), closes it on Esc (the `cancel` event), and returns focus
 * to the element that opened it. No focus-trap code to get wrong. Mark the element that
 * should get focus first with `data-autofocus` (React's autoFocus runs too early here).
 */
export function Modal({ open, title, onClose, children, footer, busy = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Where the current mouse press started. A press inside the panel that ends on the backdrop
  // (e.g. selecting text in a field) must not count as a backdrop click.
  const pressStartedOnBackdrop = useRef(false);
  const requestClose = () => {
    if (!busy) onClose();
  };

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first focusable element, which is the close button, and
      // React's autoFocus already ran before the dialog opened. So pick the start explicitly:
      // an element marked data-autofocus, else the first form field.
      const initial =
        dialog.querySelector<HTMLElement>('[data-autofocus]') ??
        dialog.querySelector<HTMLElement>('input, select, textarea');
      initial?.focus();
    }
    if (!open && dialog.open) dialog.close();
    // If the modal is unmounted while open (parents often unmount it to close it), close it
    // first: only close() makes the browser return focus to the element that opened it.
    // Layout-effect cleanup runs before React removes the <dialog> from the page.
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Let React own the open state instead of the browser closing it behind our back.
        event.preventDefault();
        requestClose();
      }}
      onMouseDown={(event) => {
        // A press on the backdrop lands on the <dialog> element itself.
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressStartedOnBackdrop.current && event.target === event.currentTarget) requestClose();
        pressStartedOnBackdrop.current = false;
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={requestClose}
            disabled={busy}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </Button>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2 pt-1">{footer}</div>}
      </div>
    </dialog>
  );
}
