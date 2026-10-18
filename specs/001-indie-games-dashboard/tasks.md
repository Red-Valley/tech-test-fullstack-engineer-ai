---

description: "Task list for the Indie Games Dashboard feature"
---

# Tasks: Indie Games Dashboard

**Input**: Design documents from `/specs/001-indie-games-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Two Vitest suites are included because plan.md commits to them (research §9).
They are written after the code they cover, not TDD-first. If the time box is at risk,
T032 and then T016 are the first tasks to drop.

**Organization**: Tasks are grouped by user story. The REST **write** endpoints live in the
Foundational phase because the dashboard's forms call them (research §7); the REST **read**
endpoints and contract conformance form User Story 3.

**Time budget** (2–3 h total): Setup 15 min · Foundational 35 · US1 40 · US2 45 · US3 10 ·
Polish 25.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task names the exact file(s) it touches

## Path Conventions

Single Next.js project with `src/` (plan.md → Project Structure). All paths are relative to
the repository root. One file is added beyond the plan's tree: `src/lib/api/http.ts` (shared
request/response helpers for the two route files).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the Next.js 16 project around the existing repo files and pin the
verified dependency versions.

- [X] T001 Scaffold Next.js into a temp dir and merge into the repo root: run
      `npx create-next-app@16.4.2 app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`
      inside the scratchpad, then move `app/*` (including dotfiles, excluding `app/.git`)
      into the repo root **without overwriting** the existing `README.md`, `.gitignore`,
      `.github/`, `.specify/`, `.claude/`, `CLAUDE.md`. Append any lines from the generated
      `.gitignore` that the existing one lacks. Confirm `package.json`, `next.config.ts`,
      `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` exist
      and `npm run dev` boots.
- [X] T002 Install dependencies in `package.json`:
      `npm i ai@7.0.143 @ai-sdk/anthropic@4.0.82 @ai-sdk/react@4.0.147 drizzle-orm@0.45.4 drizzle-zod@0.8.3 better-sqlite3@13.0.3 zod@4.6.7`
      and `npm i -D vitest@5.0.5 @types/better-sqlite3@9.6.0`. Add
      `"engines": { "node": ">=22" }` and scripts `"typecheck": "tsc --noEmit"`,
      `"test": "vitest run"`.
- [X] T003 [P] Configure `next.config.ts` with `serverExternalPackages: ['better-sqlite3']`
      and create `.nvmrc` containing `24`.
- [X] T004 [P] Create `.env.example` with `ANTHROPIC_API_KEY=` and a commented
      `ANTHROPIC_MODEL=` line ("Optional. Defaults to claude-opus-5-5"). Verify `.gitignore`
      already ignores `.env.local` and `*.db` (it does), so `data/games.db` stays out of git
      while the `data/` directory itself can be created at runtime.
- [X] T005 [P] Create `vitest.config.ts` (`test.environment: 'node'`,
      `test.include: ['tests/**/*.test.ts']`, alias `@` → `./src`).
- [X] T006 [P] Create `AI_WORKFLOW.md` skeleton with the four mandatory headings from the
      brief — "Tools used and why", "Prompts and outcomes", "Where the AI got it wrong",
      "Parallel agents / subagents / worktrees" — plus a "Running log" section. Record the
      Spec Kit flow used so far (constitution → specify → clarify → plan → tasks) with links
      to `specs/001-indie-games-dashboard/`.
- [X] T007 Run `npm run lint && npm run typecheck`; commit `chore: scaffold Next.js 16 app with
      AI SDK, Drizzle and SQLite dependencies`.

**Checkpoint**: `npm run dev` serves the default Next page; lint and typecheck pass.

**Deviations recorded during implementation** (apply to all later tasks):
- Next 16.4 scaffolds with `cacheComponents: true`. Route segment `export const dynamic` is
  **removed** in that mode, so every `dynamic = 'force-dynamic'` below is replaced by
  `await connection()` (from `next/server`) before the first repository read in a page or
  `GET` handler; the dashboard's data component sits inside `<Suspense>`.
