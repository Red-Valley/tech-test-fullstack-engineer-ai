# Handoff: Games Dashboard redesign (Nocturne)

## Overview
A dark, dense redesign of the Indie Games dashboard on branch `submission/jorge-sandoval` of `mastersanto/tech-test-fullstack-engineer-ai`. It changes the layout as well as the skin: the catalog fills the page and a single docked right rail switches between the **Assistant** and a **Game editor**. Games the assistant mentions are highlighted in the table. Data model, API routes, AI agent and tools are unchanged except for one small addition (see "Highlighting rows from answers").

## About the Design Files
The files in this bundle are **design references created in HTML**: prototypes showing intended look and behaviour, not production code. Recreate them in the existing Next.js App Router + Tailwind v4 + Vercel AI SDK codebase using its patterns.

- `Games Dashboard Nocturne.dc.html`: the redesign (target). Open in a browser from this folder. The chat is simulated.
- `Games Dashboard (current).dc.html`: the current UI for comparison.
- `nocturne-theme.css`: drop-in Tailwind v4 tokens and the two fading-rule utilities.
- `_ds/…/styles.css`: the source design-system stylesheet (reference).
- `screenshots/`: captured at ~1470px layout width (see "Files").

## Fidelity
**High-fidelity.** Final colours, type, spacing and states. Use the tokens in `nocturne-theme.css`.

## Implementation plan (by file)
| File | Change |
| --- | --- |
| `src/app/globals.css` | Replace the Geist `@theme inline` block with `nocturne-theme.css`. |
| `src/app/layout.tsx` | Load `Inter` (400/500/600) via `next/font/google`, `variable: "--font-inter"`. Body `bg-bg text-text font-sans antialiased`. Remove `dark:` variants (Nocturne is dark-only). Remove the `main` max-width/padding wrapper; the shell is now full-bleed. New header (below). |
| `src/components/DashboardShell.tsx` | Two-column full-bleed shell: catalog section + right rail. Owns `rail` state (`"chat" | {mode:"create"} | {mode:"edit", game}`) and `highlightIds`. Passes `openEditor(game?)` down to the table and header. |
| `src/app/page.tsx` | Read `searchParams` (`q`, `genre`, `sort`, `dir`); filter and sort on the server; pass `games`, `total`, `genres`, `maxRevenue`. |
| `src/components/games/CatalogToolbar.tsx` (new, client) | Search, genre select, highlight tag, count. Writes to the URL with `router.replace` (search debounced ~250 ms). |
| `src/components/games/GamesTable.tsx` | New dense table (below). Needs a client wrapper for the row highlight/selected state and the Edit/Delete callbacks. |
| `src/components/games/GameEditor.tsx` (rename of GameForm) | Renders **inside the rail**, not in a `<dialog>`. Same zod validation and fetch logic. |
| `src/components/games/DeleteGameButton.tsx` | `window.confirm` → Nocturne `<dialog>`; `window.alert` → toast. |
| `src/components/Toast.tsx` (new) | Toast context, bottom-centre. |
| `src/components/chat/ChatPanel.tsx` | Becomes the rail container. Keep `ChatView` mounted (hide with `hidden` when the editor shows) so the conversation is preserved. Below 1280px keep the existing drawer behaviour for the whole rail. |
| `src/components/chat/ChatView.tsx` | New message styling, suggestions list, composer, "New chat" via `setMessages([])`. Reports referenced game ids upward (`onReferences(ids)`). |
| `src/components/chat/MessageParts.tsx` | `ToolChip` restyle (outlined accent chip). |

Install icons: `npm i @phosphor-icons/react` (weight `regular`). The prototype uses the Phosphor web font; the names map 1:1.

## Screens / Views

