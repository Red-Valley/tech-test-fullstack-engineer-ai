# Implementation Plan: Indie Games Dashboard

**Branch**: `submission/jorge-sandoval` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-indie-games-dashboard/spec.md`

## Summary

Build a single Next.js 16 (App Router, TypeScript, Tailwind 4) application that exposes an
indie-games catalog three ways: a dashboard table with add/edit/delete, a JSON REST API, and a
streaming chat assistant. The catalog lives in one SQLite file accessed through a single
Drizzle repository module; the REST routes, the dashboard, and the assistant's tools all call
that module. The assistant is a Vercel AI SDK `ToolLoopAgent` backed by Anthropic
`claude-opus-5-5` (env-overridable) with four narrow lookup tools; it never receives the
catalog in its prompt, and replies stream to the UI over the AI SDK UI-message protocol with
tool calls rendered as visible "lookup" chips.

## Technical Context

**Language/Version**: TypeScript (strict) on Node.js ≥ 22 (developed on 24.18; `better-sqlite3`
13 requires ≥ 22). `.nvmrc` = `24`, `package.json` `engines.node = ">=22"`.

**Primary Dependencies**:
- `next` 16.4 (App Router, Turbopack dev), `react` 19.3, `tailwindcss` 4
- `ai` 7.0 (Vercel AI SDK core + UI protocol), `@ai-sdk/anthropic` 4.0, `@ai-sdk/react` 4.0
- `drizzle-orm` 0.45 + `better-sqlite3` 13, `drizzle-zod` 0.8, `zod` 4
- Dev: `vitest` 5, `eslint` (create-next-app default), `@types/better-sqlite3`

**Storage**: SQLite file at `data/games.db` (git-ignored via existing `*.db` rule). Created,
`CREATE TABLE IF NOT EXISTS`-ed and seeded on first open when the file is absent. No
migration tool.

**Testing**: Vitest, two small suites only — `tests/repository.test.ts` and
`tests/tools.test.ts` — run against an in-memory SQLite instance. Everything else is verified
manually via [quickstart.md](quickstart.md). Full coverage is out of scope per the brief.

**Target Platform**: Local developer machine (Linux/macOS/Windows), one Node process,
browser at `http://localhost:3000`. No deployment.

**Project Type**: Web application — one Next.js project serving UI and API together.

**Performance Goals**: First visible response (lookup chip or text) < 3 s (SC-003), helped by
`effort: 'low'` on the Anthropic provider; measured chips at 0.9–2.2 s, text at 2.6–4.4 s; dashboard with 100 games renders < 2 s (SC-007);
REST calls complete < 100 ms locally (synchronous SQLite, single table).

**Constraints**: 2–3 hour time box; no auth, deployment, or production error handling; no
containers; API key and model supplied via `.env.local`; the full catalog MUST NOT be placed in
the prompt (FR-014).

**Scale/Scope**: Tens of games, one operator, ~12 seed rows, ~15 source files, 3 pages
(dashboard, chat, shared layout), 3 API route files, 4 assistant tools.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Time-boxed scope | Every planned file maps to a requirement or mandatory deliverable; no auth, deploy, containers, pagination, or chat persistence | PASS — see Project Structure; non-goals listed below |
| II. Tool-calling AI | Assistant fetches data only through typed tools; prompt holds instructions, not rows; responses stream | PASS — `ToolLoopAgent` with 4 tools, `createAgentUIStreamResponse`; see [contracts/assistant-tools.md](contracts/assistant-tools.md) |
| III. Single source of truth | One data-access module; shared validation schema across UI, API, tools; six fixed fields + id | PASS — `src/lib/games/repository.ts` is the only importer of the DB client; `drizzle-zod` schema reused by API routes, form, and tools |
| IV. Simplicity & readable code | Flat layout, no speculative abstraction, every dependency justified, lint + `tsc` gates | PASS — 9 runtime deps, each justified in [research.md](research.md); no ORM migrations, no state library |
| V. Documented AI workflow | `AI_WORKFLOW.md` written incrementally | PASS — tasks phase will insert checkpoints after each milestone |
| Tech constraints | Next 14+, TS, Tailwind; provider/model via env; local storage; seed data; `.env.example` | PASS — all present in structure below |

