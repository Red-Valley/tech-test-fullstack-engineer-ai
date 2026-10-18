# Quickstart & Validation: Dashboard Chat Panel

**Plan**: [plan.md](plan.md) | **Contract**: [contracts/ui-layout.md](contracts/ui-layout.md)

## Run

Same as [001 quickstart](../001-indie-games-dashboard/quickstart.md): `.env.local` with
`ANTHROPIC_API_KEY`, then `npm run dev`. Use the browser's responsive mode to set widths.

Gates: `npm run lint && npm run typecheck && npm test && npm run build`. The build's route
table must no longer list `/chat` as a page.

## Scenarios

### V1: Side by side at 1280 × 800 (US1, SC-002)

1. Open `/`. **Expect**: no Chat tab in the header; table on the left, Assistant panel on
   the right; six data columns, ≥ 8 rows and the chat input all visible without scrolling.
2. Click a suggested question. **Expect**: lookup chip, then the streamed answer in the panel;
   the answer matches the table (e.g. Hollow Depths, $142,500).
3. Ask 6+ questions. **Expect**: only the message list scrolls; the input and table stay put.
4. Scroll the page down (add rows first if needed). **Expect**: the panel stays in view.
5. **Expect**: no Hide control on wide screens; the layout never shifts.

### V2: Edit while chatting (US2, SC-003)

1. Ask "Which game made the most revenue last month?" (expect Hollow Depths).
2. Edit Hollow Depths' revenue to 50000 and save. **Expect**: the table updates and both
   chat messages are still shown.
3. Ask the same question. **Expect**: Stardust Farm, $98,000.
4. Ask a question, and while it streams, open "Add game". **Expect**: the reply finishes
   behind the dialog. Press Escape. **Expect**: only the dialog closes.
5. Add, then delete, a game. **Expect**: the conversation is unchanged.

Repeat steps 1–3 ten times across sessions to verify SC-003 (10/10).

### V3: Narrow screen at 768 px (US3, SC-004)

1. Open `/`. **Expect**: full-width table, "Ask AI" button visible, no assistant visible.
2. Click "Ask AI". **Expect**: drawer slides in from the right over a dimmed backdrop, and
   the input is focused.
3. Ask a question; press Escape. **Expect**: the drawer closes and focus is back on "Ask AI".
   Reopen it. **Expect**: the conversation is intact. Close by clicking the backdrop, then by
   clicking ×.
4. With the drawer open, Tab repeatedly. **Expect**: focus stays usable inside the drawer;
   when closed, Tab never lands on hidden chat controls.
5. Time open → ask → close: under 15 s (SC-004).

### V4: Resize and redirect (FR-008, FR-011, SC-006)

1. At 1280 px, ask a question. Shrink to 768 px and open "Ask AI". **Expect**: same
   conversation. Grow back to 1280 px. **Expect**: same conversation in the panel.
2. At 768, 1024, 1280 and 1440 px. **Expect**: no horizontal page scrollbar.
3. Visit `/chat` at 768 px. **Expect**: URL becomes `/`, the drawer is open and the input
   focused. At 1280 px, the panel is visible and the input focused.
4. `curl -sI localhost:3000/chat`. **Expect**: `307` with `location: /#chat`.

### V5: Assistant unchanged (FR-012, SC-005)

Run the 10 scripted questions from 001 quickstart S2 in the panel. **Expect**: 10/10
correct, lookup chips shown, plain-text answers. The evaluation script used for 001
(`/api/chat` over HTTP) also applies, since the API is unchanged.

## Success-criteria checklist

| SC | Verified by |
|---|---|
| SC-001 zero navigations to ask and check | V1 |
| SC-002 columns + 8 rows + input at 1280×800 | V1.1 |
| SC-003 10/10 ask-edit-ask | V2 |
| SC-004 narrow open-ask-close < 15 s | V3.5 |
| SC-005 10/10 answers | V5 |
| SC-006 no horizontal page scroll | V4.2 |