### 1. Page background and header
- Page background: `radial-gradient(1200px 520px at 0% 0%, accent-900 @70%, transparent 70%)` over `bg` (soft depth top-left; no flat fill).
- Header: flex row, `px-5 py-2.5` (10px 20px), gap 14px.
  - Brand: 8px circle `bg-accent` with glow `0 0 10px 2px accent @60%`, gap 9px, "Indie Games" 15px weight 500.
  - Right: **Add game**, primary outlined button: 1px `accent` border, text `accent`, transparent fill, hover fill `accent @12%`, active `@22%`, radius 8px, padding 7px 12px, 14px weight 500, `Plus` icon 15px, gap 6px, nowrap.
- Below the header: a full-width `rule-fade` (1px, fading 48px each end).

### 2. Shell layout
- Row, **no wrap**, items-start, full width.
- Catalog section: `flex: 1 1 0; min-width: 0`, padding 20px 24px 32px, vertical gap 14px.
- Rail: `flex: 0 0 clamp(290px, 28vw, 400px)`, `position: sticky; top: 0`, height `min(100vh, 900px)`, min-height 520px, flex column. Background `linear-gradient(180deg, surface, color-mix(surface 40%, bg))`, edge `shadow-sm` (1px `neutral-800` ring). No radius (docked).
- Below 1280px (`xl`), turn the rail into the existing off-canvas drawer (right, `max-w-md`, `shadow-lg`) and show an "Ask AI" secondary button left of Add game. Opening Edit/Add also opens the drawer.

### 3. Catalog heading and toolbar
- `h3` "Games catalog": 25px, weight 500, letter-spacing -0.015em, margin-bottom 4px. Sub-copy 13px muted: "Monthly revenue, downloads and ratings for every tracked title."
- Toolbar: flex wrap, gap 8px, items centre.
  - Search: `.input` = `bg-surface`, 1px `divider` border, radius 8px, min-h 32px, 13px; hover border `text @45%`, focus border `accent`. `MagnifyingGlass` 15px at left 10px, opacity .55; padding-left 32px. `flex: 1 1 220px; max-width: 300px`. Placeholder "Search title or developer".
  - Genre `<select>`, same input style, min-w 140px. "All genres", then distinct genres A–Z.
  - Highlight tag (only when the last answer referenced games): outlined tag, 1px `accent` border, text `accent`, 11px, radius 6px, padding 3px 4px 3px 9px, gap 6px, nowrap: `Sparkle` 12px + "N from last answer" + ghost `X` button (`aria-label="Clear highlight"`).
  - Count, `ml-auto`, 12px muted, tabular-nums: "12 games" or "3 of 12 games".

