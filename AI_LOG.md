# AI Log

Bitácora de uso de IA durante la prueba. Alimenta `AI_WORKFLOW.md`.

## [~22:50] Planificación — Roadmap desde el overview
- **Herramienta:** Claude Code (modo plan)
- **Prompt:** "empecemos a trabajar en @tech-test-fullstack-engineer-ai/tasks/00-OVERVIEW.md"
- **Resultado:** ✅ funcionó
- **Qué corregí:** La IA encontró huecos en las tareas: `z.coerce` convertía `null` y `""` en 0, `datetime('now')` no es ISO-8601, y `SUM` devuelve `NULL` con cero filas. Elegí tareas 01 a 07, tracks en paralelo y corregir el schema.
- **Paralelo:** decidido aquí, dos worktrees después de la tarea 01

## [~22:55] Planificación — Cambio de proveedor
- **Herramienta:** Claude Code (modo plan)
- **Prompt:** "Vamos a hacer con una open api key, y para el cliente del chat, recuerda usar un strategy pattern con factory para poder cambiar entre proveedores de api facilmente"
- **Resultado:** ✅ funcionó
- **Qué corregí:** Rechacé la primera versión del plan, que asumía Anthropic como proveedor fijo. El plan pasó a OpenAI por defecto con `lib/ai/providers/`.

## [23:05] Tarea 01 — Scaffold y contrato compartido
- **Herramienta:** Claude Code
- **Prompt:** aprobación del plan de la tarea 01 (ver las dos entradas anteriores)
- **Resultado:** ⚠️ parcial; tres instrucciones del kit estaban desactualizadas frente a las versiones instaladas
- **Qué corregí:**
  - **Next 16.4:** el scaffold activa `cacheComponents`, que prohíbe el export `runtime` que exigen las tareas. Lo detecté leyendo `node_modules/next/dist/docs` y lo desactivé.
  - **MSW 3:** la skill usaba `onUnhandledRequest`, que ya no existe. `tsc` lo detectó; sin el cambio, un request sin handler no habría hecho fallar el test. Ahora es `onUnhandledFrame`.
  - **Vite:** el plugin `vite-tsconfig-paths` y la config como CommonJS daban avisos. Pasé a `resolve.tsconfigPaths` y a `vitest.config.mts`.
  - **Typecheck:** `LayoutProps` depende de tipos generados, así que el script ahora corre `next typegen` antes de `tsc`.

# Track A: CRUD (worktree wt-crud)

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

# Track B: Chat (worktree wt-chat)

# AI log, track B (chat)

Entries of the `track/chat` worktree. They get merged into `AI_LOG.md` when the tracks are integrated.

## [23:11] Tarea 05 — chat backend (tools, streaming, strategy + factory)
- **Herramienta:** Claude Code, subagente en el worktree `wt-chat`, lanzado por el agente principal.
- **Prompt:** "Implementa el track B (chat con IA) de una prueba técnica: las tareas 05 y 06. [...] Antes de escribir código del AI SDK, lee las docs instaladas en `node_modules/ai/docs/` [...] El kit se escribió sin mirar las versiones instaladas: ya falló con Next 16.4 y MSW 3, y puede fallar aquí también. Ante cualquier duda, manda lo instalado."
- **Resultado:** ⚠️ parcial. Tools, ruta, factory y tests funcionan sin red, pero nada se ha probado contra un LLM real porque no hay API key. Tampoco contra el repositorio real: `lib/games.ts` sigue siendo un stub y los tests lo mockean.
- **Qué salió mal y qué corregí:**
  - Escribí un test que esperaba `400` para una tool part desconocida en estado `output-available`, y respondió `200`. Leyendo `safeValidateUIMessages` en `dist`: el SDK convierte a propósito las tool parts terminales desconocidas en dynamic tools, y solo rechaza las pendientes. El test estaba mal, no la ruta. Ahora prueba el caso pendiente.
  - Mi primer test de `execute` no compilaba: en esta versión `ToolExecutionOptions` exige `context`, y `execute` puede devolver un `AsyncIterable`. Lo resuelve un helper `run()` en el test.