- `serverExternalPackages: ['better-sqlite3']` dropped from T003 — Next already externalises it.
- `@types/node` bumped to `^22` (vitest 5 peer requirement); `typecheck` script is
  `next typegen && tsc --noEmit` so it works before the first `next dev`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single data-access layer every story reads from, plus the write endpoints
the dashboard forms need. Nothing story-specific can start before this phase is done.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T008 Create `src/lib/db/schema.ts`: Drizzle `games` table with columns exactly as
      data-model.md — `id` INTEGER PK autoincrement; `title` TEXT NOT NULL; `developer` TEXT
      NOT NULL; `genre` TEXT NOT NULL; `monthly_revenue_usd` REAL NOT NULL;
      `monthly_downloads` INTEGER NOT NULL; `average_rating` REAL NOT NULL; `created_at` TEXT
      NOT NULL; `updated_at` TEXT NOT NULL. Export `gameInputSchema` via
      `createInsertSchema(games, …)` omitting `id`/`created_at`/`updated_at`, with refinements:
      `title`/`developer` trimmed, 1–100 chars ("Required, up to 100 characters."); `genre`
      trimmed, 1–50 chars ("Required, up to 50 characters."); `monthly_revenue_usd` finite,
      ≥ 0, ≤ 2 decimals ("Must be a number of 0 or more."); `monthly_downloads` integer ≥ 0
      ("Must be a whole number of 0 or more."); `average_rating` 0 ≤ x ≤ 5, ≤ 1 decimal
      ("Must be between 0 and 5 with at most one decimal."). Export `gameSchema` via
      `createSelectSchema`, types `Game`, `GameInput`, `Metric =
      'monthly_revenue_usd' | 'monthly_downloads' | 'average_rating'`, and
      `flattenFieldErrors(zodError) → { [field]: string[] }`.
- [X] T009 Create `src/lib/db/seed.ts` exporting `SEED_GAMES: GameInput[]` with the 12 rows
      from data-model.md → Seed dataset, verbatim values (Hollow Depths … Ironvale Tactics).
- [X] T010 Create `src/lib/db/client.ts`: `createDb(path: string)` opens `better-sqlite3`,
      runs `CREATE TABLE IF NOT EXISTS games (...)` matching T008, and returns
      `drizzle(sqlite, { schema })`. Default export `db` for `data/games.db`: `mkdirSync`
      the `data/` dir, check `existsSync` **before** opening, and insert `SEED_GAMES` only
      when the file did not exist (clarification Q2 — never reseed an emptied catalog).
      Cache the instance on `globalThis` so Next dev HMR does not reopen the file.
- [X] T011 Create `src/lib/games/repository.ts` — the **only** importer of
      `src/lib/db/client.ts` — with synchronous functions per data-model.md → Repository
      interface: `listGames()` (order `created_at` asc, `id` asc); `getGame(id)`;
      `createGame(input)` (sets both timestamps to ISO UTC now); `updateGame(id, input)`
      (replaces six fields, bumps `updated_at`, returns `undefined` if missing);
      `deleteGame(id) → boolean`; `countGames()`; `searchGames(query, limit)` case-insensitive
      `LIKE %q%` on `title` OR `developer`; `rankGames(metric, order, limit)` ordered by
      metric then `title` asc; `filterGames({ metric?, op?, value?, genre?, developer? })`
      with `op ∈ gt|gte|lt|lte|eq` and case-insensitive equality on genre/developer;
      `findGamesByTitles(titles) → { found, notFound, ambiguous }` using exact
      case-insensitive match, then unique partial match, else list candidates under
      `ambiguous[title]`. Accept an optional `db` parameter (default: the singleton) so tests
      can pass an in-memory instance.
- [X] T012 [P] Create `src/lib/games/format.ts`: `formatUsd(n)` →
      `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })`;
      `formatCount(n)` → `Intl.NumberFormat('en-US')`; `formatRating(n)` → `n.toFixed(1)`.
