# 06 — Chat UI

**Track:** B · **Depende de:** 05 (puede iniciarse en paralelo con el layout) · **Estimado:** 30 min

## Objetivo

Vista `/chat` con mensajes en streaming, indicador visible de cuándo el asistente usa una tool y preguntas sugeridas.

## Componentes

| Componente | Responsabilidad |
|---|---|
| `app/chat/page.tsx` | Contenedor de la vista |
| `components/chat/Chat.tsx` | Client: `useChat` de `@ai-sdk/react` con `transport: new DefaultChatTransport({ api: '/api/chat' })`; el texto del input es estado local |
| `components/chat/MessageList.tsx` | Renderiza los mensajes y sus *parts* (texto + tool calls) |
| `components/chat/ToolCallChip.tsx` | Chip tipo "🔧 Consultando searchGames…" → "✓ searchGames" con los argumentos colapsables |
| `components/chat/SuggestedPrompts.tsx` | Botones con las 3 preguntas del enunciado (visibles cuando no hay mensajes) |

## Detalles de implementación

- Revisa en la documentación de tu versión del SDK cómo vienen las tool calls dentro del mensaje (`message.parts` con `type: 'tool-<nombre>'` y su `state`, o `toolInvocations` en versiones anteriores).
- Renderiza el texto del asistente con `react-markdown` (para las tablas de comparación) y estilos básicos de tabla (o `@tailwindcss/typography`).
- Auto-scroll al último mensaje mientras llega el stream.
- Mientras `status` sea `streaming`/`submitted`: deshabilita el envío, muestra un indicador "pensando…" y ofrece un botón **Stop** (`stop()`).
- Error (sin API key, red): un banner con un botón **Reintentar** (`regenerate()` / `reload()`).
- Enter envía y Shift+Enter hace salto de línea.
- Burbujas diferenciadas para el usuario y el asistente; ancho máximo legible (`max-w-3xl mx-auto`).

## Criterios de aceptación

- [ ] Las 3 preguntas sugeridas funcionan con un clic
- [ ] El texto aparece progresivamente (streaming visible)
- [ ] Se ve qué tool se llamó en cada respuesta
- [ ] La comparación se muestra como tabla legible
- [ ] Stop corta la respuesta y un error muestra la opción de reintentar
- [ ] Tests de `MessageList`/`ToolCallChip` con `UIMessage` construidos a mano
- [ ] Se puede navegar a Dashboard, editar un juego, volver y el chat refleja el dato nuevo (las tools consultan en vivo)

## Prompt sugerido

> "Build the chat page at app/chat/page.tsx using useChat from the installed AI SDK version (check the docs for message parts / tool states). Render markdown, show a ToolCallChip for each tool call with its state and collapsible args, add suggested prompt buttons for the three example questions, auto-scroll, stop button, and an error banner with retry. Tailwind only."

📝 Toma un screenshot o graba un GIF corto del streaming + tool indicator para el README y el PR.
