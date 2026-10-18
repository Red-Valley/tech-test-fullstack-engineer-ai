# Contract: Assistant Tools & Instructions

**Module**: `src/lib/ai/tools.ts`, `src/lib/ai/agent.ts` | **Runtime**: AI SDK 7 `tool()` with
Zod 4 `inputSchema`, executed in-process against `lib/games/repository.ts`.

Design rule (constitution II / FR-014): tools return **only the rows needed**, never the whole
catalog. Each tool caps its result size. `Game` below is the full record from
[../data-model.md](../data-model.md); `Metric` is
`'monthly_revenue_usd' | 'monthly_downloads' | 'average_rating'`.

## Tools

### `search_games`

Find games whose title or developer contains a phrase. Used to resolve names the operator
typed, including partial or misspelled ones.

```ts
input:  { query: string /* 1–100 chars */, limit?: number /* 1–10, default 5 */ }
output: { games: Game[], total_matches: number }
```

### `rank_games`

Order the catalog by one metric and return the top or bottom N. Answers "which game made
the most revenue", "lowest rated", "top 3 by downloads".

```ts
input:  { metric: Metric, order?: 'desc' | 'asc' /* default 'desc' */, limit?: number /* 1–20, default 5 */ }
output: { games: Game[], total_games: number }
```

Ties are preserved in the result (secondary order: title asc); the instructions tell the model
to name all tied games.

### `count_games`

Count games matching a numeric threshold and/or a genre or developer. Answers "how many games
are rated above 4", "how many Mossgrove games", "how many have more than 20k downloads".

```ts
input:  {
  metric?: Metric,
  op?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',   // required together with metric and value
  value?: number,
  genre?: string,                             // case-insensitive exact match
  developer?: string                          // case-insensitive exact match
}
output: { count: number, games: Game[] /* first 20 matches */, total_games: number }
```

Calling it with no filters returns the catalog size.

### `get_games`

Fetch specific games by title for comparisons. Returns which titles were not found so the
model can say so instead of guessing (FR-019).

```ts
input:  { titles: string[] /* 1–5 items, each 1–100 chars */ }
output: { found: Game[], not_found: string[] }
```

Matching: exact case-insensitive first; otherwise a unique partial match; if several games
match one title, that title is listed in `not_found` with the candidates appended as
`ambiguous: { [title]: string[] }` so the model can ask which one was meant.

## Agent instructions (system prompt)

The prompt contains rules only — no data. Final wording lives in `agent.ts`; it MUST cover:

1. **Scope** — "You answer questions about the team's indie games catalog only. For anything
   else, say you can only help with the games catalog."
2. **Always look up** — "Never answer from memory. Use the tools for every fact. If a tool
   returns no match, say the game was not found; do not invent figures."
3. **Ambiguity** — "If a title matches several games, ask which one the user means."
4. **Ties** — "If several games share the top value, name all of them."
5. **"Last month"** — "Each game has a single monthly figure; treat 'last month' and
   'monthly' as that figure."
6. **Thresholds** — "'Above 4' means strictly greater than 4; 'at least 4' means 4 or more."
7. **Comparisons** — "When comparing, state both values and the difference."
8. **Formatting** — "Format money as US dollars with thousands separators (e.g. $142,500),
   downloads with separators (e.g. 38,200), ratings with one decimal (e.g. 4.7). Keep answers
   to a few sentences; use a short list for multiple games."
9. **Follow-ups** — "Use earlier turns to resolve references like 'the second one'."

## Agent configuration

```ts
new ToolLoopAgent({
  model,                      // lib/ai/model.ts
  instructions,               // the rules above
  tools: { search_games, rank_games, count_games, get_games },
  stopWhen: isStepCount(5),
  providerOptions: { anthropic: { effort: 'low' } },
})
```

## Test expectations (`tests/tools.test.ts`, against the seed dataset)

| Call | Expect |
|---|---|
| `rank_games({ metric: 'monthly_revenue_usd' })` | `games[0].title === 'Hollow Depths'`, `total_games === 12` |
| `count_games({ metric: 'average_rating', op: 'gt', value: 4 })` | `count === 7` |
| `count_games({ metric: 'average_rating', op: 'gte', value: 4 })` | `count === 8` |
| `count_games({ developer: 'mossgrove studio' })` | `count === 2` |
| `get_games({ titles: ['Hollow Depths', 'Stardust Farm'] })` | `found.length === 2`, `not_found.length === 0` |
| `get_games({ titles: ['Nonexistent'] })` | `found.length === 0`, `not_found === ['Nonexistent']` |
| `search_games({ query: 'lantern' })` | 2 games (Moth & Lantern, Cinder & Salt by Two Lanterns) |
