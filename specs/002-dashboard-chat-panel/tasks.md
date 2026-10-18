---

description: "Task list for the Dashboard Chat Panel feature"
---

# Tasks: Dashboard Chat Panel

**Input**: Design documents from `/specs/002-dashboard-chat-panel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-layout.md, quickstart.md

**Tests**: No new automated tests. The plan explains why: the change is layout and focus
behaviour, and Vitest runs without a DOM. Each story is verified manually with the matching
quickstart scenario. The 19 existing tests must keep passing.

**Organization**: Grouped by the three user stories in spec.md. One rule underpins all of
them (research §1): **there is exactly one `ChatView` instance, it is never unmounted, and
panel vs drawer vs hidden is CSS only.**

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3 from spec.md

---

## Phase 1: Setup

**Purpose**: Point the workflow at this feature.

- [X] T001 Confirm `.specify/feature.json` points at `specs/002-dashboard-chat-panel`, then
      record the start of feature 002 in `AI_WORKFLOW.md` → Running log with a new
      "### Feature 002: Dashboard chat panel" heading. Cover why (UX: check answers against
      the table without switching pages) and the Spec Kit steps run so far (specify → plan →
      tasks), linking `specs/002-dashboard-chat-panel/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make `ChatView` embeddable and focusable, and create the panel shell. All three
stories build on these.

**⚠️ CRITICAL**: No story work can begin until this phase is complete.

- [X] T002 Make `src/components/chat/ChatView.tsx` fill its container instead of styling
      itself as a card. On the root element (line ~55) replace
      `flex min-h-0 flex-1 flex-col rounded-lg border border-zinc-200 bg-white
      dark:border-zinc-800 dark:bg-zinc-900` with `flex h-full min-h-0 flex-col`, so the card
      chrome moves to `ChatPanel`. On the message list (line ~56) replace `min-h-[24rem]` with
      `min-h-0` and reduce `p-6` to `p-4`, so only the list scrolls inside a fixed-height
      parent (spec FR-003). Add an optional prop `inputRef?: React.Ref<HTMLInputElement>` and
      pass it to the `<input>`. Leave the message, suggestion, error and Retry behaviour
      unchanged (FR-012).
