# Research: Dashboard Chat Panel

**Date**: 2026-10-17 | **Plan**: [plan.md](plan.md)

No open technical questions remain. Behaviours were checked against the Next.js 16 docs
bundled in `node_modules/next/dist/docs/`.

## 1. Keeping the conversation alive (FR-007, FR-008)

- **Decision**: Render exactly **one** `ChatView` instance and never unmount it. Panel vs
  drawer, and shown vs hidden, are CSS states of the same element.
- **Rationale**: `useChat` keeps messages in component state. Three things could otherwise
  destroy it:
  - *Table edits*: forms call `router.refresh()`. Per `use-router.md`, refresh merges the new
    server payload "without losing unaffected client-side React (e.g. `useState`)". Safe
    provided `ChatPanel` stays at a stable position in the tree, outside the catalog's
    `<Suspense>` boundary.
  - *Breakpoint changes*: rendering two different components for wide and narrow screens
    (e.g. a `useMediaQuery` switch) would remount and wipe the chat. CSS-only placement avoids
    this.
  - *Hide/close*: hiding with `hidden`/transform keeps the component mounted.
- **Alternatives**: Lift `useChat` into a React context or a shared `Chat` instance and
  render two views. That works, but it adds a provider and duplicate rendering for no
  benefit. Persisting to `sessionStorage` would be a new behaviour, not wanted by the spec.

## 2. Panel vs drawer mechanics

- **Decision**: A single `<aside>` with Tailwind classes:
  - `< lg`: `fixed inset-y-0 right-0 z-40 w-full max-w-md` with a translate-x off-screen
    when closed, plus a separate backdrop `<div>` (click closes). `role="dialog"`,
    `aria-modal="true"` and `aria-label="Assistant"` are applied only while open on narrow
    screens.
  - `≥ lg`: `lg:static lg:translate-x-0 lg:sticky lg:top-6 lg:h-[calc(100dvh-…)]`, as a grid
    column of width `lg:w-[400px]` (inside the 360–440 px range of FR-002). Hidden on wide
    screens collapses the column and expands the table.
- **Rationale**: Native `<dialog>.showModal()` can't be responsive (it is always modal in the
  top layer). It would also stack awkwardly with the existing `GameForm` modal dialog, which
  must stay on top (spec edge case). A plain fixed element plus manual Escape and focus
  handling is about 20 lines.
- **Alternatives**: A headless UI library dialog — rejected, new dependency (Principle IV).

## 3. Two independent toggle states

- **Decision**: `ChatPanel` holds `wideHidden: boolean` (default `false`, so shown) and
  `drawerOpen: boolean` (default `false`, so closed). The wide toggle only affects `lg:`
  classes; the drawer state only affects the classes below `lg`.
- **Rationale**: Matches the spec defaults (shown on wide, closed on narrow) without reading
  the viewport in JavaScript. Resizing between widths never changes state, so nothing
  remounts and the defaults hold at each size.

## 4. Focus and keyboard (FR-006)

- **Decision**: When the drawer opens, focus the chat input. Escape closes it, and focus
  returns to the "Ask AI" button. `ChatView` gets an optional `inputRef` prop so the panel can
  focus the input.
- **Escape vs GameForm**: the native `<dialog>` used by `GameForm` handles its own Escape and
  stops there. The panel's `keydown` listener ignores events when a `<dialog open>` is
  present, so Escape closes the form, not the drawer underneath.

## 5. Redirecting `/chat` (FR-011)

- **Decision**: `next.config.ts` `redirects()` with `{ source: '/chat', destination:
  '/#chat', permanent: false }`, and delete `src/app/chat/page.tsx`. On mount, `ChatPanel`
  checks `window.location.hash === '#chat'`: it opens the drawer (on narrow screens; on wide
  screens the panel is already visible), focuses the input, and clears the hash with
  `history.replaceState`.
- **Rationale**: A fragment needs no server work and doesn't touch `useSearchParams`, which
  under Cache Components would need its own `<Suspense>` boundary. Temporary (307), because
  the address might be reused.
- **Alternatives**: Keep `chat/page.tsx` calling `redirect('/#chat')` — one more file for
  the same result. `?chat=1` — needs `useSearchParams` and Suspense.

## 6. Width budget at 1280 px (SC-002)

- **Decision**: Widen the content container from `max-w-6xl` (1152 px) to `max-w-[1440px]`
  and use a `lg:grid-cols-[minmax(0,1fr)_400px]` grid with a 24 px gap. At 1280 px the table
  then gets about 1280 − 48 (padding) − 24 (gap) − 400 = **808 px**. The seven columns
  (six data columns plus actions) fit at `text-sm` with `px-3` cells. The page header row
  (title + "Add game") stays above the grid.
- **At 1024 px** (original plan): about 552 px for the table, so Rating and Actions needed a
  sideways scroll inside the table. **Changed after review**: the side panel starts at `xl`
  (1280 px); below that the drawer is used and the table gets the full width.
- **Vertical budget at 800 px**: header ~53 px, page title row ~70 px, table header ~40 px,
  rows ~45 px each, so 8 rows ≈ 520 px plus about 680 px total. That fits. The panel height
  is `100dvh − header − padding`, so the chat input stays visible.

## 7. Removing the Chat tab

- **Decision**: Delete `NavLinks.tsx`. The header keeps the app name, which links to `/`.
- **Rationale**: Only one page remains; a single-item nav is noise (FR-010).
