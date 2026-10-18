# AI Workflow

How AI coding tools were used to build this assessment. The Running log at the bottom was
written while working; the four sections above it summarise it.

## 1. Tools used and why

- **Claude Code (CLI)** did all planning, coding, verification and commits. It can run
  commands, so it could check its own work: `npm view` for versions, the docs bundled in
  `node_modules`, tests, `next build`, and curl against the running server.
- **Spec Kit** (`/speckit-*` skills inside Claude Code) for spec-driven development:
  constitution → specify → clarify → plan → tasks → implement. The 2–3 hour time box
  rewards deciding scope up front. Spec Kit gave the assistant written acceptance criteria to
  build and test against, and the artefacts double as evidence of the process. There is one
  spec folder per feature:
  [`001`](specs/001-indie-games-dashboard/) (the brief),
  [`002`](specs/002-dashboard-chat-panel/) (chat moved onto the dashboard) and
  [`003`](specs/003-nocturne-ui-redesign/) (redesign).
- **Claude Design** for the redesign. I designed "Nocturne" there and exported a handoff
  (README, theme tokens, screenshots). Claude Code then turned it into a spec and code.
- **Playwright** (installed in a scratch folder, not the project) so the assistant could test
  the UI in a real browser: 37 checks for 002, 58 for 003.
- **Models:** Claude Opus 5.5 for most of the session. I switched to Claude Fable 5.1 with
  `/model` for 001's constitution, spec, clarify, plan and tasks steps, then back to Opus for
  implementation and for features 002 and 003.
- **No Cursor or Copilot.** One agentic tool with shell access was enough, and kept the whole
  history in one transcript.

## 2. Prompts and outcomes

Five prompts, one per decision that shaped the result. The rest (storage choice, committing
the plan before code, the 1280 px breakpoint) are in the Running log.

1. **`/speckit-specify indie games dashboard with CRUD, REST API and streaming AI chat`**:
   a deliberately short prompt. The constitution, which was derived from the brief's grading
   table, supplied the constraints. Outcome: a spec with 3 prioritised user stories, 24
   testable requirements and 8 measurable success criteria, with no clarification markers
   left. Every later step (plan, tasks, implementation, verification) was checked against it.
2. **`/speckit-clarify does it make sense to create a docker-compose and have a docker for
   the app and another for db? is any other container needed? suggestions?`** Outcome: the
   assistant argued against it. Deployment is out of scope, SQLite is embedded, and every
   reviewer has Node but not every reviewer runs Docker. I chose a single local process,
   which became clarification Q1 and tightened SC-006 to "Node + API key only".
3. **"I'd like to improve the UX, does it make sense to, instead of having a new section for
   the chat, add it directly at home? if so, create a new spec for it?"** Outcome: yes. With
   the chat beside the table, answers can be checked against the data on screen. The
   assistant wrote a separate spec (002) rather than editing the finished 001. Its key design
   decision was one chat that is never unmounted and is moved only by CSS, so the
   conversation survives edits and resizes. A 37-check browser run confirmed it.
4. **"problem found: hide the chat moves the layout, better to not hide it?"** I found this by
   clicking through the app. The assistant's browser checks had *passed* the jump (table
   806 → 1,230 px), because the spec asked for a Hide button. Outcome: Hide removed and the
   spec amended. A test can encode a bad requirement; looking at the screen caught it.
5. **"I have a new version of the UI in https://claude.ai/design/p/…, could we connect to
   it? create a new spec for design improvements?"**, then **"exported to design/003, take a
   look"**. Outcome: the assistant didn't connect, because the only Claude Design tool
   available is reserved for another workflow, and it wouldn't spec a design it couldn't
   see. It opened the exported zip as untrusted input and kept only the files it reviewed. It
   flagged the new scope (search, filters, sorting), then ran spec → plan → tasks → implement
   for 003. Before coding, it computed the design's colour contrast and fixed the one pairing
   at 4.49:1. Result: 58/58 browser checks, 10/10 chat answers, and screenshots matching the
   handoff.

