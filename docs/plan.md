# Project Plan — Indie Games Dashboard with AI Chat

## Context
This is the technical assessment for the Full Stack Engineer (AI) role at Red-Valley. The assessment requires building a small internal dashboard to manage a catalog of indie games, plus an AI chat that answers natural-language questions about that catalog using tool calling and streaming.

The scope is intentionally constrained: ~2.5–3 hours of focused work, single developer, no authentication, no deployment, no production-grade test coverage. The evaluation rubric is:

| Area | Weight |
|---|---|
| Use of AI coding tools (AI_WORKFLOW.md) | 30% |
| Full-stack implementation (CRUD + API + chat + tool use) | 30% |
| Code quality | 20% |
| UX | 10% |
| README clarity | 10% |

The two highest-leverage components are the AI workflow documentation and the chat endpoint with tool calling. These receive disproportionate planning attention.

CRUD scope: All four CRUD operations (create, read, update, delete) are implemented and exposed via the dashboard UI and the REST API. The chat exposes read-only tools over the catalog. This split confines mutations to a single surface (dashboard), eliminates write-write concurrency between dashboard and chat, and focuses chat on demonstrating tool calling — the capability actually being evaluated under requirement #3. See decisions-log entry "CRUD scope: writes from dashboard only".

## Stack
| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2.6 (App Router) | Imposed by assessment; latest Active LTS |
| Language | TypeScript | Imposed by assessment |
| Styling | Tailwind CSS v4 | Accepted by assessment; minimal setup |
| Persistence | JSON file at /data/games.json | Zero setup for reviewer; domain too small to justify SQLite |
| LLM SDK | Vercel AI SDK v6 | Resolves server-to-client streaming and client hooks in one library |
| Default LLM provider | Anthropic Claude Sonnet 4.5 | Strong tool-calling support; coherent with using Claude Code |
| Alternative LLM provider | OpenAI gpt-4o-mini, configurable via LLM_PROVIDER env var | Reviewer flexibility at the cost of ~5 lines |
| Schema validation | Zod | Standard; integrates natively with AI SDK tool inputSchema |

## Development Phases

The project is built in 11 discrete, verifiable phases. Each phase has a single focused commit. Phases are sequential; do not merge or skip.

### Phase 0 — Pre-flight cleanup ✓ DONE
Repository hygiene, CLAUDE.md, decisions-log initialization. Completed.

### Phase 1 — Data: schema and seed (~20 min)
**Goal:** define the Game model in Zod, generate 15 seed entries, validate.
**Deliverables:**
- /lib/games/schema.ts with `gameSchema`, `gameCreateSchema`, `gameUpdateSchema` and inferred `Game` type
- /data/games.json with 15 indie games using these exact titles: Hollow Knight, Celeste, Hades, Stardew Valley, Dead Cells, Slay the Spire, Cuphead, Undertale, Terraria, Disco Elysium, Spelunky 2, Outer Wilds, Risk of Rain 2, Loop Hero, Inscryption. Each entry is assigned plausible (invented) values for developer, genre, monthly_revenue_usd, monthly_downloads, average_rating. Distribution constraints still apply: ≥6 genres represented, revenue range $5k–$500k, ratings 3.2–4.9 with ≥4 above 4.5 and ≥2 below 4.0.
- /lib/games/seed-validate.ts script registered as npm script `validate:data`
**Acceptance:** `npm run validate:data` exits 0.
**Genres enum:** Metroidvania, Roguelike, Platformer, RPG, Puzzle, Simulation, Shooter, Strategy, Adventure, Sandbox.

### Phase 2 — Data: repository layer (~20 min)
**Goal:** pure async functions wrapping /data/games.json. The repository is the single source of truth consumed by both REST endpoints and chat tools.
**Deliverables:**
- /lib/games/repository.ts with 5 functions:
  - `listGames(filters?)`
  - `getGameById(id)`
  - `createGame(input)` — auto-generates kebab-case id from title slug, deduplicates with -2, -3 suffixes
  - `updateGame(id, patch)`
  - `deleteGame(id)`
- /lib/games/repository.test.ts — smoke test registered as npm script `smoke:repo`
**Acceptance:** `npm run smoke:repo` runs cleanly; writes actually persist to the JSON file.

### Phase 3 — REST API CRUD (~20 min)
**Goal:** App Router endpoints that delegate to the repository. Route handlers only handle HTTP concerns.
**Deliverables:**
- /app/api/games/route.ts (GET with optional ?genre, ?minRating; POST)
- /app/api/games/[id]/route.ts (GET, PATCH, DELETE)
**Acceptance:** all 5 endpoints verified with curl, proper HTTP status codes (200/201/204/400/404), Zod validation errors returned as structured 400 responses, no internal error messages leaked in 500s.