- [X] T003 Create `src/components/chat/ChatPanel.tsx` (`"use client"`) exporting three things:
      (1) `useChatPanel()` hook returning `{ wideHidden, setWideHidden, drawerOpen,
      setDrawerOpen, inputRef, askButtonRef }`, with `useState` defaults `wideHidden=false`
      and `drawerOpen=false` per data-model.md (no context provider);
      (2) `ChatPanel({ state })`, which renders a backdrop `<div>` (`fixed inset-0 z-30
      bg-black/40 lg:hidden`, shown only when `state.drawerOpen`, click closes it) and an
      always-rendered `<aside id="assistant-panel" aria-label="Assistant">` with card chrome
      (`flex flex-col overflow-hidden border-zinc-200 bg-white dark:border-zinc-800
      dark:bg-zinc-900`), a header (title "Assistant", helper text "Answers come from live
      lookups against the catalog.", and the controls added in T008/T014), then
      `<ChatView inputRef={state.inputRef} />` filling the rest;
      (3) `ChatToggle({ state })`, which renders the page-header buttons added in T008/T014.

**Checkpoint**: `ChatView` renders full-height inside any sized container; `ChatPanel`
exists but isn't on the page yet.

---

## Phase 3: User Story 1 - Ask and Verify on One Screen (Priority: P1) 🎯 MVP

**Goal**: At ≥ 1280 px the table and assistant sit side by side on `/`. The Chat tab and
page are gone, and the panel can be hidden and shown.

**Independent Test**: quickstart.md V1 at 1280 × 800: six columns, ≥ 8 rows and the chat
input visible together; answers stream in the panel; only the message list scrolls; the
panel stays in view while the page scrolls; Hide → Show keeps the conversation.

### Implementation for User Story 1

- [X] T004 [P] [US1] Simplify `src/app/layout.tsx`: remove the `NavLinks` import and element.
      Make the app name a `<Link href="/">` styled `font-semibold tracking-tight`. Change both
      `max-w-6xl` containers (header and `<main>`) to `max-w-[1440px]` (research §6). Keep
      `px-6 py-8` on `<main>`. Delete `src/components/NavLinks.tsx` (FR-010).
- [X] T005 [P] [US1] Delete `src/app/chat/page.tsx` (its route is replaced by the redirect in
      T016).
- [X] T006 [US1] Wide-screen classes on the `<aside>` in `src/components/chat/ChatPanel.tsx`:
      `lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100dvh-8rem)] lg:w-[400px] lg:translate-x-0
      lg:rounded-lg lg:border` (400 px is within FR-002's 360–440 px range; the height keeps
      the input visible under the 53 px header and page padding, FR-003). When `wideHidden`
      is true, add `lg:hidden` (CSS only, so the component stays mounted; research §1).
- [X] T007 [US1] Create `src/components/DashboardShell.tsx` (`"use client"`, props
      `{ children }`). It calls `useChatPanel()` once and renders the header row (h1 "Games
      catalog", the existing subtitle, then `<GameForm mode="create" />` and
      `<ChatToggle state={state} />`), followed by a grid `grid items-start gap-6` with
      `lg:grid-cols-[minmax(0,1fr)_400px]`, or `lg:grid-cols-1` when `state.wideHidden`. The
      grid holds `<div className="min-w-0">{children}</div>` and `<ChatPanel state={state} />`.
      Rewrite `src/app/page.tsx` to render
      `<DashboardShell><Suspense fallback={…}><Catalog /></Suspense></DashboardShell>` and drop
      the header markup that moved into the shell. Keep `Catalog` (with `await connection()`)
      unchanged. `ChatPanel` sits **outside** the `<Suspense>`, so `router.refresh()` after an
      edit never remounts it (research §1, FR-007).
- [X] T008 [US1] In `src/components/chat/ChatPanel.tsx`, add the wide-screen toggle. In the
      panel header, a "Hide" button (`hidden lg:inline-flex`, `aria-controls="assistant-panel"`,
      `aria-expanded="true"`) sets `wideHidden=true`. `ChatToggle` renders a "Show assistant"
      button (`hidden lg:inline-flex`, shown only when `wideHidden`, `aria-expanded="false"`)
      that sets `wideHidden=false` (FR-004).
- [X] T009 [US1] Run `npm run lint && npm run typecheck && npm test && npm run build`. The
      route table must no longer list `/chat`. Run quickstart V1 at 1280 × 800 in a browser,
      plus V1.4 (scroll with the panel staying in view). Measure the table width; if any of
      the seven columns wraps badly, reduce cell padding in
      `src/components/games/GamesTable.tsx` from `px-4` to `px-3`.
- [X] T010 [US1] Append a "Panel layout" entry to `AI_WORKFLOW.md` → Running log; commit
      `feat: show the assistant beside the games table`.

**Checkpoint**: Wide-screen side-by-side layout works on its own; this is the MVP.

> **Post-implementation change**: the Hide/Show toggle from T006/T008 was removed after
> review because hiding shifted the layout. FR-004 now says the panel is always shown on
> wide screens.

---

## Phase 4: User Story 2 - Edit and Ask Without Losing the Conversation (Priority: P2)

**Goal**: Table mutations never reset, reorder or interrupt the chat, and the next answer
reflects the edit.

**Independent Test**: quickstart.md V2: ask → edit Hollow Depths' revenue to 50000 → both
earlier messages still shown → re-ask gives Stardust Farm, $98,000. Opening "Add game" while
a reply streams doesn't interrupt it, and Escape closes only the form.

### Implementation for User Story 2

- [X] T011 [US2] Verify the tree positions that keep state stable. `ChatPanel` must be
      rendered by `DashboardShell` as a sibling of `{children}`, never inside `Catalog`, and
      with no `key` that changes. Grep `src/components/games/*.tsx` to confirm mutations
      only call `router.refresh()`, never `router.push`/`replace` or `window.location`. Fix
      anything that would remount `ChatPanel` (FR-007).
- [X] T012 [US2] Run quickstart V2 steps 1–5 in a browser with the API key set. If the
      conversation resets after an edit, inspect React DevTools to see whether `ChatPanel`
      remounts, and move it further up the tree in `src/components/DashboardShell.tsx`
      until it doesn't. Record the 10-trial result for SC-003 in `AI_WORKFLOW.md`.

**Checkpoint**: Edits and chat coexist on one page.

---

## Phase 5: User Story 3 - Use the Chat on a Narrow Screen (Priority: P3)

**Goal**: Below 1280 px the table is full width and an "Ask AI" button opens the assistant
as a drawer, which closes with ×, Escape or a backdrop click, with focus handled and the
conversation preserved.

**Independent Test**: quickstart.md V3 at 768 px, and V4.1 (resize across 1280 px with the
same conversation).

### Implementation for User Story 3

- [X] T013 [US3] Narrow-screen classes on the `<aside>` in
      `src/components/chat/ChatPanel.tsx`: `fixed inset-y-0 right-0 z-40 w-full max-w-md
      transition-transform` with `translate-x-0` when `drawerOpen`, otherwise
      `translate-x-full`. Combine with T006's `lg:` overrides so the wide layout ignores
      `drawerOpen`. While `drawerOpen` and below `xl`, set `role="dialog"` and
      `aria-modal="true"`. While closed below `xl`, set `inert` so hidden controls can't be
      tabbed into. Compute "below lg" with `window.matchMedia('(min-width: 1280px)')` in an
      effect that only toggles these **attributes**; never use it to mount or unmount
      anything (research §1–2).
- [X] T014 [US3] Narrow controls. `ChatToggle` renders an "Ask AI" button (`lg:hidden`,
      `aria-controls="assistant-panel"`, `aria-expanded={drawerOpen}`, holding a ref for focus
      return) that sets `drawerOpen=true`. The panel header gets a close button (`lg:hidden`,
      `aria-label="Close assistant"`, "×") that sets `drawerOpen=false` (FR-005).
- [X] T015 [US3] Focus and keyboard in `src/components/chat/ChatPanel.tsx`. When `drawerOpen`
      becomes true, focus `inputRef`. When it becomes false through a user action, focus the
      "Ask AI" button. Add a `document` `keydown` listener: on `Escape`, if `drawerOpen` and
      `!document.querySelector('dialog[open]')`, close the drawer, so the add/edit form's own
      Escape wins (contract → Interactions; FR-006).
- [X] T016 [US3] Add `async redirects()` to `next.config.ts` returning
      `[{ source: "/chat", destination: "/#chat", permanent: false }]`. In `ChatPanel`, on
      mount: if `window.location.hash === "#chat"`, set `drawerOpen=true` (only has a visible
      effect below `xl`), focus `inputRef`, and call
      `history.replaceState(null, "", window.location.pathname)` (research §5, FR-011).
- [X] T017 [US3] Run quickstart V3 (768 px) and V4.1–V4.4 (resize, widths, `/chat` redirect,
      `curl -sI localhost:3000/chat` → `307` `location: /#chat`). Fix any focus leak or
      horizontal page scroll. Append a "Drawer" entry to `AI_WORKFLOW.md` and commit
      `feat: chat drawer on narrow screens and /chat redirect`.

**Checkpoint**: All three stories work; one chat instance serves every width.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 [P] Update `README.md`: the "What's inside" section describes one page with the
      table and an Assistant panel (a drawer on narrow screens) instead of separate `/` and
      `/chat` pages. Add `/chat → /#chat` (307) as a note under the API table. Update the
      layout tree (`src/app/` no longer has a chat page; `src/components/` has
      `DashboardShell` and `ChatPanel`).
- [X] T019 [P] Update `specs/001-indie-games-dashboard/spec.md` FR-022 with a one-line note:
      "Superseded by 002-dashboard-chat-panel (chat moved onto the dashboard)."
- [X] T020 Run quickstart V5 using the scratchpad evaluation script against `next start` (the
      chat API is unchanged): expect 10/10 correct. Then the full gates: `npm run lint &&
      npm run typecheck && npm test && npm run build`.
- [X] T021 Update the AI_WORKFLOW summary sections if 002 changed the story. Add a prompt
      entry for "does it make sense to add the chat at home instead of a separate section? if
      so, create a new spec" and its outcome. Commit
      `docs: README and workflow notes for the dashboard chat panel`.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002 → T003)** → stories.
