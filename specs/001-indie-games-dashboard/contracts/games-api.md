# Contract: Games REST API

**Base path**: `/api/games` | **Format**: JSON (`Content-Type: application/json`) |
**Auth**: none (internal tool)

Field names and validation rules are defined once in [../data-model.md](../data-model.md);
this document only states transport behaviour.

## Types

```ts
// Game  — full record (gameSchema)
{
  id: number,
  title: string,
  developer: string,
  genre: string,
  monthly_revenue_usd: number,
  monthly_downloads: number,
  average_rating: number,
  created_at: string,   // ISO-8601 UTC
  updated_at: string    // ISO-8601 UTC
}

// GameInput — request body for POST and PUT (gameInputSchema): the six user fields only
{
  title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating
}

// ErrorResponse
{
  error: {
    code: 'validation_error' | 'not_found' | 'invalid_id' | 'invalid_json',
    message: string,
    fields?: { [field: string]: string[] }   // present only for validation_error
  }
}
```

## Endpoints

| Method | Path | Request body | Success | Errors |
|---|---|---|---|---|
| `GET` | `/api/games` | — | `200` `Game[]` (ordered by `created_at`, `id`) | — |
| `POST` | `/api/games` | `GameInput` | `201` `Game` | `400 invalid_json`, `400 validation_error` |
| `GET` | `/api/games/{id}` | — | `200` `Game` | `400 invalid_id`, `404 not_found` |
| `PUT` | `/api/games/{id}` | `GameInput` (full replacement) | `200` `Game` | `400 invalid_id`, `400 invalid_json`, `400 validation_error`, `404 not_found` |
| `DELETE` | `/api/games/{id}` | — | `204` (empty body) | `400 invalid_id`, `404 not_found` |

### Rules

- `{id}` must be a positive integer; anything else → `400 invalid_id`.
- Bodies are parsed with `gameInputSchema`; extra keys are stripped; `id`, `created_at`,
  `updated_at` in a body are ignored.
- `validation_error.fields` lists every failing field with the rule text from the data model,
  e.g. `{ "average_rating": ["Must be between 0 and 5 with at most one decimal."] }`.
- `PUT` and `DELETE` check existence **before** validating the body, so a stale edit to a
  game that was deleted elsewhere returns `404` regardless of body quality (spec edge case
  "concurrent edits").
- No caching headers; every `GET` reflects the current file state. Route handlers export
  `dynamic = 'force-dynamic'`.

## Examples

```bash
# list
curl -s localhost:3000/api/games | jq length          # → 12 on a fresh seed

# create
curl -s -X POST localhost:3000/api/games \
  -H 'content-type: application/json' \
  -d '{"title":"Test Game","developer":"Me","genre":"Puzzle",
       "monthly_revenue_usd":1000,"monthly_downloads":50,"average_rating":4.2}'
# → 201 { "id": 13, ... }

# validation failure
curl -s -X POST localhost:3000/api/games -H 'content-type: application/json' \
  -d '{"title":"","developer":"Me","genre":"Puzzle",
       "monthly_revenue_usd":-5,"monthly_downloads":1.5,"average_rating":7}'
# → 400 { "error": { "code": "validation_error", "message": "...", "fields": {
#        "title": [...], "monthly_revenue_usd": [...], "monthly_downloads": [...], "average_rating": [...] } } }

# update, then delete
curl -s -X PUT localhost:3000/api/games/13 -H 'content-type: application/json' -d '{...}'   # → 200
curl -s -X DELETE localhost:3000/api/games/13 -o /dev/null -w '%{http_code}'                 # → 204
curl -s localhost:3000/api/games/13 -w '%{http_code}'                                        # → 404
```