- [X] T013 [P] Create `src/lib/api/http.ts`: `jsonError(status, code, message, fields?)`
      producing `{ error: { code, message, fields? } }` with
      `code ∈ validation_error | not_found | invalid_id | invalid_json | ai_not_configured`;
      `parseId(param) → number | null` (positive integer only); `readGameInput(request) →
      { ok: true, data } | { ok: false, response }` that returns `400 invalid_json` on
      unparsable JSON and `400 validation_error` with `flattenFieldErrors` output on schema
      failure (contracts/games-api.md).
- [X] T014 Create `src/app/api/games/route.ts` with `POST` only for now: `readGameInput` →
      `createGame` → `201` JSON `Game`. Export `dynamic = 'force-dynamic'`.
- [X] T015 Create `src/app/api/games/[id]/route.ts` with `PUT` and `DELETE`: `parseId` →
      `400 invalid_id`; **check existence first** → `404 not_found`; then (PUT only)
      `readGameInput` → `updateGame` → `200 Game`; DELETE → `deleteGame` → `204` empty body.
      Export `dynamic = 'force-dynamic'`. (Next 16: `params` is a Promise — `await` it.)
- [X] T016 Create `tests/repository.test.ts` using `createDb(':memory:')` seeded with
      `SEED_GAMES`: list returns 12; create/get/update/delete round-trip; `updateGame` on a
      missing id → `undefined`; `rankGames('monthly_revenue_usd','desc',1)[0].title ===
      'Hollow Depths'`; `filterGames({ metric:'average_rating', op:'gt', value:4 }).length
      === 7` and `op:'gte'` → 8; `searchGames('lantern')` → 2; `findGamesByTitles(['hollow
      depths','Nope'])` → one found, `notFound: ['Nope']`.
- [X] T017 Run `npm test && npm run typecheck && npm run lint`; append a "Foundation" entry
      to `AI_WORKFLOW.md` → Running log (what was generated, what was corrected); commit
      `feat: SQLite catalog schema, repository and write endpoints`.

**Checkpoint**: Foundation ready — `data/games.db` is created and seeded on first
`npm run dev`; `curl -X POST /api/games` creates a row; tests pass.

---

## Phase 3: User Story 1 - Manage the Games Catalog (Priority: P1) 🎯 MVP

**Goal**: Dashboard table of all games with add, edit (full replace) and delete, field-level
validation messages, confirmation before delete, empty state, and persistence across reload.

**Independent Test**: quickstart.md → S1 (steps 1–6): seeded table renders with formatted
cells; invalid submission shows four field messages; add → edit → delete round-trip survives
reload; cancelled delete changes nothing; emptied catalog stays empty after restart.

### Implementation for User Story 1

- [X] T018 [P] [US1] Rewrite `src/app/layout.tsx`: HTML shell, Tailwind body classes, a top nav
      with links "Dashboard" (`/`) and "Chat" (`/chat`) that highlights the active route
      (FR-022), `max-w-6xl mx-auto px-6` content container. Replace boilerplate in
      `src/app/globals.css` with `@import "tailwindcss";` plus minimal base styles.
- [X] T019 [P] [US1] Create `src/components/games/GamesTable.tsx` (server-compatible):
      props `games: Game[]`; renders a table with columns Title, Developer, Genre, Monthly
      revenue, Downloads, Rating, Actions; cells use `formatUsd` / `formatCount` /
      `formatRating` (FR-023); numeric columns right-aligned; when `games.length === 0`
      render an empty state "No games yet — add your first game" (FR-008). Each row mounts
      `<GameForm mode="edit" game={…} />` trigger and `<DeleteGameButton id title />`.
