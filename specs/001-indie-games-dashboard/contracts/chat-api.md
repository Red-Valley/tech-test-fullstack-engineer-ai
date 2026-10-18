# Contract: Chat API

**Endpoint**: `POST /api/chat` | **Producer**: `createAgentUIStreamResponse` (AI SDK 7) |
**Consumer**: `useChat` with `DefaultChatTransport({ api: '/api/chat' })` (`@ai-sdk/react` 4)

The wire format is the AI SDK **UI Message Stream** protocol (SSE). The app does not define
its own framing; this contract pins which parts of the protocol the UI relies on and what the
server adds on top.

## Request

```http
POST /api/chat
Content-Type: application/json

{ "messages": UIMessage[] }      // full conversation so far, sent by DefaultChatTransport
```

- The server converts `messages` to model messages itself; the client never sends catalog
  data, and the server never injects catalog rows into the prompt (FR-014).
- Route config: `export const maxDuration = 30`.

## Response — success

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
x-vercel-ai-ui-message-stream: v1
```

Server-sent events, each `data: {json}`. Parts the UI handles:

| `type` | Payload | UI behaviour |
|---|---|---|
| `start` | `messageId` | new assistant bubble |
| `text-start` / `text-delta` / `text-end` | `id`, `delta` | append text progressively (FR-016) |
| `tool-input-start` | `toolCallId`, `toolName` | show lookup chip "Looking up… {toolName}" (FR-017) |
| `tool-input-available` | `toolCallId`, `toolName`, `input` | chip shows the arguments |
| `tool-output-available` | `toolCallId`, `output` | chip becomes "Looked up {toolName}" with a check mark |
| `tool-output-error` | `toolCallId`, `errorText` | chip shows error state |
| `reasoning-*` | — | ignored (adaptive-thinking models may emit empty reasoning parts) |
| `start-step` / `finish-step` | — | ignored |
| `error` | `errorText` | banner "Something went wrong" + Retry; partial text kept (FR-021) |
| `finish` | — | `status` → `'ready'` |

On the client, these materialise as `message.parts[]` entries of type `'text'` or
`'tool-<toolName>'` with `state` ∈ `input-streaming | input-available | output-available |
output-error | output-denied`.

## Response — not configured

Checked before any model call:

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{ "error": { "code": "ai_not_configured",
             "message": "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key." } }
```

The client surfaces `error.message` verbatim in the chat banner. The dashboard and the games
API are unaffected.

## Response — malformed request

```http
HTTP/1.1 400 Bad Request
{ "error": { "code": "invalid_json", "message": "Body must be { messages: UIMessage[] }" } }
```

## Server behaviour

- Agent: `ToolLoopAgent` from [assistant-tools.md](assistant-tools.md), `stopWhen:
  isStepCount(5)`, `providerOptions.anthropic.effort = 'low'`.
- Model: `process.env.ANTHROPIC_MODEL ?? 'claude-opus-5-5'`.
- Each tool call is logged to the server console as one line:
  `[chat] tool=<name> input=<json>` (minimal observability; no other logging).

## Client behaviour (ChatView)

- Empty input cannot be sent; input capped at 2,000 chars with a counter from 1,800.
- `status === 'submitted'` → "Thinking…" indicator; `'streaming'` → Stop button;
  `'error'` → banner + Retry (`regenerate()`).
- Conversation lives in component state only (session-only, per spec).
