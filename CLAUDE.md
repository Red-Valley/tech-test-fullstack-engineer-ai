# CLAUDE.md — Red Valley Tech Test

## Project
Internal dashboard for indie games catalog + AI chat assistant.
Next.js 14 App Router · TypeScript · Tailwind · OpenAI SDK (gpt-4o-mini) · SQLite (better-sqlite3).

## Architecture rules

- **App Router only** — no `pages/` directory.
- **Server Components by default** — add `"use client"` only when strictly necessary (event handlers, hooks, streaming UI).
- **API routes** live in `app/api/`. Return plain `Response` or `NextResponse`.
- **DB access** is always synchronous (`better-sqlite3`). Never use async DB calls.
- **AI layer**: OpenAI SDK (`gpt-4o-mini`) with tool calling. Never dump the full DB into the prompt context.
- All AI responses must **stream** using the Vercel AI SDK `StreamingTextResponse` or raw `ReadableStream`.

## Code style

- TypeScript strict mode — no `any`, no `ts-ignore`.
- Functional components only — no class components.
- No barrel `index.ts` re-exports unless the folder has 3+ exports.
- Tailwind for all styling — no CSS modules, no styled-components.
- No comments unless the WHY is non-obvious.
- Prefer `const` arrow functions for components: `const Foo = () => {}`.

## File & folder conventions

- `lib/db.ts` — single DB singleton + all raw SQL helpers.
- `lib/tools.ts` — Anthropic tool definitions + handler map.
- `lib/types.ts` — shared TypeScript interfaces (`Game`, `ChatMessage`, etc.).
- `components/` — reusable UI only (no data fetching inside components).
- `app/api/games/route.ts` — GET (list), POST (create).
- `app/api/games/[id]/route.ts` — GET, PUT, DELETE.
- `app/api/chat/route.ts` — streaming POST.

## Do NOT do

- Do not use Prisma or any ORM — raw SQL with `better-sqlite3`.
- Do not use `fetch` inside Server Components for local API routes — call DB helpers directly.
- Do not use `useEffect` for data fetching — use Server Components or React Server Actions.
- Do not add auth, deployment config, or full test coverage (out of scope).
- Do not install unnecessary packages — keep deps minimal.

## Game schema

```ts
interface Game {
  id: number;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number;
  monthly_downloads: number;
  average_rating: number; // 0.0 – 5.0
  created_at: string;     // ISO 8601
}
```

## AI tools available to the LLM

1. `get_games` — list all games (optional filters: genre, min_rating).
2. `get_game_by_id` — fetch single game.
3. `compare_games` — compare two games side by side.
4. `get_stats` — aggregate stats (top revenue, top downloads, avg rating, count by genre).

## Environment variables

```
APENAI_API_KEY=...   # required (OpenAI API key)
```

## How to run

```bash
npm install
npm run dev   # http://localhost:3000
```
