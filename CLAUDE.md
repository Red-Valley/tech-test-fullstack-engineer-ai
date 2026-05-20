# CLAUDE.md

## Project Overview

This repository is a technical assessment for a **Full Stack Engineer (AI)** role.
The goal is to build a small **internal dashboard** to manage a catalog of indie
games (CRUD over `title`, `developer`, `genre`, `monthly_revenue_usd`,
`monthly_downloads`, `average_rating`) plus an **AI chat** that answers
natural-language questions about that catalog using **tool calling** and
**streaming** responses.

## Tech Stack

- **Next.js 16.2.6 (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Vercel AI SDK v6**: `ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `@ai-sdk/openai`
- **Zod** for schema validation
- **Persistence**: JSON file at `/data/games.json`

## Conventions

- Functional React components only — no class components.
- Prefer **named exports** over default exports (except where Next.js requires a
  default export, e.g. `page.tsx`, `layout.tsx`, route handlers).
- **Server-side tools** (function calling definitions) live in
  `/app/api/chat/route.ts`.
- Keep **business logic isolated** from route handlers: route handlers wire HTTP
  in/out; the actual querying, validation, and persistence belong in dedicated
  modules they import.

## Out of Scope

- Authentication and authorization
- Deployment and infrastructure
- Full automated test coverage
- Production-grade error handling and observability

## Files NOT to Touch

- `README.original.md` — kept as a reference copy of the original assessment
  brief. Do not modify, rename, or delete.

## Development Phases (index)

The full project plan, including goals, deliverables, and acceptance criteria
for each phase, lives in `/docs/plan.md`. This file is the source of truth.
Read it before starting any phase.

Quick index:

0. Pre-flight cleanup — DONE
1. Data: schema and seed
2. Data: repository layer
3. REST API CRUD
4. Chat endpoint with tool calling ★
5. Dashboard UI
6. Chat UI with streaming
7. UX polish
8. README finalization
9. AI_WORKFLOW.md (human-authored)
10. PR submission

Each phase ends with a single focused commit. Phases are sequential.

## Code Quality Rules

These rules apply across all phases. Violating any of them is grounds to
refactor before moving on.

- All exported functions must have explicit TypeScript return types.
- Business logic lives outside route handlers; route handlers only handle HTTP
  concerns and delegate to `/lib`.
- Validate all external input with Zod (request bodies, query params, tool
  arguments).
- No `any` types unless explicitly justified with an inline comment explaining
  why.
- Prefer named exports over default exports for non-page modules.
- Keep files under 200 lines; split when they grow beyond that.
- English for all code, comments, identifiers, and documentation strings.
- No `console.log` statements in production code paths. Use `console.error`
  only for genuine error logging in route handlers.

### Bitácora Conventions

After completing any phase, automatically update `/docs/prompts-log.md` with an
entry. The entry format is specified in `/docs/plan.md` under "Bitácora
Conventions". Always include the field `Decisions logged:` listing any
decision-log entries added, or `"none (this phase did not produce decisions
meeting the logging criteria)"`.

Add an entry to `/docs/decisions-log.md` ONLY when a decision meets all three
criteria:

1. A real alternative was considered (not a default).
2. The trade-off is articulable as "we chose X, sacrificing Y, for Z".
3. The decision affects more than one file or is something a reviewer might
   question.

If any of the four mandatory fields (Decision, Alternatives considered,
Rationale, Consequence) cannot be filled with substantive content, the entry
should NOT be written. A non-decision logged is worse than a decision missed:
it pollutes the source material for AI_WORKFLOW.md.

### Validated SDK Gotchas (Vercel AI SDK v6)

- Tools use `inputSchema` (Zod), not the legacy `parameters` field.
- Multi-step tool use is controlled by `stopWhen: stepCountIs(N)`, replacing
  the older `maxSteps`.
- Incoming `messages` from the client must be passed through
  `convertToModelMessages` before being given to `streamText`.
- Stream the response with `result.toUIMessageStreamResponse()`, not
  `toDataStreamResponse()`.
- `useChat` lives in `@ai-sdk/react` and messages have a `parts[]` array with
  discriminated part types (text, tool-<name>, etc.). Render each part type
  explicitly.
- Tool execute functions must return JSON-serializable values. No Date, no
  BigInt, no class instances. Use ISO strings for dates if needed.
- Chat route handler must export `runtime = "nodejs"` because filesystem
  access via `fs/promises` is incompatible with the edge runtime.
- The v6 `useChat` hook no longer exposes `input`, `handleInputChange`, or
  `handleSubmit`. You manage the input state yourself with `useState` and
  call `sendMessage({ text })` on submit. Code generated against pre-v6
  patterns will fail compilation.
- `streamText` requires an `onError` callback in addition to any external
  try/catch. Without `onError`, upstream provider failures silently
  truncate the stream and the client sees a half-rendered message with
  no error signal.
- Each `parts[]` element of type `tool-<name>` has four possible states
  observable via its `state` field: `input-streaming`, `input-available`,
  `output-available`, `output-error`. The Phase 6 badge renderer must
  handle all four, not just the final state.
- When rendering message parts in React, use `part.toolCallId` as the
  React key for tool parts, not the array index. Parts mutate during the
  stream as states progress; index-based keys cause React to
  mis-reconcile and produce visual artifacts.
- `convertToModelMessages` is ASYNC in v6 (returns
  `Promise<ModelMessage[]>`). Pre-v6 versions were synchronous and most
  training data reflects the older signature. Forgetting the `await`
  silently breaks the stream because `streamText` receives a Promise
  where it expects an array, surfacing as `TypeError: messages.some is
  not a function` only inside the `onError` callback. Always await it.

## Notes for AI Coding Tools

- Next.js 16 introduces breaking changes — APIs, conventions, and file
  structure may differ from older training data. Before writing Next.js 16
  code, consult the local documentation under `node_modules/next/dist/docs/`
  or the official site (nextjs.org/docs). Heed deprecation notices.
- For Vercel AI SDK v6 specifics, see `### Validated SDK Gotchas (Vercel AI
  SDK v6)` above (the canonical reference).