## 3. Where the AI got it wrong

**The plan's Next.js caching instructions were wrong for the installed version.** During
`/speckit-plan` the assistant planned `export const dynamic = 'force-dynamic'` on every route
that reads the database. That's the standard pattern from earlier Next.js versions. But
`create-next-app@16.4` turns on `cacheComponents: true` by default, and in that mode route
segment `dynamic` is **removed**. Worse, better-sqlite3 is synchronous, so its queries finish
during prerendering. Without a fix, `GET /api/games` and the dashboard would have been
**frozen at build time and served stale in production**, while looking fine in `next dev`.

*How it was caught:* the scaffold generated an `AGENTS.md` that says "This is NOT the Next.js
you know… read `node_modules/next/dist/docs/`". Grepping those docs for `better-sqlite3`
turned up the exact case.
*Fix:* `await connection()` before every read in a page or `GET` handler, and `<Suspense>`
around the dashboard's data. *Verified:* `next build` lists `/` as Partial Prerender and the
API routes as dynamic, and against `next start` the list went from 12 to 13 rows after a
`POST`. The deviation is recorded at the top of
[`tasks.md`](specs/001-indie-games-dashboard/tasks.md).

A smaller one: the assistant stopped the dev server with `pkill -f 'next dev'`. That also
matched the shell running its own test script, so the script killed itself halfway through
a check. It was spotted from the truncated output and fixed with `fuser -k 3000/tcp`.

**During the redesign (003)**, four more, each caught before shipping:

- **It wrote a success criterion the design can't meet.** "12 rows visible at 1280×800" was
  never measured; the handoff's row height fits 11. The spec was corrected rather than
  squeezing the design.
- **The handoff's theme CSS couldn't be pasted as-is.** Its unlayered base rules would
  override every Tailwind utility and hide the page's glow background. Moved into
  `@layer base`.
- **The chat input was off-screen.** The rail height assumed it starts at the top of the
  page, but it sits under the header. Caught from the first screenshot.
- **The drawer stayed open after resizing.** Opening the editor on a wide screen marked the
  drawer as open, so it covered the page after the window was narrowed. Caught by the
  browser suite.