### Phase 4 — Chat endpoint with tool calling (~40 min) ★ CRITICAL
**Goal:** /app/api/chat/route.ts using Vercel AI SDK v6 with streaming and 4 typed tools. This phase carries the highest technical risk and the highest evaluation weight.
**Deliverables:**
- /app/api/chat/route.ts with:
  - `export const runtime = "nodejs"` (filesystem access prohibits edge)
  - `export const maxDuration = 30`
  - Provider selection via LLM_PROVIDER env var (default "anthropic")
  - Model ids are hard-coded literals in /app/api/chat/route.ts: `claude-sonnet-4-5` for Anthropic, `gpt-4o-mini` for OpenAI. Each is followed by an inline comment `// latest as of May 2026; update if SDK rejects`.
  - Before invoking the LLM, the route handler checks whether the env var for the selected provider (ANTHROPIC_API_KEY or OPENAI_API_KEY) is set. If missing, return HTTP 503 with body `{ error: 'PROVIDER_NOT_CONFIGURED', provider: <name> }`. Upstream LLM failures (network, 4xx/5xx from provider) return HTTP 502 with `{ error: 'PROVIDER_UPSTREAM', detail: <short message> }`. The chat UI in Phase 6 discriminates these two states in its error banner.
  - System prompt instructing the model to: never invent data, always resolve game titles via getGameByTitle before referencing them, present comparisons as structured short answers
  - `streamText` call with `stopWhen: stepCountIs(5)` to allow multi-step tool use
  - `convertToModelMessages` applied to incoming messages
  - Response: `result.toUIMessageStreamResponse()`
- 4 tools defined with `tool()` helper, Zod `inputSchema`, async `execute`. All four tools are read-only over the catalog. The chat does not mutate state. See decisions-log entry "CRUD scope: writes from dashboard only".
  - **listGames** — returns a compact projection of all games (id, title, genre, average_rating). For "how many games...", "list all...", scoped enumeration. Compact projection prevents the model from being tempted to dump full DB.
  - **queryGames** — workhorse tool. Filters by genre/minRating, sorts by any numeric field asc/desc, limits to N. Covers "top revenue", "rated above 4", "Roguelikes by downloads".
  - **getGameByTitle** — fuzzy match on title. Returns `{ game: Game } | { notFound: true, suggestions: string[] }`. Uses Levenshtein or substring matching. Critical: the model will receive user input like "Hollow Knight" and must resolve to id "hollow-knight" before any other tool that takes an id.
  - **aggregateGames** — sum/avg/min/max/count over a numeric field, optionally grouped by genre. Covers "average rating across Metroidvanias", "total revenue".
- Manual test script /scripts/test-chat.ts (registered as npm script `test:chat`) that POSTs sample messages and prints streamed output. Sample messages:
  - "Which game made the most revenue?"
  - "How many games are rated above 4?"
  - "Compare Hollow Knight and Celeste."
  - "What's the average rating across Metroidvanias?"
- Smoke test must include a one-time diagnostic log of `JSON.stringify(message.parts, null, 2)` from at least one streamed assistant message that triggered a tool call. The captured output is pasted into /docs/decisions-log.md as evidence under the existing "Empirical verification of parts[] discriminator shape" entry, then the diagnostic log line is removed before commit. Phase 6 types the parts[] union based on this captured evidence, not on assumed documentation.
**Constraints:**
- Tool returns must be JSON-serializable (no Date, no BigInt, no class instances).
- No game data inlined in the system prompt. Tools are the only path to data.
- Tools handle errors internally and return structured error objects, never throw.
- Tool execute functions must wrap their work in try/catch. Zod parse failures and runtime errors return as structured `{ error: string, reason: string }` objects, not thrown. Throwing inside execute terminates the stream and degrades chat UX; structured errors let the model recover in a subsequent step.
**Acceptance:** test:chat script returns sensible streamed responses for all 4 sample messages, tool calls visible in output.

### Phase 5 — Dashboard UI (~25 min)
**Goal:** table view of all games with CRUD actions. Professional, mobile-friendly, no overdesign.
**Deliverables:**
- Routes: Dashboard lives at /app/page.tsx. Chat lives at /app/chat/page.tsx. Top navigation links between them. Rationale: dashboard is the primary surface a reviewer sees on first open.
- /app/page.tsx renders a responsive table
- Columns: Title, Developer, Genre, Revenue (USD with Intl.NumberFormat), Downloads, Rating (1 decimal), Actions
- Create and Edit use a single modal component, reused with different initial state. Rationale: keeps table view stable, reuses one component, simpler keyboard handling.
- "New Game" button opens the modal in create mode; row-level Edit action opens it in edit mode; Delete confirmed with window.confirm
- Empty/loading/error states with retry on error
**Acceptance:** create, edit, delete a test game via UI; mobile viewport remains usable.