**Explicit non-goals** (would violate Principle I): authentication, Docker/compose, Server
Actions alongside REST (REST is the deliverable; the UI consumes it), pagination/search/sort,
chat history persistence, multi-month revenue history, i18n.

**Post-Phase 1 re-check**: design artifacts introduce no new dependencies or layers beyond the
table above. Gate still PASS. Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-indie-games-dashboard/
├── plan.md                     # This file
├── spec.md                     # Feature specification (clarified)
├── research.md                 # Phase 0 — decisions, rationale, alternatives, API-drift notes
├── data-model.md               # Phase 1 — Game entity, validation, seed dataset
├── quickstart.md               # Phase 1 — run + validate end to end
├── contracts/
│   ├── games-api.md            # REST contract (5 endpoints, error shape)
│   ├── chat-api.md             # Chat endpoint + UI message stream protocol
│   └── assistant-tools.md      # 4 tool schemas + system instructions
├── checklists/requirements.md  # Spec quality checklist
└── tasks.md                    # Phase 2 — created by /speckit-tasks
```

### Source Code (repository root)

```text
.env.example                    # ANTHROPIC_API_KEY, ANTHROPIC_MODEL
.nvmrc                          # 24
next.config.ts                  # serverExternalPackages: ['better-sqlite3']
vitest.config.ts
package.json                    # engines.node >=22; scripts: dev, build, lint, typecheck, test
AI_WORKFLOW.md                  # mandatory deliverable, written incrementally
README.md                       # how to run, trade-offs (replaces assessment brief)

src/
├── app/
│   ├── layout.tsx              # shell + nav (Dashboard | Chat)
│   ├── globals.css             # @import "tailwindcss"
│   ├── page.tsx                # Dashboard: server component, reads repository directly
│   ├── chat/
│   │   └── page.tsx            # Chat view (renders <ChatView />)
│   └── api/
│       ├── games/
│       │   ├── route.ts        # GET list, POST create
│       │   └── [id]/route.ts   # GET one, PUT replace, DELETE
│       └── chat/
│           └── route.ts        # POST → createAgentUIStreamResponse
├── components/
│   ├── games/
│   │   ├── GamesTable.tsx      # table + empty state; formatted cells
│   │   ├── GameForm.tsx        # client; add/edit; field-level errors; calls REST
│   │   └── DeleteGameButton.tsx# client; confirm → DELETE → router.refresh()
│   └── chat/
│       ├── ChatView.tsx        # client; useChat + input + status/error/retry
│       └── MessageParts.tsx    # renders text parts and tool-* parts as lookup chips
└── lib/
    ├── db/
    │   ├── schema.ts           # drizzle `games` table + drizzle-zod schemas
    │   ├── client.ts           # opens data/games.db; creates table + seeds if file absent
    │   └── seed.ts             # 12 seed games (see data-model.md)
    ├── games/
    │   ├── repository.ts       # list/get/create/update/remove + rank/count/search/byTitles
    │   └── format.ts           # formatUsd, formatCount, formatRating
    └── ai/
        ├── model.ts            # anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-opus-5-5')
        ├── tools.ts            # search_games, rank_games, count_games, get_games
        └── agent.ts            # ToolLoopAgent: instructions, tools, isStepCount(5), effort low

tests/
├── repository.test.ts          # CRUD + query helpers on :memory: db
└── tools.test.ts               # each tool returns the documented shape against seed data
```

**Structure Decision**: Single Next.js project with `src/` (create-next-app default). UI, API
and AI live in one process so the assistant's tools call `repository.ts` in-process rather
than over HTTP. The dashboard server component also reads `repository.ts` directly; only
browser-initiated mutations go through the REST routes (and thereby exercise the deliverable).
`lib/db/client.ts` is imported solely by `lib/games/repository.ts` (Principle III).

## Complexity Tracking

> No constitution violations. Section intentionally empty.