### 4. Games table
- Wrapper `overflow-x-auto overflow-y-hidden`. `<table>` full width, **`table-layout: fixed`**, 13px.
- Columns and widths: **Game** (auto, takes the rest) · **Revenue / mo** 128px, right, `title="Monthly revenue"` · **Downloads** 112px, right · **Rating** 84px, right · Actions 76px (sr-only header "Actions").
- Header cells: padding 8px 10px; 11px uppercase, letter-spacing .08em, colour `text @60%`. Header row bottom border uses `rule-fade` (divider). Each header is a sort button: label + `CaretUp`/`CaretDown` on the active column only. Default sort: revenue ↓; same rules as before (toggle on repeat; new text column ↑, numeric ↓).
- Rows: each `tr` paints `row-rule` (8% text, fading ends); hover adds a `text @4%` tint over it. Cell padding 8px 10px (actions 6px).
  - **Game**: 6px status dot (`neutral-800`; `accent` + glow when highlighted or selected), gap 8px, then title 13px weight 500 (`text`; `accent-300` when highlighted), and a subline 12px muted "Developer · Genre". Both lines `nowrap` + ellipsis.
  - **Revenue / mo**: right-aligned column, gap 5px: amount `$142,500` tabular-nums; below it a 72×2px track `neutral-800` with right-anchored fill `accent` sized `revenue / maxRevenue`, glow `0 0 6px accent @70%`.
  - **Downloads** `38,200`, **Rating** `4.7`, both tabular-nums.
  - **Actions**: two 30×30 ghost icon buttons, gap 2px: `PencilSimple` 15px (`accent`), `Trash` 15px (`neutral-400`). Hover fill `accent @10%`, active `@18%`, radius 8px. `aria-label="Edit {title}"` / `"Delete {title}"`.
  - Row states (apply to every cell's background): highlighted from an answer = `accent-900 @80%`; currently being edited = `accent-800 @55%`.
- Empty states (padding 40px 10px, left-aligned, gap 6px): `h5` 16px "No games match" / muted 13px "Try a different search or genre." / secondary button "Clear filters". Catalog empty: "No games yet" / "Add your first game to start tracking the catalog." / "Add game".

### 5. Rail: Assistant (default)
- Header (padding 14px 16px 10px): `Sparkle` 16px `accent` + `h5` "Assistant" 16px weight 500. Right: ghost "New chat" (`ArrowCounterClockwise`, 12px), only when there are messages.
- Description 12px muted (padding 0 16px 10px): "Answers come from live lookups against the catalog. Games it mentions light up in the table."
- `rule-fade` inset 16px.
- Message list: padding 14px 16px, gap 14px, scrolls internally.
  - Empty: `h6` "Try asking" (13px uppercase, .08em, muted), pinned to the bottom, then the three suggestions as full-width secondary buttons (1px divider border, radius 8px, 13px weight 400, padding 8px 10px, text left, `ArrowUpRight` 13px at .6 opacity on the right). Hidden while busy and once a conversation exists.
  - User message: right-aligned, max-w 88%, `bg-neutral-900`, `shadow-sm` ring, radius 8px, padding 7px 11px, 13px/1.5.
  - Assistant message: **no bubble**. Column, gap 7px:
    - `ToolChip`: inline-flex, 1px `accent-700` border, text `accent-300`, radius 4px, padding 3px 9px, 11px, gap 7px. Leading `Check` 12px when done, or a 10px spinner (1.5px `accent-700` ring, `accent-300` top, spin .8s) while pending. Label weight 500 (existing labels, "…" when pending), then the mono details at .75 opacity, truncated.
    - Text: 13px/1.6, `neutral-200`, `pre-wrap`, `text-wrap: pretty`.
    - Streaming cursor: 6×14px `accent` block, radius 1px, glow `0 0 8px accent`, `animate-blink`.
    - Stopped/error: 11px italic muted "Stopped — incomplete answer".
  - Error banner: `bg-accent-900`, 1px `accent-700` border, radius 8px, 13px `accent-200` text, "Retry" secondary button.
- Composer (padding 10px 12px 14px, gap 6px): `.input` on `bg-bg`, 13px, placeholder "Ask about the games catalog…", maxLength 2000 (keep the 1800+ counter). Send: 36×36 primary outlined icon button, `ArrowUp` 16px, disabled at 45% when empty. While streaming: secondary 36×36 `Stop` 16px.

### 6. Rail: Game editor (Add / Edit)
- Replaces the assistant in the rail; the chat stays mounted and comes back unchanged.
- Header (padding 12px 12px 10px, gap 6px): 30×30 ghost `ArrowLeft` button (`aria-label="Back to assistant"`, text colour) + `h5` "Add game" / "Edit {title}" (ellipsis). Then `rule-fade` inset 16px.
- Body (scrolls, padding 16px, gap 12px): one field per row in this order: Title, Developer, Genre, Monthly revenue (USD), Monthly downloads, Average rating (0–5). Labels 12px `text @70%`, 5px gap. Inputs `.input` on `bg-bg`, 13px, tabular-nums.
- Error: input border `accent`; below it a 12px `accent-300` line with `WarningCircle` icon + message. Clear on edit.
- Footer (padding 12px 16px 16px, gap 6px): when editing, a ghost "Delete" (`Trash`, `neutral-300`) on the left; right side secondary "Cancel" + primary outlined "Add game" / "Save changes" ("Saving…" while pending).
- While editing, the row being edited gets the "selected" state in the table.
- Success: return the rail to the assistant, `router.refresh()`, toast "Added {title}" / "Saved {title}".

### 7. Delete confirmation
- Native `<dialog>`, backdrop `neutral-900 @50%`. Surface `bg-surface`, radius 14px, `shadow-lg`, padding 18px, width `min(440px, 100%)`, gap 8.4px.
- Title 17px weight 500 "Delete {title}?"; body 13px at .85 opacity "It will be removed from the catalog. This cannot be undone."; actions right: secondary "Cancel", primary outlined "Delete game".
- On success: close (and close the editor if it was showing that game), remove the id from the highlight set, toast "Deleted {title}". 404 → toast "This game no longer exists." + refresh.

### 8. Toast
- Fixed bottom 20px, horizontally centred, z-60. `bg-surface`, radius 8px, `shadow-md`, padding 8px 14px, 13px, gap 8px, `CheckCircle` 16px `accent`. `role="status"`, auto-dismiss 2.6s.

## Highlighting rows from answers
- Each tool already returns the games it touched (`games`, `found`). In `ChatView`, after a message finishes (or as tool parts reach `output-available`), collect the ids from the latest assistant message's tool outputs: `rank_games` → first result only (the answer's subject); `count_games` → all `games`; `get_games` → `found`; `search_games` → `games`.
- Lift them to `DashboardShell` via `onReferences(ids)` and pass `highlightIds` to the table. Clear on a new user message, on "New chat" and from the toolbar tag's ✕. Drop ids for deleted games.

