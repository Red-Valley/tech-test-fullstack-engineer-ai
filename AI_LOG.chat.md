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