- **US1** (T004 ∥ T005, then T006 → T007 → T008 → T009 → T010) needs T002–T003.
- **US2** (T011 → T012) needs US1's `DashboardShell` (T007). It is a verification story: it
  hardens behaviour US1 introduces rather than adding UI.
- **US3** (T013 → T014 → T015 → T016 → T017) needs T003 and T007. It can follow US1 directly;
  US2 is not a prerequisite.
- **Polish** after all stories.

### Parallel Opportunities

- T004 ∥ T005 (layout vs page deletion, different files).
- T018 ∥ T019 (different docs).
- Everything else touches `ChatPanel.tsx` or `DashboardShell.tsx` and stays sequential.

## Parallel Example: User Story 1

```bash
Task: "Simplify src/app/layout.tsx and delete NavLinks.tsx"   # T004
Task: "Delete src/app/chat/page.tsx"                          # T005
# then sequentially: T006 (aside classes) → T007 (DashboardShell + page) → T008 (toggle)
```

## Implementation Strategy

1. **MVP = Phases 1–3**: side by side on wide screens with hide/show. That alone delivers the
   UX goal for the primary desktop audience.
2. **US2** is mostly verification. Thanks to the single-instance design it should pass
   without code changes; budget time to prove it, not to build it.
3. **US3** adds the drawer, focus handling and the redirect. Until it lands, narrow screens
   would stack the panel under the table (the default grid with `lg:` classes absent), which
   is usable but not the spec. Don't ship 002 without US3.

## Notes

- Never mount or unmount chat UI based on viewport width. JS media queries may only toggle
  ARIA/`inert` attributes.
- `ChatPanel` stays outside the catalog's `<Suspense>` boundary at all times.
- Commit at each checkpoint, and keep appending to `AI_WORKFLOW.md`.