Its own test script also had three bugs (reading results before answers finished, not
understanding Tailwind's `oklab()` colours, and testing a game that was never highlighted).
They were fixed before any result was trusted. Details are in the Running log.

## 4. Parallel agents / subagents / worktrees

**None were used for implementation, on purpose.** The codebase is about 1,300 lines, and
the stories share a foundation (schema → repository → routes) that had to land first. After
that, each phase took 3–10 minutes of agent time. Splitting across agents or worktrees would
have added merge and coordination cost for little gain. `tasks.md` still marks the
parallelisable tasks (`[P]`, 14 of 44), and the three user stories are independent once the
foundation exists. On a larger feature, I'd give US1 and US2 to separate agents in separate
git worktrees.

The same reasoning held for 002 and 003. Each was small enough, and its stories shared the
same few files (table, toolbar, rail, chat view), so one agent was simpler than several.

Within the single session, the assistant still parallelised: independent tool calls (file
writes, docs lookups, `npm view` checks) went out together, and the AI SDK was installed in a
scratch directory to read its docs during planning without touching the project.

---

## Running log

### Planning (Spec Kit)

Tool: Claude Code with the Spec Kit skills (`/speckit-*`). Every planning artefact is in
[`specs/001-indie-games-dashboard/`](specs/001-indie-games-dashboard/) and was committed
before any code was written.

| Step | Command | Output |
|---|---|---|
| Constitution | `/speckit-constitution` (no input; derived from the brief) | [`.specify/memory/constitution.md`](.specify/memory/constitution.md): 5 principles mapped to the grading weights |
| Spec | `/speckit-specify indie games dashboard with CRUD, REST API and streaming AI chat` | [`spec.md`](specs/001-indie-games-dashboard/spec.md): 3 prioritised stories, 24 FRs, 8 success criteria |
| Clarify | `/speckit-clarify does it make sense to create a docker-compose …?` | 2 clarifications recorded in the spec |
| Plan | `/speckit-plan` | plan, research, data model, 3 contracts, quickstart |
| Tasks | `/speckit-tasks` | [`tasks.md`](specs/001-indie-games-dashboard/tasks.md): 44 tasks by user story |

- **[prompt] Docker or not.** I asked during `/speckit-clarify` whether to use
  docker-compose with separate app and DB containers. The assistant recommended against it:
  the brief puts deployment out of scope, SQLite is embedded, and reviewers only need Node.
  I accepted. Recorded as clarification Q1, which tightened success criterion SC-006.
- **[prompt] Storage choice.** "The recommendation for storage is SQLite? via better-sqlite3
  or Drizzle?" The answer was Drizzle on better-sqlite3, so that `drizzle-zod` gives one
  validation schema shared by the API, the form and the AI tools (constitution principle III).
  Accepted.
- **Verifying versions instead of trusting memory.** During `/speckit-plan` the assistant ran
  `npm view` for every package and installed the AI SDK in a scratch directory to read its
  bundled docs. That surfaced several AI SDK 7 changes that differ from older examples
  (`isStepCount`, `inputSchema`, `instructions`, `createAgentUIStreamResponse`), recorded in
  [research.md §12](specs/001-indie-games-dashboard/research.md).
- Models: planning used Claude Opus 5.5 and Claude Fable 5.1 (switched with `/model`).
- **[prompt] "before implementing, does it make sense to commit?"** Yes. The planning
  artefacts went in as two commits before any code, so the history shows
  spec → plan → tasks → code in order and gave a rollback point before the scaffold merge.

### Setup (T001–T007)

- Scaffolded with `create-next-app@16.4.2` in a scratch directory, then merged into the repo
  so the existing README, `.gitignore` and planning files were not overwritten.
- **[wrong] The plan's Next.js caching advice was out of date.** The plan said to put
  `export const dynamic = 'force-dynamic'` on every route. The scaffold turned on
  `cacheComponents: true` by default, and the Next 16 docs bundled in `node_modules` say
  route segment `dynamic` is *removed* in that mode. A synchronous `better-sqlite3` read
  would then have been **prerendered at build time and served stale**. Fix: call
  `await connection()` before reads and put the dashboard data behind `<Suspense>`. The
  scaffold's own `AGENTS.md` ("This is NOT the Next.js you know") pointed at those docs.
- Also from the bundled docs: `better-sqlite3` is already in Next's built-in
  `serverExternalPackages` list, so the planned config line was dropped.
- `npm i -D vitest@5` failed with ERESOLVE because the scaffold pins `@types/node@^20` and
  vitest 5 needs `^22 || >=24`. Fixed by bumping to `@types/node@^22`, which matches the
  project's `engines.node >= 22`, rather than using `--legacy-peer-deps`.
- The scaffold's `.gitignore` contains `.env*`, which would have ignored `.env.example`. Only
  the non-conflicting lines were merged.
- `tsc --noEmit` failed on a fresh checkout (`Cannot find name 'LayoutProps'`) because Next 16
  generates those global types at dev/build time. Fixed with the
  `next typegen && tsc --noEmit` script.

### Foundation (T008–T017)

- Schema, seed, DB client, repository, REST write routes and 12 repository tests.
- Design change while implementing: the plan had repository functions take an optional `db`
  argument. A `createRepository(db)` factory turned out cleaner. Tests get an in-memory
  repository, and the app uses `getRepository()`, which opens `data/games.db` lazily so
  `next build` never creates or seeds the file.
- The first typecheck failed: a helper typed as `typeof games.title` would not accept the
  `genre` column, because Drizzle column types carry the column name. Fixed with a union type.
- Vite warned that `vitest.config.ts` used ESM in a CommonJS package. Renamed to `.mts`.
- Smoke test against `next dev`: every status code and error body matched
  `contracts/games-api.md` on the first run, including `404` before body validation for
  stale edits.

### Dashboard (T018–T024)

- Server-rendered table, native `<dialog>` form that validates on the client with the same
  `gameInputSchema` the API uses, confirm-before-delete, and an empty state.
- Cache Components in practice: the page is a static shell, and the catalog streams inside
  `<Suspense>` after `await connection()`. The `next build` route table shows `/` as
  "Partial Prerender", which confirms the catalog is not frozen at build time.
- **[wrong] The assistant's own test script killed itself.** It stopped the dev server with
  `pkill -f 'next dev'`, which also matched the shell running the script, because its command
  line contained that string. The script aborted before the empty-catalog restart check ran.
  It was rerun with `fuser -k 3000/tcp`.
- Verified over HTTP: 12 seeded rows with formatted values, POST shows up after reload, and
  deleting all games then restarting shows the empty state with no reseed. No browser tool was
  available in the session, so the dialog interactions still need a manual click-through.

### Chat assistant (T025–T034)

- `ToolLoopAgent` (AI SDK 7) on `claude-opus-5-5` with `effort: "low"`, four lookup tools,
  `stopWhen: isStepCount(5)`, served by `createAgentUIStreamResponse`. The prompt contains
  rules only; every fact comes from a tool call.
- Resolved the plan's open item by reading the installed SDK's `.d.ts` rather than guessing:
  `createAgentUIStreamResponse` accepts all `UIMessageStreamOptions`, so
  `sendReasoning: false` hides the empty reasoning parts that adaptive-thinking models
  emit, and `onError` replaces the default `"An error occurred."` with a useful message.
- Found SDK helpers (`isToolUIPart`, `getToolName`, `isTextUIPart`) by grepping the type
  definitions, instead of hand-writing `part.type.startsWith("tool-")`.
- Tools take `() => Repository`, so importing the chat route (which `next build` does)
  never opens the database file, and tests can inject an in-memory repository.
- Typecheck caught that `tool.execute()` returns `T | AsyncIterable<T>` (streaming tools).
  Tests use a small typed `run()` helper instead of casting at every call.
- No API key was available in the session, so verification stopped at the provider. With
  no key the route returns `500 ai_not_configured`. With a dummy key the response is a
  proper UI-message SSE stream, Anthropic returns "invalid x-api-key", `onError` logs it,
  and the client receives the friendly message. The 10 scripted questions (T033) are pending
  a real key.

### REST API (T035–T038)

- Added `GET /api/games` and `GET /api/games/[id]`, each calling `await connection()` first.
- Ran the full contract walkthrough against `next start` (production), not just `next dev`,
  because a prerendered `GET` would only go stale in production. The list went from 12 to 13
  after a create, so it is not frozen at build time. All 13 status codes and bodies matched
  `contracts/games-api.md`.

### Live chat evaluation (T033)

Once the API key was in `.env.local`, the assistant wrote a small Node script that plays the
10 scripted questions from `quickstart.md` as one conversation against `next start`. It
parses the SSE stream and records the tool calls, the time to the first lookup chip, the time
to the first text token, and the answer.

- **10/10 factually correct (SC-002).** Every answer came from a tool call. The follow-up
  "And at least 4?" switched `op` from `gt` to `gte` and returned 8. A missing game was
  reported as not found. The off-topic weather question was declined with no tool call.
  "Lantern" made the assistant ask which of the two matches was meant.
- **SC-004:** after `PUT` set Hollow Depths' revenue to $50,000, the next "most revenue"
  answer was Stardust Farm at $98,000, with no restart.
- **[wrong] Markdown in a plain-text UI.** Four answers used `**bold**`, which the chat
  displays literally. Fixed with one prompt rule ("plain text, `- ` lists only"), and those
  questions were rerun to confirm.
- **SC-003 latency only partly met, so I amended the criterion.** The lookup chip appears at
  0.9–2.2 s, but the first words of text arrive at 2.6–4.4 s, because a tool answer needs
  two model round trips (pick a tool, then answer). The assistant offered three options:
  reword the criterion to "first visible response", switch to a faster default model, or
  leave it as is. I chose to reword it. The chip gives feedback well within 3 s, Opus stays
  the default for answer quality, and the change is recorded as a post-implementation
  clarification in the spec. `ANTHROPIC_MODEL` remains the lever if text latency matters.

### Feature 002: Dashboard chat panel

- **[prompt] "I'd like to improve the UX, does it make sense to, instead of having a new
  section for the chat, add it directly at home? if so, create a new spec for it?"** The
  assistant agreed: answers can be checked against the visible table, and the edit → ask
  loop needs no navigation. It created a separate spec (`002`) rather than editing 001,
  because 001 was already implemented and committed. See
  [`specs/002-dashboard-chat-panel/`](specs/002-dashboard-chat-panel/).
- Spec Kit steps: `/speckit-specify` (3 stories, 12 requirements, 6 success criteria),
  `/speckit-plan`, then `/speckit-tasks` (21 tasks).
- Key design decision from the plan: **one chat instance, never unmounted**. Panel, drawer
  and hidden are CSS states of the same element. The bundled Next docs confirm that
  `router.refresh()` keeps client state, so table edits can't wipe the conversation.
  Swapping components at a breakpoint would have.
- While generating tasks, the first draft of T007 told the server-component `page.tsx` to
  call a client hook, then corrected itself in the same sentence. Caught on review and
  rewritten around a client `DashboardShell` wrapper before implementation.
- **Implementation.** One `ChatPanel` (sticky column from 1024 px, off-canvas drawer below),
  a client `DashboardShell` that keeps it outside the catalog's `<Suspense>`, a `/chat` →
  `/#chat` redirect in `next.config.ts`, and the nav removed. No server, API or assistant
  changes.
- **[wrong] A bug the plan missed.** `ChatView` auto-scrolled with
  `scrollIntoView()`, which scrolls *every* scrollable ancestor. Inside a side panel, each
  streamed token would have yanked the whole page. Spotted while reading the component before
  embedding it; fixed by setting the list's own `scrollTop`.
- **Real browser testing this time.** For 001, the dialog checks were left for a manual
  click-through because there was no browser tool. Here the assistant found Playwright's
  Chromium already cached in `~/.cache/ms-playwright`, installed Playwright in a scratch
  directory (not the project), and wrote a 35-check script covering quickstart V1–V4. The
  script ran against `next start` with real chat calls: side-by-side geometry at 1280×800
  (806 px table, 400 px panel, 10 rows and the input visible), conversation kept through
  hide/show, a dashboard edit, resizing and drawer open/close, Escape and focus return,
  backdrop and × closing, and the `/chat` redirect at both widths.
- **[wrong] The script caught a regression, and my first diagnosis was wrong.** After
  tightening table padding, the 768 px "no horizontal page scroll" check failed. The first fix
  (an explicit `grid-cols-1`) didn't help. Measuring elements past the viewport showed the
  real cause: Tailwind's `sr-only` labels ("Actions", "Delete …") are `position: absolute`.
  The table's `overflow-x-auto` wrapper had no `position: relative`, so they escaped the
  scroll container and widened the page. This had been latent since 001. One word fixed it
  (`relative`), and all 35 checks passed.
- Reran the 10 scripted questions against the new build: still 10/10, with lookup chips at
  0.75–2.07 s.
- At 1024–1279 px the table (~550 px) had to scroll inside its own box to reach Rating and
  Edit/Delete. The spec allowed it, but the assistant flagged it from the screenshot and
  suggested raising the side-panel breakpoint. **[prompt] "yes, use the drawer below
  1280px"**, so the panel now starts at
  `xl` (1280 px) and the drawer is used below that. Recorded as a second post-implementation
  clarification. Three new browser checks at 1024 px: drawer, not panel; all columns visible;
  conversation carried over. 37/37 pass.
- **[prompt] "problem found: hide the chat moves the layout, better to not hide it?"** This
  came from clicking through the app by hand. The automated checks had *confirmed* the jump
  (the table went from 806 → 1,230 px) and counted it as a pass, because the spec asked for
  it. The assistant agreed and removed Hide/Show and its state, since the panel is sticky and
  scrolls on its own. It recorded the decision as a post-implementation clarification in spec
  002, amended FR-004, and replaced the browser check with "no Hide control; table width
  never changes". 34/34 checks pass. Lesson: a test can encode a bad requirement; a human
  looking at the screen caught what the script couldn't judge.

### Feature 003: Nocturne redesign

- **[prompt] "I have a new version of the UI in https://claude.ai/design/p/…, could we
  connect to it? create a new spec for design improvements?"** The session had a
  `DesignSync` tool that can read Claude Design projects, but its rules restrict it to the
  user-started `/design-sync` component-sync workflow. The assistant didn't stretch it to
  this use. It asked for an export instead and refused to write a spec before seeing the
  design. The user exported a zip to `design/003/`.
- The zip was treated as untrusted and extracted into an empty scratch folder. The README,
  theme CSS and 7 screenshots were read. The HTML prototypes and the 69 KB `support.js`
  runtime weren't needed and weren't reviewed, so only the reviewed files were copied into
  [`design/003/handoff/`](design/003/handoff/).
- Spec Kit: `/speckit-specify` (4 stories, 29 FRs, 8 SCs), `/speckit-plan`, then
  `/speckit-tasks` (40 tasks). The spec flags new scope the design introduced (search, genre
  filter, sorting), which 001 had ruled out.
- During planning, the assistant computed WCAG contrast for every token pairing in the
  design. One fails by a hair: the subline on a *selected* row is 4.49:1 against 4.5. The plan
  changes that single pairing from 55% to 60% text (≈ 5.0:1).
- **Implementation order deviated from tasks.md, on purpose.** The table, toolbar, rail and
  chat view are each touched by several stories. Writing each file once in its final form,
  then verifying, avoided building them three times. The pure logic and its 25 new unit tests
  came first; the UI was then verified as a whole.
- **[wrong] The handoff's theme CSS couldn't be pasted "verbatim" as its README said.** Its
  base rules (`body { background }`, `:focus-visible`) are unlayered. In Tailwind v4,
  unlayered CSS beats every utility, so `body`'s flat colour would have silently hidden the
  page's glow background. Wrapped in `@layer base`.
- **[wrong] Rail height.** The handoff gives the rail `min(100vh, 900px)`, assuming it starts
  at the top of the page; ours sits under a 54 px header, so the first screenshot had **no
  chat input visible**. Fixed with `calc(100dvh - 54px)`. Caught by looking at the
  screenshot, not by a check, so a "chat input visible" check was added.
- **[wrong] I wrote a success criterion the design can't meet.** SC-002 said "12 rows at
  1280×800" without measuring; the handoff's real row height fits 11. Corrected the spec
  (post-implementation clarification) instead of squeezing the design.
- **A real app bug found by the browser suite.** `openEditor()` always set
  `drawerOpen = true`, which is invisible on wide screens, but after narrowing the window the
  drawer was already open over the page. Now it opens the drawer only when the screen is
  narrow.
- **Three test-script mistakes, fixed before trusting the results.** (1) It waited for the
  Send button, which also shows while a request is only *submitted*, so it read highlights
  before any answer existed. (2) Its colour parser didn't understand Tailwind v4's computed
  `oklab()` colours; replaced with the browser's own conversion via a 1×1 canvas.
  (3) It deleted Moth & Lantern to check the highlight, but at 4.0 it isn't *above* 4, so it
  was never highlighted. The app was right; the test's assumption was wrong.
- Final verification against `next start`: 58/58 browser checks. These cover all four
  stories, the 002 regressions (drawer, Escape layering, `/chat`, no horizontal scroll at
  768/1024/1280/1440), the selected-row contrast measured at **5.05:1**, and zero console
  errors. The 10 scripted questions still score 10/10, and screenshots of states S1–S7 were
  compared with handoff screenshots 01–07. One leftover was fixed: the browser's native blue
  clear button in the search box.
