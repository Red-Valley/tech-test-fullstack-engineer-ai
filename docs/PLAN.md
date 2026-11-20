# PLAN.md: Indie Games Catalog build plan

Step-by-step plan to build everything in [ARCHITECTURE.md](../ARCHITECTURE.md), one small-to-medium commit at a time. Tick a box (`[x]`) when its commit lands and add the hash.

**Before every commit:** `npm run lint && npm run typecheck && npm test` pass, and the commit's **Verify** step has been done.
**At the end of every phase:** run the `code-reviewer` subagent, add a `docs/prompts-log.md` entry ("My call" is left for Cristian), and update the matching section of `AI_WORKFLOW.md`.

---

## Done before this plan

- [x] **Project skeleton**: Next 16, TS strict, Tailwind v4, Vitest, ESLint + Prettier, folders from ARCHITECTURE.md §3 (`454cd26`)

## Phase 0: Workflow capture

- [x] **C0.1 `chore: capture prompts and replies, start AI_WORKFLOW.md`** (`3df0f27`)
  - Copy the kit's `.claude/` into the repo: the prompt hook, `settings.json` and the `code-reviewer` agent.
  - Add a Stop hook, `.claude/hooks/log-conversation.mjs`, that appends each prompt and Claude's text reply to `docs/conversation-log.md`.
  - Create `AI_WORKFLOW.md` with its 7 sections. §1 is filled from real files; the rest are `[MISSING: …]` until there's history.
  - Update `CLAUDE.md` so the logs and `AI_WORKFLOW.md` are updated after every phase.
  - **Verify:** pipe a test payload into each hook and check the appended markdown. Restart the Claude Code session (hooks load at startup), send one prompt, and confirm it shows up in `docs/prompts-raw.md` and `docs/conversation-log.md`.

- [x] **C0.2 `ci: add GitHub Actions workflow`** (`8756c26`): `.github/workflows/ci.yml` runs install → format:check → lint → typecheck → test → build.
  - **Verify:** run the same commands locally in that order. After a push, the Actions run is green.

## Phase 1: Shared contract

- [x] **C1.1 `chore: next config for nodejs route handlers`** (`1c390b4`): turn off the scaffold's `cacheComponents`. With it on, Next 16 forbids the `runtime = 'nodejs'` export that ARCHITECTURE.md §2 requires, and it would run synchronous better-sqlite3 queries at build time.
  - **Verify:** `npm run build` succeeds.

- [x] **C1.2 `feat(shared): genres, zod schemas, DTO types`** (`1c390b4`): `shared/constants/genres.ts`, `shared/schemas/game.schema.ts` (`gameSchema`, `gameInputSchema`, `gameUpdateSchema`), `shared/types/game.dto.ts`, plus unit tests.
  - **Verify:** `npm test` shows passing cases for: title of 0 and 101 characters rejected, genre outside the list rejected, negative or non-integer revenue and downloads rejected, rating 5.1 and 3.25 rejected and 4.5 accepted.

## Phase 2: Database

- [x] **C2.1 `feat(db): sqlite client, schema, games repository`** (`d318848`): `server/db/client.ts` (reads `DB_PATH`, creates the table if missing, `UNIQUE COLLATE NOCASE` on title), `schema.sql`, `server/http/errors.ts` (`ConflictError`, `NotFoundError`), and `server/repositories/games.repository.ts` (prepared statements only, the only code that runs SQL). Tests run against an in-memory DB.
  - **Verify:** `npm test` covers list with filters and sort, get, create, update and delete, a case-insensitive duplicate title throwing `ConflictError`, and SQL-looking input stored as plain text.

- [x] **C2.2 `feat(db): test fixture + seed`** (`2a8d633`): `tests/fixtures/games.fixture.ts` (includes the prompt-injection game) and `seed.ts` with ~25 invented games inserted through the repository, no tie for top revenue, and ratings both above and below 4. Adds the `seed` and `db:reset` scripts (run with `tsx`).
  - **Verify:** `npm run db:reset`, then `sqlite3 data/games.db "select count(*) from games; select title, monthly_revenue_usd from games order by 2 desc limit 2;"` shows about 25 rows and two different top revenues.

_Order swapped from the first draft: the seed has to go through the repository, because ARCHITECTURE.md makes the repository the only code that runs SQL._

## Phase 3: Services + REST API

- [x] **C3.1 `feat(api): games service + http helpers`**: `server/services/games.service.ts` (filter and sort rules, stats, aggregates, fuzzy title match, compare) and `server/http/responses.ts`, with tests.
  - **Verify:** `npm test` checks exact stats against the fixture, fuzzy match on a misspelled title, and that a compare ratio is computed in code.

- [ ] **C3.2 `feat(api): games route handlers`**: `api/games`, `api/games/[id]`, `api/games/stats`.
  - **Verify:** with `npm run dev` running, curl each endpoint and check the status code:
    - `GET /api/games?genre=Roguelike&sortBy=revenue&order=desc` → 200
    - `POST` a valid game → 201, the same title in different case → 409, a bad body → 400 with `fieldErrors`
    - `GET /api/games/9999` → 404, `PUT` → 200, `DELETE` → 204 and then 404
    - `GET /api/games/stats` → the five fields, with values matching sqlite

