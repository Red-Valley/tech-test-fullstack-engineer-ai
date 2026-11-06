---
name: api-contract-patterns
description: API contract conventions between backend and frontend in this project — resource shapes, endpoints, status codes, the standard error envelope, validation, query params, typed client, and how to evolve the contract safely. Use when creating/consuming an endpoint, handling API errors in the UI, or changing anything in tasks/00-OVERVIEW.md.
---

# API Contract Patterns

The contract in `tasks/00-OVERVIEW.md` is canonical. This skill defines **how** endpoints behave so backend and frontend never guess.

## 1. Single source of truth
- Zod schemas in `lib/schema.ts` define inputs; `Game` in `lib/types.ts` defines output. Both sides import the same types — the frontend never re-declares a `Game`.
- Field names are `snake_case` exactly as the assessment specifies. Don't map to camelCase.

## 2. Resource shape
```jsonc
// Game
{ "id": 1, "title": "Starfall Tactics", "developer": "Nimbus Forge", "genre": "Strategy",
  "monthly_revenue_usd": 182500.5, "monthly_downloads": 48210, "average_rating": 4.6,
  "created_at": "2026-11-05T21:00:00.000Z", "updated_at": "2026-11-05T21:00:00.000Z" }
```
- Numbers are JSON numbers (never strings). Money in USD as a decimal number (acceptable for this scope; note "integer cents" as a production trade-off).
- Timestamps ISO-8601 UTC.
- Collections return a bare array `Game[]` (small dataset, no pagination — documented trade-off).

## 3. Endpoints and status codes
| Action | Request | Success | Errors |
|---|---|---|---|
| List | `GET /api/games?genre&search&sortBy&order&minRating` | `200 Game[]` | `400` bad query |
| Create | `POST /api/games` body `GameInput` | `201 Game` + `Location: /api/games/:id` | `400` |
| Read | `GET /api/games/:id` | `200 Game` | `400` bad id, `404` |
| Update | `PUT /api/games/:id` body `Partial<GameInput>` (≥1 field) | `200 Game` | `400`, `404` |
| Delete | `DELETE /api/games/:id` | `204` empty body | `400`, `404` |
| Chat | `POST /api/chat` body `{ messages: UIMessage[] }` | `200` UI message stream | `400`, `500` config |

Rules: `PUT` here is a partial update (document it; `PATCH` would also be acceptable — pick one, don't support both). Unknown body keys are stripped (Zod default) — not an error. Empty update body → `400`.

## 4. Error envelope (every non-2xx JSON response)
```jsonc
{
  "error": {
    "code": "VALIDATION_ERROR",          // stable machine code: VALIDATION_ERROR | INVALID_JSON | INVALID_ID | NOT_FOUND | CONFIG_ERROR | INTERNAL
    "message": "Request validation failed", // human readable, safe to show
    "issues": {                          // only for VALIDATION_ERROR: field → messages
      "average_rating": ["Number must be less than or equal to 5"]
    }
  }
}
```
- Build it with helpers in `lib/http.ts`: `jsonError(status, code, message)`, `validationError(zodError)` (uses `z.flattenError(err).fieldErrors` in Zod 4 / `err.flatten().fieldErrors` in Zod 3).
- Never return stack traces or SQL errors. Log server-side, return `INTERNAL`.

## 5. Query params
- Parse with a Zod schema using `z.coerce` for numbers; enums for `sortBy` (`monthly_revenue_usd | monthly_downloads | average_rating | title`) and `order` (`asc | desc`). Invalid → `400`, not silently ignored.

## 6. Frontend consumption (`lib/api-client.ts`)
```ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError };
export async function createGame(input: GameInput): Promise<ApiResult<Game>> { … }
```
- Never `throw` for expected HTTP errors; return the discriminated union so the UI must handle both branches.
- `VALIDATION_ERROR` → field errors next to inputs. `NOT_FOUND` → "This game no longer exists" + refresh. Network/`INTERNAL` → generic banner with retry.

## 7. AI tools are part of the contract
Tool names, input schemas and output shapes are an internal API between the model and the repository. Keep them stable, documented in the README, and covered by tests. Output shapes: `{ results: Game-subset[], count }`, `{ stats: GameStats }`, `{ games: [...], notFound: string[] }`.

## 8. Changing the contract
1. Update `tasks/00-OVERVIEW.md` + `lib/types.ts`/`lib/schema.ts` in the same commit.
2. Update both producer and consumer + their tests.
3. Call it out in the agent report and the PR "Trade-offs" if it deviates from the assessment.