### Phase 6 — Chat UI with streaming (~25 min)
**Goal:** /app/chat/page.tsx using `useChat` from @ai-sdk/react. The reviewer must SEE that tools are being called without reading code.
**Deliverables:**
- Client component with useChat hook
- Message list with distinct visual treatment for user vs assistant
- **Visible tool-call badges:** render each tool invocation inline in the assistant message as a compact badge (e.g., "called: queryGames" with input args expandable on hover or in a collapsible). Inspect `message.parts` array and render text parts as text, tool-<name> parts as the badge.
- 3 suggested example prompts as clickable chips: "Which game made the most revenue?", "How many games are rated above 4?", "Compare two games of your choice"
- Input box with Send button, disabled while streaming, Enter sends, Shift+Enter newline
- Error banner if API key missing or request fails
**Acceptance:** type a question, see badge appear, see streamed response; multi-step query (e.g., comparison) shows multiple badges.

### Phase 7 — UX polish (~10 min)
**Goal:** consistency pass across dashboard and chat. Catches cross-cutting issues that inline polish misses.
**Checklist:**
- Shared layout shell with consistent top nav
- Visible focus rings on all interactive elements (focus-visible: variants)
- Disabled state styling (opacity + cursor-not-allowed)
- Currency formatting consistent (Intl.NumberFormat USD)
- Chat input auto-focus on /chat load
- Dashboard rows hover state
- Modals close on Escape and backdrop click
- Page metadata: "Dashboard — Indie Games" and "Chat — Indie Games" via Next Metadata API
- No console.log in production paths
- `npm run lint` passes with zero warnings
**Acceptance:** `npm run build` clean, `npm run lint` clean.

### Phase 8 — README finalization (~15 min)
**Goal:** replace the current README with a professional one in English C1 register.
**Sections:** Overview, Demo placeholder, Stack table with rationales, Getting Started (prerequisites, install, env vars), Architecture, Trade-offs (4–6 honest items), Time spent, Cross-reference to AI_WORKFLOW.md.

### Phase 9 — AI_WORKFLOW.md (~25 min) ★ HUMAN-AUTHORED
**Goal:** the deliverable worth 30%. Distilled from /docs/prompts-log.md and /docs/decisions-log.md.
**Approach:** Claude Code generates the skeleton only. The prose is written by the human author. Claude Code outputs the raw material (full contents of prompts-log and decisions-log) for the author to work with.
**Sections:**
1. Tooling — which tools, why, configuration (CLAUDE.md mention)
2. Workflow Strategy — phased approach, what was delegated vs manual, verification gates, why no parallel agents
3. Selected Prompts (4–5) — title, goal, prompt verbatim, outcome, reflection
4. Where the Model Got It Wrong — concrete case with before/after code, root cause, detection method, fix
5. Trade-offs and Reflections

### Phase 10 — PR submission (~10 min)
**Goal:** push branch, open PR against Red-Valley:main with descriptive body.

## Bitácora Conventions
Two working documents track the project history:

### /docs/prompts-log.md
Chronological record of every meaningful prompt sent to Claude Code. Updated by Claude Code immediately after executing each phase. Entry format:

[Phase N] <descriptive title>
Date: <ISO 8601> 
Tool: Claude Code 
Prompt: <verbatim summary or quote of the prompt> 
Outcome: <what was produced; what worked; what failed and why> 
Decisions logged: <comma-separated list of titles added to decisions-log, OR "none (this phase did not produce decisions meeting the logging criteria)"> 
Notes: <surprises, manual corrections, lessons>
### /docs/decisions-log.md
Record of technical and process decisions with real trade-offs. Updated by Claude Code only when a decision meets all three criteria:
1. **Alternative considered:** a real alternative existed, not just a default
2. **Articulable trade-off:** the decision can be stated as "we chose X, sacrificing Y, in exchange for Z"
3. **Non-local impact:** the decision affects more than one file or is something a reviewer might question

Entry format (all four fields mandatory; if any cannot be filled with substantive content, the entry should not be written):

[Phase N] <title>
Decision: <one sentence, present tense> 
Alternatives considered: <at least one real alternative with its profile> 
Rationale: <2–4 sentences explaining the trade-off> 
Consequence: <concrete effect on code or project>
These two files are private working documents distilled at the end into README.md (trade-offs section) and AI_WORKFLOW.md.

## Out of scope (explicit)
- Authentication and authorization
- Deployment and production infrastructure
- Comprehensive test coverage (smoke tests only)
- Real-time multi-user collaboration
- Database migrations or relational schema
- I18n / localization (English-only UI)
