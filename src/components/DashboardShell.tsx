"use client";

import { Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Rail } from "@/components/chat/Rail";
import { DeleteDialog } from "@/components/games/DeleteDialog";
import { ToastView, useToast } from "@/components/Toast";
import type { Game } from "@/lib/db/schema";

/** From this width the rail is docked beside the catalog; below it, it is a drawer. */
export const RAIL_DOCKED_QUERY = "(min-width: 1280px)";

export type RailMode = { mode: "chat" } | { mode: "create" } | { mode: "edit"; game: Game };
export type DeleteTarget = Pick<Game, "id" | "title">;

type Dashboard = {
  rail: RailMode;
  openEditor: (game?: Game) => void;
  closeEditor: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  highlightIds: number[];
  setHighlightIds: (ids: number[]) => void;
  pendingDelete: DeleteTarget | null;
  requestDelete: (game: DeleteTarget) => void;
  clearDelete: () => void;
  toast: (message: string) => void;
  chatInputRef: RefObject<HTMLInputElement | null>;
  askButtonRef: RefObject<HTMLButtonElement | null>;
};

const DashboardContext = createContext<Dashboard | null>(null);

/**
 * Shared UI state for the dashboard. Table rows are rendered inside the server catalog, so
 * they can't receive callbacks as props from here; they read them from this context.
 */
export function useDashboard(): Dashboard {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("useDashboard must be used inside <DashboardShell>");
  return value;
}

/**
 * Page frame: header, catalog (server `children`) and the rail. The catalog refreshing after
 * an edit or a filter change never remounts the rail, so the conversation is kept.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const [rail, setRail] = useState<RailMode>({ mode: "chat" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightIds, setHighlightIds] = useState<number[]>([]);
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);
  const { toast, show } = useToast();
  const chatInputRef = useRef<HTMLInputElement>(null);
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openEditor = useCallback((game?: Game) => {
    setRail(game ? { mode: "edit", game } : { mode: "create" });
    // Only below 1280 px, where the rail is a drawer. Setting it on wide screens would leave the
    // drawer open over the page after the window is narrowed.
    if (!window.matchMedia(RAIL_DOCKED_QUERY).matches) setDrawerOpen(true);
  }, []);
  const closeEditor = useCallback(() => setRail({ mode: "chat" }), []);
  const clearDelete = useCallback(() => setPendingDelete(null), []);

  const value = useMemo<Dashboard>(
    () => ({
      rail,
      openEditor,
      closeEditor,
      drawerOpen,
      setDrawerOpen,
      highlightIds,
      setHighlightIds,
      pendingDelete,
      requestDelete: setPendingDelete,
      clearDelete,
      toast: show,
      chatInputRef,
      askButtonRef,
    }),
    [rail, openEditor, closeEditor, drawerOpen, highlightIds, pendingDelete, clearDelete, show],
  );

  return (
    <DashboardContext.Provider value={value}>
      <header className="flex items-center gap-3.5 px-5 py-2.5">
        <Link href="/" className="flex items-center gap-[9px] text-[15px] font-medium">
          <span
            aria-hidden
            className="size-2 rounded-full bg-accent shadow-[0_0_10px_2px_color-mix(in_srgb,var(--color-accent)_60%,transparent)]"
          />
          Indie Games
        </Link>
        <div className="ml-auto flex gap-2">
          <button
            ref={askButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-controls="assistant-panel"
            aria-expanded={drawerOpen}
            className="btn btn-secondary xl:hidden"
          >
            Ask AI
          </button>
          <button type="button" onClick={() => openEditor()} className="btn btn-primary">
            <Plus size={15} aria-hidden />
            Add game
          </button>
        </div>
      </header>
      <div className="rule-fade" />
      <div className="flex items-start">
        <section className="flex min-w-0 flex-1 flex-col gap-3.5 px-6 pt-5 pb-8">{children}</section>
        <Rail />
      </div>
      <DeleteDialog />
      <ToastView toast={toast} />
    </DashboardContext.Provider>
  );
}
