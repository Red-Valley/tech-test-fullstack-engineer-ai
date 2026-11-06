---
name: bug-prevention
description: Defensive-coding checklist of the bug classes most likely in this Next.js 16 + React 19 + SQLite + AI SDK project (validation, SQL, async, server/client boundary, hydration, React state, streaming, LLM/tool pitfalls, version drift in AI-generated code). Use while writing code, before reporting a task done, and when reviewing a diff.
---

# Bug Prevention

Use it **while coding**, not only at review time. Each item: the bug → the guard.

## 1. Inputs & validation
- Unvalidated body/query/params → Zod `safeParse` at every boundary (HTTP + tool input). Never trust `as Game`.
- `NaN` from `Number('')` / `parseInt('12abc')` → `z.coerce.number()` + `.int().positive()` for ids; reject, don't default.
- Whitespace-only strings pass `min(1)` → `.trim()` before `.min(1)`.
- Partial update with `{}` silently succeeds → refine "at least one field".
- `req.json()` throws on malformed JSON → wrap and return `400 INVALID_JSON`.

## 2. Data & SQL
- Injection via string concatenation → bound params only; dynamic `ORDER BY` from a whitelist map.
- Floating point money (`0.1+0.2`) → round for display; note integer cents as production trade-off; never compare money with `===` after arithmetic.
- Off-by-one on "above 4" → decide `>` vs `>=`, encode in one place, test both 4.0 and 4.1.
- `LIKE` with user `%`/`_` → escape or accept and document; use `COLLATE NOCASE` for case-insensitive.
- Multiple DB connections in dev (hot reload) → `globalThis` singleton.
- Tests depending on seed data → each test creates the data it asserts.

## 3. Next.js 16 server/client boundary
- `params`/`searchParams` are Promises → `await` them (sync access is an error in 16).
- Importing `lib/db.ts` from a client component → `import 'server-only'` in server modules.
- SQLite on Edge runtime → `export const runtime = 'nodejs'`; `serverExternalPackages: ['better-sqlite3']`.
- Caching stale data → `dynamic = 'force-dynamic'` on data routes / `router.refresh()` after mutations.
- Secrets reaching the client → never prefix with `NEXT_PUBLIC_`; read env only on the server.
- Hydration mismatch → no `Date.now()`, `Math.random()`, `toLocaleString()` without fixed locale/timezone in render.

## 4. React
- Copying props into state then `useEffect`-syncing → derive with `useMemo` or read props directly.
- Stale closures in handlers/intervals → functional `setState(prev => …)`.
- Double submit → disable while pending (`useTransition`/`isPending`).
- Index as `key` on mutable lists → use `id`.
- Unhandled promise in event handler → `try/catch` + user-visible error.
- Missing cleanup (listeners, AbortController on unmount for manual fetches).
- Controlled number inputs showing `NaN` → keep raw string in form state, coerce on submit.

## 5. Streaming & AI SDK
- **Version drift (the #1 AI-generated bug):** code written for another major (`parameters` vs `inputSchema`, `maxSteps` vs `stopWhen`, `system` vs `instructions` in v7, `useChat({ api })` vs transport, `toDataStreamResponse` vs `toUIMessageStreamResponse`, `toolInvocations` vs `message.parts`). Guard: check `package.json`, read `node_modules/ai/docs`, run `tsc`.
- Single-step loop → the model calls a tool and never answers. Enable multi-step (step-count stop condition ~5).
- Awaiting the stream before returning → kills streaming. Return the stream response directly.
- Unbounded tool output (all rows) → cap `limit`, return only needed fields.
- Model inventing numbers → instructions "always use tools", explicit empty/not-found outputs, low temperature.
- Prompt injection from data (game titles) → read-only tools, no write tools in chat, treat tool outputs as data.
- Missing API key → fail fast with clear `500 CONFIG_ERROR`, not an opaque stream error.
- Markdown XSS → `react-markdown` without `rehype-raw`.

## 6. Errors & observability
- Swallowed errors (`catch {}`) → log server-side with context, return the envelope.
- Leaking internals (stack, SQL) in responses → generic message + code.
- `console.log` left in code → remove before commit.

## 7. Before you say "done"
- [ ] `npm run typecheck && npm run lint && npm test` green
- [ ] Negative path tested for every new input
- [ ] No `any`, no `!` on external data, no TODO without a ticket
- [ ] Manually exercised the feature once in the running app
- [ ] AI-generated code checked against the installed library version