- **Comprobaciones que evitaron un bug:**
  - `OPENAI_API_KEY=` viene vacía en `.env.example`, y `loadApiKey` del SDK acepta `""` y solo lee la key al enviar, ya dentro del stream. La factory trata la key en blanco como ausente, para que responda `CONFIG_ERROR` antes del stream.
  - El SDK 7 rechaza por defecto un `role: system` dentro de `messages`, pero lo haría como error interno. La ruta solo admite `user` y `assistant`, así que el cliente recibe un `400`.
  - Stop durante una tool deja una llamada sin resultado en el historial, que el proveedor rechazaría. Por eso `ignoreIncompleteToolCalls: true`.
  - El mensaje de un error de tool vuelve al modelo, que podría repetirlo. `runQuery` lo registra en el servidor y lanza un mensaje genérico.
- **Deriva del kit frente a lo instalado:**
  - `result.toUIMessageStreamResponse()` (tarea 05 y skills backend-architecture y bug-prevention) está **deprecado** en `ai` 7: la guía de migración pide `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`. La tarea 05 lo presenta como la API correcta de v7.
  - La skill bug-prevention pide "low temperature", pero `gpt-6-astra` no admite `temperature` según la tabla de `@ai-sdk/openai`. No se envía.
  - El aviso de `@ai-sdk/openai` de cambiar `.optional()` por `.nullable()` se refiere a `strictJsonSchema` (salida estructurada), no a las tools. El código envía `strict: tool.strict ?? false`, y se comprobó en el request capturado: las cuatro tools van con `strict: false` y `.optional()` funciona sin cambios. Falta confirmarlo contra la API real.
  - La tabla de la tarea 05 da `limit` sin máximo y el esquema compartido permite 100; se aplica el máximo de 25 de la skill backend-architecture.
  - El README sugerido en la tarea 08 habla de `ANTHROPIC_API_KEY`, pero el proveedor por defecto es OpenAI.
- **Verificación real:** `curl` contra `next dev` sin key devuelve `500 CONFIG_ERROR`, y con body inválido `400`. Con un servidor local falso del endpoint de OpenAI Responses (`OPENAI_BASE_URL`; no es un LLM) se vio el ciclo tool → resultado → texto llegando en fragmentos separados por el tiempo, y el request capturado no contiene catálogo.
- **Paralelo:** worktree `wt-chat`, rama `track/chat`, programando contra las firmas de `lib/games.ts` mientras otro agente hace el track A en `wt-crud`.

## [23:16] Tarea 06 — chat UI
- **Herramienta:** Claude Code, mismo subagente, más Claude in Chrome para la comprobación visual.
- **Prompt:** el mismo encargo de la entrada anterior: "Implementa el track B (chat con IA) [...] las tareas 05 y 06."
- **Resultado:** ⚠️ parcial. La UI funciona con un servidor falso de OpenAI, pero sin LLM real ni repositorio real. Sin repositorio, el chip solo se vio en el navegador en sus estados "en curso" y "falló"; el estado "hecho" está cubierto solo por tests.
- **Qué salió mal y qué corregí:**
  - Usé tokens `text-success`, `text-danger` y `text-on-brand` que no existen en `globals.css`. Ni `tsc` ni los tests lo detectan, porque Tailwind ignora las clases desconocidas. Lo vi al repasar el código, y como `globals.css` no es de este track usé la paleta de Tailwind con `dark:`.
  - Tras pulsar Stop durante una tool, el chip se quedaría girando para siempre: la llamada nunca recibe resultado. Ahora muestra "stopped".
  - Al apagar mi servidor intenté un `pkill -f "next-server"`, que también habría matado el servidor del track A en el puerto 3001. El clasificador de permisos lo bloqueó. Lo rehice identificando el PID del puerto 3002 y comprobando que su cwd era `wt-chat`. Lección: con agentes en paralelo, apagar por PID y puerto, nunca por nombre.
- **Decisiones:**
  - "Compare revenue of Game A vs Game B" del enunciado respondería siempre "no encontrado". La página pide los dos títulos con más revenue a `listGames` para armar la pregunta, con una pregunta genérica si eso falla.
  - `Chat` recibe `transport` como prop opcional: los tests usan el `useChat` real con un transporte controlado, sin mockear el hook. También hay tests con `DefaultChatTransport` y MSW.
- **Deriva del kit frente a lo instalado:**
  - La skill run-frontend-tests avisa que jsdom no tiene web streams y recomienda mockear `useChat`. Aquí no hizo falta: el hook real funciona en el proyecto `frontend` con Node 26 y jsdom 31.
  - La tarea 06 menciona `reload()` como alternativa a `regenerate()`; el código usa `regenerate()`, que es lo que documenta la referencia instalada de `useChat`.
