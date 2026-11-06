---
name: backend-architecture
description: Backend architecture for this Next.js 16 + SQLite + AI SDK project — layering, folder layout, DB access, route handlers, AI tools and the streaming chat route. Use when creating or changing anything under lib/ or app/api/, adding a tool, or deciding where server code belongs.
---

# Backend Architecture

## Layers (dependencies point down only)
```
HTTP route handlers (app/api/**/route.ts)      AI chat route (app/api/chat/route.ts)
        │  parse + validate (Zod)                     │  streamText + tools
        ▼                                             ▼
                 Repository  — lib/games.ts  (the ONLY place with SQL)
                        │
                 DB connection — lib/db.ts (singleton, migration, seed)
                        │
                     SQLite file (data/games.db | :memory: in tests)
```
- Route handlers are thin adapters: parse → validate → call repository → map to HTTP. No business rules, no SQL.
- AI tools (`lib/ai/tools.ts`) are a second adapter over the same repository. Same validation library, same functions. If the API and a tool need the same query, it is one repository function.
- `lib/schema.ts` holds Zod schemas shared by HTTP and tools; `lib/types.ts` holds domain types. Prefer deriving types from schemas (`z.infer`) where it avoids duplication, but keep `Game` matching the contract.

## Folder layout
```
lib/
  db.ts            getDb(): Database — singleton on globalThis; path from DATABASE_PATH (default data/games.db)
  seed-data.ts     fictional games
  games.ts         repository (import 'server-only')
  schema.ts        Zod: gameInput, gameUpdate, gameFilters, idParam
  types.ts
  http.ts          json helpers + error envelope (see api-contract-patterns)
  ai/tools.ts      tool definitions
  ai/prompt.ts     instructions (system prompt)
  ai/model.ts      getChatModel(): resolves provider + model through the factory
  ai/providers/    one strategy per provider + factory.ts (AI_PROVIDER, Anthropic by default); only place importing @ai-sdk/<provider>
app/api/games/route.ts, app/api/games/[id]/route.ts, app/api/chat/route.ts
```

## Database rules
- `better-sqlite3` is synchronous — that's fine and simpler; don't wrap it in fake async.
- Singleton via `globalThis.__db ??= open()` to survive dev hot reload. `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`.
- **Testability:** `DATABASE_PATH=:memory:` gives each test worker an isolated DB. Export a `resetDb()` (test-only) or a `createDb(path)` factory so tests can start clean.
- Idempotent migration (`CREATE TABLE IF NOT EXISTS`) + seed only when empty. `CHECK` constraints mirror Zod rules (defense in depth).
- Prepared statements with named params (`@title`). Dynamic `ORDER BY` only from a whitelist map: `const SORT = { monthly_revenue_usd: 'monthly_revenue_usd', … } as const`.
- Map rows to domain objects in one function (`toGame(row)`), never leak raw rows.
- `next.config.ts`: `serverExternalPackages: ['better-sqlite3']`. Every route using the DB: `export const runtime = 'nodejs'`.

## Route handler template (Next.js 16)
```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = idParam.safeParse((await ctx.params).id);
  if (!id.success) return jsonError(400, 'INVALID_ID', 'id must be a positive integer');
  const body = await readJson(req);                 // returns null on malformed JSON
  if (body === null) return jsonError(400, 'INVALID_JSON', 'Body must be valid JSON');
  const parsed = gameUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const game = updateGame(id.data, parsed.data);
  return game ? Response.json(game) : jsonError(404, 'NOT_FOUND', `Game ${id.data} not found`);
}
```
(Typed `RouteContext<'/api/games/[id]'>` helpers exist in recent Next versions — use them if available.)

## AI layer (Vercel AI SDK 7 — verify against `node_modules/ai/docs`)
- `streamText({ model, instructions, messages: await convertToModelMessages(uiMessages), tools, stopWhen: <step-count helper>(5) })` → `result.toUIMessageStreamResponse()`. In v7 the system prompt is `instructions`; loop helpers and callback names changed from v6 (`onFinish`→`onEnd`, `fullStream`→`stream`). **Check the installed docs; don't trust memory.**
- Tools: `tool({ description, inputSchema: z.object({...}), execute })`. Every schema field has `.describe()`. Keep 3–5 orthogonal tools: search/list with filters+sort+limit, aggregate stats, compare by titles, list genres.
- Tool `execute` returns compact JSON (only needed fields, numbers as numbers) and explicit `{ results: [], note }` / `notFound: [...]` shapes. Cap `limit` (≤ 25) to protect the context window.
- Treat tool inputs as untrusted (the model can be prompt-injected by data). Validation is the schema; the repository is read-only for the chat — **no write tools**.
- Model id from env (`AI_MODEL`) with a sensible default; fail fast with a clear 500 if the API key is missing.
- `export const maxDuration = 30` on the chat route.

## Decision log (document these in README trade-offs)
- SQLite file vs in-memory: file for persistence across restarts; `:memory:` for tests.
- "Last month" = current `monthly_*` columns (no history table) — stated in the prompt and README.
- Rating "above 4" = strictly `> 4` (pick one, test it, document it).
