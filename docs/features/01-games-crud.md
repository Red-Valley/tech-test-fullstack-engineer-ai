# Feature: Games CRUD

Covers the data model, persistence layer, validation, and repository abstraction for the indie games catalog.

---

## Data Model

Each game has six domain fields plus two auto-managed timestamps:

| Field | Type | Constraints |
|---|---|---|
| `id` | `TEXT` | Primary key — UUID generated server-side via `crypto.randomUUID()` |
| `title` | `TEXT` | Required, 1–200 chars |
| `developer` | `TEXT` | Required, 1–200 chars |
| `genre` | `TEXT` | Required, 1–100 chars |
| `monthly_revenue_usd` | `REAL` | Required, ≥ 0 |
| `monthly_downloads` | `INTEGER` | Required, integer ≥ 0 |
| `average_rating` | `REAL` | Required, 0–5 inclusive |
| `created_at` | `TEXT` | ISO datetime, set on INSERT |
| `updated_at` | `TEXT` | ISO datetime, updated on every PUT |

**Source of truth:** [`lib/db/schema.sql`](../../lib/db/schema.sql)

The schema uses `CHECK` constraints to enforce domain rules at the database level (`monthly_revenue_usd >= 0`, `average_rating BETWEEN 0 AND 5`). Two performance indexes are pre-created: `idx_games_monthly_revenue` and `idx_games_rating`.

---

## Persistence Stack

- **Database:** SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) — synchronous API, no async overhead, single-file database at `data/games.db`.
- **Configuration:** WAL journal mode + foreign keys enabled on every connection ([`lib/db/client.ts`](../../lib/db/client.ts)).
- **Schema provisioning:** `db.exec(schema)` runs the DDL on every startup; `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` make it idempotent.
- **Singleton client:** `getDb()` returns a single `Database` instance for the process lifetime — no connection pooling overhead for a single-process server.

---

## Repository Pattern

The domain logic never touches SQL directly. All access goes through the `GamesRepository` interface:

```ts
// lib/games/repository.ts
interface GamesRepository {
  list(): Game[];
  findById(id: string): Game | null;
  create(input: NewGame): Game;
  update(id: string, input: GameUpdate): Game | null;
  delete(id: string): boolean;
}
```

**`SqliteGamesRepository`** is the production implementation. It pre-compiles all statements once in the constructor (prepared statements), eliminating per-request parsing overhead and ensuring all parameters are bound — no SQL injection surface.

Key implementation notes:
- `create` generates a UUID server-side, inserts, then reads back the full row via `findById`.
- `update` uses `result.changes === 0` to detect a missing ID and returns `null` (the route handler maps this to 404).
- `delete` returns a boolean derived from `result.changes > 0`.
- `getGamesRepository()` is a module-level singleton factory — one repository instance for the lifetime of the server process.

---

## Validation

Input is validated with Zod before touching the repository:

```ts
// lib/games/schemas.ts
export const gameInputSchema = z.object({
  title:                 z.string().trim().min(1).max(200),
  developer:             z.string().trim().min(1).max(200),
  genre:                 z.string().trim().min(1).max(100),
  monthly_revenue_usd:   z.number().finite().nonnegative(),
  monthly_downloads:     z.number().int().nonnegative(),
  average_rating:        z.number().min(0).max(5),
});

export const gameUpdateSchema = gameInputSchema; // full replacement (PUT semantics)
```

`safeParse` is used in route handlers — it returns a `success` flag rather than throwing, so the handler can return a 400 with structured field errors without a try/catch just for validation.

---

## Seed Script

`scripts/seed.ts` populates the database with 10 indie games (Hollow Knight, Celeste, Stardew Valley, etc.) on first run. It checks `repo.list().length > 0` and exits early if data already exists.

Run with:
```
npm run seed
```

Full reset (wipe + re-seed):
```
npm run db:reset
```