- **Verificación real:** en Chrome contra `next dev` y el servidor falso: clic en una pregunta sugerida, "Thinking…", chip en curso y luego fallido (stub de `lib/games.ts`), tabla markdown, Enter, un segundo turno con historial y Stop a mitad del texto. Contra `next start` sin key: el banner muestra "Set OPENAI_API_KEY in .env.local" con Reintentar.
- **Problema abierto:** `next dev` registra un error de hydration en el boundary de metadata de Next (`__next_metadata_boundary__`). También ocurre en `/`, que este track no toca. No determiné la causa (puede ser Next 16.4 o la extensión del navegador) ni si ocurre en producción.
- **Paralelo:** worktree `wt-chat`, rama `track/chat`.

# Integración (tarea 07)

## [23:40] Tarea 07 — Reviews independientes, merge y correcciones
- **Herramienta:** Claude Code (subagentes en background: dos implementadores y dos reviewers)
- **Prompt:** "continua la sesion", siguiendo el plan aprobado; a cada reviewer se le pidió verificar sus hallazgos en el código y no editar nada
- **Resultado:** ⚠️ parcial; merge sin conflictos y correcciones aplicadas, pero sin validar con LLM real
- **Qué corregí:**
  - **Aceptado del review del track A:** Esc repetido durante el guardado cerraba el diálogo y dejaba la UI inservible (reproducido y verificado en Chrome), aviso cuando el catálogo supera las 100 filas, foco en el primer campo inválido, y tests que faltaban.
  - **Aceptado del review del track B:** `searchGames` truncaba sin avisar, `order` sin documentar su default, respuesta vacía al agotar los pasos, conversación perdida al navegar, skeleton del dashboard en `/chat`, imágenes markdown generadas por el modelo, y tests contra SQLite real.
  - **No aplicado:** tope de revenue, foco tras borrar, coerción laxa de query params, y unificar `lib/ai/errors.ts` con `lib/http.ts`.
  - **Pendiente:** el hallazgo de reasoning huérfano tras Stop. Solo se puede confirmar con la API real.
- **Paralelo:** merge de `track/crud` y `track/chat` sin conflictos

## [23:40] Tarea 07 — Primera llamada real a OpenAI
- **Herramienta:** Claude Code
- **Prompt:** las 3 preguntas del enunciado, un juego inexistente y una pregunta fuera de tema, contra `/api/chat`
- **Resultado:** ❌ falló por causa externa: `insufficient_quota` / `credit_balance_exhausted` en la cuenta de OpenAI
- **Qué corregí:** Nada en el código. La ruta registró la causa en el servidor y envió un mensaje genérico al cliente. Los criterios con LLM real siguen sin verificar hasta que la cuenta tenga créditos.

## [00:22] Tarea 07 — Pruebas reales con Anthropic y QA completo
- **Herramienta:** Claude Code (subagente `qa-engineer`) y Claude in Chrome
- **Prompt:** "Listo, ya cargue dinero en anthropic y cambie el ai provider , procede a las pruebas, documentemos los hallazgos , y programemos un nuevo task para resolverlos , corre de nuevo el qa engineer para evaluar toda la implementacion y continuar para cerrar las tareas pendientes"
- **Resultado:** ⚠️ parcial; las respuestas son correctas, pero aparecieron problemas que los 341 tests en verde no podían ver
- **Qué corregí:** Consolidé todo en `tasks/09-qa-findings.md`. Lo más útil: tras una tool el texto llegaba de golpe. Medí el modelo sin la ruta para descartar un buffer propio, y la doc del proveedor confirmó que Sonnet 5.5 no permite desactivar el reasoning. También descarté mi primer arreglo del doble clic en Send (`key` distintas) antes de aplicarlo, porque el segundo clic caería igual sobre el botón Stop nuevo.

## [02:35] Tarea 09 — Validación en vivo con Haiku
- **Herramienta:** Claude Code
- **Prompt:** Implementar H1-H16 de `tasks/09-qa-findings.md` y repetir los golden prompts con el modelo por defecto
- **Resultado:** ⚠️ parcial; cifras correctas y streaming real, pero dos instrucciones del prompt no bastaron
- **Qué corregí:** La IA propuso una protección de 500 ms para el doble clic que rompía el Stop rápido; la cambié por `event.detail`. Haiku respondía también la pregunta detenida aunque el prompt lo prohibía, así que la ruta ahora descarta esas preguntas. Una frase "pegada" que parecía un bug de la UI venía de mi script de prueba, que concatenaba los bloques de texto. Queda sin resolver: Haiku a veces anuncia el reintento de búsqueda; lo dejo documentado.
