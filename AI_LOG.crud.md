# AI log: track A (CRUD)

Separate from `AI_LOG.md` so the parallel worktrees do not conflict. Merge it during task 08.

## [23:09] Tarea 02 — Capa de datos (SQLite, seed, repositorio)
- **Herramienta:** Claude Code (subagente de implementación, perfil `backend-developer`)
- **Prompt:** Encargo del agente coordinador, citado: "Implementa el track A (CRUD) de una prueba técnica: las tareas 02, 03 y 04 [...] `lib/games.ts` es un stub con los tipos y firmas del contrato: reemplázalo manteniendo exactamente esas firmas". Incluía decisiones ya tomadas: timestamps con `strftime`, `minRating` exclusivo, `COALESCE` en `getStats`, escape de `%` y `_`, `resetDb()` sin re-seed.
- **Resultado:** ✅ funcionó. 78 tests del backend pasaron en la primera corrida.
- **Qué corregí:** El kit tenía huecos que el coordinador cerró antes de escribir código (`datetime('now')` no es ISO-8601; `SUM`/`AVG` devuelven `NULL` sin filas). Yo agregué casos que nadie pidió: `DATABASE_PATH` vacío abriría una base temporal (uso `||`, no `??`); un título en blanco en `findGamesByTitles` se volvería `%%` y devolvería todo el catálogo; `sortBy: 'constructor'` pasaría un lookup ingenuo de la whitelist (uso `Object.hasOwn`). Error mío menor: corrí `tsc --noEmit` suelto y falló con `LayoutProps` porque faltaba `next typegen`; con `npm run typecheck` pasa.
- **Paralelo:** worktree `wt-crud` (rama `track/crud`); otro agente hace el track B en `wt-chat`.

## [23:11] Tarea 03 — API REST de juegos
- **Herramienta:** Claude Code (subagente, perfil `backend-developer`)
- **Prompt:** El mismo encargo del coordinador, citado: "Query params vacíos: `?minRating=` se trata como ausente, no como 0. Un valor inválido responde 400." y "Verifica los criterios de aceptación ejecutando el código de verdad: los curl de la tarea 03 contra el servidor."
- **Resultado:** ✅ funcionó. Los curl de la tarea dieron 200/201/204/400/404 contra `next dev -p 3001`, con la base recreada tras borrar `data/`.
- **Qué corregí:** Tres huecos del kit. (1) Con solo `fieldErrors`, un PUT `{}` respondía 400 sin decir por qué: el mensaje del `refine` vive en `formErrors`, así que `validationError` lo pasa a `message`. (2) `idParamSchema` usa coerción, y `/api/games/1e2` o `0x10` serían ids válidos: agregué una verificación de dígitos en la ruta, sin tocar el esquema compartido. (3) Sin envoltorio, un error inesperado devolvía el 500 HTML de Next y no el envelope: agregué `withErrorEnvelope`. Decisión a revisar: `readJson` sigue la plantilla del kit y devuelve `null` si el JSON es inválido, así que un body literal `null` responde `INVALID_JSON`. Sigue siendo 400.
- **Paralelo:** worktree `wt-crud` (rama `track/crud`); otro agente hace el track B en `wt-chat`.
