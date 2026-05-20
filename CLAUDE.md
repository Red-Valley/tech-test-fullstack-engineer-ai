# CLAUDE.md

## Project Overview

This repository is a technical assessment for a **Full Stack Engineer (AI)** role.
The goal is to build a small **internal dashboard** to manage a catalog of indie
games (CRUD over `title`, `developer`, `genre`, `monthly_revenue_usd`,
`monthly_downloads`, `average_rating`) plus an **AI chat** that answers
natural-language questions about that catalog using **tool calling** and
**streaming** responses.

## Tech Stack

- **Next.js 14+** with the App Router
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

## Development Phases

The project is built in 10 discrete, verifiable phases. Each phase has explicit
acceptance criteria and produces a single focused commit. Do not skip ahead, do
not merge phases.

0. Pre-flight cleanup (current)
1. Data model and seed (Zod schema, 15-game seed)
2. Data access layer (repository with 5 CRUD functions)
3. REST API (CRUD endpoints under `/app/api/games`)
4. Dashboard UI (table view with CRUD actions)
5. Chat endpoint with tool calling (4 typed tools, streaming)
6. Chat UI with streaming (`useChat` hook, visible tool-call badges)
7. UX polish (focus states, currency formatting, lint clean)
8. README finalization
9. AI_WORKFLOW.md finalization (human-authored)

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

## Notes for AI Coding Tools

- Next.js 16 introduces breaking changes — APIs, conventions, and file
  structure may differ from older training data. Before writing Next.js 16
  code, consult the local documentation under `node_modules/next/dist/docs/`
  or the official site (nextjs.org/docs). Heed deprecation notices.
- Vercel AI SDK is on v6 (package `ai` version `^6.x`). Tools use
  `inputSchema` (not the legacy `parameters`). Streaming responses use
  `result.toUIMessageStreamResponse()` (not `toDataStreamResponse`). The
  `useChat` hook lives in `@ai-sdk/react` and messages have a `parts[]`
  array with discriminated part types.
