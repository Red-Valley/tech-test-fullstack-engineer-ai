# Implementation Plan: Dashboard Chat Panel

**Branch**: `submission/jorge-sandoval` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-dashboard-chat-panel/spec.md`

## Summary

Put the existing `ChatView` on the home page inside a new `ChatPanel` client component.
`ChatPanel` renders a **single, always-mounted** chat whose placement changes with CSS
only: a sticky right-hand column from `xl` (1280 px) up, and a fixed overlay drawer below
it. The conversation therefore survives table edits (`router.refresh()` keeps client
state), hiding and showing, and breakpoint changes, with no state lifting or persistence.
The Chat nav tab and `/chat` page go away, and `/chat` redirects to `/#chat`. No server,
API, data or assistant changes.

## Technical Context

**Language/Version**: TypeScript (strict), Node ≥ 22. Unchanged from 001.

**Primary Dependencies**: No new dependencies. Next.js 16.4 App Router, React 19.3,
Tailwind 4, `@ai-sdk/react` 4 (`useChat` already in `ChatView`).

**Storage**: N/A. No data changes; UI state lives in React component state only.

**Testing**: Manual, via [quickstart.md](quickstart.md) at four viewport widths, plus a rerun
of 001's scripted chat questions. No new automated tests: the change is layout and focus
behaviour, which the existing Vitest setup (node environment, no DOM) doesn't cover.
The 19 existing tests must still pass.

**Target Platform**: Desktop browsers first. Drawer layout below 1280 px.

**Project Type**: Web application (same single Next.js project as 001).

**Performance Goals**: No regression. Dashboard with 100 games still renders < 2 s
(001 SC-007); the panel adds one client component and no requests until a message is sent.

**Constraints**: The conversation must never reset on edit, toggle or resize (spec FR-007,
FR-008). No horizontal page scroll at 768/1024/1280/1440 px (SC-006). At 1280 × 800, six
columns, ≥ 8 rows and the chat input visible together (SC-002).

**Scale/Scope**: 1 new component, 4 edited files, 1 deleted page, 1 config redirect.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Time-boxed scope | Change limited to layout and navigation; no new assistant features, persistence, or settings | PASS |
| II. Tool-calling AI | Assistant, tools, prompt and stream protocol untouched | PASS |
| III. Single source of truth | No new data paths; the table and chat still read through the same repository | PASS |
| IV. Simplicity | No new dependencies; one always-mounted component positioned by CSS instead of a state store, context or portal | PASS |
| V. Documented AI workflow | Spec 002 and this plan are new evidence; tasks will append to `AI_WORKFLOW.md` | PASS |
| Tech constraints | Next 16 / TS / Tailwind | PASS |

**Post-Phase 1 re-check**: still PASS. No new layers or dependencies. Complexity Tracking left
empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-dashboard-chat-panel/
├── plan.md               # This file
├── spec.md
├── research.md           # Phase 0 decisions
├── data-model.md         # UI state only (no persisted data)
├── quickstart.md         # Viewport-by-viewport validation
├── contracts/
│   └── ui-layout.md      # Layout, breakpoints, interactions, a11y, redirect
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (changes relative to 001)

```text
next.config.ts                        # + redirects(): /chat → /#chat (temporary)
src/app/
├── layout.tsx                        # header: app name only (NavLinks removed); main widened
├── page.tsx                          # two-column grid: catalog + <ChatPanel />
└── chat/page.tsx                     # DELETED
src/components/
├── NavLinks.tsx                      # DELETED
└── chat/
    ├── ChatPanel.tsx                 # NEW: panel/drawer shell, toggle, focus, Escape, #chat
    └── ChatView.tsx                  # fills its container (h-full); header row removed from page
```

**Structure Decision**: Same single Next.js project. `ChatPanel` wraps the unchanged
`ChatView`. Both sit directly in `page.tsx`, outside the `<Suspense>` boundary around the
catalog, so refreshing the catalog after an edit re-renders only the server part and leaves
the chat's client state intact.

## Complexity Tracking

> No constitution violations. Section intentionally empty.
