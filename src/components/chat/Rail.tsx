"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { RAIL_DOCKED_QUERY, useDashboard } from "@/components/DashboardShell";
import { GameEditor } from "@/components/games/GameEditor";
import { ChatView } from "./ChatView";

function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(RAIL_DOCKED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Only used for ARIA/inert attributes; nothing is mounted or unmounted by width. */
function useIsWide() {
  return useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(RAIL_DOCKED_QUERY).matches,
    () => true,
  );
}

/**
 * The right rail: the Assistant, or the game editor over it. From 1280 px it is docked
 * beside the catalog; below that it is a drawer. ChatView is always mounted (hidden while the
 * editor shows) so the conversation, and any reply still streaming, survives.
 */
export function Rail() {
  const { rail, closeEditor, drawerOpen, setDrawerOpen, setHighlightIds, chatInputRef, askButtonRef } = useDashboard();
  const isWide = useIsWide();
  const wasOpen = useRef(false);
  const editing = rail.mode !== "chat";

  // Focus the chat input when the drawer opens on the assistant; return focus to "Ask AI" when it closes.
  useEffect(() => {
    if (drawerOpen && !editing) chatInputRef.current?.focus();
    else if (!drawerOpen && wasOpen.current) askButtonRef.current?.focus();
    wasOpen.current = drawerOpen;
  }, [drawerOpen, editing, chatInputRef, askButtonRef]);

  // Escape closes one layer at a time: a dialog (it handles itself), then the editor, then the drawer.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
      if (editing) closeEditor();
      else if (drawerOpen) setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editing, closeEditor, drawerOpen, setDrawerOpen]);

  // /chat redirects to /#chat: reveal the assistant, then drop the hash.
  useEffect(() => {
    if (window.location.hash !== "#chat") return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    if (window.matchMedia(RAIL_DOCKED_QUERY).matches) chatInputRef.current?.focus();
    else setDrawerOpen(true);
  }, [chatInputRef, setDrawerOpen]);

  function closeDrawer() {
    setDrawerOpen(false);
    closeEditor(); // reopening the drawer starts on the assistant
  }

  const isDrawer = !isWide;

  return (
    <>
      {drawerOpen && <div aria-hidden className="fixed inset-0 z-30 bg-neutral-900/50 xl:hidden" onClick={closeDrawer} />}
      <aside
        id="assistant-panel"
        aria-label={editing ? "Game editor" : "Assistant"}
        role={isDrawer && drawerOpen ? "dialog" : undefined}
        aria-modal={isDrawer && drawerOpen ? true : undefined}
        inert={isDrawer && !drawerOpen}
        className={[
          "flex flex-col overflow-hidden bg-[linear-gradient(180deg,var(--color-surface),color-mix(in_srgb,var(--color-surface)_40%,var(--color-bg)))]",
          // Below 1280 px: off-canvas drawer.
          "fixed inset-y-0 right-0 z-40 w-full max-w-md shadow-lg transition-transform duration-200",
          drawerOpen ? "translate-x-0" : "translate-x-full",
          // From 1280 px: docked rail beside the catalog.
          "xl:sticky xl:top-0 xl:z-auto xl:h-[min(calc(100dvh-54px),900px)] xl:min-h-[520px] xl:max-w-none xl:flex-[0_0_clamp(290px,28vw,400px)] xl:translate-x-0 xl:shadow-sm xl:transition-none",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close panel"
          className="btn btn-ghost absolute top-2.5 right-2.5 z-10 size-[30px] p-0 xl:hidden"
        >
          <X size={15} aria-hidden />
        </button>
        <ChatView
          className={editing ? "hidden" : ""}
          inputRef={chatInputRef}
          onReferences={setHighlightIds}
        />
        {editing && <GameEditor key={rail.mode === "edit" ? rail.game.id : "new"} game={rail.mode === "edit" ? rail.game : undefined} />}
      </aside>
    </>
  );
}
