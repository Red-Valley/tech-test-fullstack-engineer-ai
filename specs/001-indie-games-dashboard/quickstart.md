# Quickstart & Validation: Indie Games Dashboard

**Plan**: [plan.md](plan.md) | **Contracts**: [contracts/](contracts/) |
**Data**: [data-model.md](data-model.md)

## Prerequisites

- Node.js **22 or newer** (`node --version`; `.nvmrc` pins 24). `better-sqlite3` ships
  prebuilt binaries for 22/24 on Linux, macOS and Windows — nothing compiles.
- An Anthropic API key.
- No Docker, no database server (spec clarification Q1).

## Run

```bash
cp .env.example .env.local        # then set ANTHROPIC_API_KEY=sk-ant-...
npm install
npm run dev                       # http://localhost:3000
```

`.env.example`:

```env
ANTHROPIC_API_KEY=
# Optional. Defaults to claude-opus-5-5. Any Anthropic model with tool calling works.
ANTHROPIC_MODEL=
```

First start creates `data/games.db` and seeds 12 games (data-model.md → Seed dataset).
Delete the file to reseed.

Quality gates (must all pass before the PR):

```bash
npm run lint
npm run typecheck                 # tsc --noEmit
npm test                          # vitest run
```

## Validation scenarios

Each scenario maps to a spec user story; expected values come from the seed dataset.

### S1 — Dashboard & CRUD (User Story 1)

1. Open `/`. **Expect**: table of 12 games, six columns formatted (`$142,500`, `38,200`,
   `4.7`), nav shows Dashboard | Chat.
2. Click **Add game**, submit with title blank, revenue `-5`, downloads `1.5`, rating `7`.
   **Expect**: no request succeeds; four field-level messages appear.
3. Fix the values (e.g. "Test Game", "Me", "Puzzle", 1000, 50, 4.2) and submit.
   **Expect**: row appears immediately; reload — still there (13 rows).
4. Edit "Test Game", change revenue to 2000, save. **Expect**: cell shows `$2,000`.
5. Click **Delete** on "Test Game", cancel. **Expect**: nothing changes. Click again,
   confirm. **Expect**: row gone; reload — 12 rows.
6. Stop the server, delete every game via the UI, restart. **Expect**: empty state with
   "Add your first game" — no reseed (clarification Q2). Delete `data/games.db` and restart
   to get the seed back.

### S2 — Chat assistant (User Story 2)

Open `/chat` and ask, in one conversation:

| # | Question | Expect |
|---|---|---|
| 1 | Which game made the most revenue last month? | Lookup chip `rank_games` → "Hollow Depths … $142,500" |
| 2 | How many games are rated above 4? | Chip `count_games` → **7**, optionally listed |
| 3 | And at least 4? | **8** (follow-up resolved from context; adds Moth & Lantern) |
| 4 | Compare revenue of Hollow Depths vs Stardust Farm. | Chip `get_games` → both figures, "Hollow Depths by $44,500" |
| 5 | Which has the most downloads? | Stardust Farm, 51,400 |
| 6 | How many games does Mossgrove Studio have? | 2 |
| 7 | Compare revenue of Hollow Depths vs Nonexistent Game. | Says "Nonexistent Game" not found; no invented number |
| 8 | What's the weather in Madrid? | Declines: catalog questions only |
| 9 | Tell me about Lantern. | Asks which: Moth & Lantern or Cinder & Salt (Two Lanterns) |
| 10 | Which game has the lowest rating? | Skyline Siege, 3.2 |

Also verify while watching:

- A lookup chip or the first words of a reply appear **within 3 s** of sending (SC-003);
  text is shown as it streams in.
- Edit Hollow Depths' revenue to `50000` on the dashboard, return to chat, re-ask Q1.
  **Expect**: Stardust Farm ($98,000) — no restart (SC-004).
- Remove `ANTHROPIC_API_KEY` from `.env.local`, restart, send a message. **Expect**: banner
  with the configuration message and a Retry button; dashboard still works (FR-021).
- Send an empty message. **Expect**: button disabled.

### S3 — REST API (User Story 3)

Run the `curl` sequence in [contracts/games-api.md](contracts/games-api.md) → Examples.
**Expect** the status codes and bodies listed there: `12` on list, `201` with `id`, `400`
with four `fields` entries, `200` on update, `204` on delete, `404` afterwards.

### Automated

```bash
npm test
```

**Expect**: `tests/repository.test.ts` (CRUD + helpers) and `tests/tools.test.ts` (the
seven cases in [contracts/assistant-tools.md](contracts/assistant-tools.md) → Test
expectations) pass against an in-memory database.

## Success-criteria checklist

| SC | How verified |
|---|---|
| SC-001 add a game < 60 s | S1 step 3, timed |
| SC-002 10/10 correct answers | S2 table |
| SC-003 first visible response (chip or text) < 3 s | S2 observation |
| SC-004 edit reflected next answer | S2 edit check |
| SC-005 no invalid records via UI or API | S1 step 2 + S3 validation call |
| SC-006 fresh checkout → running < 5 min, Node + key only | Run section |
| SC-007 100 games < 2 s | `POST` 88 extra games in a loop, reload `/` |
| SC-008 lookups visible per answer | S2 chips |