## Interactions & Behavior
- All interactive elements use the DS states: hover tints, pressed one step stronger, focus `outline 2px accent, offset 2px`, disabled 45%.
- Escape: closes the dialog first, then the editor (back to assistant), then the drawer on narrow screens.
- Filters/sort live in the URL so they survive `router.refresh()`.
- Animations: spinner, cursor blink, drawer slide (200ms). Nothing else.

## State Management
- URL: `q`, `genre`, `sort`, `dir`.
- Shell: `rail`, `highlightIds: number[]`.
- Editor: `values`, `errors`, `formError`, `saving`.
- Delete: `pending: {id, title} | null`, `deleting`.
- Toast context.
- Chat: `useChat` as today + `setMessages` for New chat.

## Design Tokens
See `nocturne-theme.css`. Summary:
- `bg #161826`, `surface #232532`, `text #e9e9ed`, `accent #9184d9`; divider = text 16%; row rule = text 8%; muted = text 55%. Accent text at paragraph size must use `accent-300`.
- Type: Inter only. Headings weight 500, never bolder (h3 25, h5 16, h6 13 uppercase). Body 13px in the app chrome; 12px sublines and labels; 11px chips, tags and table headers.
- Spacing (0.7× density): 2.8 / 5.6 / 8.4 / 11.2 / 16.8 / 22.4px.
- Radii: 4px (chips), 8px (buttons, inputs, bubbles, toast), 14px (dialog).
- Shadows: `sm` 1px ring, `md` ring + ambient, `lg` ring + deep ambient. Glows only on accent marks (dots, revenue line, cursor).
- Rules always fade 48px at each end; box outlines stay solid.

## Assets
- Icons: Phosphor regular: Plus, MagnifyingGlass, Sparkle, X, CaretUp, CaretDown, PencilSimple, Trash, ArrowCounterClockwise, ArrowUpRight, Check, ArrowUp, Stop, ArrowLeft, WarningCircle, CheckCircle.
- Font: Inter (Google Fonts via `next/font`).
- No images.

## Files
- `Games Dashboard Nocturne.dc.html`: redesign prototype.
- `Games Dashboard (current).dc.html`: current UI reference.
- `nocturne-theme.css`: Tailwind v4 tokens + `rule-fade` / `row-rule` utilities.
- `_ds/nocturne-04a88ba1-b7c1-453e-bddf-df64469f0f5c/styles.css`: source DS stylesheet.
- `screenshots/`: `01-default`, `02-chat-tool-pending`, `03-answer-highlights-rows`, `04-edit-rail`, `05-edit-validation`, `06-delete-confirm`, `07-empty-filter`.
