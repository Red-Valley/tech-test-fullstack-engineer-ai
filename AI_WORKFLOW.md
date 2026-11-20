# AI_WORKFLOW.md

How AI coding tools were used for this assessment.

This is a **living log**. It is updated at the end of every stage, prompts are quoted verbatim, and
every check is marked as either **done** (with the command that was actually run) or **not yet
done**. Nothing in here is written from memory after the fact.

Legend: ✅ done and observed · ⬜ not done yet · ⚠️ partly done / caveat

---

## 1. Tools used, and why

| Tool | Used for | Why |
|---|---|---|
| **Claude Code** (VS Code extension), model **Claude Sonnet 5.5** | Everything: reading the brief, planning, scaffolding, writing code, running the checks, writing docs | It works inside the repo and the terminal, so each stage could be built and then *verified by running it* (typecheck, lint, build, tests, HTTP calls) instead of just generating code and hoping. |
| **`claude-api` skill** (bundled with Claude Code) | Reference for the Anthropic SDK: current model IDs, the streaming + tool-use patterns, API drift | My own knowledge of the SDK is older than the SDK installed here (`@anthropic-ai/sdk` 1.x). The skill is the source of truth for model names and tool-use shapes. |
| **Next.js docs bundled in `node_modules/next/dist/docs`** | Checking Next 16 behaviour (route handler params, caching model, `serverExternalPackages`) | Next 16.4 differs from what I remember, so I read the docs for the version actually installed rather than relying on memory. |

---

## 2. Prompts and outcomes

Only prompts that were actually sent are listed. Follow-up prompts from the reviewer are appended as
they happen.

### Prompt 1 — kickoff (verbatim)

> Please read README.md, the pull request template, and any repository instructions to understand this assessment.
>
> Briefly summarize the requirements and propose a practical approach within the suggested time limit. Then implement the solution in manageable stages, keeping the code clear and avoiding unnecessary complexity.
>
> Validate each stage with appropriate checks, and explain the key design decisions and trade-offs so I can review and understand the implementation. Let me know when any credentials or decisions are needed.
>
> Maintain AI_WORKFLOW.md throughout the process, recording the actual prompts, outcomes, and any mistakes we identify and correct. Clearly distinguish completed checks from anything still unverified.
>
> Before finishing, review the implementation against the assessment requirements and update the setup documentation. Leave the changes ready for my review without committing, pushing, or opening a pull request.

**Outcome (so far):**

- Read `README.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`. The repo has no other instruction
  files (no `CLAUDE.md` / `AGENTS.md` / contributing guide).
- Produced a 7-stage plan sized to the 2–3 h limit (below) and named the three things that need a
  human decision (API key, default model, refusal fallbacks).
- Stage 0 (scaffold) is done — see the ledger.

**The plan that came out of this prompt**

| Stage | Content | How it is verified |
|---|---|---|
| 0 | Scaffold: Next.js, Tailwind, Vitest, this file | typecheck, lint, build |
| 1 | SQLite data layer, zod validation, fictional seed data | unit tests |
| 2 | REST API `/api/games`, `/api/games/[id]` | handler tests + real HTTP calls |
| 3 | Dashboard UI (stats, search, sort, create / edit / delete) | browser smoke test + screenshots |
| 4 | Chat backend: 3 read-only tools, streaming tool loop, `/api/chat` | tests against a scripted Messages API |
| 5 | Chat UI: streaming, tool-call chips, markdown | browser test against a mock API, then a live check |
| 6 | README / setup docs, requirements review, finish this file | checklist against the brief |

---

## 3. Where the AI got it wrong (and how it was fixed)

> The brief asks for one concrete moment. Everything that was actually caught is logged here; the
> most instructive one is flagged at the bottom once the work is finished.

### 3.1 Stale knowledge of the toolchain — caught before it shipped (stage 0)

- **What went wrong:** my plan assumed the Next.js / Tailwind setup I remembered: Tailwind v4 wired
  through `postcss.config.mjs`, and the classic App Router caching model. The versions `npm` resolved in
  November 2026 were newer than that (Next **16.4.6**, Tailwind **4.3**). My first command to inspect
  the scaffold tried to read a `postcss.config.mjs` — it does not exist, because Tailwind is now wired
  through a Turbopack loader in `next.config.ts`, and the template also switches on `cacheComponents`.
