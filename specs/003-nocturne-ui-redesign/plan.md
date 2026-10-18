# Implementation Plan: Nocturne UI Redesign

**Branch**: `submission/jorge-sandoval` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-nocturne-ui-redesign/spec.md`

**Design source**: `design/003/` handoff (README, `nocturne-theme.css`, screenshots 01–07).

## Summary

Rebuild the dashboard UI on the Nocturne tokens without touching data, API or assistant.
The server page reads the catalog view (`q`, `genre`, `sort`, `dir`) from `searchParams`
inside `<Suspense>`, filters and sorts through a new repository query, and hands rows to a
client table. A client `DashboardShell` owns the shared UI state (rail mode, highlight,
pending delete, toasts) and exposes it through one React context. Server-rendered table rows
can't receive callbacks as props, so they reach that state through the context. The rail
renders the editor *over* an always-mounted `ChatView` (hidden, not unmounted), which keeps
002's guarantee that the conversation survives. Highlights are computed client-side from the
tool outputs already in the chat messages.

## Technical Context

**Language/Version**: TypeScript (strict), Node ≥ 22. Unchanged.

**Primary Dependencies**: Unchanged, plus **`@phosphor-icons/react` 2.1.10** (React ≥ 16.8
peer; client entry plus an `/ssr` entry for server components). That is the only new
dependency, and the handoff names it. **Inter** via `next/font/google` replaces Geist.

**Storage**: SQLite unchanged. A new **read-only** repository function serves filtered and
sorted queries; no schema change.

**Testing**: Vitest. Add pure tests for catalog-view parsing (`tests/catalog-view.test.ts`),
the repository's new `queryCatalog` (in `tests/repository.test.ts`), and highlight extraction
from chat messages (`tests/references.test.ts`). UI is verified with a rewritten scratch
Playwright suite and side-by-side screenshot comparison with the handoff (quickstart).

**Target Platform**: Desktop browsers first; drawer below 1280 px (unchanged).

**Project Type**: Web application (same single Next.js project).

**Performance Goals**: Filtering and sorting re-render in under 300 ms for 100 games (the
server query plus a small RSC payload). The page stays under 2 s with 100 games (001
SC-007). Search is debounced at 250 ms.

**Constraints**: FR-029, so no API, data or prompt changes. 002's guarantees still hold
(conversation never reset, drawer below 1280 px, no horizontal page scroll). Contrast meets
SC-006 (see research §7). Cache Components remain on: all request-time reads stay inside
`<Suspense>`.

**Scale/Scope**: About 9 new or rewritten components, 2 new lib modules, 1 repository
function, 3 test files, theme and layout rewrite. 2 components deleted (`GameForm`,
`DeleteGameButton`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Time-boxed scope | Implements the handoff's listed changes only; no theme switch, no pagination, no persistence of rail or highlight | PASS (scope set by the user's design; new search/sort noted in the spec) |
| II. Tool-calling AI | Tools, prompt and stream unchanged; highlights read tool outputs already sent to the client | PASS |
| III. Single source of truth | Filtering and sorting go through `repository.ts`; editor validation reuses `gameInputSchema`; mutations still go through the REST routes | PASS |
| IV. Simplicity | One new dependency (icons, named by the design). One context, justified because server-rendered rows need shell callbacks. No state library, no UI kit | PASS, see Complexity Tracking |
| V. Documented AI workflow | Spec, plan and tasks committed before code; log entries per phase | PASS |

**Post-Phase 1 re-check**: PASS. The context and icon dependency are recorded below.

## Project Structure

### Documentation (this feature)

```text
specs/003-nocturne-ui-redesign/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── ui-nocturne.md        # screens, states, interactions, a11y (maps to handoff sections)
│   └── url-state.md          # q / genre / sort / dir grammar and defaults
├── checklists/requirements.md
└── tasks.md                  # /speckit-tasks
design/003/                   # handoff reference: README, theme CSS, screenshots
```

### Source Code (changes relative to 002)

```text
package.json                         # + @phosphor-icons/react@2.1.10
src/app/
├── globals.css                      # REWRITE: @import tailwindcss + Nocturne tokens/utilities
├── layout.tsx                       # Inter; dark-only body; no header/main wrapper (moves to shell)
└── page.tsx                         # Suspense → Catalog(searchParams) → <CatalogSection …/>
src/lib/
├── games/repository.ts              # + queryCatalog(view), listGenres(), maxRevenue()
├── games/catalog-view.ts            # NEW: parse/serialize q, genre, sort, dir (pure)
└── ai/references.ts                 # NEW: game ids referenced by an assistant message (pure)
src/components/
├── DashboardShell.tsx               # REWRITE: header, layout, DashboardContext provider
├── Toast.tsx                        # NEW: single toast, role=status, 2.6 s
├── games/
│   ├── CatalogSection.tsx           # NEW (client): heading, toolbar, table, empty states
│   ├── CatalogToolbar.tsx           # NEW (client): search, genre, highlight tag, count
│   ├── GamesTable.tsx               # REWRITE (client): dense rows, sort headers, row states
│   ├── GameEditor.tsx               # NEW (replaces GameForm): rail editor
│   ├── DeleteDialog.tsx             # NEW (replaces DeleteGameButton): one shared <dialog>
│   ├── GameForm.tsx                 # DELETE
│   └── DeleteGameButton.tsx         # DELETE
└── chat/
    ├── Rail.tsx                     # RENAME of ChatPanel: rail/drawer, mode switch, Escape layering
    ├── ChatView.tsx                 # RESTYLE + New chat + onReferences
    └── MessageParts.tsx             # RESTYLE chips, streaming cursor
tests/
├── catalog-view.test.ts             # NEW
├── references.test.ts               # NEW
└── repository.test.ts               # + queryCatalog / listGenres / maxRevenue
```

**Structure Decision**: Same single project. The header moves from `layout.tsx` into
`DashboardShell`, because "Add game" opens the rail editor, which is shell state.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `DashboardContext` (one React context) | Table rows render inside the server `Catalog` (under `<Suspense>`). Their edit/delete/highlight need shell state, and functions can't cross the server boundary as props | Prop drilling fails at the server boundary. Moving the whole catalog client-side would lose server filtering and `connection()` freshness |
| `@phosphor-icons/react` | 16 icons specified by the high-fidelity design | Hand-drawn inline SVGs would mean 16 hand-maintained paths and risk drifting from the design |