- [X] T020 [P] [US1] Create `src/components/games/GameForm.tsx` (`'use client'`): props
      `mode: 'create' | 'edit'`, `game?: Game`. A trigger button ("Add game" / "Edit") opens a
      native `<dialog>` (`showModal()`) containing six labelled inputs (`type="number"` with
      `step` 0.01 / 1 / 0.1 for revenue / downloads / rating). On submit: build `GameInput`,
      `gameInputSchema.safeParse` client-side and show `flattenFieldErrors` messages under
      each field; if valid, `fetch` `POST /api/games` or `PUT /api/games/{id}`; on `400`
      show the server `fields` messages; on `404` show "This game no longer exists" and
      `router.refresh()`; on success close the dialog, reset, and `router.refresh()`
      (FR-002, FR-003, FR-005). Disable the submit button while the request is in flight.
- [X] T021 [P] [US1] Create `src/components/games/DeleteGameButton.tsx` (`'use client'`):
      props `id`, `title`. Click → `window.confirm("Delete \"{title}\"? This cannot be
      undone.")`; on cancel do nothing (FR-004); on confirm `fetch DELETE /api/games/{id}`;
      `204` → `router.refresh()`; `404` → alert "This game no longer exists" then
      `router.refresh()`.
- [X] T022 [US1] Rewrite `src/app/page.tsx` as a server component: `export const dynamic =
      'force-dynamic'`; call `listGames()` from `@/lib/games/repository`; render a page header
      with the game count and the `<GameForm mode="create" />` trigger, then
      `<GamesTable games={games} />` (FR-001).
- [ ] T023 [US1] (HTTP-level checks done: render, persistence, no reseed. Browser click-through pending.) Run quickstart.md → S1 steps 1–6 manually in the browser; fix any
      discrepancy; confirm layout has no horizontal scroll at 1024 px (FR-024).
- [X] T024 [US1] `npm run lint && npm run typecheck`; append a "Dashboard" entry to
      `AI_WORKFLOW.md` → Running log; commit `feat: games dashboard with add, edit and delete`.

**Checkpoint**: User Story 1 is a complete internal tool on its own — the MVP.

---

## Phase 4: User Story 2 - Ask the Assistant About the Catalog (Priority: P2)

**Goal**: Chat view where the operator asks plain-language questions; a `ToolLoopAgent` on
`claude-opus-5-5` answers via four narrow lookup tools against the repository; replies stream
token-by-token with visible lookup chips; errors are shown with Retry.

**Independent Test**: quickstart.md → S2: the 10 scripted questions return the known answers
from the seed dataset; first words appear within 3 s; an edit on the dashboard changes the
very next answer; removing the API key yields the configuration banner while the dashboard
keeps working.

> Before writing any AI SDK call, open the matching bundled doc and copy its shape
> (research.md §12): `node_modules/ai/docs/03-agents/02-building-agents.mdx`,
> `node_modules/ai/docs/03-ai-sdk-core/15-tools-and-tool-calling.mdx`,
> `node_modules/ai/docs/04-ai-sdk-ui/02-chatbot.mdx`,
> `node_modules/ai/docs/04-ai-sdk-ui/03-chatbot-tool-usage.mdx`,
> `node_modules/@ai-sdk/anthropic/docs/05-anthropic.mdx`.

### Implementation for User Story 2

- [X] T025 [P] [US2] Create `src/lib/ai/model.ts`: `import { anthropic } from
      '@ai-sdk/anthropic'`; export `model = anthropic(process.env.ANTHROPIC_MODEL ||
      'claude-opus-5-5')` and `isAiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY)`.
- [X] T026 [US2] Create `src/lib/ai/tools.ts` with four `tool()` definitions (`inputSchema`
      in Zod 4, `execute` calling the repository) exactly as contracts/assistant-tools.md:
      `search_games` `{ query: 1–100 chars, limit?: 1–10 default 5 }` → `{ games,
      total_matches }`; `rank_games` `{ metric: Metric, order?: 'desc'|'asc' default 'desc',
      limit?: 1–20 default 5 }` → `{ games, total_games }`; `count_games` `{ metric?, op?,
      value?, genre?, developer? }` (metric/op/value required together) → `{ count, games
      (first 20), total_games }`; `get_games` `{ titles: 1–5 items, each 1–100 chars }` →
      `{ found, not_found, ambiguous? }`. Each `execute` logs one line
      `[chat] tool=<name> input=<json>` (contracts/chat-api.md). Write tool `description`s
      that say when to use each one.