- **How it was caught:** I scaffolded a reference app with the official `create-next-app` in a scratch
  folder (outside the repo) and read its generated files instead of writing config from memory, then
  read the bundled Next docs for the behaviours I depend on.
- **Fix / decisions that came out of it:**
  - Copied the template's real Tailwind + ESLint + tsconfig setup.
  - The template enables `cacheComponents`. I **left it off**: with it on, a *synchronous* SQLite read
    cannot be detected as dynamic, so Next could prerender build-time seed data into pages and `GET`
    routes. The classic model (`dynamic = "force-dynamic"`) is simpler and safe.
  - Dropped the template's `next/font/google` (needs network at build time) for the system font stack.
  - Avoided the generated global helper types the template uses (`LayoutProps`, `RouteContext`) so
    `tsc` works on a fresh clone before `next dev` / `next build` has generated them.
  - Set `agentRules: false` in `next.config.ts` so `next dev` does not drop an `AGENTS.md` into the repo.

### 3.2 Switched LLM integration after reading the Claude API skill (stage 0)

- **What went wrong:** my first instinct was the Vercel AI SDK (`ai` + `useChat`). Loading the
  `claude-api` skill showed the intended path for Claude is the official `@anthropic-ai/sdk`, and that
  the AI SDK's chat protocol would add a framework layer on top of a ~50-line tool loop that the brief
  explicitly wants to see.
- **Fix:** use `@anthropic-ai/sdk` directly (streaming + a tool loop I own). Not a bug, but a decision
  that changed because of new information, so it is recorded.

### 3.3 A test asserted the wrong thing; the code was right (stage 1)

- **What went wrong:** the first test run was 33/34 green. The failing test compared the genre list
  returned by SQL with JavaScript's default `.sort()`. The database sorts case-insensitively
  (`COLLATE NOCASE` → `Racing, Roguelike, RPG`); JS sorts by code unit (`RPG` first). I had written the
  expectation without remembering the column's collation.
- **How it was caught:** by actually running the suite rather than assuming. The diff in the failure
  output made the cause obvious.
- **Fix:** the *test* was changed to a case-insensitive comparator, with a comment. The case-insensitive
  order is the deliberate, friendlier behaviour (it is what a person scanning a genre list expects), so
  the implementation stayed as it was.

### 3.4 A "passing" restart check that proved nothing (stage 2)

- **What went wrong:** my first real-HTTP smoke run reported **31 / 31 PASS**, including "data survives a
  server restart". It did not. The script "restarted" the server with `kill $PID`, but on Windows that
  only kills the shell wrapper, not the `node` process. The second `next start` died with `EADDRINUSE`,
  and `curl --retry` happily connected to the *old* server still running — so the restart checks
  were answered by the process that had never restarted.
- **How it was caught:** not by the checks themselves. After the run I explicitly confirmed the
  server was stopped, and port 3100 still returned `200`. The server log then showed the `EADDRINUSE`
  crash.
- **Fix:** the harness now stops the server by the port it listens on (PowerShell), asserts the port is
  closed (`000`) *before* restarting, aborts if the port is already taken or the new server logs
  `EADDRINUSE`, and asserts the port is closed again at the end. Re-run: **34 / 34**, this time with a
  genuine restart.
- **Lesson:** a green check is only evidence if it could have failed. Checks for "it restarted" need a
  control that proves the old process is gone.

### 3.5 The page scrolled sideways on phones, and my first debugging heuristic hid the cause (stage 3)

- **What went wrong:** the dashboard browser test passed 47 / 49. One failure was real: at 390 px wide the
  *whole page* scrolled horizontally (document scroll width 705 px), even though the table sits inside
  its own `overflow-x-auto` container. No unit test or typecheck could have caught this.
