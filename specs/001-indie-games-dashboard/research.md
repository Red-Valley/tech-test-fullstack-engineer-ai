# Research: Indie Games Dashboard

**Date**: 2026-10-17 | **Plan**: [plan.md](plan.md)

All Technical Context items are resolved. Versions were verified with `npm view` on
2026-10-17; AI SDK API shapes were verified against the bundled docs of the installed
packages (`node_modules/ai/docs`, `node_modules/@ai-sdk/anthropic/docs`), not from memory.

## 1. Framework version

- **Decision**: Next.js 16.4 (App Router) via `create-next-app@16.4.2` with TypeScript,
  Tailwind 4, ESLint, `src/` directory, Turbopack.
- **Rationale**: Brief says "14+"; the latest stable removes the need to reason about
  deprecated APIs and matches what reviewers will scaffold themselves.
- **Alternatives**: Pin Next 14/15 — no benefit; older `middleware.ts` / webpack defaults.

## 2. LLM layer

- **Decision**: Vercel AI SDK 7 (`ai`) with `@ai-sdk/anthropic` 4 and `@ai-sdk/react` 4,
  authenticated with `ANTHROPIC_API_KEY` from `.env.local`.
- **Rationale**: One package gives streaming, tool calling with Zod schemas, a multi-step
  tool loop (`ToolLoopAgent`), the UI message stream protocol, and the `useChat` React hook
  with typed tool parts — everything FR-012..FR-021 need. Provider is swappable by editing
  one file (`lib/ai/model.ts`).
- **Alternatives**:
  - Raw `@anthropic-ai/sdk`: would require hand-rolling the tool loop, SSE framing, and
    client-side stream parsing — more code to review in a 2–3 h window.
  - OpenAI SDK / OpenRouter: equally valid per brief; no advantage, and the Anthropic provider
    doc is already verified.
  - LangChain/LangGraph: heavyweight for four tools.
  - Vercel AI Gateway: zero provider packages but needs a Vercel account/OIDC or gateway key;
    extra reviewer setup for no gain.

## 3. Model and reasoning settings

- **Decision**: `claude-opus-5-5` by default, overridable with `ANTHROPIC_MODEL`.
  Provider options: `effort: 'low'`; thinking left at its adaptive default (it cannot be
  disabled on this model).
- **Rationale**: Default model per Anthropic guidance. The provider docs state that on
  `claude-opus-5-5` "effort is the main control for latency and cost" and to "set
  `effort: 'low'` when time to first token matters" — which is exactly SC-003 (< 3 s).
  Catalog questions are simple tool lookups; low effort is sufficient. Cost for an
  assessment's worth of questions is cents.
- **Alternatives**: `claude-sonnet-5-5` / `claude-haiku-5-5` — reachable via the env var;
  documented in README for reviewers who prefer a cheaper key.
- **Implementation note**: adaptive-only models may begin a response with a reasoning part
  with empty text. The UI ignores `reasoning` parts and shows a "thinking…" state from
  `status === 'submitted'` instead.

## 4. Agent pattern

- **Decision**: `new ToolLoopAgent({ model, instructions, tools, stopWhen: isStepCount(5) })`
  in `lib/ai/agent.ts`; route handler returns
  `createAgentUIStreamResponse({ agent, uiMessages: messages })`; client type is
  `InferAgentUIMessage<typeof agent>`.
- **Rationale**: The AI SDK docs recommend `ToolLoopAgent` over hand-rolled loops. Five
  steps allow "search → rank → answer" chains with headroom; the cap prevents runaway loops.
- **Alternatives**: `streamText` + `createUIMessageStreamResponse({ stream:
  toUIMessageStream({ stream: result.stream }) })` — equivalent, less encapsulated.
- **Verify at implementation** (not confirmed in the greps): the options
  `createAgentUIStreamResponse` accepts for forwarding error text to the client and for
  suppressing reasoning parts (`sendReasoning`). Check
  `node_modules/ai/docs/07-reference/` before writing the route.

## 5. Storage

- **Decision**: SQLite file via `better-sqlite3` 13 + `drizzle-orm` 0.45
  (`drizzle-orm/better-sqlite3`). Table created with `CREATE TABLE IF NOT EXISTS` and seeded
  inside `lib/db/client.ts` the first time the file is absent. No `drizzle-kit`, no
  migrations. `next.config.ts` sets `serverExternalPackages: ['better-sqlite3']`.
- **Rationale**: Repo `.gitignore` already ignores `*.db` (authors expect SQLite). Real
  `SELECT … ORDER BY/COUNT/WHERE` map 1:1 onto the four assistant tools. Synchronous API keeps
  the repository and tools plain functions. Prebuilt binaries exist for Node 22/24 on all
  three OSes, so reviewers compile nothing. First-run-only seeding is the spec's Q2 answer.
