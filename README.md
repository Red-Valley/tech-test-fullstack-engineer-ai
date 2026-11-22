# Indie Games Studio Dashboard & AI Copilot

A full-stack internal dashboard and AI-powered chat assistant for managing and analyzing an indie games catalog. Built for the Red-Valley Full-Stack Engineer (AI) Technical Assessment.

---

## Overview

The application combines a high-performance **catalog management dashboard** (with real-time search, multi-column sorting, genre filtering, and full CRUD operations) with a **database-backed AI chat assistant** capable of answering natural-language queries about revenue, rankings, ratings, and comparisons via tool calling and live streaming.

### Key Highlights
- **Framework:** Next.js 15.5.29 (App Router) + React 19 + TypeScript + Tailwind CSS.
- **Local Persistence:** Zero-dependency SQLite via Node.js 24 native `node:sqlite` in WAL mode, with prepared parameterized statements.
- **REST API:** Clean REST endpoints (`/api/games`, `/api/games/[id]`, `/api/games/stats`) with Zod domain validation.
- **AI Stack:** Google Generative AI (`gemini-3.8-flash`) via the Vercel AI SDK (`ai` v7.0.179, `@ai-sdk/google` v4.0.124, `@ai-sdk/react` v4.0.183).
- **Tool Calling:** 5 dedicated database-backed tools invoking domain services directly; the database is never dumped into the prompt.
- **Streaming:** Server-to-client UI streaming via `streamText` and `@ai-sdk/react` `DefaultChatTransport`.
- **Honest Data Modeling:** Strict semantic handling of rating boundaries (`average_rating > 4.0`) and transparent disclosure that `monthly_revenue_usd` represents recorded catalog snapshots without calendar-month or reporting-period timestamps.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Next.js 15 Presentation                          │
│                                (App Router)                                 │
├──────────────────────────────────────┬──────────────────────────────────────┤
│          Dashboard (Left)            │         AI Copilot (Right)           │
│  - MetricCards (/api/games/stats)    │  - ChatPanel (useChat)               │
│  - GameTable (/api/games)            │  - DefaultChatTransport              │
│  - GameFormModal (Create/Edit)       │  - Suggested Prompt Chips            │
│  - DeleteConfirmModal (Delete)       │  - Tool Invocation Badges            │
└──────────────────┬───────────────────┴──────────────────┬───────────────────┘
                   │ HTTP REST (JSON)                     │ POST /api/chat (SSE)
                   ▼                                      ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│           REST API Routes            │  │           AI Chat Route           │
│  - GET/POST /api/games               │  │  - POST /api/chat                 │
│  - GET/PATCH/DELETE /api/games/[id]  │  │  - streamText() + stepCountIs(5)  │
│  - GET /api/games/stats              │  │  - CATALOG_SYSTEM_PROMPT          │
└──────────────────┬───────────────────┘  └──────────────────┬────────────────┘
                   │                                         │
                   ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Domain: GamesService                              │
│              Validation (Zod) + Business Logic + AI Tool Handlers           │
│                                                                             │
│   Tools: search_games | count_games | get_top_games | compare_games | ...   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Persistence: GamesRepository                          │
│        Node.js 24 native SQLite (node:sqlite) — Parameterized SQL & WAL     │
│                 Default: data/games.db  |  Tests: :memory:                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AI Implementation & Technical Specifications

### Model & Provider Configuration
- **Provider:** Google Generative AI via `@ai-sdk/google` (`createGoogleGenerativeAI`).
- **Model Identifier:** `gemini-3.8-flash` (declared and supported in `@ai-sdk/google` v4.0.124 typings).
- **Server Isolation:** All AI modules (`provider.ts`, `tools.ts`, `system-prompt.ts`, `route.ts`) enforce `import 'server-only';`. API keys are accessed exclusively server-side and never exposed to client bundles (no `NEXT_PUBLIC_` prefix).
- **Environment Variables:**
  - `GOOGLE_GENERATIVE_AI_API_KEY`: Primary API key.
  - `GEMINI_API_KEY`: Supported automatic fallback.

### Database-Backed Tools (Function Calling)
The AI assistant interacts with the catalog exclusively through five dedicated tools that invoke `GamesService`:
1. `search_games`: Query by title/developer substring, genre, rating bounds, and minimum revenue.
2. `count_games`: Aggregate matching game count. Enforces strict exclusive inequality `average_rating > rating_above` (e.g. for "above 4" queries).
3. `get_top_games`: Rank games by `monthly_revenue_usd`, `monthly_downloads`, or `average_rating`. Returns a data limitation notice regarding calendar periods.
4. `compare_games`: Side-by-side comparison of 2–5 games by title or ID with computed deltas for revenue, downloads, and ratings.
5. `get_catalog_stats`: Catalog-wide aggregates (total games, total revenue, average downloads, average rating, genre breakdown).

### Streaming Architecture
- **Server:** `src/app/api/chat/route.ts` executes `streamText` with multi-step tool resolution (`stopWhen: stepCountIs(5)`), returning a native SSE response via `toUIMessageStreamResponse()`.
- **Client:** `src/components/chat/ChatPanel.tsx` consumes the SSE stream using `@ai-sdk/react`'s `useChat` with `transport: new DefaultChatTransport({ api: '/api/chat' })`. UI updates progressively as tokens and tool events arrive.

