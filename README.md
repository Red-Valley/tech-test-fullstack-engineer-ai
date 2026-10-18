# Indie Games Dashboard

An internal dashboard for a catalog of indie games, plus an AI chat that answers questions
about it ("Which game made the most revenue last month?", "How many games are rated above 4?").
The assistant uses **tool calling** to query the catalog and **streams** its replies. The
catalog is never pasted into the prompt.

Built for the Full Stack Engineer (AI) assessment. The original brief is in the first
commit (`git show 51117ab:README.md`), and the AI-assisted workflow is documented in
[`AI_WORKFLOW.md`](AI_WORKFLOW.md).

## Run it

Prerequisites: **Node.js 22 or newer** (`.nvmrc` pins 24) and an
[Anthropic API key](https://console.anthropic.com/). No Docker or database server is needed.

```bash
cp .env.example .env.local     # then set ANTHROPIC_API_KEY
npm install
npm run dev                    # http://localhost:3000
```

On first start the app creates `data/games.db` and seeds 12 sample games. Delete that file
to reset. The dashboard and REST API work without a key; only the chat needs one.

| Variable | Required | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | for chat | — |
| `ANTHROPIC_MODEL` | no | `claude-opus-5-5` (any Anthropic model with tool use, e.g. `claude-sonnet-5-5`, `claude-haiku-5-5`) |

Other scripts: `npm test` (Vitest), `npm run lint`, `npm run typecheck`, `npm run build`.

## What's inside

Everything is on one page (`/`), in a dark design ("Nocturne", from a Claude Design handoff
in [`design/003/handoff/`](design/003/handoff/)). The catalog fills the page, and a right
rail holds the assistant or the game editor, so you can check every answer against the data
you can see.

**Catalog table**: a dense table showing each game's developer and genre, a revenue bar
relative to the top earner, downloads and rating. Search by title or developer, filter by
genre, and sort by any column. All of it is kept in the URL (`?q=&genre=&sort=&dir=`), so a
view survives reload and can be shared. Add and edit open **in the rail**, keeping the table
in view. Validation runs in the browser and again in the API with the same schema. Deleting
asks for confirmation, and each change confirms with a short message.

**Assistant**: plain-language questions with streamed answers. Each lookup the assistant
makes appears as a chip above the answer ("Ranked games · metric: monthly_revenue_usd"), so
you can see where every number came from. Follow-up questions keep the context. Unknown games
are reported as not found instead of invented, and off-topic questions are declined.
**Games an answer is about light up in the table**, with a "N from last answer" tag to clear
them; "New chat" starts over. From 1280 px the rail is docked beside the table; on narrower
screens "Ask AI" opens it as a drawer. Editing, filtering and sorting never reset the
conversation. `/chat` redirects to `/#chat`, which opens the assistant.

**REST API**

| Method | Path | Success | Errors |
|---|---|---|---|
| `GET` | `/api/games` | `200` list | — |
| `POST` | `/api/games` | `201` game | `400 invalid_json`, `400 validation_error` |
| `GET` | `/api/games/:id` | `200` game | `400 invalid_id`, `404 not_found` |
| `PUT` | `/api/games/:id` | `200` game (full replace) | `400`, `404` |
| `DELETE` | `/api/games/:id` | `204` | `400 invalid_id`, `404 not_found` |
| `POST` | `/api/chat` | AI SDK UI-message stream (SSE) | `500 ai_not_configured`, `400 invalid_json` |

Errors look like `{ "error": { "code", "message", "fields"? } }`. Full contracts are in
[`specs/001-indie-games-dashboard/contracts/`](specs/001-indie-games-dashboard/contracts/).

```bash
curl -X POST localhost:3000/api/games -H 'content-type: application/json' \
  -d '{"title":"Test","developer":"Me","genre":"Puzzle","monthly_revenue_usd":1000,"monthly_downloads":50,"average_rating":4.2}'
```

## How it works

```
Dashboard (server component) ─┐
REST routes  /api/games ──────┼──► lib/games/repository.ts ──► SQLite (data/games.db)
AI tools  (in-process) ───────┘          ▲
        ▲                                │ one schema: lib/db/schema.ts (Drizzle + drizzle-zod)
/api/chat ── ToolLoopAgent (AI SDK 7) ── Anthropic
```

- **One data-access module.** `repository.ts` is the only code that touches the database.
  The UI, the API and the assistant's tools all go through it, so they can't disagree.
- **One validation schema.** Generated from the Drizzle table with `drizzle-zod`. The API,
  the form and the tools all use it.
- **Narrow tools, not a data dump.** `search_games`, `rank_games`, `count_games` and
  `get_games` each return only the rows they need. The system prompt contains rules only.
  The assistant reads the live database on every question, so a dashboard edit shows up in
  the very next answer.
- **Streaming.** `createAgentUIStreamResponse` on the server and `useChat` on the client.
  Tool calls arrive as typed message parts and are rendered as the lookup chips.
- **Highlights reuse those tool results.** The browser reads the game ids from the latest
  answer's lookups (`lib/ai/references.ts`) and lights up those rows. No extra API call or
  prompt change is needed.
- **The table view lives in the URL.** `?q=&genre=&sort=&dir=` is parsed on the server
  (`lib/games/catalog-view.ts`) and queried through the repository, so filters survive edits
  and reloads. Changing them never remounts the chat.

Stack: Next.js 16 (App Router, Cache Components), React 19, Tailwind 4, Vercel AI SDK 7 with
`@ai-sdk/anthropic`, Drizzle ORM on better-sqlite3, Zod 4, Vitest. UI: Inter and Phosphor
icons, following the Nocturne design tokens.

## Trade-offs

- **SQLite file, no migrations.** The table is created with `CREATE TABLE IF NOT EXISTS` on
  first open. That's right for one table in an assessment; a real schema would use
  `drizzle-kit` migrations.
- **Seeded once.** Sample data is inserted only when the database file is first created, so
  an emptied catalog stays empty after a restart.
- **Node 22+ required.** `better-sqlite3` 13 needs it, and ships prebuilt binaries so nothing
  compiles on install.
- **Claude Opus 5.5 by default, at low effort.** A lookup chip appears within about 1–2 s,
  but answer text starts after 2.5–4.5 s, because each answer takes two model calls
  (choose a lookup, then reply). Set `ANTHROPIC_MODEL=claude-sonnet-5-5` or
  `claude-haiku-5-5` for faster, cheaper replies.
- **Chat history is per session.** It's held in the browser and lost on reload.
- **Next.js Cache Components.** better-sqlite3 is synchronous, so pages and `GET` routes call
  `connection()` before reading. Without that, Next would prerender them at build time and
  serve stale data.
- **Out of scope per the brief:** authentication, deployment, production-grade error handling,
  full test coverage. 44 unit tests cover the data layer, the tools, URL parsing and highlight
  extraction, which is where correctness comes from. UI behaviour was verified with a
  58-check Playwright run, kept outside the repo.
- **Dark only.** The design is dark-only by intent; there is no light theme.
- **Highlights from a count cover at most 20 games.** The count tool lists only its first 20
  matches, which is plenty at this catalog size.
- **Filtering runs on the server, per request.** That's simple and fast for tens of games;
  there is no pagination.

## How it was built

Spec-driven with [Spec Kit](https://github.com/github/spec-kit) inside Claude Code, in three
features. Each one's spec, plan, contracts and tasks were committed before its code:

| Feature | What it delivered |
|---|---|
| [`001-indie-games-dashboard`](specs/001-indie-games-dashboard/) | The brief: CRUD dashboard, REST API, streaming tool-calling chat |
| [`002-dashboard-chat-panel`](specs/002-dashboard-chat-panel/) | The chat moved beside the table (a UX review), drawer below 1280 px |
| [`003-nocturne-ui-redesign`](specs/003-nocturne-ui-redesign/) | The Nocturne redesign from a Claude Design handoff: rail editor, search and sort, answer highlights |

[`AI_WORKFLOW.md`](AI_WORKFLOW.md) covers the tools used, five key prompts and their
outcomes, and where the AI got things wrong. The main case is a Next.js 16 caching pattern
that would have served stale data in production. A running log written during the work is
at the end.

## Project layout

```
src/app/            the dashboard page and API routes
src/components/     dashboard shell (shared state), catalog toolbar and table, rail editor,
                    delete dialog, toast, rail and chat view
src/lib/db/         Drizzle schema, SQLite client and seed data
src/lib/games/      repository (all queries), URL view parsing, number formatting
src/lib/ai/         model, tools, agent, and which games an answer references
tests/              repository, tool, URL view and reference tests
design/003/handoff/ design reference: README, theme tokens, screenshots
specs/              Spec Kit spec, plan, contracts and tasks for features 001, 002 and 003
```
