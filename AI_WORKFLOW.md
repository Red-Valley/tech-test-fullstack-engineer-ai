# AI Workflow Documentation

This document describes how AI coding tools were used throughout the development of the Indie Games Studio Dashboard & AI Copilot assessment, in compliance with the assessment's mandatory submission requirements.

---

## 1. Tools Used and Why

### Primary Tool: Antigravity CLI (v1.5.14)
- **Model:** Gemini 3.8 Flash (High) via Antigravity Starter Quota.
- **Workflow Mode:** Planning Mode (`/plan`), an iterative, gated workflow requiring human review and approval of technical design artifacts before modifying code or running mutating operations.
- **Why Chosen:**
  - **Tool-Integrated Agent Loop:** Antigravity CLI provides direct, inspectable tools for file manipulation, static analysis, command execution in PowerShell, and structured artifact generation.
  - **Verification Discipline:** Unlike unstructured code generators, Antigravity operates under an explicit approval boundary. Every phase requires concrete verification commands (`npm test`, `npm run lint`, `npm run build`) before moving forward.
  - **Context Persistence:** Maintains session history across complex multi-step refactors, ensuring architectural constraints (e.g. strict rating inequality, unanchored revenue fields, server-only isolation) remain intact throughout the project lifecycle.

---

## 2. Concrete Prompts and Outcomes

Below are five concrete, representative prompts used across the project phases, along with their actual outcomes.

### Prompt 1: Phase Scaffolding & Zero-Dependency SQLite Setup
> **Prompt:**
> *"Initialize the Next.js 15 App Router project with TypeScript, Tailwind CSS, and the Vercel AI SDK. Configure Node.js 24 native `node:sqlite` as the local persistence layer using WAL mode and parameterized prepared statements. Do not add heavy ORMs."*

- **Outcome:**
  - Set up Next.js 15.5.29, React 19, TypeScript 5.6.3, and Tailwind CSS 3.4.16.
  - Installed `ai` v7.0.179, `@ai-sdk/google` v4.0.124, `@ai-sdk/react` v4.0.183, and `zod` v3.25.76.
  - Created `src/lib/db.ts` using `node:sqlite` with WAL mode enabled and connection lifecycle management.
  - Baseline scripts (`dev`, `build`, `lint`, `test`, `db:seed`) configured and passing.

---

### Prompt 2: Data Modeling, Strict Rating Semantics & Idempotent Seeding
> **Prompt:**
> *"Implement the GamesRepository with full CRUD methods, Zod schemas, UUIDs, timestamps, and search/filter/sort capabilities. Ensure strict exclusive filtering for `rating_above` (`average_rating > value`). Create a seed dataset of 15 synthetic indie games, ensuring at least one game has an exact 4.0 rating to verify boundary conditions."*

- **Outcome:**
  - Implemented `GamesRepository` with parameterized SQL to prevent SQL injection.
  - Created `src/lib/types.ts` defining `Game`, `createGameSchema`, `updateGameSchema`, and `gameFilterSchema`.
  - Added 15 synthetic games in `data/seed-data.json`, including *Animal Well* (rating 4.0) and *Pizza Tower* (rating 3.8).
  - Wrote 9 repository unit tests in `tests/crud-repository.test.ts` running against `:memory:`, verifying that `rating_above: 4.0` strictly returns 13 games.

---

### Prompt 3: Business Service Layer & REST API with Route Context
> **Prompt:**
> *"Build GamesService encapsulating domain validation and error handling, and expose the catalog through Next.js 15 REST API routes (`/api/games` and `/api/games/[id]`). Ensure Next.js 15 route context handles `params: Promise<{ id: string }>` asynchronously, and add integration tests using isolated in-memory databases."*

- **Outcome:**
  - Implemented `src/lib/services/games-service.ts` with domain validation and duplicate title checks.
  - Implemented `src/app/api/games/route.ts` and `src/app/api/games/[id]/route.ts` with `runtime = 'nodejs'` and asynchronous route parameter resolution (`await params`).
  - Added 13 integration tests in `tests/api-routes.test.ts` covering pagination, filtering, creation validation (HTTP 201/400), partial updates (HTTP 200/400), and deletion (HTTP 200/404).

---

### Prompt 4: AI Tool Calling with Revenue Period Disclosures
> **Prompt:**
> *"Create five database-backed AI tools calling GamesService: `search_games`, `count_games`, `get_top_games`, `compare_games`, and `get_catalog_stats`. Author an authoritative system prompt that forbids hallucinating, forbids dumping the whole database into the prompt, enforces `average_rating > 4.0`, and strictly discloses that `monthly_revenue_usd` has no calendar-month timestamp. Wire up `POST /api/chat` with `streamText` and `stepCountIs(5)`."*

