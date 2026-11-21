# Indie Games Dashboard

An internal dashboard for a catalog of indie games, plus an AI chat that answers questions about the catalog. The assessment brief is in [CHALLENGE.md](CHALLENGE.md). How AI tools were used to build it is in [AI_WORKFLOW.md](AI_WORKFLOW.md).

- **Dashboard** (`/`): stat cards, a sortable and filterable table, and an add, edit, and delete flow.
- **REST API** (`/api/games`): full CRUD over the catalog.
- **Chat** (`/chat`): ask questions in plain language. The model answers by calling two read-only tools against the database. The answer streams to the browser.

## Stack

Next.js 16 (App Router, Cache Components) with TypeScript, Tailwind CSS 4, SQLite through `better-sqlite3`, Zod for validation, and the Anthropic SDK (`claude-opus-5-5`) for the chat. Tests use Vitest.

## Run it locally

Prerequisites: Node.js 22 and npm. The chat also needs an Anthropic API key. The dashboard and the REST API work without one.

```bash
npm install
cp .env.example .env.local   # then set ANTHROPIC_API_KEY in .env.local
npm run dev
```

Open http://localhost:3000. Use `localhost` and not `127.0.0.1`, because the Next.js dev server blocks other hosts by default.

The first request creates `data/games.db` and seeds it with 18 fictional games. The database is seeded once: if you delete every game, the seed games do not come back. Delete `data/games.db` to start over, or set `DATABASE_PATH` to store the database somewhere else. Without `ANTHROPIC_API_KEY`, the chat page shows a clear error and everything else keeps working.

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | Generate route types and run `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (repository, route handler, and request validation tests) |

## REST API

A game has `id`, `title`, `developer`, `genre`, `monthly_revenue_usd`, `monthly_downloads`, `average_rating` (0 to 5), `created_at`, and `updated_at`. `title` is unique, ignoring case.

| Method and path | Result |
|---|---|
| `GET /api/games` | `200` with an array of all games |
| `POST /api/games` | `201` with the new game. `400` with `{ error, issues }` for invalid input. `409` for a duplicate title |
| `GET /api/games/:id` | `200`, `400` for a bad id, `404` |
| `PATCH /api/games/:id` | `200` with the updated game. Send any non-empty subset of the six fields. `400`, `404`, `409` |
| `DELETE /api/games/:id` | `204`, `400`, `404` |
| `POST /api/chat` | Streams newline-delimited JSON events (see below) |

```bash
curl -X POST localhost:3000/api/games -H 'Content-Type: application/json' \
  -d '{"title":"Moonlit Fort","developer":"Pine Hollow","genre":"Strategy","monthly_revenue_usd":8200,"monthly_downloads":31000,"average_rating":4.1}'
```

## How the chat works

The model never sees the database. It sees two tool definitions and, for each call it makes, the result of that call.

1. The browser sends the conversation to `POST /api/chat`.
2. The route runs the Anthropic SDK tool runner with two tools, `query_games` and `aggregate_games`. Both are defined with Zod schemas and call the same repository that backs the REST API.
3. The model decides which tool to call and with which filters. The runner validates the arguments, runs the tool, and returns the result to the model. A question is limited to 6 model calls.
4. The route streams the response as newline-delimited JSON events: `text` (an answer fragment), `tool_call` (a tool name and its arguments, shown as a chip above the answer), `done` (the full conversation), and `error`.
5. The browser stores the conversation from `done` and sends it back unchanged with the next question. The server keeps no state.

If a response does not finish (an error, a dropped connection, or the Stop button), the browser removes that question and answer from the screen and puts the question back in the input box. The server only returns the conversation when an answer is complete, so this keeps what you see in step with what the model is sent.

What the tools can do:

- `query_games`: find games by title, genre, developer, or numeric conditions (for example `average_rating > 4`), sorted and limited to at most 50 rows. It also returns `total_matching`.
- `aggregate_games`: `count`, `sum`, `avg`, `min`, or `max` of a numeric field, optionally grouped by genre or developer.

Every column, operator, and metric the model can name comes from a whitelist in `lib/games/repository.ts`, and every value reaches SQLite as a bound parameter. The tools are read-only. A blank filter is an error and not a match-everything filter.

Model settings are in `app/api/chat/route.ts`: `claude-opus-5-5` at `low` effort, adaptive thinking, and the server-side refusal fallback. Raise `effort` for harder questions.

## Project layout

```
app/
  page.tsx, chat/page.tsx      Dashboard and chat pages (server components)
  api/games/                   REST routes
  api/chat/route.ts            Streaming chat route
components/                    Dashboard table, add/edit dialog, chat, nav (client components)
lib/
  db.ts                        SQLite connection, schema, seed on first run
  games/                       Zod schemas, repository (CRUD, query, aggregate), seed data, tests
  chat/                        Tool definitions, system prompt, request validation, stream event types
tests/                         Route handler tests
```

## Testing

- `npm test`: 23 Vitest tests. They cover the repository (CRUD, validation, filters, sorting, aggregates, seeding), the REST route handlers and their status codes, and the chat route's request validation.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- Checked by hand: every REST route and status code with `curl`, the dashboard flows in a browser (add, duplicate-title error, edit, delete, genre filter), and the chat route end to end against a local stand-in for the Messages API. The stand-in is not part of this repository. Chat answers from the real model need an API key and are not covered by automated tests.

## Trade-offs

- **Two generic tools, not one tool per question.** The model composes filters and aggregates, so questions the author did not anticipate still work. The cost is that the tool schema is larger and a model can make a poor query. The repository caps rows and rejects anything outside the whitelists.
- **"Last month" means the stored figures.** Each game has one `monthly_revenue_usd` and one `monthly_downloads` value, as the brief defines. The system prompt tells the model so and tells it to say when a question needs history that does not exist.
- **Stateless chat route.** The browser holds the conversation, so the server needs no session store. The cost is a request body that grows with each turn (the route refuses bodies over 512 KB and more than 200 messages), and no history after a page reload.
- **SQLite with `better-sqlite3`.** Synchronous and simple. It is a native module, so install needs a prebuilt binary for your Node version (Node 22 has one). With Cache Components, each page awaits `connection()` before reading, so the query runs per request and never at build time.
- **No auth, no rate limit, no pagination.** The brief puts auth out of scope, and the table holds a few dozen rows. `POST /api/chat` spends your API key, so do not expose this server to the public internet.
- **Server-side fallback and thinking-block binding are on.** If the safety classifiers decline a request on `claude-opus-5-5`, the API retries it on the recommended fallback model. If a mid-stream decline happens, the text from before it stays on screen above the fallback's answer. If the stored conversation ever stops matching what produced its thinking blocks, the API drops them instead of rejecting the request.
- **Genres are matched ignoring ASCII letter case**, the same way SQLite compares them, so "puzzle" and "Puzzle" are one genre in the dashboard filter, the chat tools, and the database.

## Next steps

Component tests, an eval set for the chat (the three sample questions with expected answers), pagination for large catalogs, and a history table so "last month" and trend questions can use real month-by-month data.
