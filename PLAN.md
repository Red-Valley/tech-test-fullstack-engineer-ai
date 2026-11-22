# PLAN

Build the indie games dashboard and AI chat described in `README.md` (the assessment brief). One Next.js app at the repository root. Task 1 is the data layer and REST API. Task 2 is the chat route, the UI, and the documentation.

## Decisions

- Next.js 16 (App Router) with TypeScript and Tailwind CSS, npm, no `src/` directory, import alias `@/*`.
- Storage: SQLite through `better-sqlite3`. The database file is created and seeded on first run and is ignored by git.
- LLM layer: `@anthropic-ai/sdk` beta tool runner, model `claude-opus-5-5`.
- The brief moves to `CHALLENGE.md`. `README.md` becomes the submission README.

## Task 1: data layer and REST API

Scope: everything the UI and the chat tools will call. Do not create UI pages (keep the scaffold page), the chat route, or anything for auth.

### Scaffold

Run `create-next-app` in a temporary directory outside the repository, then move the result into the repository root. Do not run it in the repository root, because it refuses a non-empty directory and overwrites `AGENTS.md` and `CLAUDE.md`.

```bash
npx create-next-app@16.4.6 <tmpdir>/app --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --no-agents-md --disable-git
```

- Move every file except `README.md`, `.gitignore`, `AGENTS.md`, and `CLAUDE.md` into the repository root. Merge any missing lines from the generated `.gitignore` into the existing one. Keep the existing `README.md`, `AGENTS.md`, and `CLAUDE.md` untouched.
- Next.js 16 differs from older versions. Read the relevant guides in `node_modules/next/dist/docs/` (route handlers and dynamic route `params`) before writing route code.
- Dependencies: `better-sqlite3`, `zod`. Dev dependencies: `@types/better-sqlite3`, `vitest`.
- Scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck` (`next typegen && tsc --noEmit`), `test` (`vitest run`).
- Confirm `better-sqlite3` is in Next.js's default `serverExternalPackages` list. Add it to `next.config.ts` only if it is not.
- Never read or print any `.env*` file.

### Files

- `lib/db.ts`
  - `openDatabase(path)` factory: opens `better-sqlite3`, creates the parent directory for file paths, runs the schema below, seeds when the table is empty, and returns the handle. Tests call it with `:memory:`.
  - `getDb()` singleton cached on `globalThis` so dev hot reloads keep one connection. The path is `process.env.DATABASE_PATH ?? "data/games.db"`.
  - Table: `games (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL UNIQUE COLLATE NOCASE, developer TEXT NOT NULL, genre TEXT NOT NULL, monthly_revenue_usd REAL NOT NULL CHECK (monthly_revenue_usd >= 0), monthly_downloads INTEGER NOT NULL CHECK (monthly_downloads >= 0), average_rating REAL NOT NULL CHECK (average_rating BETWEEN 0 AND 5), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`.
- `lib/games/seed.ts`: about 18 fictional indie games across about 6 genres (it grew to 70 across 13, see the deviations below). Vary revenue, downloads, and ratings. Several ratings above 4 and several below. Use invented titles and developers only.
- `lib/games/schema.ts`: Zod `GameInput` (all six fields; strings trimmed and non-empty; revenue >= 0; downloads an integer >= 0; rating from 0 to 5), `GameUpdate` (`GameInput.partial()`, at least one field), and the `Game` type (adds `id`, `created_at`, `updated_at`).
- `lib/games/repository.ts`: `createRepository(db)` returning:
  - `list()`, `get(id)`, `create(input)`, `update(id, patch)` (also sets `updated_at`), `remove(id)`.
  - `query({ filters, sort_by, order, limit })` returning `{ total_matching, games }`. `limit` is clamped from 1 to 50, default 10. `sort_by` is any game column, default `title`.
  - `aggregate({ metric, field, group_by, filters })` where `metric` is `count`, `sum`, `avg`, `min`, or `max`; `field` is one of the three numeric columns (required unless `metric` is `count`); `group_by` is optional and is `genre` or `developer`. Returns `{ rows }`, each row holding the group value (when grouped) and the result.
  - Shared `filters`: `titles?: string[]` (case-insensitive partial match, OR-combined), `genre?`, `developer?` (case-insensitive), `numeric?: { field, op, value }[]` with `field` one of the three numeric columns and `op` one of `>`, `>=`, `<`, `<=`, `=`.
  - Build SQL only from whitelisted identifiers. Pass every value as a bound parameter. A duplicate title raises a typed `DuplicateTitleError`.
  - Export the input and result types so the chat tools in Task 2 can reuse them.
- `app/api/games/route.ts`: `GET` lists all games. `POST` creates one (201). Respond 400 with the Zod issues for invalid input and 409 for a duplicate title.
- `app/api/games/[id]/route.ts`: `GET`, `PATCH`, `DELETE` (204). Respond 400 for a bad id or body, 404 for a missing game, 409 for a duplicate title. Await `params` as Next.js 16 requires.
- Both route files set `export const runtime = "nodejs"`.
- `lib/games/repository.test.ts` (vitest, `:memory:` database): CRUD round trip; validation rejects bad input; `query` with `average_rating > 4` returns the expected `total_matching`; sort by revenue descending with limit 1 returns the top game; `titles` filter matches two games; `aggregate` for `count` and for a grouped `sum`.
- `.env.example`: `ANTHROPIC_API_KEY=` and a commented `# DATABASE_PATH=data/games.db`.

### Acceptance

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
- Against `npm run dev`, curl shows: list; create (201); invalid create (400); duplicate title (409); patch; get; delete (204); get after delete (404). Stop the dev server afterwards.
- No git commit, push, or pull request.

### Out of scope

UI pages, the chat route, auth, ORMs, logging frameworks, and abstractions beyond the files above.

## Task 2: chat route, UI, documentation

Done in the main session after Task 1 is reviewed.

### Chat backend

- `lib/chat/tools.ts`: two `betaZodTool` tools with `eager_input_streaming: true`. `query_games` wraps `repository.query`. `aggregate_games` wraps `repository.aggregate`. Tool descriptions state units (USD, monthly figures are last month's numbers, rating scale 0 to 5). Results are compact JSON.
- `lib/chat/system-prompt.ts`: a frozen constant. Answer only from tool results, never guess figures, say when a title is not found, plain text without Markdown, concise.
- `app/api/chat/route.ts`: runs the tool runner with `claude-opus-5-5`, `effort: "low"`, adaptive thinking with `drop_block` binding, server-side refusal fallback, and `stream: true`. Streams NDJSON events `text`, `tool_call`, `done` (carrying the full message history), and `error`. The client replays the returned history unchanged on the next turn.

### UI

- `app/layout.tsx`: shared header with Dashboard and Chat links.
- `app/page.tsx` and `components/games-dashboard.tsx`: stat cards, sortable and filterable table, add and edit form with API validation errors, delete with an inline confirmation.
- `app/chat/page.tsx` and `components/chat.tsx`: streaming message list, visible tool-call chips, sample-question buttons, error banner, new chat reset.

### Documentation

- `README.md` (submission README) and `CHALLENGE.md` (the brief, moved with `git mv`).
- `AI_WORKFLOW.md`, written only from what actually happened in this session.
- `AGENTS.md`: replace the "no application exists yet" content with the real layout and verified commands.

## Verification

1. Ladder: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
2. REST smoke with curl.
3. Chat smoke with the three brief questions plus one follow-up turn that replays the returned history. Needs `ANTHROPIC_API_KEY` in `.env.local`.
4. Load `/` and `/chat` in a browser and exercise add, edit, delete, and one chat question.

## Deviations from this plan

Changes made while building, with the reason for each.

- **No `export const runtime = "nodejs"` in the route files.** The scaffold enables Cache Components, and the Next.js 16 docs say to omit `runtime` there. Node.js is the default runtime. The `GET` handlers that read the database call `await connection()` first, so the synchronous SQLite read never runs at build time.
- **`@types/node` is `^22`.** Vitest 5 declares a peer range that excludes the scaffold's `^20`.
- **`.gitignore` ignores `.env*` and re-includes `.env.example`.** The first merge dropped the scaffold's `.env*` rule.
- **The database is seeded once per file.** `PRAGMA user_version` records the seed, so deleting every game does not bring the seed games back.
- **Blank filters are errors.** A blank `titles` entry, `genre`, or `developer` throws instead of matching every game.
- **Chat route settings.** It uses the tool runner with `thread: false` (the default thread mode sends only new messages and adds a beta), `max_tokens: 16000`, and a limit of 6 model calls per question. It accepts only the content block types in `lib/chat/request.ts`.
- **Added after review:** `lib/chat/request.ts`, `tests/api-routes.test.ts`, `lib/chat/request.test.ts`, and `vitest.config.mts` (the `@/` alias).
- **Removed:** `next/font/google` (a build-time network dependency) and the unused `create-next-app` SVGs.
- **Offline mock added.** `scripts/mock-anthropic.mjs`, `scripts/dev-mock.mjs` (`npm run dev:mock`), and `tests/chat-route.test.ts` let the chat run and be tested without API credits. The chat route shows a clear message when the API reports an empty balance.
- **A larger seed.** The seed grew from 18 to 70 fictional games across 13 genres, on request, so the dashboard and the chat have more to filter and rank. A test checks that every seed game is valid, titles are unique, and revenues have no ties.
- **Client-side pagination.** The dashboard table shows 10, 25, or 50 rows per page (`lib/pagination.ts`, `components/games-dashboard.tsx`). Paging is done in the browser over the full list, so the REST API, the repository, and the stat cards did not change. The author chose this over SQL `LIMIT` and `OFFSET`, which scales further but is a much larger change and alters the public `GET /api/games` contract. Search, genre, sort, and page-size changes return to page 1. Saving a game shows a short "Added" or "Saved" notice, because the game can land on another page.