- [X] T027 [US2] Create `src/lib/ai/agent.ts`: `instructions` string implementing the nine
      rules in contracts/assistant-tools.md → Agent instructions (scope, always look up,
      ambiguity, ties, "last month", thresholds, comparisons, formatting with the `$142,500` /
      `38,200` / `4.7` examples, follow-ups); `new ToolLoopAgent({ model, instructions,
      tools, stopWhen: isStepCount(5), providerOptions: { anthropic: { effort: 'low' } } })`;
      export `type ChatMessage = InferAgentUIMessage<typeof agent>`.
- [X] T028 [US2] Create `src/app/api/chat/route.ts`: `export const maxDuration = 30`; if
      `!isAiConfigured()` return `jsonError(500, 'ai_not_configured', 'ANTHROPIC_API_KEY is
      not set. Copy .env.example to .env.local and add your key.')`; parse body, return `400
      invalid_json` unless `messages` is an array; return `createAgentUIStreamResponse({
      agent, uiMessages: messages, … })`. Check `node_modules/ai/docs/07-reference/` for the
      options that forward error text to the client and suppress reasoning parts, and set
      them (research.md §4 open item).
- [X] T029 [US2] Create `src/components/chat/MessageParts.tsx` (`'use client'`): props
      `message: ChatMessage`. Render `text` parts as paragraphs (preserve line breaks); render
      every `tool-*` part as a compact chip: `input-streaming`/`input-available` → spinner +
      "Looking up {toolName}…" with the stringified `input`; `output-available` → check mark
      + "Looked up {toolName}" with the input summary; `output-error` → warning + `errorText`
      (FR-017). Ignore `reasoning`, `step-start` and other part types.
- [X] T030 [US2] Create `src/components/chat/ChatView.tsx` (`'use client'`): `useChat<ChatMessage>({
      transport: new DefaultChatTransport({ api: '/api/chat' }) })`; message list with
      user/assistant bubbles via `<MessageParts>`; auto-scroll to the newest message; input
      with `maxLength={2000}` and a counter shown from 1,800 chars; Send disabled when input
      is blank or `status !== 'ready'`; "Thinking…" row while `status === 'submitted'`; Stop
      button while `'streaming'` (`stop()`); on `error` show a banner with the error message
      (the `ai_not_configured` text when present) and a Retry button calling `regenerate()`;
      keep partial assistant text visible (FR-012, FR-016, FR-021). Suggested-question chips
      for the three example questions from the brief.
- [X] T031 [US2] Create `src/app/chat/page.tsx` rendering a page header and `<ChatView />`.
- [X] T032 [US2] Create `tests/tools.test.ts`: build a repository on `createDb(':memory:')`
      seeded with `SEED_GAMES` and execute each tool's `execute` for the seven cases in
      contracts/assistant-tools.md → Test expectations (Hollow Depths top revenue; 7 above 4;
      8 at least 4; 2 by "mossgrove studio"; two found/none missing; `['Nonexistent']` →
      `not_found`; "lantern" → 2).
- [X] T033 [US2] (10/10 correct, SC-004 verified; SC-003 met as amended: chip 0.9–2.2 s, text 2.6–4.4 s.) Run quickstart.md → S2: all 10 questions plus the timing, edit-propagation,
      missing-key and empty-input checks. Tune `instructions` or tool descriptions until
      10/10 (SC-002); record every prompt adjustment in `AI_WORKFLOW.md`.
- [X] T034 [US2] `npm test && npm run lint && npm run typecheck`; append a "Chat assistant"
      entry to `AI_WORKFLOW.md` → Running log (include at least one concrete case where the
      model or the coding assistant got something wrong and how it was fixed); commit
      `feat: streaming AI chat with catalog lookup tools`.

