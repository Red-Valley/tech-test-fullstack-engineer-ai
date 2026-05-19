# Feature: AI Chat

A streaming conversational interface that answers natural-language questions about the game catalog using Anthropic's Claude and the Vercel AI SDK.

---

## Architecture Overview

```
Browser                     Server (Next.js)              Anthropic API
──────                     ─────────────────              ─────────────
useChat (SDK hook)  ──POST /api/chat──►  streamText()  ──►  claude-haiku-4-5
                   ◄── SSE stream ──────  tool callbacks     tool calls
                                          │ list_games
                                          │ find_game_by_title
                                          │ catalog_summary
                                          └─► respond (final answer)
```

The model **never receives the database as raw context**. It calls typed tools to fetch exactly what it needs, then structures its final answer via the `respond` tool.

---

## Server Route

**File:** [`app/api/chat/route.ts`](../../app/api/chat/route.ts)

- Validates the incoming `{ messages }` body with Zod (min 1 message).
- Calls `streamText` from the Vercel AI SDK with:
  - **Model:** `anthropic("claude-haiku-4-5")` — lighter and more cost-effective than Sonnet (the spec suggests `claude-sonnet-4-6` but it is not mandated).
  - **System prompt:** see below.
  - **Tools:** returned by `createGamesTools(getGamesRepository())`.
  - **`stopWhen: stepCountIs(6)`** — caps the agentic loop at 6 steps to prevent runaway tool calls.
- Returns `result.toUIMessageStreamResponse()` — an SSE stream consumed by the client SDK hook.

---

## System Prompt

The prompt enforces two behavioral contracts:

1. **Always call `respond` exactly once as the final step.** The model must not emit free-form text outside of the `respond` call.
2. **`summary` must be plain prose** — no markdown formatting (`**bold**`, bullets, backticks). The UI renders structured data cards; the summary is a single natural-language sentence.
3. **Choose the most specific `data.kind`** for the question. Comparison questions must use `kind: "comparison"`, never fall back to `text`.

---

## Tools

Defined in [`lib/games/ai-tools.ts`](../../lib/games/ai-tools.ts) via `createGamesTools(repository)`:

### `list_games`
Fetches games from the repository with optional filters. Supports:
- `minRating` — minimum `average_rating` (inclusive)
- `genre` — exact genre match (case-insensitive)
- `sortBy` — one of `revenue | downloads | rating | title`
- `order` — `asc | desc` (default `desc`)
- `limit` — max results (1–50)

Returns `{ games: Game[], total: number }` where `total` is the count before the limit is applied.

### `find_game_by_title`
Fuzzy title search (case-insensitive substring). Returns:
- `{ game: Game, suggestions: [] }` if exactly one match.
- `{ game: null, suggestions: Game[] }` if multiple matches.
- `{ game: null, suggestions: [] }` if no match.

### `catalog_summary`
Returns aggregate stats for the whole catalog: total games, unique genres, unique developers, average rating, and total monthly revenue. Used for overview questions without listing every game.

### `respond` — the structured answer tool
The model always calls this last. Its input schema is a **discriminated union** with 6 kinds:

| `kind` | When to use | Extra fields |
|---|---|---|
| `game` | One specific game | `gameId: string` |
| `games` | A list of games | `gameIds: string[]`, `context: string` |
| `comparison` | Two games on one metric | `gameIds: [string, string]`, `metric`, `winnerId` |
| `count` | A numeric answer | `value: number`, `context: string` |
| `stats` | Catalog overview | _(no extra fields; server computes stats)_ |
| `text` | Last resort | _(no extra fields)_ |

**Hydration:** the model sends game IDs (token-efficient). The `execute` function resolves each ID to a full `Game` object from the repository. If an ID is not found, it falls back to `kind: "text"` gracefully.

The output type `CatalogAnswer` (defined in [`lib/games/answer-types.ts`](../../lib/games/answer-types.ts)) is shared between the server tool and the client `AnswerCard` component — it lives in a separate file to avoid importing server-side code into the client bundle.

---

## Client Side

**`useChat`** from `@ai-sdk/react` manages the message state and SSE connection ([`components/chat/chat-scaffold.tsx`](../../components/chat/chat-scaffold.tsx)).

Messages are arrays of **parts** (`UIMessage.parts`). Each part has a type:
- `text` — free text emitted by the model (suppressed in the UI when `respond` is present).
- `tool-*` / `dynamic-tool` — tool call with states: `input-streaming → input-available → output-available`.

### Rendering logic

| Condition | What renders |
|---|---|
| `respond` part, `output-available` | `<AnswerCard answer={part.output} />` |
| `respond` part, `input-streaming/available` | "Preparing response…" chip |
| Other tool part, pending | "Querying catalog…" chip |
| Assistant is streaming, no tool parts yet | "Generating response…" chip |
| Text part, assistant + streaming or respond present | filtered out (suppressed) |
| Text part, assistant + no respond + stream ended | shown as fallback bubble |
| Text part, user message | shown as sent bubble |

The streaming suppression ensures the model's narrative text (which Haiku often emits before calling `respond`) never appears in the UI — the user sees only progress chips followed by the final structured card.

---

## Answer Card

[`components/chat/answer-card.tsx`](../../components/chat/answer-card.tsx) renders the `CatalogAnswer` output:

- **`game`** — `GameMetrics` card: title, developer, genre, revenue, downloads, rating.
- **`games`** — list of `GameMetrics` cards with a context label above.
- **`comparison`** — 2-column grid of `GameMetrics` cards; the winner (if any) gets a sky border and a "Winner" badge.
- **`count`** — large number centered with context label.
- **`stats`** — 4-stat grid (games, avg rating, total revenue, genres) + genre chips.
- **`text`** — only the `summary` paragraph, no card.
