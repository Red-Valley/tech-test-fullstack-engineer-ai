# 03 — API REST de juegos

**Track:** A · **Depende de:** 02 · **Estimado:** 20 min · **Bloquea:** 04

## Objetivo

Exponer el CRUD vía Route Handlers según la tabla del contrato en `00-OVERVIEW.md`.

## Pasos

1. `app/api/games/route.ts`
   - `GET`: lee los query params (`genre`, `search`, `sortBy`, `order`, `minRating`) y los valida con un `z.object` de filtros. Llama a `listGames`.
   - `POST`: `gameInputSchema.safeParse(body)`. Si falla, responde `400` con el **error envelope** (`VALIDATION_ERROR` + `issues` por campo; ver la skill `api-contract-patterns`). Si pasa, `createGame` y responde `201`.
2. `app/api/games/[id]/route.ts`
   - Parsea `id` como entero positivo; si es inválido, `400`.
   - `GET` → `getGame` → `200` / `404`
   - `PUT` → `gameUpdateSchema` → `updateGame` → `200` / `400` / `404`
   - `DELETE` → `deleteGame` → `204` / `404`
   - Ojo con Next 16: `params` es una **Promise** (`const { id } = await params`).
3. En ambos archivos: `export const runtime = 'nodejs'` (SQLite no corre en edge) y `export const dynamic = 'force-dynamic'`.
4. Helpers en `lib/http.ts`: `jsonError(status, code, message)`, `validationError(zodError)` y `readJson(req)`.
5. Captura el JSON mal formado (`req.json()` lanza un error) → `400 INVALID_JSON`.

## Criterios de aceptación

Prueba con curl (pega los comandos en el README como ejemplo):

```bash
curl localhost:3000/api/games
curl "localhost:3000/api/games?sortBy=monthly_revenue_usd&order=desc"
curl -X POST localhost:3000/api/games -H 'Content-Type: application/json' \
  -d '{"title":"Test","developer":"Me","genre":"Puzzle","monthly_revenue_usd":100,"monthly_downloads":10,"average_rating":4.2}'
curl -X PUT localhost:3000/api/games/1 -H 'Content-Type: application/json' -d '{"average_rating":4.9}'
curl -X DELETE -i localhost:3000/api/games/1
curl -X POST localhost:3000/api/games -H 'Content-Type: application/json' -d '{"title":""}'   # → 400
```

- [ ] Todos los status codes coinciden con el contrato
- [ ] Un rating de 7 o un revenue negativo → 400 con el detalle por campo
- [ ] Tests de los handlers en `app/api/games/**/route.test.ts`
- [ ] Los handlers no contienen SQL (solo llaman a `lib/games.ts`)

## Prompt sugerido

> "Create Next.js App Router route handlers for /api/games and /api/games/[id] following the API table in tasks/00-OVERVIEW.md. Validate with the zod schemas in lib/schema.ts, use runtime='nodejs', remember params is a Promise in Next 16, use the error envelope from the api-contract-patterns skill, and return proper 400/404/201/204 codes. Only call functions from lib/games.ts."

📝 Error típico para registrar: la IA genera `({ params }: { params: { id: string } })` (acceso síncrono), que en Next 16 rompe el build.