### Query Semantics & Constraints
- **"Which game made the most revenue last month?":** The database stores `monthly_revenue_usd` as an unanchored scalar value per game with no reporting-period or calendar-month field. The assistant calls `get_top_games`, returns the highest recorded earner (Celeste), and explicitly discloses that the catalog does not record calendar months or reporting periods, so it cannot be confirmed whether the figures represent last month's performance.
- **"How many games are rated above 4?":** Strictly evaluated as `average_rating > 4.0`, excluding games rated exactly 4.0 (such as *Animal Well* at 4.0). The query accurately returns 13 out of 15 seeded games.
- **"Compare revenue of Celeste vs Hollow Knight":** Invokes `compare_games` to display side-by-side metrics and calculated differences ($1,250,000 vs $920,000 → delta of $330,000) with period disclaimer.

---

## Verification & Testing

### Verification Distinctions
- **Code-Level Verification (Completed & Passing):**
  - All 29 unit and integration tests execute against isolated in-memory SQLite databases (`:memory:`), guaranteeing zero mutations to `data/games.db` and zero Gemini API quota consumption.
  - ESLint (`npm run lint`) passes with 0 errors and 0 warnings.
  - TypeScript and Next.js production build (`npm run build`) compile cleanly.
- **Live Gemini Verification Note:**
  - No live Gemini API requests were performed during automated testing to protect starter quota. Live upstream endpoints may experience intermittent 503 Overloaded errors depending on Google API Studio availability.
  - An optional integration test script is available via `npm run test:live` if a developer wishes to test live streaming with an active key.

---

## Getting Started

### Prerequisites
- **Node.js:** v24.0.0+ (requires native `node:sqlite` support; tested on Node v24.15.0).
- **npm:** v10+ or v11+.

### 1. Installation
Clone your fork and install dependencies:
```bash
git clone git@github.com:AndersonGrisalesV/tech-test-fullstack-engineer-ai.git
cd tech-test-fullstack-engineer-ai
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```
Add your Google Gemini API key to `.env.local`:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
```
*(The dashboard and REST API remain fully functional for CRUD operations even without an API key; the AI chat gracefully displays an informational notice if the key is omitted.)*

### 3. Database Initialization & Seeding
Seed the local SQLite database (`data/games.db`) with 15 curated indie games:
```bash
npm run db:seed
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Tests & Quality Checks
```bash
# Run all 29 automated tests (isolated in-memory DB, zero API quota used)
npm test

# Run ESLint
npm run lint

# Run Next.js production build & type checking
npm run build
```

---

## Project Structure

```
├── data/
│   ├── games.db                 # Local SQLite database (WAL mode)
│   └── seed-data.json           # 15 synthetic indie games dataset
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts    # Streaming AI chat endpoint (streamText)
│   │   │   └── games/
│   │   │       ├── route.ts     # GET /api/games & POST /api/games
│   │   │       ├── [id]/route.ts# GET, PATCH, DELETE /api/games/[id]
│   │   │       └── stats/route.ts# GET /api/games/stats
│   │   ├── globals.css          # Tailwind CSS styling
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Unified dashboard & split-grid layout
│   ├── components/
│   │   ├── chat/
│   │   │   └── ChatPanel.tsx    # Streaming chat UI with tool badges & quick chips
│   │   └── dashboard/
│   │       ├── DeleteConfirmModal.tsx # Accessible delete confirmation modal
│   │       ├── GameFormModal.tsx      # Accessible create/edit form modal
│   │       ├── GameTable.tsx          # Filterable, sortable, paginated table
│   │       └── MetricCards.tsx        # Catalog-wide KPI cards
│   └── lib/
│       ├── ai/
│       │   ├── provider.ts      # Server-only Google Gemini provider config
│       │   ├── system-prompt.ts # Strict operational system prompt
│       │   └── tools.ts         # 5 database-backed AI tool definitions
│       ├── repositories/
│       │   └── games-repository.ts # Prepared SQL queries & SQLite driver
│       ├── services/
│       │   └── games-service.ts    # Business logic & validation layer
│       ├── db.ts                # SQLite connection lifecycle & WAL configuration
│       ├── seed.ts              # Idempotent database seeder
│       └── types.ts             # TypeScript interfaces & Zod validation schemas
└── tests/
    ├── ai-tools.test.ts         # 7 deterministic tests for AI tool calling
    ├── api-routes.test.ts       # 13 REST API integration tests (in-memory DB)
    ├── crud-repository.test.ts  # 9 repository CRUD & SQL injection tests
    └── live-chat.integration.ts # Optional live Gemini test (run via test:live)
```

---

## Tradeoffs & Design Decisions

1. **Native `node:sqlite` vs External ORM (Prisma / Drizzle):**
   - *Decision:* Used Node 24's built-in `node:sqlite` module without extra ORM dependencies.
   - *Rationale:* Zero external native binary compilation issues, lightning-fast boot time, low footprint, and total control over prepared statements and in-memory test databases (`:memory:`).
2. **Server-Side Filtering & Pagination vs Client-Side:**
   - *Decision:* Filtering, sorting, and pagination happen at the database level via query parameters on `GET /api/games`.
   - *Rationale:* Mirrors real-world production architectures where catalogs scale beyond memory limits, avoiding expensive client bundle transfers.
3. **Dedicated Metric Cards Endpoint (`/api/games/stats`):**
   - *Decision:* Added a dedicated read-only stats route rather than deriving KPIs from paginated table rows.
   - *Rationale:* Guarantees that overview cards display accurate catalog-wide totals regardless of active filters or pagination page.
4. **Transport Decoupling in AI SDK 7:**
   - *Decision:* Configured `useChat` with explicit `DefaultChatTransport` rather than legacy string options.
   - *Rationale:* Ensures full type safety and alignment with the latest Vercel AI SDK 7 / `@ai-sdk/react` 4 architectural standards.