## Phase 4: Frontend data layer _(worktree `feat/ui`, parallel with Phase 6)_

- [ ] **C4.1 `feat(client): domain, http client, api, transformers`**, with transformer tests.
  - **Verify:** `npm test` shows DTO⇄domain round-trips, and an empty form field becomes a validation error instead of `0`.

- [ ] **C4.2 `feat(client): hooks + CatalogContext`**: `use-games`, `use-game-mutations`, `use-game-stats`, and `catalog-context.tsx` (`highlightedGameIds`, `refreshCatalog`).
  - **Verify:** typecheck and lint pass, including the client-must-not-import-server rule. Checked in the browser in Phase 5.

## Phase 5: Dashboard UI _(worktree `feat/ui`)_

- [ ] **C5.1 `feat(ui): primitives + format helpers`**: Button, Input, Select, Modal (focus trap, closes on Esc), Badge, Spinner, EmptyState, plus `lib/format.ts` with tests.
  - **Verify:** `npm test` for USD, thousands separators and one-decimal ratings. In the browser, Tab stays inside the modal and Esc closes it.

- [ ] **C5.2 `feat(ui): KPI cards + games table`**: dashboard and table containers with loading, error and empty states.
  - **Verify:** in the browser, the KPI values equal `curl /api/games/stats`. Stop the server to see the error state, and empty the DB to see the empty state. At ≤768px the dashboard and chat stack.

- [ ] **C5.3 `feat(ui): create/edit modal + delete`**
  - **Verify:** in the browser, create a game (row appears, KPIs update), edit it, enter a duplicate title (409 shown on the field), and delete it.

## Phase 6: AI tools + chat route _(worktree `feat/ai`, parallel with Phases 4–5)_

- [ ] **C6.1 `feat(ai): model, system prompt, read-only tools`**: `query_games`, `aggregate_games`, `find_game`, `compare_games`, all calling the service. Level 1 tests.
  - **Verify:** `npm test` shows `limit` capped at 10, `total` given before the limit, `notFound` with suggestions, `{ error }` on bad input, and no tool returning more than 10 games.

- [ ] **C6.2 `feat(ai): streaming chat route`**: `streamText` with `stopWhen: stepCountIs(5)`, a 503 when there's no API key, and a 400 on a bad body. Level 2 tests use the mock model from `ai/test` (confirm the exact export first).
  - **Verify:** `npm test` shows the tool executes, text arrives in more than one chunk, and the 503 and 400 cases. Manually, curl without a key → 503, then with a key: `curl -N -X POST localhost:3000/api/chat …` streams the answer.

## Phase 7: Chat UI _(after both worktrees are merged)_

- [ ] **C7.1 `feat(ui): chat panel`**: MessageList, MessageBubble, ToolCallChip, ChatInput, SuggestionChips, and the chat container with `useChat` and a Stop button.
  - **Verify:** in the browser, the three suggestion chips get correct answers (checked against sqlite), tool chips go from running to done, and Stop works. With no key, the 503 message shows in the UI.

- [ ] **C7.2 `feat(ui): highlight rows from chat`**
  - **Verify:** in the browser, ask "Top 3 by downloads?" and those 3 rows are highlighted.

## Phase 8: Evals (Level 3)

- [ ] **C8.1 `feat(evals): eval db, cases, grader`**: `eval:db` script (builds the DB from the fixture), `evals/cases.ts` (~20 cases covering every category in ARCHITECTURE.md §7.3, with expected answers computed by code), and `evals/grade.ts` with unit tests.
  - **Verify:** `npm test` shows grader normalization (`$1.2M`, `1,200,000`, `4.5`) and that a runner-up named as the winner fails.

- [ ] **C8.2 `feat(evals): runner + first results`**: `evals/run-evals.ts` (server and eval-DB check, `--runs 3`, `console.table`, `latest.json`/`latest.md`, exit 1 if below threshold).
  - **Verify:** run `npm run eval:db && DB_PATH=data/eval.db npm run dev`, then `npm run eval` in a second terminal. The tables print, both result files are written, and accuracy is visible. Failing cases get fixed before the results are committed.

## Phase 9: Deliverables

- [ ] **C9.1 `docs: README`**: setup, env vars, scripts, API table, chat tools, eval table, trade-offs, screenshot.
  - **Verify:** fresh clone in `/tmp` → the one-command setup works.

- [ ] **C9.2 `docs: AI_WORKFLOW.md final + PR template/description`**, built from the logs.
  - **Verify:** no `[MISSING]` left unexplained, and every claim traces to the logs or git.

---

## Parallel work

After Phase 3 the API contract is fixed, so two worktrees can run at the same time without touching the same files:

| Worktree  | Phases | Owns                                                              |
| --------- | ------ | ----------------------------------------------------------------- |
| `feat/ui` | 4–5    | `src/client/**`                                                   |
| `feat/ai` | 6      | `src/server/ai/**`, `src/app/api/chat/**`, `tests/integration/**` |

Merge `feat/ai` first, then `feat/ui`. Phase 7 needs both, so it runs on `main` after the merge. Each branch gets a `code-reviewer` pass before merging.

## Decisions taken in this plan

- **C1.1:** turn off `cacheComponents` to keep ARCHITECTURE.md §2 (`runtime = 'nodejs'`) as written.