- **Consequence**: `better-sqlite3@13` declares `engines.node >= 22`. Reviewer prerequisite
  becomes Node ≥ 22; stated in README, `.nvmrc`, and `engines`.
- **Alternatives**:
  - JSON file: zero deps, but filtering/sorting reimplemented in TS and no real queries.
  - `node:sqlite` (built in, stable on Node 24): zero native deps — but Drizzle 0.45 ships no
    driver for it (verified: `drizzle-orm/` has `better-sqlite3`, `libsql`, `bun-sqlite`,
    `d1`, … and no `node-sqlite`). Raw SQL without Drizzle loses the shared Zod schema.
  - `@libsql/client`: also native; no advantage locally.
  - Prisma: codegen step and heavier client for one table.

## 6. Validation schema

- **Decision**: `drizzle-zod` 0.8 `createInsertSchema(games, refinements)` produces
  `gameInputSchema`; `createSelectSchema` produces `gameSchema`. Both exported from
  `lib/db/schema.ts` and imported by API routes, `GameForm`, and tool output types.
- **Rationale**: One definition of "valid game" (Principle III, FR-005/FR-011).
  `drizzle-zod@0.8.3` peer-depends on `zod ^3.25 || ^4` — compatible with zod 4.
- **Alternatives**: Hand-written Zod schema duplicating the table — drift risk.

## 7. UI data flow

- **Decision**: Dashboard page is a server component calling `repository.list()` directly.
  Create/update/delete from the browser call the REST routes with `fetch`, then
  `router.refresh()`. No Server Actions.
- **Rationale**: Avoids self-HTTP on the server path while making the REST API the single
  mutation path from the browser, so the deliverable is exercised by the UI itself.
- **Alternatives**: Server Actions — would duplicate the REST routes' logic or bypass them.

## 8. Field naming

- **Decision**: Snake_case field names from the brief (`monthly_revenue_usd`,
  `monthly_downloads`, `average_rating`) are used verbatim as DB columns, TypeScript
  property names, JSON keys, and tool parameter values.
- **Rationale**: One name per field everywhere; the brief and reviewers use these names.
- **Alternatives**: camelCase in TS with a mapping layer — extra code, extra bug surface.

## 9. Testing

- **Decision**: Vitest 5 with two suites against `new Database(':memory:')`:
  repository CRUD/query helpers and the four tool handlers' output shapes. UI untested.
- **Rationale**: SC-002 (correct answers) depends on the query helpers being right; tests are
  cheap because the layer is synchronous and pure. Kept small to honour the time box.
- **Alternatives**: No tests — acceptable per brief, but the helpers are the highest-risk
  logic and the suites take ~15 minutes.

## 10. Chat error handling

- **Decision**:
  1. Route pre-flight: if `ANTHROPIC_API_KEY` is missing, respond `500` JSON
     `{ error: { code: 'ai_not_configured', message } }` before streaming.
  2. Mid-stream provider failures surface as an `error` stream part; the client shows the
     message, keeps partial text, and offers Retry (`regenerate`).
  3. Dashboard and REST never touch the AI module, so they are unaffected (FR-021).
- **Rationale**: FR-021 and the "AI provider unavailable" edge case.

## 11. Number formatting

- **Decision**: `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
  maximumFractionDigits: 0 })` for revenue; `Intl.NumberFormat('en-US')` for downloads;
  `toFixed(1)` for rating. Same helpers used in table cells and quoted to the assistant in
  its instructions (FR-023).

## 12. AI SDK 7 API-drift notes (carry into implementation)

Verified against the bundled docs for `ai@7.0.143`; several differ from older examples:

| Older pattern | Current (ai 7 / @ai-sdk/react 4) |
|---|---|
| `stopWhen: stepCountIs(n)` | `stopWhen: isStepCount(n)` |
| `tool({ parameters: z.object(...) })` | `tool({ inputSchema: z.object(...), execute })` |
| `streamText({ system: '...' })` | `streamText({ instructions: '...' })` (agents: `instructions` too) |
| `result.toUIMessageStreamResponse()` | `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })` or, for agents, `createAgentUIStreamResponse({ agent, uiMessages })` |
| `useChat({ api })` | `useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) })` from `@ai-sdk/react` + `ai` |
| `message.content` | `message.parts[]` — `part.type === 'text'` or `'tool-<name>'` |
| tool part `state` | `'input-streaming' \| 'input-available' \| 'output-available' \| 'output-error' \| 'output-denied'`; `part.input`, `part.output`, `part.errorText`, `part.toolCallId` |
| `status` values | `'submitted' \| 'streaming' \| 'ready' \| 'error'`; `stop()` and `regenerate()` available |
| provider options | `providerOptions: { anthropic: { effort: 'low' } }` |

Rule for implementation: before writing any AI SDK call, open the matching file under
`node_modules/ai/docs/` and copy the shape from there.
