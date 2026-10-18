# Research: Nocturne UI Redesign

**Date**: 2026-10-17 | **Plan**: [plan.md](plan.md)

All items are resolved. Next.js behaviour was checked in `node_modules/next/dist/docs/`, the
package via `npm view`, and contrast computed from the handoff tokens.

## 1. Where filtering and sorting run

- **Decision**: On the server. `page.tsx` renders
  `<Suspense><Catalog searchParams={searchParams} /></Suspense>`. `Catalog` awaits
  `connection()` and `searchParams`, parses them with `parseCatalogView()`, and calls
  `repository.queryCatalog(view)`, `listGenres()` and `maxRevenue()`.
- **Rationale**: `searchParams` is a request-time promise (`page.md`: "opt the page into
  dynamic rendering"). Reading it inside the existing `<Suspense>` keeps the static shell.
  Queries stay in the single data module (Principle III), and the URL survives
  `router.refresh()` after edits (FR-013).
- **Alternatives**: Client-side filtering of a full list. Simpler at this scale, but it
  duplicates query logic outside the repository and needs `useSearchParams`, which under
  Cache Components needs its own Suspense boundary.

## 2. Updating the URL without resetting state

- **Decision**: `CatalogToolbar` and the sort headers call
  `router.replace('?' + serializeCatalogView(next), { scroll: false })`. The current view
  arrives as **props** from the server; the client never calls `useSearchParams`.
- **Rationale**: `use-router.md` says `bfcacheId` "stays the same for … search-param- or
  hash-only navigations", so the segment isn't recreated. Client state (conversation, rail
  mode, highlight) survives, as it does with `router.refresh()` (002 research §1). The
  search input keeps its own local value while typing and syncs to the URL after 250 ms.
- **Verify in quickstart**: the conversation is intact after typing a search (V3).

## 3. Shared UI state

- **Decision**: `DashboardShell` provides `DashboardContext`:
  `{ rail, openEditor(game?), closeEditor(), highlightIds, setHighlightIds, requestDelete(game),
  toast(message) }`. `Rail`, `CatalogSection`, `GamesTable`, `GameEditor` and `DeleteDialog`
  consume it.
- **Rationale**: Table rows are rendered inside the server `Catalog`, so they can't receive
  callbacks as props from the client shell. One context is the smallest bridge. (002
  avoided a context because the panel and page were siblings; that no longer holds.)
- **Alternatives**: Zustand or other stores: a new dependency for one screen's state.

## 4. Editor inside the rail without losing the chat

- **Decision**: `Rail` always renders `<ChatView>` and adds `hidden` when
  `rail.mode !== "chat"`, rendering `<GameEditor key={rail.game?.id ?? "new"}>` alongside.
  The `key` resets the form when switching games (edge case: unsaved edits discarded).
- **Rationale**: Same single-instance rule as 002. `hidden` keeps `useChat` mounted, so a
  streaming reply continues (FR-021).

## 5. Highlight extraction

- **Decision**: `src/lib/ai/references.ts` exports `referencedGameIds(message)`. It walks the
  assistant message's tool parts in `state === "output-available"`:
  - `rank_games` → `output.games[0]?.id` only (the answer's subject)
  - `count_games` → `output.games[].id`
  - `get_games` → `output.found[].id`
  - `search_games` → `output.games[].id`
  It returns unique ids in first-seen order. `ChatView` calls `onReferences(ids)` whenever
  the latest assistant message's output parts change. The shell clears the highlight when a
  user message is sent, on New chat, and from the tag's ✕. It drops ids after a delete.
- **Rationale**: Uses data already streamed to the client (FR-029). Pure and unit-testable.
- **Known limit**: `count_games` lists at most 20 games (001 tool contract), so more than 20
  matches highlight the first 20, and the tag says 20. Acceptable at catalog scale; noted in
  the README.

## 6. Icons

- **Decision**: `@phosphor-icons/react@2.1.10`. Client components import from
  `@phosphor-icons/react`; any server component imports from `@phosphor-icons/react/ssr`.
  Weight `regular` throughout (handoff).
- **Rationale**: React 19 compatible (peer `react >= 16.8`). The handoff lists 16 icons by
  Phosphor name.

## 7. Contrast (SC-006)

Computed from the handoff tokens (WCAG relative luminance):

| Background | text | muted (55%) | header (60%) | accent | accent-300 |
|---|---|---|---|---|---|
| plain row (`bg`) | 14.54 | 5.19 | 5.94 | 5.45 | 11.73 |
| highlighted (`accent-900` @ 80%) | 12.37 | 4.79 | 5.41 | 4.64 | 9.97 |
| **selected (`accent-800` @ 55%)** | 11.11 | **4.49** ✗ | 5.04 | 4.17 (icon, ≥ 3 ✓) | 8.96 |
| rail `surface` | 12.55 | 4.83 | 5.47 | 4.71 | 10.12 |

- **Decision**: On a **selected** row only, the "Developer · Genre" subline uses `text` @ 60%
  instead of 55% (≈ 5.0:1). Every other pairing passes as designed.
- The status dot (`neutral-800`, 1.76:1) is decorative. Highlight and selection are also
  given a text alternative (§8), so meaning doesn't depend on colour alone.

## 8. Accessibility details

- Highlighted rows carry visually hidden text "(mentioned in last answer)"; the selected row
  has `aria-current="true"`.
- Sort headers are `<button>`s inside `<th aria-sort="ascending|descending|none">`.
- The toast container is `role="status"` with `aria-live="polite"`.
- Escape layering (FR-027): one `keydown` handler in `Rail`. If any `dialog[open]` exists,
  do nothing (the dialog closes itself). Else, if the editor is open, go back to chat. Else,
  if the drawer is open, close it.

## 9. Theme application

- **Decision**: `globals.css` = `@import "tailwindcss";` + `nocturne-theme.css` verbatim
  (tokens, `rule-fade`, `row-rule`, base rules). Add one utility `bg-page` for the radial
  top-left glow. Remove all `dark:` variants (dark-only).
- `layout.tsx`: `Inter({ subsets: ["latin"], weight: ["400","500","600"], variable:
  "--font-inter" })`.

## 10. Rail width and breakpoint

- Rail: `flex: 0 0 clamp(290px, 28vw, 400px)` from `xl`, which is 358 px at 1280 and 400 px
  from 1429. Below `xl`, the 002 drawer (`max-w-md`) for the whole rail. The spec's FR-003
  (290–400 px) replaces 002's 360–440 px.
- Height `min(100vh, 900px)`, sticky `top: 0`, docked (no radius), per handoff §2.
