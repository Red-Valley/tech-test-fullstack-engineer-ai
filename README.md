# Indie Games Catalog — Full Stack AI Assessment

An internal dashboard to manage a catalog of indie games with a built-in AI chat that answers natural-language questions about the catalog using tool calling and streaming.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| Styling | Tailwind CSS v4 |
| Persistence | SQLite via `better-sqlite3` |
| LLM | Anthropic Claude (`claude-haiku-4-5`) via Vercel AI SDK v6 |
| Validation | Zod v4 |

---

## Prerequisites

- Node.js 18+
- An Anthropic API key with credits (required only for the AI chat feature)

---

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment variables**

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

**3. Seed the database**

Creates `data/games.db` and inserts 10 sample indie games:

```bash
npm run seed
```

**4. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run seed` | Create and seed the SQLite database |
| `npm run db:reset` | Wipe the database and re-seed from scratch |

---

## Features

### Games Catalog (CRUD)
- Card grid layout, responsive from mobile to desktop.
- Create, edit, and delete games via native `<dialog>` modals (bottom-sheet on mobile, centered on desktop).
- Fields: `title`, `developer`, `genre`, `monthly_revenue_usd`, `monthly_downloads`, `average_rating`.
- Client-side + server-side Zod validation with inline field errors.

### REST API
Five endpoints under `/api/games`:

```
GET    /api/games          List all games
POST   /api/games          Create a game
GET    /api/games/:id      Get a single game
PUT    /api/games/:id      Full replacement update
DELETE /api/games/:id      Delete a game
```

### AI Chat
- Chat drawer (FAB bottom-right → slides in from the right on desktop, fullscreen on mobile).
- Streaming responses via Vercel AI SDK + Anthropic.
- Tool calling — the model never receives the full database; it calls typed tools (`list_games`, `find_game_by_title`, `catalog_summary`) to fetch only what it needs.
- Structured output: the model always finishes by calling a `respond` tool that returns a discriminated union (`game | games | comparison | count | stats | text`), rendered as rich cards in the UI.
- Questions to try:
  - *"Which game made the most revenue?"*
  - *"How many games are rated above 4?"*
  - *"Compare Hollow Knight vs Celeste on revenue"*
  - *"Give me an overview of the catalog"*

---

## Architecture Notes

**Repository pattern.** Route handlers and AI tools never touch SQL directly — they go through a `GamesRepository` interface implemented by `SqliteGamesRepository`. This keeps the data layer swappable without touching the API or chat layer.

**Server Components by default.** `app/page.tsx` is a Server Component that fetches games directly from the repository (no HTTP round-trip). After mutations, the client calls `router.refresh()` to get a fresh server render.

**Structured chat output.** Instead of rendering free-form markdown text, the `respond` tool forces the model to emit a typed `CatalogAnswer` object. The client renders it as a rich card (game details, comparison grid, stat summary, etc.) rather than a plain chat bubble.

---

## Trade-offs

**`claude-haiku-4-5` instead of `claude-sonnet-4-6`.** The spec suggests Sonnet but does not mandate it. Haiku is significantly lighter and more cost-effective for the structured tool-calling pattern used here, where the model's job is to select tools and fill a well-defined schema rather than reason deeply.

**SQLite over a managed database.** Zero setup for local development and perfectly sufficient for the catalog size in this assessment. Would not scale to multi-process production deployments.

**Full replacement PUT (not PATCH).** The edit form always submits all six fields, so partial updates add no practical value. Keeps the schema and validation symmetric with POST.

**No authentication.** Explicitly out of scope per the assessment brief.

---

## Project Structure

```
app/
├── api/
│   ├── games/          ← REST route handlers
│   └── chat/           ← Streaming AI chat route
├── layout.tsx
└── page.tsx            ← Server Component entry point

components/
├── games/              ← CRUD UI (cards, form dialog, delete dialog)
└── chat/               ← Chat surface (FAB, drawer, scaffold, answer cards)

lib/
├── db/                 ← SQLite client + schema
└── games/              ← Repository, types, schemas, AI tools, formatters

docs/
├── specs/              ← Original assessment requirements
└── features/           ← Technical implementation docs per feature

scripts/
└── seed.ts             ← Database seed script
```
