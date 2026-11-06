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

## [23:18] Tarea 04 — Dashboard UI (tabla y CRUD)
- **Herramienta:** Claude Code (subagente, perfil `frontend-developer`) y Claude in Chrome para el recorrido en navegador
- **Prompt:** El mismo encargo del coordinador, citado: "Formulario: guarda strings crudos y los convierte a número antes de validar [...] Un campo vacío debe dar error, no 0." y "`app/page.tsx` lee directo del repositorio y necesita render dinámico".
- **Resultado:** ⚠️ parcial. Crear, editar, borrar, ordenar y los KPIs funcionaron en Chrome contra `next dev`, y `npm run build` marca `/` como dinámica. Queda sin aclarar del todo un aviso de hidratación en dev (ver abajo).
- **Qué corregí:** (1) La documentación instalada de Next 16.4 usa `retry` en `error.tsx`, no el `reset` que yo recordaba; y recomienda `connection()` para drivers síncronos como `better-sqlite3`. (2) Primera corrida: 4 tests fallaron por errores míos de test. `getByLabelText(/title/i)` también encontraba el diálogo "Edit Old Title", y Esc no llegaba al diálogo porque el polyfill de `showModal` en jsdom no mueve el foco. (3) Al revisar eso vi un bug real: deshabilitar los inputs mientras se guarda hacía perder el foco del teclado, así que ahora usan `readOnly`. (4) En Chrome, el aviso "Hydration failed" apunta al `<div hidden>` interno de metadata de Next. También sale en `/chat`, que no es de este track, y el HTML servido (curl) trae `<div hidden="">` sin el `display:contents` que React encontró en el DOM. Apunta a algo que modificó el DOM en el navegador, quizá una extensión, pero no lo comprobé en un perfil limpio. (5) Errores míos operando el navegador: un clic con coordenadas viejas tras cambiar el viewport, y `type` con tabuladores escribió todo en un solo campo.
- **Paralelo:** worktree `wt-crud` (rama `track/crud`); otro agente hace el track B en `wt-chat`. Ambos compartimos el mismo Chrome: mi grupo de pestañas desapareció una vez a mitad del recorrido y tuve que crear otro.