- **Outcome:**
  - Defined all 5 tools with strict Zod input schemas in `src/lib/ai/tools.ts`.
  - Authored `CATALOG_SYSTEM_PROMPT` in `src/lib/ai/system-prompt.ts` with mandatory tool use and transparent disclosure rules for "last month" questions.
  - Implemented streaming route in `src/app/api/chat/route.ts` using `toUIMessageStreamResponse()`.
  - Verified deterministically via 7 test cases in `tests/ai-tools.test.ts` without making live API calls or consuming quota.

---

### Prompt 5: Presentation Layer & AI SDK 7 Transport Alignment
> **Prompt:**
> *"Build the frontend dashboard with MetricCards, filterable/sortable GameTable, accessible Create/Edit/Delete modals, and ChatPanel. Connect the chat interface using `@ai-sdk/react`'s `useChat` with quick prompt chips for the three assessment questions and tool invocation badges."*

- **Outcome:**
  - Developed responsive dashboard with desktop split grid (7 cols table, 5 cols chat copilot).
  - Added read-only `GET /api/games/stats` route so KPI cards reflect global catalog metrics rather than paginated rows.
  - Built accessible modals with Escape key dismissal, autofocus, and field-level error mapping.
  - Integrated `useChat` with explicit `DefaultChatTransport({ api: '/api/chat' })` from `ai`.

---

## 3. Moment the AI Got It Wrong & How It Was Fixed

### The Error
During the implementation of Step 5 ([ChatPanel.tsx](file:///F:/try1/test/tech-test-fullstack-engineer-ai/src/components/chat/ChatPanel.tsx)), the AI initially instantiated the React hook following legacy Vercel AI SDK patterns:
```tsx
const { messages, sendMessage, status, error } = useChat({
  api: '/api/chat',
});
```

When running `npm run build`, Next.js failed type checking with the following compiler error:
```
./src/components/chat/ChatPanel.tsx:9:5
Type error: Object literal may only specify known properties, and 'api' does not exist in type 'UseChatOptions<UIMessage<unknown, UIDataTypes, UITools>>'.

   7 | export function ChatPanel() {
   8 |   const { messages, sendMessage, status, error } = useChat({
>  9 |     api: '/api/chat',
     |     ^
  10 |   });
```

### The Root Cause Diagnosis
In the installed version of `@ai-sdk/react` (`^4.0.183`) and `ai` (`^7.0.179`), the client-side chat hook architecture was restructured:
- `api` is no longer accepted as a top-level property on `UseChatOptions`.
- Transport configuration is now abstracted into `ChatTransport` implementations (`HttpChatTransport` / `DefaultChatTransport`).

### The Fix
Rather than blindly suppressing the error with `as any` or `@ts-ignore`, we inspected the installed type definitions in `node_modules/@ai-sdk/react/dist/index.d.ts` and `node_modules/ai/dist/index.d.ts`. We imported `DefaultChatTransport` from `ai` and memoized the transport instance:

```tsx
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export function ChatPanel() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });
  // ...
}
```

Following this correction, `npm run build` compiled cleanly with zero errors or warnings, and static page generation succeeded across all 7 routes.

---

## 4. Agent Architecture: Single-Agent Sequential Workflow

### Strategy: Bounded Single Agent with Gated Approval
- **Approach:** We utilized a single Antigravity CLI coordinator agent operating in sequential, gated phases (Steps 1 through 6).
- **Why No Parallel Swarms or Subagents:**
  - This assessment has a strict single repository boundary and a tight 2–3 hour scope.
  - Operating on a shared branch (`submission/anderson-grisales`) with multiple autonomous background workers running simultaneous edits would risk merge conflicts, race conditions in SQLite database files, or accidental quota consumption.
  - Sequential phases with human-in-the-loop review at every gate ensured complete alignment, high code clarity, and strict verification before any new phase was initiated.

---

## 5. Model, Streaming, and Verification Integrity

### Configured Model
- The configured model is **`gemini-3.8-flash`** using `@ai-sdk/google` (`createGoogleGenerativeAI`).
- The model identifier is declared and recognized in `@ai-sdk/google` v4.0.124 typings.
- The model is configured server-side in `src/lib/ai/provider.ts` and is protected by `server-only`.

### Verification Distinctions
- **Code-Level Verification:** Completely verified. 29 automated tests pass in memory, ESLint is clean, and the production build compiles cleanly.
- **Live Gemini Verification:** To preserve starter quota and maintain deterministic reproducibility, no live Gemini API calls were made during automated testing. Live upstream endpoints are subject to Google's live server capacity (intermittent 503s were observed in initial explorations). An optional live integration test file (`tests/live-chat.integration.ts`) is included for explicit manual verification via `npm run test:live`.
