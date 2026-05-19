# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Project Overview

An internal dashboard to manage a catalog of indie games (CRUD) plus an AI chat that answers natural-language questions about the catalog. The chat uses tool calling against the same data layer that backs the REST API — it never receives the database as raw context — and streams responses to the UI in real time.

## Tech Stack

- **Framework:** Next.js 14+ (App Router) + TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Persistence:** SQLite (local file under `data/`, git-ignored)
- **LLM layer:** Vercel AI SDK + Anthropic `claude-sonnet-4-6`
- **Transport:** Next.js Route Handlers for both REST and streaming chat

## Spec Quick Reference

Authoritative requirements live in [docs/specs/](docs/specs/). Always read the relevant spec before changing the corresponding area:

- [docs/specs/01-games-crud.md](docs/specs/01-games-crud.md) — Games data model (`title`, `developer`, `genre`, `monthly_revenue_usd`, `monthly_downloads`, `average_rating`) + SQLite persistence.
- [docs/specs/02-rest-api.md](docs/specs/02-rest-api.md) — REST endpoints: `GET /games`, `POST /games`, `GET /games/:id`, `PUT /games/:id`, `DELETE /games/:id`.
- [docs/specs/03-ai-chat.md](docs/specs/03-ai-chat.md) — Streaming chat with tool calling; no DB dumps into the prompt.
- [docs/specs/04-ui.md](docs/specs/04-ui.md) — Dashboard view (table or cards) + chat view, Next.js App Router + Tailwind.

## Feature Documentation

Technical docs explaining how each feature is actually implemented — data flow, components, design decisions. Read these when working on or extending an existing feature:

- [docs/features/01-games-crud.md](docs/features/01-games-crud.md) — Data model, SQLite schema, repository pattern (`GamesRepository` interface + `SqliteGamesRepository`), Zod validation, seed script.
- [docs/features/02-rest-api.md](docs/features/02-rest-api.md) — Route handler structure, request/response shapes, error format, design decisions (full replacement PUT, server-generated IDs, no query params).
- [docs/features/03-ai-chat.md](docs/features/03-ai-chat.md) — `streamText` setup, system prompt contract, tool definitions (`list_games`, `find_game_by_title`, `catalog_summary`, `respond`), `CatalogAnswer` discriminated union, hydration pattern, client-side part rendering logic.
- [docs/features/04-ui.md](docs/features/04-ui.md) — App Router data flow, component tree, native `<dialog>` pattern, chat drawer, `AnswerCard` variants, Tailwind conventions.

## Engineering Rules (Non-Negotiable)

### Clean Code
- Meaningful, intention-revealing names. No abbreviations that aren't industry-standard.
- Small functions doing one thing. Early returns over nested conditionals.
- No dead code, no unused exports, no premature abstraction. Duplication is preferable to the wrong abstraction.

### SOLID
- **S** — One responsibility per module, component, route handler, and tool definition.
- **O / L** — Extend behavior by adding new tools, repositories, or components rather than mutating existing ones.
- **I** — Keep interfaces narrow; consumers should not depend on shapes they don't use.
- **D** — Depend on abstractions at the data and AI boundaries (e.g. a `GamesRepository` interface implemented by a SQLite adapter; LLM tools defined against the repository, not against the DB driver).

### No Comments — Of Any Kind
Code must be self-explanatory through naming and structure. Do not write:
- Inline comments (`//` or `#`).
- Block comments (`/* ... */`).
- JSDoc / TSDoc.
- Banner comments, section dividers, `TODO` / `FIXME` / `NOTE` markers.

The only acceptable prose lives in Markdown files (`CLAUDE.md`, `README.md`, `docs/`). If you feel the urge to explain code with a comment, rename a symbol or extract a function instead.