**Checkpoint**: Dashboard and chat both work; chat answers reflect dashboard edits
immediately.

---

## Phase 5: User Story 3 - Access the Catalog Programmatically (Priority: P3)

**Goal**: Complete the REST contract with the read endpoints and verify every status code and
error shape in contracts/games-api.md with an HTTP client.

**Independent Test**: quickstart.md → S3: the curl sequence returns `12` on list, `201` with
an `id`, `400` with four `fields` entries, `200` on update, `204` on delete, `404` afterwards.

### Implementation for User Story 3

- [X] T035 [US3] Add `GET` to `src/app/api/games/route.ts`: `listGames()` → `200 Game[]`.
- [X] T036 [US3] Add `GET` to `src/app/api/games/[id]/route.ts`: `parseId` → `400
      invalid_id`; `getGame` → `200 Game` or `404 not_found`.
- [X] T037 [US3] Run the full curl walkthrough from contracts/games-api.md → Examples against
      `npm run dev`, including `GET /api/games/abc` → `400 invalid_id`, a `PUT` to a deleted
      id with an invalid body → `404` (existence before validation), and a body with extra
      keys → stripped. Fix any deviation in `src/lib/api/http.ts` or the route files.
- [X] T038 [US3] Append an "API" entry to `AI_WORKFLOW.md` → Running log; commit
      `feat: games REST read endpoints and contract conformance`.

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: The graded deliverables around the code — README (10%), AI_WORKFLOW.md (30%),
PR — and the final quality gates.

- [X] T039 [P] Rewrite `README.md` (replacing the assessment brief, which stays in git
      history): one-paragraph overview; prerequisites (Node ≥ 22, Anthropic key, no Docker);
      run steps in ≤ 5 commands (`cp .env.example .env.local`, `npm install`, `npm run
      dev`); env vars incl. `ANTHROPIC_MODEL` override; feature tour (dashboard, chat with
      visible lookups, API table of the 5 endpoints); architecture in ~10 lines (single
      repository module, tools call it in-process, no DB in prompt); `npm test` / `lint` /
      `typecheck`; trade-offs (no migrations, session-only chat, no auth, Node ≥ 22,
      Opus by default and how to switch).
- [X] T040 [P] Finalise `AI_WORKFLOW.md`: (1) tools used and why — Claude Code with Spec Kit
      skills, which models; (2) 3–5 concrete prompts with outcomes, drawn from the Running
      log (e.g. the Docker clarification, the storage recommendation, the AI SDK API-drift
      discovery via bundled docs, the prompt tuning in T033); (3) one moment the AI got it
      wrong and the fix; (4) parallel agents / subagents / worktrees — describe actual usage
      or state none were used and why. Keep the Running log as an appendix.
- [X] T041 [P] Add `.github/PULL_REQUEST_TEMPLATE.md` content as a prepared PR body in
      `specs/001-indie-games-dashboard/pr-body.md`: Name, Email (from `git config
      user.email`), Time spent (sum from the Running log), What I built, How to run, Trade-offs,
      and the checklist with all five boxes ticked.
- [ ] T042 (Done: S3, Automated, SC-007 at 45–75 ms for 100 games. Pending: S1 browser click-through, S2 with a real key.) Run the complete quickstart.md validation (S1, S2, S3, Automated, and the SC-007
      check: `POST` 88 extra games in a shell loop, reload `/`, confirm < 2 s) and fix
      anything that fails.
- [X] T043 Final gates: `npm run lint && npm run typecheck && npm test && npm run build`;
      `git status` shows no `.env.local` or `data/*.db`; remove the Sync Impact Report
      comment from `.specify/memory/constitution.md`.
