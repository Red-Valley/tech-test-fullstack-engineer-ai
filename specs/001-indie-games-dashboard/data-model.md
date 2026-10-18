# Data Model: Indie Games Dashboard

**Date**: 2026-10-17 | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Entity: Game

One indie title tracked by the team. No relationships to other entities.

| Column | SQLite type | TS type | Constraints | Notes |
|---|---|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | `number` | system-assigned, stable | never supplied by clients |
| `title` | TEXT NOT NULL | `string` | trimmed, 1–100 chars | duplicates allowed |
| `developer` | TEXT NOT NULL | `string` | trimmed, 1–100 chars | |
| `genre` | TEXT NOT NULL | `string` | trimmed, 1–50 chars | free text |
| `monthly_revenue_usd` | REAL NOT NULL | `number` | finite, ≥ 0, ≤ 2 decimal places | whole dollars in seed data |
| `monthly_downloads` | INTEGER NOT NULL | `number` | integer, ≥ 0 | |
| `average_rating` | REAL NOT NULL | `number` | 0 ≤ x ≤ 5, at most 1 decimal place | |
| `created_at` | TEXT NOT NULL | `string` | ISO-8601 UTC, set on insert | default ordering key |
| `updated_at` | TEXT NOT NULL | `string` | ISO-8601 UTC, set on insert and update | |

Snake_case names are used verbatim in SQL, TypeScript, JSON and tool parameters
(research §8).

### Validation (shared schema)

`lib/db/schema.ts` exports, built with `drizzle-zod`:

- **`gameInputSchema`** — the six user-supplied fields with the refinements in the table
  above. Used by `POST /api/games`, `PUT /api/games/:id`, and `GameForm`. Unknown keys are
  stripped; `id`, `created_at`, `updated_at` are rejected if present.
- **`gameSchema`** — the full row (`gameInputSchema` + `id`, `created_at`, `updated_at`).
  Used as the `Game` type and as the shape of tool outputs.
- **Error mapping** — a failed parse is flattened to
  `{ [field]: string[] }` (first message per field is shown in the UI). Rule texts:
  - `title`/`developer`: "Required, up to 100 characters."
  - `genre`: "Required, up to 50 characters."
  - `monthly_revenue_usd`: "Must be a number of 0 or more."
  - `monthly_downloads`: "Must be a whole number of 0 or more."
  - `average_rating`: "Must be between 0 and 5 with at most one decimal."

### Lifecycle

Games have no states. Operations: create → (update)* → delete. `PUT` is a full replacement
of the six user fields (the form always submits all six), so one schema serves create and
update.

### Repository interface (`lib/games/repository.ts`)

All functions are synchronous and are the only code that imports `lib/db/client.ts`.

| Function | Signature | Backs |
|---|---|---|
| `listGames()` | `() => Game[]` ordered by `created_at` asc, `id` asc | dashboard, `GET /api/games` |
| `getGame(id)` | `(id: number) => Game \| undefined` | `GET/PUT/DELETE /api/games/:id` |
| `createGame(input)` | `(input: GameInput) => Game` | `POST /api/games` |
| `updateGame(id, input)` | `(id, input: GameInput) => Game \| undefined` | `PUT /api/games/:id` |
| `deleteGame(id)` | `(id: number) => boolean` | `DELETE /api/games/:id` |
| `countGames()` | `() => number` | tools |
| `searchGames(query, limit)` | case-insensitive `LIKE %q%` on `title` OR `developer` | `search_games` tool |
| `rankGames(metric, order, limit)` | `ORDER BY metric order, title asc LIMIT n` | `rank_games` tool |
| `filterGames(filter)` | `{ metric?, op?, value?, genre?, developer? }` → `Game[]` (case-insensitive equality on genre/developer) | `count_games` tool |
| `findGamesByTitles(titles)` | exact case-insensitive match per title → `{ found: Game[]; notFound: string[] }`; falls back to unique partial match | `get_games` tool |

`metric` is the union `'monthly_revenue_usd' | 'monthly_downloads' | 'average_rating'`
(exported as `Metric`); `op` is `'gt' | 'gte' | 'lt' | 'lte' | 'eq'`.

## Entity: Conversation (client-only)

Held in `useChat` state in the browser; never persisted. Shape is the AI SDK `UIMessage`
typed via `InferAgentUIMessage<typeof agent>`:

- `role`: `'user' | 'assistant'`
- `parts[]`: `text` parts and `tool-search_games` / `tool-rank_games` / `tool-count_games` /
  `tool-get_games` parts with `state`, `input`, `output`, `errorText`.

Reloading the page discards it (spec assumption).

## Seed dataset

Inserted once when `data/games.db` is first created (spec FR-007, clarification Q2).
Twelve fictional games chosen so every example question has one unambiguous answer and the
"above 4" / "at least 4" boundary is exercised.

| # | title | developer | genre | monthly_revenue_usd | monthly_downloads | average_rating |
|---|---|---|---|---|---|---|
| 1 | Hollow Depths | Mossgrove Studio | Metroidvania | 142500 | 38200 | 4.7 |
| 2 | Stardust Farm | Pixel Hearth | Farming Sim | 98000 | 51400 | 4.5 |
| 3 | Neon Drift | Volt Circuit | Racing | 61200 | 29800 | 3.9 |
| 4 | Paper Kingdoms | Foldline Games | Strategy | 45300 | 12600 | 4.2 |
| 5 | Cinder & Salt | Two Lanterns | Narrative | 22800 | 9100 | 4.8 |
| 6 | Rogue Harvest | Mossgrove Studio | Roguelike | 77900 | 33700 | 4.1 |
| 7 | Deep Signal | Hexwave | Horror | 54600 | 21300 | 3.6 |
| 8 | Tidewalkers | Pixel Hearth | Adventure | 19400 | 8750 | 3.8 |
| 9 | Gearloose | Brass Rabbit | Puzzle | 31250 | 17900 | 4.4 |
| 10 | Skyline Siege | Volt Circuit | Tower Defense | 12900 | 6300 | 3.2 |
| 11 | Moth & Lantern | Two Lanterns | Platformer | 8400 | 4900 | 4.0 |
| 12 | Ironvale Tactics | Foldline Games | Tactics | 36700 | 10200 | 4.3 |

**Known answers** (used by quickstart and `tests/tools.test.ts`):

- Most revenue: Hollow Depths ($142,500). Least: Moth & Lantern ($8,400).
- Most downloads: Stardust Farm (51,400). Highest rating: Cinder & Salt (4.8).
- Rated **above** 4: 7 games (Hollow Depths, Stardust Farm, Paper Kingdoms, Cinder & Salt,
  Rogue Harvest, Gearloose, Ironvale Tactics). Rated **4 or higher**: 8 (adds Moth & Lantern).
- Hollow Depths vs Stardust Farm revenue: $142,500 vs $98,000 — Hollow Depths by $44,500.
- Games by Mossgrove Studio: 2. Genres: 12 distinct. Total games: 12.
