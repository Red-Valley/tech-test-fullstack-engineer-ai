"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

const DURATION_MS = 2600;

type Toast = { id: number; message: string };

/** One toast at a time: a new message replaces the current one and restarts the timer. */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, show };
}

export function ToastView({ toast }: { toast: Toast | null }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-60 flex justify-center">
      {toast && (
        <div key={toast.id} className="flex items-center gap-2 rounded-md bg-surface px-3.5 py-2 text-[13px] shadow-md">
          <CheckCircle size={16} className="text-accent" aria-hidden />
          {toast.message}
        </div>
      )}
    </div>
  );
}
