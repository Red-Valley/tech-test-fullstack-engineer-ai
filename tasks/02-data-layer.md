# 02 — Capa de datos (SQLite + seed + repositorio)

**Track:** A · **Depende de:** 01 · **Estimado:** 25 min · **Bloquea:** 03, integración de 05

## Objetivo

Implementar `lib/db.ts` y `lib/games.ts` cumpliendo **exactamente** las firmas del contrato (`00-OVERVIEW.md`). Es la única capa que habla con la base de datos.

## Pasos

### `lib/db.ts`
- Singleton de `better-sqlite3` (guárdalo en `globalThis` para que el hot reload de dev no abra múltiples conexiones).
- Ruta: `process.env.DATABASE_PATH ?? 'data/games.db'` (`:memory:` en tests). Si es un archivo, crea la carpeta con `fs.mkdirSync(..., { recursive: true })`.
- Exporta `resetDb()` para que cada test arranque con una base limpia.
- `PRAGMA journal_mode = WAL`.
- Migración idempotente:
  ```sql
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    developer TEXT NOT NULL,
    genre TEXT NOT NULL,
    monthly_revenue_usd REAL NOT NULL CHECK (monthly_revenue_usd >= 0),
    monthly_downloads INTEGER NOT NULL CHECK (monthly_downloads >= 0),
    average_rating REAL NOT NULL CHECK (average_rating BETWEEN 0 AND 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```
- **Seed automático** si la tabla está vacía. El `.db` está en el `.gitignore`, así que el evaluador arranca sin datos.

### Datos de seed (`lib/seed-data.ts`)
- 12–15 juegos **ficticios** con variedad de géneros (Roguelike, Platformer, Puzzle, Metroidvania, Farming Sim, Horror…).
- Distribuye los valores para que las preguntas de ejemplo tengan respuestas interesantes:
  - Un claro #1 en revenue
  - ~5 juegos con rating > 4
  - Dos juegos con nombres fáciles de comparar
- Usa nombres inventados para no depender de datos reales.

### `lib/games.ts`
- Implementa todas las funciones del contrato con **prepared statements** y parámetros bind (nunca concatenes input en SQL).
- `listGames`: construye el `WHERE` dinámicamente desde `GameFilters`. Pon `sortBy` en una **whitelist** (no se puede bindear un nombre de columna). `limit` por defecto: 100, máximo 100.
- `findGamesByTitles`: un `title LIKE ? COLLATE NOCASE` por cada título con `%título%`, unidos con `OR`.
- `getStats`: `COUNT`, `SUM`, `AVG` con los mismos filtros. Redondea los promedios a 2 decimales.
- `updateGame`: actualiza `updated_at`. Retorna `null` si el id no existe.
- Marca el archivo con `import 'server-only'`.

## Criterios de aceptación

- [ ] Al borrar `data/games.db` y arrancar, la base se recrea con el seed
- [ ] Prueba rápida en un script o en la consola de una route: `listGames({ sortBy: 'monthly_revenue_usd', order: 'desc', limit: 1 })` devuelve el #1
- [ ] `getStats({ minRating: 4 })` devuelve un count correcto (el rating debe ser **mayor** a 4: decide si `>` o `>=` y documéntalo)
- [ ] `findGamesByTitles(['hollow', 'STAR'])` encuentra juegos sin importar mayúsculas
- [ ] No hay SQL fuera de `lib/`
- [ ] `lib/games.test.ts` cubre CRUD, filtros, whitelist de `sortBy`, stats `> 4` y búsqueda por títulos (skill `writing-quality-tests`)

## Prompt sugerido

> "Implement lib/db.ts (better-sqlite3 singleton on globalThis, WAL, idempotent migration, auto-seed when empty) and lib/games.ts following the exact function signatures in tasks/00-OVERVIEW.md. Use prepared statements, whitelist sortBy columns, and create lib/seed-data.ts with 14 fictional indie games with varied genres and a clear revenue leader."

📝 Errores típicos de la IA para registrar: concatenar `sortBy` en el SQL sin whitelist, olvidar el singleton (aparece "database is locked" en dev), o el error de bindings nativos de `better-sqlite3` en el bundler.
