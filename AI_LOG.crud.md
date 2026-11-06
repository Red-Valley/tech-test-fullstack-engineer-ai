# AI log: track A (CRUD)

Separate from `AI_LOG.md` so the parallel worktrees do not conflict. Merge it during task 08.

## [23:09] Tarea 02 — Capa de datos (SQLite, seed, repositorio)
- **Herramienta:** Claude Code (subagente de implementación, perfil `backend-developer`)
- **Prompt:** Encargo del agente coordinador, citado: "Implementa el track A (CRUD) de una prueba técnica: las tareas 02, 03 y 04 [...] `lib/games.ts` es un stub con los tipos y firmas del contrato: reemplázalo manteniendo exactamente esas firmas". Incluía decisiones ya tomadas: timestamps con `strftime`, `minRating` exclusivo, `COALESCE` en `getStats`, escape de `%` y `_`, `resetDb()` sin re-seed.
- **Resultado:** ✅ funcionó. 78 tests del backend pasaron en la primera corrida.
- **Qué corregí:** El kit tenía huecos que el coordinador cerró antes de escribir código (`datetime('now')` no es ISO-8601; `SUM`/`AVG` devuelven `NULL` sin filas). Yo agregué casos que nadie pidió: `DATABASE_PATH` vacío abriría una base temporal (uso `||`, no `??`); un título en blanco en `findGamesByTitles` se volvería `%%` y devolvería todo el catálogo; `sortBy: 'constructor'` pasaría un lookup ingenuo de la whitelist (uso `Object.hasOwn`). Error mío menor: corrí `tsc --noEmit` suelto y falló con `LayoutProps` porque faltaba `next typegen`; con `npm run typecheck` pasa.
- **Paralelo:** worktree `wt-crud` (rama `track/crud`); otro agente hace el track B en `wt-chat`.
