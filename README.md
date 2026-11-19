# IndiePulse — Indie Games Catalog & LangGraph AI Analyst

An internal dashboard for managing an indie games catalog (**Next.js 15 App Router + TypeScript + Tailwind CSS + `node:sqlite`**) paired with a streaming **LangGraph** AI assistant powered by **Google AI (Gemini)**.

---

## Features

- **Games CRUD & Analytics Dashboard**
    - Auto-seeded SQLite database (`data/games.db` via built-in `node:sqlite` `DatabaseSync`) with **28 indie games** and paginated table browsing (7 per page).
    - KPI summary cards (Total Games, Monthly Revenue, Monthly Downloads, Average Rating, Top-Grossing Title).
    - Live search, genre filter, minimum rating filter (`4.0+`, `4.5+`), and multi-column sorting.
    - Create, Edit, and Delete games (including descriptions) with Zod validation, clickable titles for a full Game Details modal, and two-step delete confirmation.
    - **Dark & Light Themes** with `localStorage` persistence and a custom gamepad SVG favicon (`src/app/icon.svg`).
- **User Management & Authentication (`/api/auth/*`, `/api/users/*`)**
    - Auto-seeded admin account: **John Doe** (`john.doe@indiegames.ai` / `importantpassword`), with salted `scrypt` password hashing and HMAC-SHA256 signed HTTP-only session cookies.
    - Role-based User Management modal (`admin` / `member`) to list, create, edit, and delete users.
- **REST API (`/api/games`, `/api/games/[id]`)**
    - `GET /api/games` with `search`, `genre`, `minRating`, `maxRating`, `sortBy`, `sortOrder`, `limit` query params.
    - `POST /api/games`, `GET /api/games/[id]`, `PATCH`/`PUT /api/games/[id]`, `DELETE /api/games/[id]`.
- **Streaming LangGraph AI Chat (`/api/chat`)**
    - Built with `@langchain/langgraph` (`StateGraph` + `ToolNode`) and `@langchain/google-genai` (`gemini-3-flash-preview`, with model selector for Gemini 3 Flash / Flash Lite / 3.7 / 3.8).
    - Streams Server-Sent Events (`tool_start`, `tool_end`, `token`, `done`, `error`) and renders responses with GitHub-Flavored Markdown (`react-markdown` + `remark-gfm`), automatically refreshing the dashboard when catalog-mutating tools run.
    - **5 structured catalog tools** (`search_games`, `count_games`, `get_catalog_stats`, `compare_games`, `add_or_update_game`) — the database is never dumped into the prompt.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript (strict)
- **Styling & Markdown:** Tailwind CSS v4, Lucide Icons, `react-markdown`, `remark-gfm`
- **Database:** Node.js built-in `node:sqlite` (`DatabaseSync`)
- **AI / Agent:** `@langchain/langgraph`, `@langchain/google-genai`, `@langchain/core`, `zod`
- **Quality & Testing:** Vitest (39 tests), TypeScript, ESLint, Prettier, Husky, Commitlint (Conventional Commits)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure a Google AI API Key

Copy `.env.example` to `.env.local` and add your Google AI Studio API key:

```bash
cp .env.example .env.local
```

```env
# Google AI Studio (https://aistudio.google.com/apikey)
GOOGLE_GENERATIVE_AI_API_KEY=...

# Optional overrides:
# LLM_MODEL=gemini-3-flash-preview
# DATABASE_PATH=./data/games.db
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database (`data/games.db`) is created and seeded automatically on the first request with **28 indie games** and the default admin account:

- **Email:** `john.doe@indiegames.ai`
- **Password:** `importantpassword`

### 4. Run tests, lint, typecheck, and production build

```bash
npm test            # Vitest unit tests (39 tests across games, users/auth, API routes & AI tools)
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run format:check # Prettier check
npm run build       # Production Next.js build
```

---

## Example AI Chat Queries

Click any starter pill in the AI Analyst panel or ask:

1. _"Which game made the most revenue last month?"_ → invokes `get_catalog_stats` / `search_games`
2. _"How many games are rated above 4?"_ → invokes `count_games`
3. _"Compare revenue of Hades II vs Balatro."_ → invokes `compare_games`
4. _"Break down revenue by genre."_ → invokes `get_catalog_stats`

---

## Trade-offs & Design Decisions

- **Built-in `node:sqlite` vs. `better-sqlite3` / Prisma:** Node v26 ships `node:sqlite` (`DatabaseSync`) in core, avoiding native C++ `node-gyp` build issues and keeping setup zero-config while still using real SQLite persistence.
- **LangGraph `StateGraph` + `ToolNode`:** Provides an explicit, inspectable agent loop and `streamEvents(..., { version: "v2" })` so tools execute deterministically on the server while the chat UI streams clean Markdown responses and auto-refreshes the table on mutations.
- **In-memory SQLite for unit tests:** Repository and AI tool tests run against `DatabaseSync(":memory:")` in <400ms without mutating `data/games.db`.
- **Zero-dependency Authentication:** Passwords use Node.js `crypto.scryptSync` with per-user salts and `timingSafeEqual`, and sessions use HMAC-SHA256 signed HTTP-only cookies without external auth dependencies.
- **Bundle Optimization:** `Dashboard`, `MarkdownMessage` (`react-markdown` + `remark-gfm`), and all three modals (`GameModal`, `GameDetailModal`, `UserManagementModal`) are lazy-loaded via `next/dynamic`, reducing `/` First Load JS from `178 kB` to `107 kB` (`4.36 kB` route JS).
