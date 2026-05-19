# Feature: REST API

Exposes the games catalog over HTTP using Next.js App Router Route Handlers. All endpoints live under `app/api/games/`.

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/games` | List all games, ordered by `created_at DESC` |
| `POST` | `/api/games` | Create a new game |
| `GET` | `/api/games/:id` | Fetch a single game by UUID |
| `PUT` | `/api/games/:id` | Full replacement update of a game |
| `DELETE` | `/api/games/:id` | Delete a game by UUID |

---

## Route Files

```
app/api/games/
├── route.ts          ← GET (list) + POST (create)
└── [id]/
    └── route.ts      ← GET (single), PUT (update), DELETE
```

In Next.js App Router the dynamic segment `[id]` is resolved as `Promise<{ id: string }>` and must be awaited:

```ts
const { id } = await params;
```

---

## Request & Response Shapes

### `GET /api/games`
- Response: `Game[]` — full array, JSON.
- No query parameters (filtering/sorting is handled by the AI tools layer, not the REST API).

### `POST /api/games`
- Body: `gameInputSchema` fields (title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating).
- Response 201: newly created `Game` object + `Location` header.
- Response 400: `{ error: "Validation failed", details: { fieldErrors, formErrors } }`.

### `GET /api/games/:id`
- Response 200: `Game` object.
- Response 404: `{ error: "Game not found" }`.

### `PUT /api/games/:id`
- Body: same shape as POST (full replacement).
- Response 200: updated `Game` object.
- Response 400: validation error (same shape as POST 400).
- Response 404: `{ error: "Game not found" }`.

### `DELETE /api/games/:id`
- Response 204: no body.
- Response 404: `{ error: "Game not found" }`.

---

## Error Handling

All handlers wrap logic in `try/catch`. On unexpected errors:
- `console.error("<context>", error)` — visible in dev server stderr and any log collector.
- Returns `500` with `{ error: "<human message>" }`.

Validation errors (400) use `parsed.error.flatten()` from Zod, giving the client per-field error messages (`details.fieldErrors`) that the form UI can display inline.

---

## Design Decisions

**No query parameters on GET /api/games.** The dashboard fetches all games at once and re-renders after mutations via `router.refresh()`. Filtering, sorting, and aggregation are the AI chat's responsibility — it uses a richer tool interface (`list_games` with `minRating`, `genre`, `sortBy`, `limit` options) rather than query strings.

**PUT = full replacement, not PATCH.** `gameUpdateSchema` is identical to `gameInputSchema`. Every edit goes through the form which always submits all six fields, so partial updates add no practical value here.

**IDs are server-generated UUIDs.** Clients never supply an `id` in POST body — `crypto.randomUUID()` runs in the repository's `create` method. Any `id` field in the body is silently stripped by Zod's default unknown-key handling.
