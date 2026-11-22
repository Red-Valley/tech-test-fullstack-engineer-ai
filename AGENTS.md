# Indie Games Dashboard

Candidate submission for the Full Stack Engineer (AI) take-home: an internal dashboard for a catalog of indie games, plus an AI chat that answers questions about the catalog. `README.md` describes the app, `CHALLENGE.md` is the assessment brief (requirements, stack, evaluation weights, submission steps), and `AI_WORKFLOW.md` is the mandatory record of how AI tools were used.

## Stack and layout

- Next.js 16 App Router with Cache Components enabled (`next.config.ts`), React 19, TypeScript, Tailwind CSS 4, npm, Node 22.
- A page that reads the database is an async server component that calls `await connection()` first and sits inside `<Suspense>` (see `app/page.tsx`). `better-sqlite3` is synchronous, so without `connection()` the query would run at build time.
- Route handlers do not export `runtime` or `dynamic`: Cache Components rejects route segment config. `GET` handlers that read the database call `await connection()`.
- `lib/db.ts`: SQLite connection cached on `globalThis`, the schema, and a one-time seed recorded in `PRAGMA user_version`. The default file is `data/games.db` (gitignored). Set `DATABASE_PATH` to change it.
- `lib/games/`: Zod schemas (`schema.ts`), `createRepository(db)` with CRUD plus the read-only `query` and `aggregate` (`repository.ts`), and seed data. Every SQL identifier comes from a whitelist and every value is a bound parameter.
- `lib/pagination.ts`: pure `paginate` and `pageNumbers` for the dashboard table. Paging is client-side: `app/page.tsx` still loads every game, and `components/games-dashboard.tsx` slices the filtered, sorted rows. `GET /api/games` is not paged.
- `lib/chat/`: `tools.ts` (two `betaZodTool`s over the repository), `system-prompt.ts` (frozen, because the API ties thinking blocks to the exact system prompt and tool set), `request.ts` (validation of the replayed conversation), `events.ts` (NDJSON event types).
- `app/api/chat/route.ts`: Anthropic SDK tool runner (`claude-opus-5-5`, `effort: "low"`, `thread: false`, server-side fallback) that streams NDJSON. The route is stateless: the browser replays the conversation it received in the `done` event, unchanged.
- `components/`: client components for the dashboard table, the add and edit dialog, the chat, and the nav.
- `scripts/`: `mock-anthropic.mjs` (an offline stand-in for the Messages API that speaks the real streaming protocol, used by `tests/chat-route.test.ts` and `npm run dev:mock`) and `dev-mock.mjs` (the launcher).
- `PLAN.md`: the plan the work was built from, with the deviations that came up.

## Commands

Run from the repository root. All of these were run and pass, except `dev`, which was run and checked by hand.

- `npm install`
- `npm run typecheck`: `next typegen && tsc --noEmit`. Typegen must run first, or `RouteContext` and `LayoutProps` do not resolve.
- `npm run lint`
- `npm test`: Vitest over `lib/**/*.test.ts` and `tests/`. Needs no API key.
- `npm run build`: needs no database and no API key.
- `npm run dev`: open `http://localhost:3000`. Use `localhost`, because the dev server blocks `127.0.0.1`.
- `npm run dev:mock`: the dev server with the chat on the offline mock (`scripts/mock-anthropic.mjs`), so no API credits are used. It overrides any key in `.env*`. Extra arguments go to `next dev` (`npm run dev:mock -- -p 3200`).
- `npm run mock:anthropic`: only the mock, on `MOCK_PORT` (default 4010).

## Constraints

- Never read or commit `.env*`. `ANTHROPIC_API_KEY` goes in `.env.local`, and `.env.example` lists the variables.
- Never put the whole catalog in a prompt. The chat must keep answering through tool calls, and its responses must keep streaming.
- Keep `AI_WORKFLOW.md` truthful. Every prompt, outcome, and mistake in it must have happened.
- `app/api/chat/route.ts` accepts only the content block types listed in `lib/chat/request.ts`. A new block type needs that list and a test case updated.
- `next dev` rewrites the managed block at the end of this file. Commit it with the work.
- The brief puts auth, deployment, production error handling, and full test coverage out of scope.

## Verification

Deterministic checks: typecheck, lint, test, build. Behavioral acceptance: games CRUD works in the UI and through the REST API, and the chat streams an answer through tool calls for each sample question in `CHALLENGE.md`.

A live chat run needs `ANTHROPIC_API_KEY` with credits and makes paid calls, so run it only when asked. The chat route is tested end to end against the offline mock in `scripts/` (`tests/chat-route.test.ts`, `npm run dev:mock`). The author also ran it against the live model (`claude-opus-5-5`, screenshots in `AI_WORKFLOW.md`), and the live API accepted the request settings, including the two beta parameters `server-side-fallback-2026-07-01` and `thinking-binding-controls-2026-08-01`. Real-model answers are not covered by automated tests.

## Submission

- Work goes on a branch named `submission/<your-name>`. The pull request targets `main` of the original assessment repository. `origin` is the candidate's fork, and no `upstream` remote is configured.
- The PR body follows `.github/PULL_REQUEST_TEMPLATE.md`: name, email, time spent, what was built, how to run, trade-offs, and the checklist. The candidate supplies the name, email, and time spent.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
