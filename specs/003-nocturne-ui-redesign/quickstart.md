# Quickstart & Validation: Nocturne UI Redesign

**Plan**: [plan.md](plan.md) | **Contracts**: [ui-nocturne.md](contracts/ui-nocturne.md),
[url-state.md](contracts/url-state.md)

## Run

As in 001: `.env.local` with `ANTHROPIC_API_KEY`, `npm install`, `npm run dev`. Delete
`data/games.db` first to get the seed catalog.

Gates: `npm run lint && npm run typecheck && npm test && npm run build`.

## Scenarios

### V1: Look and table (US1)

1. At 1470 × 900, screenshot `/` and compare it side by side with
   `design/003/.../screenshots/01-default.png`. **Expect**: same structure, colours and type.
   Minor anti-aliasing differences are fine.
2. **Expect**: Hollow Depths' revenue bar is full width; Moth & Lantern's is about 6%.
3. At 1280 × 800, **Expect**: at least 11 rows and the assistant input visible (SC-002).
4. Tab through a row. **Expect**: sort headers, ✎ and 🗑 are reachable, with an accent focus
   ring.

### V2: Edit in the rail (US2)

1. Ask "How many games are rated above 4?". Click ✎ on Stardust Farm. **Expect**: the rail
   shows "Edit Stardust Farm", and the row is selected (`aria-current`).
2. Set rating to 7 and save. **Expect**: the S5 state; the message clears when the field is
   edited.
3. Set revenue to 99000 and save. **Expect**: the rail returns to chat with the same
   messages, the table shows $99,000, and the toast "Saved Stardust Farm".
4. 🗑 on a game, then Cancel: nothing changes. 🗑 again, then "Delete game": row gone, toast.
5. Repeat step 3 ten times across sessions (SC-005: 10/10).

### V3: Find and sort (US3)

1. Type "lantern". **Expect**: 2 rows, "2 of 12 games", URL `?q=lantern`, conversation
   untouched.
2. Genre "Racing". **Expect**: none (combined with "lantern"). Clear search: Neon Drift.
3. Click Rating twice. **Expect**: descending then ascending; arrow only on Rating.
4. Reload. **Expect**: same view. Search "zzz", then "Clear filters": back to all 12 with the
   sort kept.
5. Open `/?sort=bogus&dir=up`. **Expect**: the default view, no error.

### V4: Highlights and chat (US4)

1. Ask the 3 suggestions in turn. **Expect**: Q1 highlights Hollow Depths only; Q2 the 7
   games rated above 4 (tag "7 from last answer"); Q3 Hollow Depths and Stardust Farm
   (SC-004: 3/3).
2. Tag ✕: highlight cleared. New chat: messages cleared, suggestions back.
3. While a reply streams, **expect** the blinking cursor. Press Stop: "Stopped — incomplete
   answer".

### V5: Regressions (002 and 001)

1. Rerun the 002 browser suite, rewritten for the rail editor: drawer below 1280 px, Escape
   layering, `/chat` redirect, no horizontal page scroll at 768/1024/1280/1440.
2. Rerun the 10 scripted questions (SC-008: 10/10).
3. Contrast: measure the selected-row subline. **Expect**: ≥ 4.5:1 (research §7).

## Success-criteria checklist

| SC | Verified by |
|---|---|
| SC-001 matches screenshots 01–07 | V1.1, plus state screenshots for S2–S7 |
| SC-002 ≥ 11 rows + input at 1280×800 | V1.3 |
| SC-003 find a game < 5 s | V3.1 |
| SC-004 highlights 3/3 | V4.1 |
| SC-005 conversation intact 10/10 | V2.5 |
| SC-006 contrast | V5.3 + research §7 |
| SC-007 keyboard-only | V1.4, V2, V3 with keyboard |
| SC-008 10/10 answers, no horizontal scroll | V5.1–V5.2 |