- **What I got wrong while debugging:** my first diagnostic script listed elements wider than the
  viewport but **skipped anything inside a scroll container** (reasoning that those are allowed to be
  wide). It reported *no offenders*, while the page was clearly 705 px wide — the heuristic had excluded
  the culprit. The width (705 ≈ the table's 704 px minimum) pointed at the table anyway.
- **Root cause:** the `sr-only` screen-reader labels in the table (`position: absolute`). The scroll
  wrapper was not `position: relative`, so those labels were *not clipped* by it and stretched the page.
- **How it was confirmed before fixing:** set `position: relative` on the wrapper in the live page and
  re-measured: scroll width 705 → 390. Only then was the one-word fix (`relative`) made in the component,
  with a comment explaining why.
- **Same test run, two non-bugs:** a console error that was the browser logging my *intentional* 409
  (duplicate-title test) — the check now expects exactly one such log instead of ignoring all errors; and
  the first run hung on `networkidle` because the header links to `/chat`, which does not exist until
  stage 5 (its prefetch 404s). I switched the test to wait for rendered content and to tolerate only that
  one known 404 — **to be re-checked once the chat page exists** (see ledger).

### 3.6 An empty chat request crashed the validator — a 500 where a 400 belonged (stage 4)

- **What went wrong:** the first run of the new chat tests was 120 / 121. The failing test sent
  `{ "messages": [] }`. My request schema rejected that with `.min(1)`, but *also* ran an object-level
  `.refine(({ messages }) => messages[0].role === "user" …)` which indexed into the empty array and threw a
  `TypeError`. I had assumed zod stops evaluating once a check has failed; zod 4 keeps running refinements
  after a non-aborting check like `.min()`. Through the real route, `handle()` would have turned that
  `TypeError` into a **500 "Internal server error"** — a client mistake reported as a server fault.
- **How it was caught:** by a test I wrote for exactly that input (I had listed "empty conversation" as an
  edge case before running anything). The stack trace pointed at the refine.
- **Fix:** the refine now short-circuits on an empty list (which is already reported as "Send at least one
  message"), and the test asserts the *exact* issue list `["Send at least one message"]`, so a duplicate or
  a crash would fail it.

### 3.7 Two layers of bug in my own test harness made a correct app look broken (stage 5)

- **What went wrong:** the first end-to-end chat run failed immediately — the mock Anthropic server answered
  `401 "x-api-key header is required"`. The app was fine; the harness was wrong, twice:
  1. **Stale knowledge.** I wrote the mock to require the legacy `x-api-key` header. The installed SDK
     (1.11) sends API keys as `Authorization: Bearer <key>`; I only found that by reading the SDK's
     `authHeaders()` source and then confirming with a bare client against a header-echo server.
  2. **My own fix broke the fix.** I patched the mock's check with a regex via a shell heredoc and the
     backslashes were eaten: the file contained `/^Bearers+S+/`, which can never match `Bearer sk-…`. The
     second run failed with a *different* message that looked like progress, but still blamed the app's
     credentials.
- **How it was caught:** by refusing to assume. I logged the raw header *names* the mock received
  (`authorization` was there), then the header *value* (`"Bearer sk-ant-mock-key"` — perfectly valid), which
  made it obvious the mock's own regex was the problem, and `grep` showed the mangled line.
- **Fix:** corrected the line with an exact-match edit (not a script that re-escapes), accepted both
  credential styles in the mock, and made the test record *which* credential style the SDK used.
- **Lesson:** when a check fails, find out which side is wrong before changing the product. And never patch
  regexes through layers of shell escaping.

### 3.8 Minor slips (no impact)

- A chained `cat a && cat b` command stopped at the missing `postcss.config.mjs` and truncated the
  output I wanted — re-ran the reads separately.
- A one-liner that `require()`d `@anthropic-ai/sdk/package.json` failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`
  (the package does not export it). Used `npm ls --depth=0` instead.
- `vitest.config.ts` produced a Vite warning (ESM syntax in a CommonJS-loaded file). Renamed it to
  `vitest.config.mts` rather than flipping the whole project to `"type": "module"`.
- I dropped the template's favicon when simplifying the layout, so browsers requested `/favicon.ico` and
  got a 404 (a console error). Added `src/app/icon.svg`, which Next serves as the app icon.
- In the form, "Revenue / month (USD)" wrapped to two lines and pushed its input out of line with the
  other two. Spotted in the screenshot (not by any assertion); labels shortened.
- A regex with the `s` flag in a test helper failed the typecheck (`TS1501`: the template targets ES2017).
  Rewrote it as `[\s\S]` instead of raising the project's compile target for one helper.
- **A dev-mode failure that was not a product bug (stage 5):** the first chat run against `next dev` failed
  at the first interaction. Before touching the app I probed it: `curl` showed `/chat` returning 200 with the
  heading in the HTML and no errors, and the crash screenshot showed a fully rendered, idle page. Cause: my
  test clicked a suggestion before React had hydrated on a cold dev server, so the click did nothing. The
  test now waits for React to tag the DOM as hydrated (rather than a fixed sleep); the suite passes 52 / 52.
- **Design hole caught in self-review, before it shipped (stage 5):** while wiring the chat UI I noticed the
  server caps messages at 4,000 characters and a conversation at 30 messages, but the browser would happily
  resend a long assistant answer or a 40-message history — so a *follow-up question* would have failed with a
  confusing 400. Fixed in a pure, tested function: the client sends a rolling window that starts and ends on
  a question, trims very long replies, and replies get a larger server cap (8,000) than questions (4,000).
  The test checks the real scenario (41 messages) against the server's own schema.

---

## 4. Parallel agents / subagents / worktrees

None so far. Work has been sequential in a single Claude Code session. This section is updated at the
end with whatever was actually used (for example an independent review pass) and what it found.

---

## 5. Verification ledger

### Stage 0 — scaffold

| Check | Status | Evidence |
|---|---|---|
| Dependencies install on this machine (Windows 11, Node 22.23.2) | ✅ | `npm install` → 499 packages |
| `better-sqlite3` native binary loads and runs SQL | ✅ | `node -e` opened `:memory:` DB → SQLite 3.54.1, insert + select OK |
| TypeScript | ✅ | `npx tsc --noEmit` → exit 0 |
| Lint | ✅ | `npm run lint` → exit 0 |
| Production build | ✅ | `npm run build` → Next.js 16.4.6 (Turbopack) compiled, 3/3 pages |
| Unit tests | ⬜ | No tests existed at this stage (they arrive with stage 1) |
| Anything involving the Anthropic API | ⬜ | No API key available yet; nothing has been run against the live API |

### Stage 1 — data layer (SQLite + validation + seed)

| Check | Status | Evidence |
|---|---|---|
| TypeScript | ✅ | `npx tsc --noEmit` → exit 0 |
| Lint | ✅ | `npm run lint` → exit 0 |
| Unit tests | ✅ | `npx vitest run` → 3 files, **34 tests passed** |
| ↳ Validation rules | ✅ | Per-field messages, trimming, 2-decimal rounding, wrong types, unknown fields ignored, empty PATCH rejected |
| ↳ CRUD + constraints | ✅ | create/get/update/delete, case-insensitive unique title (on create *and* rename), DB `CHECK` constraints as a backstop |
| ↳ Query semantics | ✅ | "above 4" is strict `>` and differs from `>=` on the seed (several games are exactly 4.0); filters combine with AND; genre + search are case-insensitive |
| ↳ Safety | ✅ | `%`/`_` in search are literal; a `'; DROP TABLE games; --` value changes nothing; unknown column / operator names are refused |
| ↳ Aggregates | ✅ | count / sum / avg / min / max and group-by-genre match values computed independently in JS from the seed; empty result → `0` / `null`, not an error |
| ↳ Title resolution | ✅ | exact (any case), single partial match, ambiguous (lists candidates), not found |
| ↳ Persistence | ✅ | Real temp-file DB: parent folder auto-created, data survives reopen, seed runs once (deleting all games does not re-seed) |
| Multi-process access to the same DB file | ⬜ | Not tested; `better-sqlite3` is single-process, which is fine for this app |

### Stage 2 — REST API

| Check | Status | Evidence |
|---|---|---|
| TypeScript / lint | ✅ | `tsc --noEmit` and `npm run lint` → exit 0 |
| Route-handler tests | ✅ | `vitest run` → 4 files, **47 tests passed** (13 new). Real handlers, real `Request` objects, a fresh seeded in-memory DB per test; covers list/filter/sort, 201 + `Location`, per-field validation issues, malformed JSON, 409 duplicate, GET/PUT/PATCH/DELETE, 404, malformed id → 400, internal errors hidden behind a generic 500 |
| Production build | ✅ | `npm run build` → `/api/games` and `/api/games/[id]` are dynamic (ƒ), never prerendered |
| Real HTTP against `next start` | ✅ | Scratch-folder script, **34 checks / 34 passed** on a fresh DB: list, `?genre&sort&order`, `?q`, create (201 + `Location`), validation (400 with 4 issues), bad JSON, duplicate (409), get / put / patch / delete, 404s, `abc` id → 400, `PUT /api/games` → 405 |
| Persistence across a genuine restart | ✅ | After the harness fix (see 3.4): server confirmed down, restarted, data intact (25 rows = 24 seed + 1 created, not re-seeded) |
| Smoke script in the repo | ⚠️ | It lives in my scratch folder (Windows-specific process handling), so it is **not** part of the submission. The README documents equivalent `curl` calls |

### Stage 3 — dashboard UI

| Check | Status | Evidence |
|---|---|---|
| TypeScript / lint | ✅ | `tsc --noEmit` and `npm run lint` → exit 0 (includes the React-hooks lint rules) |
| Unit tests | ✅ | `vitest run` → 5 files, **58 tests passed** (11 new for filter / sort / next-sort / genres / stats) |
| Production build | ✅ | `/` is dynamic (ƒ) — server-rendered per request, not prerendered with build-time data |
| Browser test, real Chrome 157 against `next start` | ✅ | Scratch-folder Playwright script, **50 checks / 50 passed** (after the fix in 3.5) |
| ↳ Rendering | ✅ | 24 seeded rows, stats cards, default sort, `aria-sort` |
| ↳ Search / filter / sort | ✅ | search, no-match empty state + "Clear filters", genre filter, stats follow the filter ("1 of 24"), numeric columns sort biggest-first then flip, text sorts A–Z |
| ↳ Create | ✅ | empty submit → 6 inline errors and focus on the first bad field; valid submit → dialog closes, row appears, toast, stats update; duplicate title → server 409 shown *inline on the Title field*, dialog stays open |
| ↳ Edit / delete | ✅ | edit prefills and saves; delete asks first, **Cancel has initial focus**, cancel deletes nothing, confirm removes the row |
| ↳ Dialog behaviour | ✅ | Esc closes, backdrop click closes |
| ↳ Server state | ✅ | after a full page reload the data is still there |
| ↳ Mobile (390 px viewport) | ✅ | no sideways page scroll; the table scrolls inside its own card |
| ↳ Console | ✅ | no console errors, no hydration warnings, no page errors (only the deliberate 409 log, asserted to occur exactly once) |
| Screenshots reviewed by eye | ✅ | desktop, validation dialog, delete dialog, mobile — this is how the label-wrap in the form was found |
| Re-run after the label fix + final styling | ✅ | Repeated at the end of stage 5 on the final build: **50 / 50**, with the temporary `/chat` 404 tolerance removed (the page exists now) and the label fix confirmed in the screenshot |
| Browsers other than Chrome | ⬜ | Only Chrome was driven. Firefox / Safari untested |
| Real touch device, screen reader, dark mode | ⬜ | Not tested. Mobile = an emulated 390 px viewport only. The UI is light-theme only |
| Known limitation (by design) | ⚠️ | On phones the table scrolls sideways, so the Edit / Delete buttons are off-screen until you scroll. Fine for a desktop-first internal tool; a card layout would fix it |

### Stage 4 — chat backend (tools + streaming loop + `/api/chat`)

How it is tested: a **scripted stand-in for the Messages API** is injected as the SDK's `fetch`. Nothing in the
SDK is mocked — the *real* Anthropic client parses scripted Server-Sent-Events (text deltas, tool inputs
arriving as partial-JSON fragments, thinking blocks, stop reasons), so the real stream parser, the real tool
loop and the real request building all run. Only the model's decisions are scripted.

| Check | Status | Evidence |
|---|---|---|
| TypeScript / lint | ✅ | `tsc --noEmit`, `npm run lint` → exit 0 |
| Tests | ✅ | `vitest run` → 12 files, **122 tests passed** (64 new) |
| ↳ Tool schemas (what the model sees) | ✅ | 3 tools; valid JSON Schemas; `$schema` stripped; operators spelled out (`gt` = strictly greater); required fields; `titles` has `minItems: 2` |
| ↳ `search_games` | ✅ | top earner = Echoes of Halcyon; "cut off" note with totals; **`gt` vs `gte` differ on games rated exactly 4.0**; genre case-insensitive; unknown genre → note listing real genres; invalid input → readable error; no internal ids leaked |
| ↳ `aggregate_games` | ✅ | count with a condition; avg per genre (RPG = 4.8 over 2); sum per developer; `metric` enforced for non-count; empty result → `null` + note |
| ↳ `compare_games` | ✅ | all metrics + ranking + leader + exact gap (revenue gap $104,549.75 = 105.9 % higher); case-insensitive and partial titles; ambiguous → candidates; unknown → reported; same game twice → no self-comparison; ties → `leader: null` |
| ↳ Tool loop | ✅ | one API call for a plain answer; text arrives as several deltas; tool call → result → answer in the right order; the follow-up request contains the model's own `tool_use` turn and the matching `tool_result` (JSON parsed back to the right game); parallel calls answered in one user message, in order; bad input comes back as `is_error` and the model recovers; invented tool name handled |
| ↳ Thinking blocks | ✅ | Opus 5.5 always thinks: a thinking block with its signature is passed back unchanged and in order in the follow-up request |
| ↳ Safe stopping | ✅ | refusal → clear error; **a tool call cut off by `max_tokens` is never executed**; a runaway loop stops after `maxSteps` with an error |
| ↳ Request shape | ✅ | model, `stream: true`, system prompt, 3 tools, `max_tokens: 16000`; no `temperature` / `top_p` / `top_k` / `tool_choice` / `thinking` (newer Claude models reject some of these) |
| ↳ Streaming plumbing | ✅ | first event readable while the job is still running (would hang if buffered); error → `error` + `done`, details not leaked; browser disconnect aborts the upstream call and later writes are harmless; request abort propagates; client-caused aborts are not logged as errors |
| ↳ `/api/chat` route | ✅ | 400 for bad JSON / bad conversation; **503 with setup instructions when no API key**; SSE headers; full tool-assisted answer ends with `done`; the system prompt carries only the game *count* and genre names — **the catalog is never put in the prompt**; model defaults to `claude-opus-5-5` and honours `ANTHROPIC_MODEL`; API failure arrives as an `error` event |
| ↳ Wire protocol + request schema | ✅ | round-trip of every event, reassembly when split at any byte boundary, malformed events skipped; message-count / length caps |
| ↳ Error messages | ✅ | rejected key, wrong model, rate limit, permission, network down, API's own message (e.g. empty credit balance) surfaced; unknown errors generic |
| **Real Anthropic API** | ⬜ **NOT VERIFIED** | No API key yet. Nothing has been sent to the live API. Everything above proves *my* code behaves correctly against the documented wire format; it does not prove the API accepts these exact requests or that the model chooses the right tools |
| ↳ Model behaviour | ⬜ **NOT VERIFIED** | Whether Opus 5.5 reads the tool descriptions as intended (picks `gt` for "above 4", sorts desc + limit for "most revenue", uses `compare_games` for "A vs B") is only checkable with a live key. The three example questions from the brief are the live acceptance test |
| ↳ Tool schema acceptance | ⬜ **NOT VERIFIED** | The JSON Schemas use `minItems` / `maxItems` / `minimum` / `maximum` / `enum`. They come from the same `z.toJSONSchema` the SDK's own helper uses, but only a live call confirms the API accepts them |

### Stage 5 — chat UI, and the whole chain end to end

How it is tested: the **production build** (`next start`) is driven by real Chrome while talking, over real HTTP,
to a **separate mock-Anthropic process** that I wrote (outside the repo). The mock speaks the streaming wire
format with realistic delays, mimics the API's structural validation (a `tool_use` must be answered by a
`tool_result`, no `temperature` / forced `tool_choice`, …), and composes its answers from the app's *real* tool
results — so numbers on screen can be compared with the database.

| Check | Status | Evidence |
|---|---|---|
| TypeScript / lint | ✅ | `tsc --noEmit`, `npm run lint` → exit 0 |
| Unit tests | ✅ | `vitest run` → 13 files, **139 tests passed** (17 new: event→UI reducer, request-window / trimming, limits) |
| Production build | ✅ | routes `/`, `/chat`, `/api/chat`, `/api/games`, `/api/games/[id]`, `/icon.svg` |
| Chat browser test (Chrome → `next start` → mock API) | ✅ | **52 / 52** passed |
| ↳ Streaming, end to end | ✅ | the reply grew through **37 distinct lengths** while streaming (not one blob) — through `next start`'s compression layer too |
| ↳ Tool use visible and checkable | ✅ | chip "Looked up games" with the exact tool input, expandable to the real result (`total_matches: 24`); answers contain the real top earner ($203,300.00), the real count of games rated above 4 (compared with `/api/games`), and the real revenue gap for a comparison; markdown tables render |
| ↳ What the app really sent over HTTP | ✅ | 2 calls (ask → answer with tool result); credential sent as `Bearer`; **no structural problems per the mock's validation**; 3 tools; system prompt lists genres but **not** the games; model `claude-opus-5-5`; `stream: true`; the thinking block + signature **round-tripped through real HTTP**; `tool_result.tool_use_id` matches the `tool_use` id |
| ↳ Composer | ✅ | Enter sends; Shift+Enter inserts a newline and sends nothing; Send disabled when empty; Stop replaces Send while streaming |
| ↳ Conversation | ✅ | survives navigating to the dashboard and back; a follow-up carries earlier turns as plain text (no tool blocks); **Stop cancels the reply and the upstream call** (the mock logged the connection closing: browser → Next → SDK → API); no error is shown for a deliberate stop |
| ↳ Failures | ✅ | rejected key → friendly message, raw API text not leaked; **Try again** replaces the failed reply (not duplicated); the failed reply is not sent back to the model; the chat keeps working; connection dropped mid-answer → partial text kept + error + UI usable |
| ↳ Other | ✅ | New chat clears and restores the suggestions; the comparison suggestion uses real catalog titles; mobile 390 px has no sideways page scroll; **no console errors, no hydration warnings** |
| No API key configured | ✅ | **8 / 8**: the API answers 503 with the exact setup instruction, the chat shows it with "Try again" (not stuck), REST + dashboard unaffected |
| Dashboard regression on the final build | ✅ | **50 / 50** |
| Same suites against `next dev` (what the README tells people to run) | ✅ | dashboard **50 / 50**, chat **52 / 52**; no hydration warnings (dev mode shows ones production hides), no dev-server warnings, and **no `AGENTS.md` generated** (`agentRules: false` works) |
| Screenshots reviewed by eye | ✅ | empty state, conversation with chips + tables, error state, mobile |
| **Real Anthropic API** | ⬜ **STILL NOT VERIFIED** | The mock is *my model of* the API, built from the SDK source and the documented wire format. It cannot prove that the live API accepts these requests (including the SDK 1.x `Authorization: Bearer` API-key style, the tool schemas, and the request with no `thinking` / `effort` set), nor that Opus 5.5 picks the right tools. **A live run with a real key is the one remaining acceptance test** |

---

## 6. Timeline

Wall-clock times are from the machine clock (EST). They measure the AI-assisted work; the reviewer's own
reading and testing time is not included.

| When | Event |
|---|---|
| ~11:10 (estimate) | Session started; read README, PR template, repo layout. First *timestamped* command was 11:19 |
| 11:19 | Reference scaffold generated in a scratch folder |
| 11:30 | Stage 0 complete (typecheck, lint, build green) |
| 11:35 | Stage 1 complete (34 tests green) |
| 11:40 | Stage 2 complete (47 tests green; 34 real-HTTP checks green after fixing the harness) |
| 11:49 | Stage 3 complete (58 tests green; 50 browser checks green after the mobile-overflow fix) |
| 11:59 | Stage 4 complete (122 tests green against the scripted Messages API; live API still unverified) |
| 12:13 | Stage 5 complete (139 tests; 52 chat + 8 no-key + 50 dashboard browser checks green; live API still unverified) |
