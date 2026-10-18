---

description: "Task list for the Nocturne UI redesign"
---

# Tasks: Nocturne UI Redesign

**Input**: Design documents from `/specs/003-nocturne-ui-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (ui-nocturne.md,
url-state.md), quickstart.md

**Tests**: The plan commits to three pure Vitest suites (catalog view parsing, the new
repository queries, highlight extraction). They are written alongside the logic in US3 and
US4. UI is verified with the rewritten scratch Playwright suite and the screenshot comparison
in Polish.

**Visual reference for every UI task**: the handoff in `design/003/` (README sections are
cited as "H§n"). Use the tokens from `nocturne-theme.css`; never hard-code a hex value that
has a token.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup

- [X] T001 Copy the handoff reference into the repo for traceability: extract only
      `README.md`, `nocturne-theme.css` and `screenshots/*.png` from
      `design/003/Red-Valley (1).zip` into `design/003/handoff/`. Leave out the HTML
      prototypes, `support.js` and `_ds/`: they are unreviewed prototype code. Delete the zip
      from the working tree, since the reference files supersede it.
- [X] T002 Install `@phosphor-icons/react@2.1.10` (exact version) in `package.json`.
- [X] T003 [P] Start a "Feature 003: Nocturne redesign" entry in `AI_WORKFLOW.md` → Running
      log: the prompt (a Claude Design link, then the exported zip), why `DesignSync` wasn't
      used, the handoff contents, and the spec → plan → tasks steps. Commit the planning docs
      and `design/003/handoff/` as `docs: spec, plan and tasks for Nocturne redesign (003)`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme, fonts, the shell context and the rail container. Every story renders
inside these.

**⚠️ CRITICAL**: No story work can begin until this phase is complete.

- [X] T004 Rewrite `src/app/globals.css`: `@import "tailwindcss";` followed by the contents of
      `design/003/handoff/nocturne-theme.css` verbatim (both `@theme` blocks, the `rule-fade`
      and `row-rule` utilities, and the base rules). Add `@utility bg-page { background:
      radial-gradient(1200px 520px at 0% 0%, color-mix(in srgb, var(--color-accent-900) 70%,
      transparent), transparent 70%), var(--color-bg); }` (H§1). Remove the old
      `dialog::backdrop` rule, which the theme now provides.
- [X] T005 Rewrite `src/app/layout.tsx`: load `Inter` from `next/font/google` with
      `subsets: ["latin"], weight: ["400","500","600"], variable: "--font-inter"`; set
      `<html className={inter.variable}>` and `<body className="bg-page min-h-full text-text
      font-sans antialiased">`. Remove the Geist fonts, the `<header>`, the `<main>`
      max-width wrapper and every `dark:` class. The header moves to the shell (T007).
- [X] T006 Create `src/components/Toast.tsx` (`"use client"`): `ToastView({ message })`, fixed
      bottom 20 px, centred, `z-60`, `bg-surface rounded-md shadow-md px-3.5 py-2 text-[13px]`,
      Phosphor `CheckCircle` 16 px `text-accent`, `role="status" aria-live="polite"` (H§8).
      Also create a `useToast()` hook: `show(message)` replaces any current toast and
      auto-clears after 2600 ms. Clear the timer on replace and on unmount.
- [X] T007 Rewrite `src/components/DashboardShell.tsx` as the context provider and page frame.
      Export `DashboardContext` and `useDashboard()` with the value from data-model.md:
      `rail` (`{mode:"chat"} | {mode:"create"} | {mode:"edit", game}`), `openEditor(game?)`
      (sets rail; also sets `drawerOpen=true`), `closeEditor()`, `drawerOpen`/`setDrawerOpen`,
      `highlightIds`/`setHighlightIds`, `pendingDelete`/`requestDelete(game)`/`clearDelete()`,
      `toast(message)`. Render, per H§1–2: a header (`px-5 py-2.5`, 8 px accent dot with glow,
      "Indie Games" 15 px/500 linking to `/`; on the right the "Ask AI" button (secondary,
      `xl:hidden`) and "Add game" (primary outlined, Phosphor `Plus` 15 px) calling
      `openEditor()`), a full-width `rule-fade`, then a no-wrap flex row: `<section
      className="min-w-0 flex-1 px-6 pt-5 pb-8 flex flex-col gap-3.5">{children}</section>`
      and `<Rail />`. Render `<ToastView>` once.
- [X] T008 Rename `src/components/chat/ChatPanel.tsx` → `src/components/chat/Rail.tsx`
      (`git mv`), and make it read drawer state from `useDashboard()` instead of
      `useChatPanel()` (delete that hook and `ChatToggle`; "Ask AI" now lives in the shell
      header). Apply the rail geometry from H§2 at `xl`: `xl:sticky xl:top-0
      xl:flex-[0_0_clamp(290px,28vw,400px)] xl:h-[min(100vh,900px)] xl:min-h-[520px]`,
      background `linear-gradient(180deg, var(--color-surface), color-mix(in srgb,
      var(--color-surface) 40%, var(--color-bg)))`, `shadow-sm`, no radius. Below `xl`, keep
      the 002 drawer classes with `shadow-lg`. For now render only `<ChatView>`; the editor
      comes in US2. Keep the `/#chat` handler, focus management and `inert`/`role` logic.
- [X] T009 Update `src/app/page.tsx` to render `<DashboardShell><Suspense
      fallback=…><Catalog/></Suspense></DashboardShell>`, with `Catalog` unchanged for now.
      Run `npm run lint && npm run typecheck && npm test && npm run build`.

**Checkpoint**: The app runs dark with the new header and docked rail; the old table still
renders inside it.

---

## Phase 3: User Story 1 - Scan the Catalog at a Glance (Priority: P1) 🎯 MVP

**Goal**: Dense Nocturne table with Game + subline, revenue bar, icon actions, row states and
empty state.

**Independent Test**: quickstart V1: matches screenshot 01 at 1470 × 900; Hollow Depths' bar
is full; at least 11 rows plus the input at 1280 × 800; keyboard focus rings visible.

### Implementation for User Story 1

- [X] T010 [US1] In `src/lib/games/repository.ts` add `maxRevenue(): number`
      (`max(monthly_revenue_usd)` over the whole catalog, `0` when empty). Add a test in
      `tests/repository.test.ts`: seed → `142500`; empty db → `0`.
- [X] T011 [US1] Rewrite `src/components/games/GamesTable.tsx` as a client component
      (`"use client"`), props `{ games: Game[]; maxRevenue: number }`. It reads
      `highlightIds`, `rail`, `openEditor` and `requestDelete` from `useDashboard()`. Per
      H§4: a wrapper `relative overflow-x-auto overflow-y-hidden`; `<table className="w-full
      table-fixed text-[13px]">`; `<colgroup>` widths auto / 128 / 112 / 84 / 76 px; headers
      Game · Revenue / mo (`title="Monthly revenue"`, right) · Downloads (right) · Rating
      (right) · sr-only "Actions". Headers are 11 px uppercase, `tracking-[.08em]`,
      `text-text/60`, padding `8px 10px`, with a `rule-fade` bottom. They are **static
      labels in this task**; US3 makes them sort buttons.
      Each row gets the `row-rule` class, hover `bg-text/4`, cell padding `8px 10px`
      (actions 6px):
      - **Game cell**: a 6 px dot (`bg-neutral-800`; `bg-accent shadow-glow` when highlighted
        or selected), gap 8 px, then a block with the title (13 px/500, `text-accent-300` when
        highlighted) and the subline "Developer · Genre" (12 px, `text-muted`, or `text-text/60`
        on the selected row, per research §7). Both `truncate` with `title={full text}`.
      - **Revenue cell**: `formatUsd` (tabular-nums), then a 72×2 px track (`bg-neutral-800`)
        with a right-anchored fill `bg-accent` of width `revenue / maxRevenue`
        (`maxRevenue` 0 → 0%) and a glow `shadow-[0_0_6px_color-mix(in_srgb,var(--color-accent)_70%,transparent)]`.
      - **Downloads, Rating**: `formatCount`, `formatRating`, tabular-nums.
      - **Actions**: two 30×30 ghost icon buttons, gap 2 px: `PencilSimple` 15 px
        `text-accent` with `aria-label="Edit {title}"` calling `openEditor(game)`; `Trash`
        15 px `text-neutral-400` with `aria-label="Delete {title}"` calling
        `requestDelete(game)`. Hover `bg-accent/10`, active `bg-accent/18`, `rounded-md`.
      - **Row states**: highlighted → every cell `bg-accent-900/80`, plus
        `<span className="sr-only">(mentioned in last answer)</span>` in the Game cell;
        selected (`rail.mode==="edit" && rail.game.id===game.id`) → `bg-accent-800/55`
        and `aria-current="true"` on the `<tr>`.
      - **Empty catalog** (`games.length===0`), per H§4: left-aligned, padding `40px 10px`,
        gap 6 px: h5 "No games yet", muted "Add your first game to start tracking the
        catalog.", secondary "Add game" calling `openEditor()`.
- [X] T012 [US1] Create `src/components/games/CatalogSection.tsx` (`"use client"`), props
      `{ games, maxRevenue, total }`. It renders the heading block (H§3: h3 "Games catalog" 25 px/500,
      `tracking-[-0.015em]`, mb 4 px; muted 13 px sub-copy), a toolbar row containing only the
      count for now ("12 games", 12 px, muted, `ml-auto`, tabular-nums), then `<GamesTable>`.
- [X] T013 [US1] Update `Catalog` in `src/app/page.tsx` to compute `games = listGames()`,
      `maxRevenue()` and `countGames()`, and render `<CatalogSection …/>`. Keep `await
      connection()` first.
- [X] T014 [US1] Shared control styles in `src/app/globals.css`: add `@utility btn-primary`
      (1 px accent border, `text-accent`, transparent; hover `bg-accent/12`, active
      `bg-accent/22`, `rounded-md px-3 py-[7px] text-sm font-medium inline-flex items-center
      gap-1.5 whitespace-nowrap`, disabled `opacity-45`), `@utility btn-secondary` (1 px
      `divider` border, `text-text`, hover `bg-text/6`), `@utility btn-ghost`, and `@utility
      input` (H§3: `bg-surface border border-divider rounded-md min-h-8 text-[13px] px-2.5`,
      hover `border-text/45`, focus `border-accent outline-none`). Replace the equivalent inline
      classes written in T007, T011 and T012 with these utilities; later tasks use them
      directly.
- [X] T015 [US1] Run gates, then quickstart V1.1–V1.4 with a screenshot at 1470 × 900 compared
      side by side with `design/003/handoff/screenshots/01-default.png`. Fix visible
      deviations. Commit `feat: Nocturne theme, shell and dense catalog table`.

**Checkpoint**: The redesign is visible and the table is complete. Edit/delete icons set
shell state, which US2 renders.

---

## Phase 4: User Story 2 - Edit Without Leaving the Context (Priority: P2)

**Goal**: Editor in the rail, styled delete confirmation, toasts; the conversation preserved.

**Independent Test**: quickstart V2: edit from a row → "Edit {title}" in the rail, row
selected → save → back to the same conversation, toast; validation per field; delete via
dialog.

### Implementation for User Story 2

- [X] T016 [P] [US2] Create `src/components/games/GameEditor.tsx` (`"use client"`), props
      `{ game?: Game }`. Port the value/parse/fetch logic from `GameForm.tsx` unchanged: the
      same `gameInputSchema`, `toInput`, POST/PUT and 400/404 handling. Layout per H§6:
      - **Header** (`px-3 pt-3 pb-2.5`, gap 6 px): a 30×30 ghost `ArrowLeft` button
        (`aria-label="Back to assistant"`) calling `closeEditor()`, and an h5 "Add game" or
        "Edit {title}" (truncate). Then `rule-fade mx-4`.
      - **Scrolling body** (`p-4 gap-3`): the six fields in 001's order. Labels 12 px
        `text-text/70`, 5 px gap; inputs use the `input` utility on `bg-bg`, tabular-nums. An
        error sets `border-accent` and shows a 12 px `text-accent-300` line with
        `WarningCircle`. Clear a field's error on change.
      - **Footer** (`px-4 pt-3 pb-4`, gap 6 px): when editing, a ghost "Delete" (`Trash`,
        `text-neutral-300`) on the left calling `requestDelete(game)`. On the right, secondary
        "Cancel" (`closeEditor`) and primary "Add game" or "Save changes" ("Saving…" while
        pending).
      - **On success**: `closeEditor()`, `router.refresh()`, `toast("Added {title}"` /
        `"Saved {title}")`. On 404: `toast("This game no longer exists.")`, `closeEditor()`,
        `router.refresh()`.
- [X] T017 [P] [US2] Create `src/components/games/DeleteDialog.tsx` (`"use client"`), rendered
      once by the shell. It opens a native `<dialog>` with `showModal()` while `pendingDelete`
      is set, and calls `clearDelete()` on its `close` event. Per H§7: `bg-surface
      rounded-[14px] shadow-lg p-[18px] w-[min(440px,100%)]`; title 17 px/500 "Delete
      {title}?"; body 13 px `opacity-85` "It will be removed from the catalog. This cannot be
      undone."; secondary "Cancel" and primary "Delete game" ("Deleting…" while pending).
      Confirm → `DELETE /api/games/{id}`. On 204: close, `closeEditor()` if the rail shows
      that game, remove the id from `highlightIds`, `toast("Deleted {title}")`,
      `router.refresh()`. On 404: close, `toast("This game no longer exists.")`,
      `router.refresh()`.
- [X] T018 [US2] In `src/components/chat/Rail.tsx`, render
      `<ChatView className={rail.mode==="chat" ? "" : "hidden"} … />` **always**, plus
      `{rail.mode!=="chat" && <GameEditor key={rail.mode==="edit" ? rail.game.id : "new"}
      game={rail.mode==="edit" ? rail.game : undefined}/>}`. The `key` resets the form when
      switching games. Replace the Escape handler with the layered one from research §8:
      dialog open → ignore; editor → `closeEditor()`; drawer → close. Closing the drawer
      while the editor shows also calls `closeEditor()` (spec edge case). Add a `className`
      prop to `ChatView`'s root.
- [X] T019 [US2] Mount `<DeleteDialog/>` in `src/components/DashboardShell.tsx`. Delete
      `src/components/games/GameForm.tsx` and `src/components/games/DeleteGameButton.tsx`, and
      remove any remaining imports.
- [X] T020 [US2] Run gates, then quickstart V2.1–V2.4 in a browser and compare with screenshots
      04, 05 and 06. Commit `feat: edit games in the rail with styled delete and toasts`.

**Checkpoint**: All CRUD happens without a modal form; the chat survives.

---

## Phase 5: User Story 3 - Find and Order Games (Priority: P3)

**Goal**: Search, genre filter, count and sortable headers, all in the URL.

**Independent Test**: quickstart V3: "lantern" → 2 games and "2 of 12 games"; Racing → Neon
Drift; Rating sort flips; reload keeps the view; "zzz" → "No games match" → Clear filters.

### Tests and logic for User Story 3

- [X] T021 [P] [US3] Create `src/lib/games/catalog-view.ts` exactly per
      `contracts/url-state.md`. Export `SORT_KEYS = ["title","revenue","downloads","rating"]`,
      type `CatalogView = { q: string; genre: string; sort: SortKey; dir: "asc"|"desc" }`,
      `defaultDir(sort)` (title → asc, else desc), `parseCatalogView(params: Record<string,
      string|string[]|undefined>)` (first value of repeated params; `q` trimmed and cut to 100
      chars; unknown `sort` → `revenue`; unknown `dir` → `defaultDir(sort)`),
      `serializeCatalogView(view)` (omit defaults; key order q, genre, sort, dir; returns
      `""` or `"?…"`), and `toggleSort(view, key)`.
- [X] T022 [P] [US3] Create `tests/catalog-view.test.ts` covering every row of the Examples
      table in `contracts/url-state.md`, the round trip parse(serialize(v)) = v, a 101-char
      `q` truncated, an array param, and `toggleSort` (same column flips; new numeric column →
      desc; title → asc).
- [X] T023 [US3] In `src/lib/games/repository.ts` add `queryCatalog(view: CatalogView):
      Game[]` and `listGenres(): string[]`, per data-model.md. `queryCatalog` uses the escaped
      `LIKE %q%` on title OR developer (reuse `containsIgnoringCase`), `equalsIgnoringCase` on
      genre when non-empty, and ORDER BY the mapped column in `dir` then `title` asc.
      `listGenres` returns distinct genres ordered by `lower(genre)`. Add tests to
      `tests/repository.test.ts`: `q:"lantern"` → 2; `genre:"racing"` → `["Neon Drift"]`;
      `sort:"rating", dir:"desc"` → first is Cinder & Salt; `sort:"title", dir:"asc"` → first is
      Cinder & Salt; `q:"%"` → 0; `listGenres()` has 12 entries starting with "Adventure".

### UI for User Story 3

- [X] T024 [US3] Update `Catalog` in `src/app/page.tsx` to take `searchParams` (the
      `PageProps<"/">` prop), `await` it after `connection()`, `parseCatalogView`, and pass
      `games = queryCatalog(view)`, `total = countGames()`, `genres = listGenres()`,
      `maxRevenue()` and `view` to `CatalogSection`.
- [X] T025 [US3] Create `src/components/games/CatalogToolbar.tsx` (`"use client"`), props
      `{ view, genres, shown, total }`. Per H§3:
      - **Search**: the `input` utility with `MagnifyingGlass` 15 px at left 10 px
        (`opacity-55`), `pl-8`, `flex-[1_1_220px] max-w-[300px]`, placeholder "Search title or
        developer", `aria-label="Search games"`. It keeps a local draft and, 250 ms after the
        last keystroke, calls `router.replace(serializeCatalogView({...view, q}) || "/",
        { scroll: false })`.
      - **Genre**: a `<select>` with the `input` style, `min-w-[140px]`, `aria-label="Genre"`,
        "All genres" then `genres`.
      - **Count**: `ml-auto` 12 px muted tabular-nums, "N games" when `shown===total`, else
        "N of M games".
      The highlight tag slot is added in US4.
- [X] T026 [US3] Make the headers in `src/components/games/GamesTable.tsx` sortable. Each
      sortable `<th aria-sort=…>` contains a `<button>` that calls
      `router.replace(serializeCatalogView(toggleSort(view, key)) || "/", { scroll: false })`
      and shows `CaretUp` / `CaretDown` 12 px on the active column only. Add a `view` prop.
      Add the filtered empty state (H§4): "No games match" / "Try a different search or
      genre." / secondary "Clear filters", which replaces the URL keeping only `sort` and
      `dir`. Show it when `games.length===0 && total>0`; otherwise keep the catalog-empty state.
- [X] T027 [US3] Wire `CatalogToolbar` into `src/components/games/CatalogSection.tsx`,
      replacing the count-only row, and pass `view` to `GamesTable`.
- [X] T028 [US3] Run gates (the new tests must pass), then quickstart V3.1–V3.5 including
      "conversation intact after typing a search". Compare with screenshot 07. Commit
      `feat: search, genre filter and sortable columns kept in the URL`.

**Checkpoint**: The catalog is searchable and sortable; the URL is shareable.

---

## Phase 6: User Story 4 - See Which Games an Answer Is About (Priority: P4)

**Goal**: Rows highlighted from the last answer, a tag, the chat restyle and New chat.

**Independent Test**: quickstart V4: the three suggestions highlight 1 / 7 / 2 rows exactly;
tag ✕ and New chat clear; streaming cursor; "Stopped — incomplete answer".

### Tests and logic for User Story 4

- [X] T029 [P] [US4] Create `src/lib/ai/references.ts`: `referencedGameIds(message:
      ChatMessage): number[]`. Walk `message.parts`; for each tool part with
      `state==="output-available"`, apply: `rank_games` → `output.games[0]?.id`;
      `count_games` → `output.games.map(g=>g.id)` (skip outputs with an `error` key);
      `get_games` → `output.found.map(g=>g.id)`; `search_games` →
      `output.games.map(g=>g.id)`. Return unique ids in first-seen order.
- [X] T030 [P] [US4] Create `tests/references.test.ts` with hand-built `ChatMessage` objects
      (cast as needed): a rank output with 3 games → only the first id; count → all;
      get_games found + not_found → found only; a count error output → `[]`; a pending
      (`input-available`) part → ignored; duplicates across two parts → deduplicated.

### UI for User Story 4

- [X] T031 [US4] Restyle `src/components/chat/MessageParts.tsx` (H§5). The `ToolChip` is
      `inline-flex border border-accent-700 text-accent-300 rounded-sm px-[9px] py-[3px]
      text-[11px] gap-[7px]`, with `Check` 12 px when done, or a 10 px spinner (1.5 px
      `border-accent-700`, `border-t-accent-300`, `animate-spin [animation-duration:.8s]`)
      while pending. The label is weight 500 ("…" when pending), and the details mono at
      `opacity-75`, truncated. Error chips keep their message in `text-accent-300`. Text parts
      are 13 px/1.6 `text-neutral-200 whitespace-pre-wrap [text-wrap:pretty]`. Accept a
      `streaming` prop: when true, append a 6×14 px `bg-accent rounded-[1px]
      shadow-[0_0_8px_var(--color-accent)] animate-blink` cursor after the last text part.
- [X] T032 [US4] Restyle `src/components/chat/ChatView.tsx` (H§5), keeping all behaviour:
      - **Header**: `Sparkle` 16 px accent and h5 "Assistant" 16 px/500. On the right, a ghost
        "New chat" (`ArrowCounterClockwise` 12 px, 12 px text) shown only when
        `messages.length>0`; it calls `stop()` and then `setMessages([])`. Below, the
        description "Answers come from live lookups against the catalog. Games it mentions
        light up in the table." (12 px, muted), then `rule-fade mx-4`. **Move this header out
        of `Rail.tsx`** into ChatView, so the editor has its own header.
      - **Empty state**: a bottom-pinned h6 "Try asking" (13 px uppercase, `tracking-[.08em]`,
        muted) and the three suggestions as full-width secondary buttons (text left,
        `ArrowUpRight` 13 px at 60% opacity on the right). Hidden while busy or once messages
        exist.
      - **User message**: right-aligned, `max-w-[88%] bg-neutral-900 shadow-sm rounded-md
        px-[11px] py-[7px] text-[13px]/[1.5]`.
      - **Assistant message**: no bubble; a column with gap 7 px using `MessageParts`, with
        `streaming` set for the last message while `status==="streaming"`. "Stopped —
        incomplete answer" (11 px italic muted) on the last assistant message when
        `status==="error"` or it was stopped.
      - **Error banner**: `bg-accent-900 border border-accent-700 rounded-md text-[13px]
        text-accent-200`, with a secondary "Retry".
      - **Composer** (`px-3 pt-2.5 pb-3.5`, gap 6 px): the `input` utility on `bg-bg`, keeping
        `maxLength` 2000, the 1800+ counter and `inputRef`. Send is a 36×36 primary icon
        button (`ArrowUp` 16 px, `aria-label="Send"`, 45% when disabled); while streaming, a
        secondary 36×36 `Stop` (`aria-label="Stop"`).
      - **References**: add a prop `onReferences(ids: number[])`. In an effect keyed on the
        last assistant message's parts, call `onReferences(referencedGameIds(last))`. When a
        user message is sent, call `onReferences([])` first.
- [X] T033 [US4] Wire highlights. In `src/components/chat/Rail.tsx`, pass
      `onReferences={setHighlightIds}` to `ChatView`. In
      `src/components/games/CatalogToolbar.tsx`, render the tag when `highlightIds.length>0`
      (H§3): `border border-accent text-accent text-[11px] rounded-[6px] pl-[9px] pr-1
      py-[3px] gap-1.5`, `Sparkle` 12 px, "{n} from last answer", and a ghost `X` button
      (`aria-label="Clear highlight"`) → `setHighlightIds([])`. `GamesTable` already renders
      row highlights (T011).
- [X] T034 [US4] Run gates (the references tests must pass), then quickstart V4.1–V4.3 with
      the API key. Compare with screenshots 02 and 03. Commit
      `feat: highlight games from the last answer; restyled chat with New chat`.

**Checkpoint**: All four stories work.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T035 Rewrite the scratch Playwright suite
      (`$SCRATCHPAD/pw/panel-check.mjs` → `$SCRATCHPAD/pw/nocturne-check.mjs`, outside the
      repo) for the new UI. Keep every 002 check that still applies: conversation kept after
      editing (now through the rail editor), drawer below 1280 px, Escape layering
      (dialog → editor → drawer), `/chat` redirect, no horizontal page scroll at
      768/1024/1280/1440. Add V1.3 (≥ 11 rows at 1280×800), V3 (search, genre, sort,
      reload, invalid URL), V4 (1/7/2 highlights), the selected-row subline contrast
      ≥ 4.5 measured from computed colours, and screenshots of states S1–S7 at 1470 × 900.
      Run it against `next start` and fix failures.
- [X] T036 Compare the S1–S7 screenshots side by side with `design/003/handoff/screenshots/`
      01–07 (SC-001), and fix visible deviations.
- [X] T037 Rerun the 10 scripted questions with `$SCRATCHPAD/chat-eval.mjs` (SC-008: 10/10).
- [X] T038 [P] Update `README.md`: the "What's inside" section for Nocturne (dark theme,
      rail with Assistant or editor, search, filter, sort, highlights); add the URL params to
      the API/usage section; add to trade-offs "dark-only by design" and "highlights from a
      count cover at most 20 games"; update the layout tree with the new files.
- [X] T039 [P] Update `AI_WORKFLOW.md`: Running log entries for each phase (including any
      **[wrong]** moments), and a prompt entry for the Claude Design handoff.
- [X] T040 Final gates `npm run lint && npm run typecheck && npm test && npm run build`;
      commit `docs: README and workflow notes for the Nocturne redesign`. Do **not** push
      (the PR is already open; pushing updates it, so confirm with the user first).

---

## Dependencies & Execution Order

- **Setup** (T001 → T002 → T003) → **Foundational** (T004 → T005 → T006 → T007 → T008 → T009).
- **US1** (T010 → T011 → T012 → T013 → T014 → T015) needs Foundational. T014 extracts the button and input styles written inline in T007, T011 and T012 into utilities.
- **US2** (T016 ∥ T017 → T018 → T019 → T020) needs US1's table (T011) for the row actions and
  selected state.
- **US3** (T021 ∥ T022, then T023 → T024 → T025 → T026 → T027 → T028) needs US1 (T011–T013).
  Independent of US2.
- **US4** (T029 ∥ T030, then T031 → T032 → T033 → T034) needs US1 (row highlight in T011) and
  T025 (the toolbar tag slot). Independent of US2.
- **Polish** after all stories.

### Parallel Opportunities

- T016 ∥ T017 (editor vs dialog, different files).
- T021 ∥ T022, and T029 ∥ T030 (logic vs its test file).
- T038 ∥ T039 (docs).
- After US1, US2, US3 and US4 touch mostly disjoint files. They meet in `GamesTable.tsx` (US3
  T026) and `CatalogToolbar.tsx` (US3 T025, US4 T033), so run US3 before US4.

## Parallel Example: User Story 2

```bash
Task: "Create src/components/games/GameEditor.tsx"     # T016
Task: "Create src/components/games/DeleteDialog.tsx"   # T017
# then: T018 (Rail mode switch) → T019 (mount dialog, delete old files) → T020
```

## Implementation Strategy

1. **MVP = Phases 1–3**: the new look and dense table, which is most of the visible
   redesign. Edit/delete icons set state that US2 renders, so ship US2 with it.
2. Then **US2** (interaction change), **US3** (new capability) and **US4** (the integration
   that makes the design distinctive), committing after each.
3. **Polish** verifies everything 002 guaranteed still holds, and that the result matches
   the handoff.

## Notes

- Never unmount `ChatView`: hide it with `hidden` while the editor shows.
- All request-time reads (`connection()`, `searchParams`) stay inside the `Catalog`
  `<Suspense>` boundary.
- No `useSearchParams` on the client: the view arrives as props.
- Tokens only: no raw hex for colours that have a token.