### Mobile First
All UI work starts from the smallest viewport and scales up — never the other way around:
- Design and implement the mobile layout first, then progressively enhance with Tailwind's `sm:`, `md:`, `lg:`, `xl:` breakpoints.
- Base (unprefixed) Tailwind classes describe the mobile experience; larger-breakpoint prefixes add or override only what changes.
- Tap targets are at least 44×44px; spacing, typography, and forms must remain usable with one thumb.
- Tables (dashboard view) must have a mobile-friendly fallback — horizontal scroll within a bounded container, or a card layout on narrow screens — never a layout that overflows the viewport.
- The chat surface must work on mobile: composer pinned, input never hidden by the on-screen keyboard, streaming output scrolls into view.
- Test every change at ~360px wide before considering it done.

### Accessibility (UI)
Every interactive UI surface must meet WCAG basics:
- Semantic HTML (`<button>`, `<nav>`, `<main>`, `<form>`, `<table>`, `<th scope>`...).
- Every form control paired with a real `<label htmlFor>` — placeholders are not labels.
- `aria-*` attributes where semantics aren't conveyed by HTML alone; never as decoration.
- Full keyboard navigation, logical tab order, visible focus states (do not remove default outlines without replacement).
- Color contrast meets AA via Tailwind's accessible palette choices; never communicate state through color alone.
- Streaming chat output uses `aria-live="polite"` so screen readers receive incremental updates.
- Images and icons that convey meaning have `alt` text; purely decorative ones use `alt=""` or `aria-hidden`.

### No Lint-Disable Lines or Tags
Never bypass tooling. Do not write — anywhere, for any reason:
- `eslint-disable`, `eslint-disable-next-line`, `eslint-disable-line` (any rule).
- `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
- `prettier-ignore`.
- Equivalent disables for any other linter or formatter added later.

If a linter or the type checker complains, fix the root cause: refine types, restructure code, or update the rule configuration explicitly in the config file with a justification in the PR description.

## Out of Scope

Per the assessment brief: authentication, deployment, production-grade error handling, and full test coverage are out of scope. Do not invest time there unless the user explicitly asks.

## Conventions

- **TypeScript strict mode** is on; no implicit `any`.
- **Server Components by default.** Use `"use client"` only where required (forms with local state, the chat surface).
- **REST routes** live under `app/api/games/` as Route Handlers; one file per resource path.
- **Chat route** lives under `app/api/chat/` and returns a streamed response via the Vercel AI SDK.
- **Repository layer** sits between Route Handlers / AI tools and the SQLite driver — handlers and tools never touch SQL directly.
- **SQLite file** lives at `data/games.db`, is git-ignored, and is provisioned by a seed script that runs idempotently.
- **Environment variables** (e.g. `ANTHROPIC_API_KEY`) are read from `.env.local`, which is git-ignored; provide a checked-in `.env.example`.

## Next.js version notes

@AGENTS.md

---

## Assessment Information

> **Note:** This section is purely informational and must not be taken into account for development decisions. It does not apply any rules or conventions to the code.

**1. Tools used**

I used Claude Code with Opus (planning mode) for planning and Sonnet (edit mode) for writing code. This is the most effective combination I have found: plan thoroughly before the first line of code is written.

**2. Most impactful prompts**

- A skill to take the requirements and convert them into `.md` files, so Claude always has the full context of what is needed — both for development and bug fixing. Those files are also referenced in `CLAUDE.md` so every session starts with the right context.
- A prompt to analyze the entire app and generate technical feature documentation, also referenced in `CLAUDE.md`. Useful not only for the AI (to reinforce context about what was built and how) but also for any developer who needs to understand the codebase.
- A prompt to audit the app and surface potential bugs and improvement opportunities. The user then decides which ones to tackle.

All three prompts involve active user participation — for code design decisions, library choices, and trade-off calls.

**3. Cases where the AI got it wrong**

There were no serious cases where the AI misunderstood the goal and required manual intervention. A significant amount of time was invested upfront in planning and building sufficient context so the AI always had clear direction. There were only minor UI cases where I had to redirect it toward a specific approach.

**4. Parallel tools / agents**

No tools other than Claude Code were used.
