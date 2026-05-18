# Full Stack Engineer (AI) — Technical Assessment

**Time limit:** 2–3 hours max.

---

## Challenge

Build a small **internal dashboard** to manage a catalog of indie games, plus an **AI chat** that answers natural-language questions about that catalog.

### Requirements

1. **Games CRUD**
   Fields: `title`, `developer`, `genre`, `monthly_revenue_usd`, `monthly_downloads`, `average_rating`.
   Persist locally (SQLite, JSON, or in-memory).

2. **REST API**
   Expose the catalog via API routes.

3. **AI Chat**
   Chat UI that answers questions like:
   - *"Which game made the most revenue last month?"*
   - *"How many games are rated above 4?"*
   - *"Compare revenue of Game A vs Game B."*

   - Must use **tool calling / function calling** to query the data. Do **not** dump the full DB into the prompt.
   - Responses must **stream**.

4. **UI**
   Dashboard view (table or cards) + chat view. Tailwind is fine.

### Stack

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS
- **LLM layer:** your choice — Anthropic SDK, OpenAI SDK, Vercel AI SDK, OpenRouter, LangChain / LangGraph, etc. Any model/provider is fine as long as tool calling + streaming work.
- Storage: your choice (SQLite, JSON, in-memory)

### Out of scope

Auth, deployment, production error handling, full test coverage.

---

## Implementation

### Stack chosen

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 App Router + TypeScript | Matches requirement; App Router enables Server Components |
| Styling | Tailwind CSS + shadcn/ui (Sonner) | Fast, consistent, dark-theme friendly |
| LLM | OpenAI SDK (`gpt-4o-mini`) | Tool calling + SSE streaming, cost-efficient |
| Storage | SQLite via `better-sqlite3` | Zero-config, synchronous API, persists between restarts |

### Project structure

```
app/
  api/
    games/          → GET (list + filter), POST (create)
    games/[id]/     → GET, PUT, DELETE
    chat/           → POST — SSE streaming with tool calling
  chat/             → Chat page
  page.tsx          → Dashboard page
components/
  GameTable.tsx     → CRUD table (responsive: cards on mobile, table on desktop)
  ChatWindow.tsx    → Streaming chat UI with suggestion pills
  ui/toaster.tsx    → Sonner toast wrapper
lib/
  db.ts             → SQLite singleton, schema, seed, query helpers
  tools.ts          → 4 LLM tool definitions + handlers
  types.ts          → Shared TypeScript interfaces
  utils.ts          → cn() helper (tailwind-merge + clsx)
```

### AI tools available to the LLM

| Tool | Description |
|---|---|
| `get_games` | List all games, optionally filtered by genre or min rating |
| `get_game_by_id` | Fetch a single game by ID |
| `compare_games` | Compare two games by title (revenue, downloads, rating) |
| `get_stats` | Aggregate stats: top revenue, top downloads, avg rating, genre breakdown |

---

## How to run locally

### Prerequisites

- Node.js 18+
- An OpenAI API key

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Set your API key
echo "APENAI_API_KEY=sk-..." >> .env.local

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database (`games.db`) is created automatically on first run and seeded with 12 indie games.

---

## Trade-offs

- **`better-sqlite3` over Prisma/Drizzle** — synchronous API is simpler in Next.js Server Components; no async/await overhead. Trade-off: less ergonomic for complex queries.
- **Manual SSE over Vercel AI SDK** — avoided adding a dependency for a feature (streaming + tool loop) that's 60 lines of code. Trade-off: more boilerplate.
- **`gpt-4o-mini` over GPT-4o** — cost-efficient for a demo; handles multi-step tool use correctly. Trade-off: slightly weaker reasoning on ambiguous queries.
- **No pagination on API** — pagination is client-side only (10 rows). Trade-off: all games load on first request. Acceptable at catalog scale (~100s of games).
- **Auth out of scope** — per assessment requirements.

---

## Mandatory: `AI_WORKFLOW.md`

See [AI_WORKFLOW.md](./AI_WORKFLOW.md) for the full documentation of how AI coding tools were used during this assessment.

---

## Evaluation

| Area | Weight |
|---|---|
| Use of AI coding tools (`AI_WORKFLOW.md`) | 30% |
| Full-stack implementation (CRUD + API + chat + tool use) | 30% |
| Code quality | 20% |
| UX | 10% |
| README clarity | 10% |

---

## How to submit

1. **Fork** this repo.
2. Create branch `submission/<your-name>`.
3. Implement.
4. Open a **Pull Request** to `main` of this repo.
5. In the PR include: time spent, how to run locally, trade-offs made.
