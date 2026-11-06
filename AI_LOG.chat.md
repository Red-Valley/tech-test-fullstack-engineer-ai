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
  - Un mensaje `role: system` del cliente reemplazaría las instrucciones si se aceptara. La ruta solo admite `user` y `assistant`.
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