- [ ] T044 (Commit done; push + PR awaiting confirmation.) Commit `docs: README, AI_WORKFLOW and submission notes`; push
      `submission/jorge-sandoval`; open the PR to upstream `main` using
      `specs/001-indie-games-dashboard/pr-body.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately. T001 → T002 → {T003, T004, T005, T006} → T007.
- **Foundational (Phase 2)**: after Setup. T008 → T009 → T010 → T011 → {T014, T015} →
  T016 → T017; T012 and T013 can run any time after T008. **Blocks all stories.**
- **US1 (Phase 3)**: after Foundational. Needs T011 (repository), T012 (format), T014–T015
  (write endpoints).
- **US2 (Phase 4)**: after Foundational. Needs T011 only. Independent of US1.
- **US3 (Phase 5)**: after Foundational. Needs T011, T013. Independent of US1/US2 (edits the
  same two route files as T014/T015, sequentially).
- **Polish (Phase 6)**: after all stories.

### User Story Dependencies

- **US1**: no dependency on other stories.
- **US2**: no dependency on other stories (tools call the repository in-process, not the API).
- **US3**: no dependency on other stories.

### Within Each Story

- US1: T018–T021 in parallel → T022 → T023 → T024.
- US2: T025 ∥ (T026 → T027) → T028 → T029 → T030 → T031 → T032 → T033 → T034.
- US3: T035 ∥ T036 → T037 → T038.

### Parallel Opportunities

- Setup: T003, T004, T005, T006 (four different files).
- Foundational: T012, T013 alongside T009–T011.
- US1: T018, T019, T020, T021 (four components, no shared files).
- US2: T025 alongside T026; T029 can start once T027 exports `ChatMessage`.
- Polish: T039, T040, T041.
- Stories US1, US2, US3 are mutually independent after Phase 2 — a second agent or worktree
  could take US2 while the first finishes US1 (if so, record it in `AI_WORKFLOW.md` §4).

---

## Parallel Example: User Story 1

```bash
# After Phase 2, launch the four UI pieces together (different files, no shared state):
Task: "Rewrite src/app/layout.tsx with nav and container"                      # T018
Task: "Create src/components/games/GamesTable.tsx"                             # T019
Task: "Create src/components/games/GameForm.tsx (dialog, validation, fetch)"   # T020
Task: "Create src/components/games/DeleteGameButton.tsx"                       # T021
# Then wire them up:
Task: "Rewrite src/app/page.tsx to render the table from listGames()"          # T022
```

## Parallel Example: User Story 2

```bash
Task: "Create src/lib/ai/model.ts"                                             # T025
Task: "Create src/lib/ai/tools.ts with the four tools"                         # T026
# then sequentially: agent.ts → route.ts → MessageParts.tsx → ChatView.tsx → page.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup (15 min) → Phase 2 Foundational (35 min).
2. Phase 3 US1 (40 min). **Stop and validate** with quickstart S1.
3. At this point the submission already satisfies "Games CRUD" and half of "API"; commit.

### Incremental Delivery

1. Add US2 (45 min) → validate with the 10 scripted questions → commit. This is the headline
   capability and the second-largest grading item; do not start Polish before it works.
2. Add US3 (10 min) → curl walkthrough → commit.
3. Polish (25 min): README and AI_WORKFLOW.md are 40% of the grade combined — budget for
   them even if it means dropping T016/T032 tests or the suggested-question chips.

### If Time Runs Short (drop in this order)

1. T032 tools test, then T016 repository test.
2. Suggested-question chips in T030; the 1,800-char counter.
3. SC-007 load check in T042.
Never drop: T040 (AI_WORKFLOW.md), T039 (README), streaming + tool chips in US2.

---

## Notes

- [P] tasks = different files, no dependencies.
- Every AI SDK call is copied from `node_modules/ai/docs/…` for the installed version, never
  from memory (research.md §12 lists the known drift).
- Commit at each phase checkpoint with the messages given; keep `.env.local` and
  `data/games.db` out of git.
- Record prompts, corrections and time spent in `AI_WORKFLOW.md` as you go — it is 30% of
  the grade and must not be reconstructed at the end.
