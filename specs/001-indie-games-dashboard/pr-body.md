# Submission

- **Name:** Jorge Sandoval
- **Email:** jorgeivansandoval@gmail.com
- **Time spent:** about 2 hours by commit timestamps (16:51–18:55): ~1 h for the core
  assessment and the chat panel (16:51–17:50), ~30 min for the Nocturne redesign
  (18:27–18:55, after the design export), plus the initial Spec Kit planning session before
  the first commit

## What I built

An internal dashboard for an indie games catalog, plus a streaming AI chat that answers
questions about it by calling tools.

- **Dashboard (`/`)**: one page in a dark design ("Nocturne", from a Claude Design handoff
  in `design/003/handoff/`). It has a dense table with each game's developer and genre,
  revenue bars, sortable columns, and search and genre filters kept in the URL. A right rail
  holds the assistant, or the add/edit form when editing, so the table stays in view.
  Validation runs in the browser and again in the API, from one shared schema. Deletes ask
  for confirmation in a dialog, and changes confirm with a toast. Below 1280 px the rail is an
  "Ask AI" drawer. Editing, filtering and sorting never reset the conversation.
- **REST API (`/api/games`)**: list, get, create, update, delete, with structured errors
  that list each failing field.
- **AI chat**: AI SDK 7 `ToolLoopAgent` on Claude with four narrow tools
  (`search_games`, `rank_games`, `count_games`, `get_games`). The catalog is never put in
  the prompt. Replies stream, and each tool call shows as a lookup chip so you can see where
  every number came from. **Games an answer is about light up in the table**, taken from
  the tool results the browser already has.
- **Storage**: SQLite through Drizzle and better-sqlite3, seeded with 12 games on first run.
- **Process**: spec-driven with Spec Kit inside Claude Code, in three features. 001 is the
  dashboard, API and chat. 002 moves the chat onto the dashboard after a UX review. 003 is the
  Nocturne redesign from a design handoff. Each feature's spec, plan, contracts and tasks
  were committed before its code.
- **`AI_WORKFLOW.md`**: covers the tools (Claude Code with Spec Kit, Claude Design,
  Playwright) and five key prompts with their outcomes. It records where the AI got it wrong
  across all three features. The main case is a Next.js 16 caching pattern that would have
  served stale data in production; others are a success criterion it never measured and a
  layout bug a passing test missed. It also explains why one agent was used instead of
  parallel ones. A running log written during the work is at the end.

## How to run

```bash
cp .env.example .env.local     # set ANTHROPIC_API_KEY
npm install                    # Node 22+
npm run dev                    # http://localhost:3000
```

`npm test` runs 44 unit tests. `npm run lint`, `npm run typecheck` and `npm run build` all
pass. Verified against the production build: 10/10 scripted chat questions answered
correctly, and a 58-check Playwright run. That run covered layout at 768–1440 px, editing in
the rail, search/sort/URL state, answer highlights, keyboard and Escape behaviour, and
contrast (5.05:1 on the lowest-contrast text).

## Trade-offs

- SQLite file with `CREATE TABLE IF NOT EXISTS`, no migrations; enough for one table.
- Requires Node 22+ (better-sqlite3 13 ships prebuilt binaries, so nothing compiles).
- Defaults to Claude Opus 5.5 at low effort. Lookup chips appear in 1–2 s, while answer
  text starts at 2.5–4.5 s (two model calls per answer). `ANTHROPIC_MODEL` switches to a
  faster model. All 10 scripted test questions were answered correctly.
- Chat history lives in the browser session only.
- Dark-only by design. Highlights from a "how many" answer cover at most 20 games (the count
  tool lists its first 20). Filtering runs on the server per request, with no pagination;
  fine for tens of games.
- Next 16 Cache Components: reads call `connection()` so production never serves a
  build-time snapshot of the database.
- Automated tests cover the data layer, the tools, URL parsing and highlight extraction. UI
  behaviour was checked with a scratch Playwright script and by hand, not with a committed UI
  test suite.
- Auth, deployment and production error handling are out of scope per the brief.

## Checklist

- [x] Games CRUD
- [x] API
- [x] Chat with streaming
- [x] Assistant uses tool calling
- [x] `AI_WORKFLOW.md` included

🤖 Generated with [Claude Code](https://claude.com/claude-code)
