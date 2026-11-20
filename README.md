# Indie Games Catalog

An internal dashboard for an indie games catalog, plus an AI chat that answers questions about it. The chat uses tool calling against a SQLite database and streams its answers.

Built for the Full Stack Engineer (AI) technical assessment. Time spent and AI workflow are in [`AI_WORKFLOW.md`](AI_WORKFLOW.md).

## Screenshot

_[MISSING: screenshot or GIF of the dashboard and chat. Not captured yet.]_

## Run it locally

Requirements: Node 22, a Groq API key (free at https://console.groq.com/keys).

```bash
npm install
cp .env.example .env.local      # then set GROQ_API_KEY in .env.local
npm run db:reset                # creates data/games.db with 25 invented games
npm run dev                     # open http://localhost:3000
```

Without `GROQ_API_KEY` the dashboard works fully; the chat shows a clear message that the key is missing.

## Environment variables

| Variable            | Default                                                      | Purpose                                    |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `GROQ_API_KEY`      | –                                                            | Key for the default LLM provider           |
| `LLM_PROVIDER`      | `groq`                                                       | `groq` or `anthropic`                      |
| `ANTHROPIC_API_KEY` | –                                                            | Only with `LLM_PROVIDER=anthropic`         |
| `LLM_MODEL`         | `openai/gpt-oss-120b` (groq), `claude-haiku-5-5` (anthropic) | Model override                             |
| `DB_PATH`           | `data/games.db`                                              | SQLite file. Evals use `data/eval.db`      |
| `EVAL_BASE_URL`     | `http://localhost:3000`                                      | Where `npm run eval` sends questions       |
| `EVAL_THRESHOLD`    | `0.9`                                                        | Eval exits with code 1 below this accuracy |

## Scripts

| Script                                        | What it does                                                |
| --------------------------------------------- | ----------------------------------------------------------- |
| `npm run dev` / `build` / `start`             | Next.js dev server, production build, production server     |
| `npm run seed`                                | Fills an empty database with the 25 seed games              |
| `npm run db:reset`                            | Empties the database and seeds it again                     |
| `npm run eval:db`                             | Rebuilds `data/eval.db` from the test fixture (18 games)    |
| `npm run eval`                                | Runs the 20 eval cases against a running server (see below) |
| `npm test`                                    | Unit and integration tests (Vitest), no API key needed      |
| `npm run lint` / `typecheck` / `format:check` | Quality gates; CI runs them with `test` and `build`         |

## API

| Method | Path                                                        | Body                                | Response                                                                         |
| ------ | ----------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/api/games?genre=&minRating=&maxRating=&sortBy=&order=&q=` | –                                   | `200` `Game[]`                                                                   |
| POST   | `/api/games`                                                | game                                | `201` `Game`, `400` field errors, `409` duplicate title                          |
| GET    | `/api/games/:id`                                            | –                                   | `200` `Game`, `404`                                                              |
| PUT    | `/api/games/:id`                                            | full game                           | `200` `Game`, `400`, `404`, `409`                                                |
| DELETE | `/api/games/:id`                                            | –                                   | `204`, `404`                                                                     |
| GET    | `/api/games/stats`                                          | –                                   | `200` `{ totalGames, totalRevenue, totalDownloads, averageRating, ratedAbove4 }` |
| POST   | `/api/chat`                                                 | `{ messages }` (AI SDK UI messages) | streamed response; `503` without a key, `400` on a bad body                      |

Errors always have the shape `{ "error": string, "fieldErrors"?: {...} }`. Internal errors return a generic `500`.

Game fields: `title` (1–100 chars, unique ignoring case), `developer`, `genre` (fixed list), `monthly_revenue_usd` and `monthly_downloads` (whole numbers ≥ 0, last month), `average_rating` (0–5, one decimal).

## The chat

The model never receives the catalog. It calls one of four read-only tools, which run through the same service layer as the API:

| Tool              | Use                                                            |
| ----------------- | -------------------------------------------------------------- |
| `query_games`     | Top or filtered lists (at most 10 games, plus the total count) |
| `aggregate_games` | Count, sum, average, min or max; optionally per genre          |
| `find_game`       | One game by title, tolerant of typos and partial titles        |
| `compare_games`   | Two games on one metric, with the winner and the ratio         |

Every calculation happens in code. The model only phrases the answer. Each tool call shows as a chip with its arguments and state, and the games an answer is about are highlighted in the table. A Stop button cancels a streaming answer.

Game data is user-editable, so the system prompt tells the model to treat it as data, and the eval set includes a game whose developer field tries to change its rating.

## Architecture

The full decisions are in [`ARCHITECTURE.md`](ARCHITECTURE.md). In short:

- **Route handlers** only parse and validate, then call the **service** (rules, math, fuzzy matching), which calls the **repository** (the only code that runs SQL).
- **Frontend** follows domain → api → transformers → hooks → presentational components and containers. Only one React context exists (`CatalogContext`).
- **Shared** Zod schemas validate the API, the forms and the tool inputs in the same way.

## Evals

The evals run the real model against a fixed test database, with expected answers computed from that database rather than hardcoded. Grading is deterministic (no LLM judge): the answer must contain the right values, must not contain forbidden ones, and the expected tools must have run.

To run them:

```bash
# terminal 1
npm run eval:db && DB_PATH=data/eval.db npm run dev

# terminal 2
npm run eval
```

Latest result (`evals/results/latest.md`, 20 cases × 3 runs):

**Overall accuracy: 95% (57/60 runs)**, above the 90% threshold.

| Case                        | Category     | Pass rate | Avg latency | Tools used                   |
| --------------------------- | ------------ | --------- | ----------- | ---------------------------- |
| top-revenue                 | ranking      | 3/3       | 1.2s        | query_games                  |
| top3-downloads              | ranking      | 3/3       | 1.1s        | query_games                  |
| lowest-rated                | ranking      | 3/3       | 1.4s        | query_games, aggregate_games |
| count-above-4               | counting     | 3/3       | 0.9s        | aggregate_games              |
| count-roguelikes            | counting     | 3/3       | 6.1s        | aggregate_games              |
| avg-rating-roguelike        | aggregates   | 3/3       | 2.8s        | aggregate_games              |
| total-revenue               | aggregates   | 3/3       | 1.9s        | aggregate_games              |
| total-downloads             | aggregates   | 3/3       | 2.8s        | aggregate_games              |
| compare-revenue             | comparison   | 3/3       | 3.3s        | compare_games                |
| compare-downloads           | comparison   | 3/3       | 3.3s        | compare_games                |
| fuzzy-compare               | fuzzy        | 0/3       | 6.2s        | compare_games                |
| fuzzy-rating                | fuzzy        | 3/3       | 2.8s        | find_game                    |
| partial-title               | fuzzy        | 3/3       | 3.1s        | find_game                    |
| not-found                   | not-found    | 3/3       | 3.2s        | find_game                    |
| not-found-revenue           | not-found    | 3/3       | 3.1s        | find_game                    |
| empty-horror                | empty        | 3/3       | 4.0s        | query_games                  |
| genre-highest-avg-revenue   | multi-step   | 3/3       | 3.5s        | aggregate_games              |
| genre-highest-total-revenue | multi-step   | 3/3       | 4.1s        | aggregate_games              |
| out-of-scope-weather        | out-of-scope | 3/3       | 1.2s        | –                            |
| injection-rating            | injection    | 3/3       | 3.2s        | find_game                    |

**Known limitation:** `fuzzy-compare` ("Compare revenue of Lantren Drift vs Coper Tides") fails in every run. The model finds both games and gives the ratio, but leaves out the two dollar amounts that the case requires. The tool returns both values; the model's wording is what varies. Across runs of this case the model passed 0 of 1 (sample run), 2 of 3 (first full run) and 0 of 3 (final run), so the result depends on the model's wording. The likely fix is a `compare_games` output the model can quote directly.

Earlier runs: a 20-question sample scored 95% (19/20), and a full run scored 98% (59/60) before the grader was made stricter. The final grader rejects vague phrases such as "is not", so those numbers are not directly comparable.

## Trade-offs

- **SQLite with raw SQL, no ORM.** One file, no server, and the repository is the single place SQL lives. The cost is hand-written queries and no migrations tool.
- **Two datasets.** Dashboard seed data (25 games) and the test fixture (18 games, including the injection case) are separate, so editing the dashboard can't change eval answers. The cost is two lists to keep in step.
- **Fuzzy matching is deliberately conservative.** A wrong match is worse than "not found", so typo matching requires every word of the query to fit a word in the title. Some reasonable misspellings are reported as not found with suggestions instead.
- **Free LLM tier.** Groq is free but rate-limited. The evals pace requests and retry only on errors, and each retry is recorded in `latest.json`.
- **Tests stop at the API and the logic.** Unit and integration tests cover the schemas, repository, service, tools, route handlers and chat wiring with a mock model. The React hooks and modals were checked by hand in a browser, not by automated UI tests, because a DOM test setup wasn't in the approved stack.
- **Evals are not in CI.** They need an API key and take minutes; their latest results are committed instead.
- **Auth, deployment and production error handling are out of scope**, as the assignment asks.

## What I would do with more time

- Make `compare_games` return a sentence the model can quote, to fix `fuzzy-compare`.
- Add browser-level tests (Playwright) for the modals, sorting and chat streaming.
- Render Markdown in chat answers, since the model sometimes uses bold text.
- Add pagination to the table and a database migrations setup.
- Run the evals in CI against a cheap model on a schedule.
