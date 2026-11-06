# 05 — Chat backend (tools + streaming)

**Track:** B · **Depende de:** 01 (programa contra las firmas del contrato; se integra cuando 02 esté listo) · **Estimado:** 30 min · **Bloquea:** 06

## Objetivo

`POST /api/chat` que responda en **streaming** y use **tool calling** para consultar el catálogo. **Prohibido** meter la base de datos completa en el prompt: es un requisito explícito.

## ⚠️ Antes de empezar

El Vercel AI SDK cambia de API entre versiones mayores (`parameters` → `inputSchema`, `maxSteps` → `stopWhen`, `toDataStreamResponse` → `toUIMessageStreamResponse`; y en **v7**: `system` → `instructions`, `onFinish` → `onEnd`, `fullStream` → `stream`). **Revisa la versión instalada en `package.json` y lee la documentación incluida en `node_modules/ai/docs`** (o ai-sdk.dev para esa versión mayor). Si la IA genera código de otra versión, **regístralo en `AI_LOG.md`**: es el candidato perfecto para "el momento en que la IA se equivocó".

## Tools (`lib/ai/tools.ts`)

Pocas, genéricas y con descripciones claras. Los esquemas Zod de entrada deben tener `.describe()` en cada campo.

| Tool | Input | Llama a | Responde preguntas como |
|---|---|---|---|
| `searchGames` | `genre?`, `developer?`, `minRating?`, `maxRating?`, `minRevenue?`, `search?`, `sortBy?`, `order?`, `limit?` (default 10) | `listGames` | "¿Qué juego ganó más el mes pasado?", "Top 3 por descargas", "Juegos de horror" |
| `getCatalogStats` | mismos filtros (sin sort) | `getStats` | "¿Cuántos juegos tienen rating mayor a 4?", "Revenue total de los roguelikes" |
| `compareGames` | `titles: string[]` (2–5) | `findGamesByTitles` | "Compara el revenue de A vs B" |
| `listGenres` | — | `listGenres` | Ayuda al modelo a usar nombres de género válidos |

- Cada `execute` devuelve **solo los campos necesarios** y un objeto serializable. Si no hay resultados, devuelve `{ results: [], note: 'No games matched' }` para que el modelo lo diga en vez de inventar.
- `compareGames`: si algún título no se encuentra, inclúyelo en `notFound: string[]`.

## System prompt (`lib/ai/prompt.ts`)

Puntos clave:
- Eres un analista del catálogo interno de juegos indie.
- **Usa siempre las tools** para cualquier dato; nunca inventes cifras.
- Todos los valores son **mensuales y corresponden al último mes** → así se interpreta "last month".
- Formatea montos en USD y usa tablas markdown cortas para comparaciones.
- Si la pregunta no trata del catálogo, responde brevemente y redirige.
- Responde en el idioma del usuario.

## Route handler (`app/api/chat/route.ts`)

Esqueleto conceptual (ajústalo a tu versión del SDK):

```ts
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: getChatModel(),                 // lib/ai/model.ts → factory de proveedores
    instructions: SYSTEM_PROMPT,           // v7 (en v6 era `system`)
    messages: await convertToModelMessages(messages),
    tools,
    // permitir varios pasos: tool call → resultado → respuesta final
    stopWhen: /* helper de conteo de pasos de tu versión */(5),
  });
  return result.toUIMessageStreamResponse();
}
```

- Si falta la API key del proveedor activo, responde `500 CONFIG_ERROR` con un mensaje claro ("Set ANTHROPIC_API_KEY in .env.local").

## Proveedores: strategy + factory (`lib/ai/providers/`)

Cambiar de proveedor debe requerir solo una variable de entorno.

| Archivo | Responsabilidad |
|---|---|
| `types.ts` | Interfaz `LLMProviderStrategy`: `id`, `apiKeyEnv`, `defaultModel`, `createModel(modelId)` |
| `openai.ts` | Estrategia OpenAI |
| `anthropic.ts` | Estrategia Anthropic |
| `factory.ts` | Registro de estrategias y `getProviderStrategy(env)` |
| `../model.ts` | `getChatModel()`: resuelve estrategia y modelo; sobreescribible con el mock model en tests |

- `AI_PROVIDER` (por defecto `anthropic`) se valida con Zod. `AI_MODEL` es opcional y reemplaza el `defaultModel` de la estrategia.
- Un proveedor desconocido o una key ausente lanzan un error de configuración tipado, que la ruta traduce a `CONFIG_ERROR`.
- `@ai-sdk/openai` y `@ai-sdk/anthropic` solo se importan dentro de `lib/ai/providers/`.
- Agregar un proveedor es un archivo de estrategia y una línea en el registro.

## Criterios de aceptación

Prueba con curl o con la UI de la tarea 06:
- [ ] "Which game made the most revenue last month?" → llama a `searchGames` (sortBy revenue, limit 1) y responde con el juego correcto
- [ ] "How many games are rated above 4?" → llama a `getCatalogStats` con `minRating` y el número coincide con la base de datos
- [ ] "Compare revenue of <A> vs <B>" → llama a `compareGames` y muestra ambos valores y la diferencia
- [ ] La respuesta llega en streaming (token a token, no de golpe)
- [ ] Revisando los logs del request, el prompt **no** contiene el catálogo completo
- [ ] Una pregunta sobre un juego inexistente → el modelo dice que no lo encontró
- [ ] Tests: cada tool vía `execute` + chat route con el mock model de `ai/test` (sin red)
- [ ] Tests de la factory: elige cada estrategia, `anthropic` por defecto, proveedor desconocido, key ausente y `AI_MODEL` que reemplaza el default

## Prompt sugerido

> "Implement app/api/chat/route.ts with the Vercel AI SDK version installed in package.json (check its docs; do not use APIs from other major versions). Define tools in lib/ai/tools.ts — searchGames, getCatalogStats, compareGames, listGenres — with zod input schemas that have .describe() on every field, each calling functions from lib/games.ts. Allow multi-step tool use, stream the response, and put the system prompt in lib/ai/prompt.ts. Never put the full catalog in the prompt."
