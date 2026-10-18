# Feature Specification: Dashboard Chat Panel

**Feature Branch**: `submission/jorge-sandoval` (spec directory `002-dashboard-chat-panel`)

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Move the AI chat onto the dashboard home page as a side panel next to the games table, so operators can ask questions and check answers against the table without switching pages. Replaces the separate Chat page/nav tab; on narrow screens the panel collapses into a toggleable drawer. Builds on the implemented feature 001-indie-games-dashboard."

## Clarifications

### Session 2026-10-17 (post-implementation)

- Q: Hiding the panel on wide screens made the table jump from about 800 px to 1,230 px wide
  and shifted the header buttons. Should the panel stay hideable? → A: No. On wide screens
  the panel is always shown; there is no Hide/Show. The narrow-screen drawer is unchanged.
- Q: Between 1024 and 1279 px the table gets about 550 px, so Rating and Edit/Delete need a
  sideways scroll inside the table. Should the side panel start at a wider breakpoint? → A:
  Yes. Side panel from 1280 px; the drawer is used below 1280 px.

**Builds on**: [001-indie-games-dashboard](../001-indie-games-dashboard/spec.md). The
assistant's behaviour (lookups, answers, streaming, error handling: 001 FR-012 to FR-021) is
unchanged. This feature changes only **where** the chat lives and how it coexists with the
table. It supersedes 001 FR-022 (switching between a dashboard view and a chat view).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask and Verify on One Screen (Priority: P1)

An operator on a laptop or desktop opens the dashboard and sees the games table with the
assistant panel beside it. They ask "Which game made the most revenue last month?" and,
while the answer streams in, glance at the table to confirm it, without leaving the page.

**Why this priority**: This is the whole point of the change. Answers can be checked against
visible data, which builds trust in the assistant and removes a navigation step from every
question.

**Independent Test**: At a 1280 px-wide window, open the home page. Confirm the table and
the chat are both visible without scrolling sideways. Ask the three example questions and
check each answer against the visible table.

**Acceptance Scenarios**:

1. **Given** a window at least 1280 px wide, **When** the operator opens the home page,
   **Then** the games table and the chat panel are both visible side by side, the table is
   readable without horizontal scrolling, and the chat input is visible without scrolling
   the page.
2. **Given** the panel is visible, **When** the operator sends a question, **Then** the
   reply streams into the panel and shows its lookups exactly as the separate chat page did
   (001 FR-012 to FR-021).
3. **Given** a long conversation, **When** messages exceed the panel's height, **Then** only
   the message list scrolls; the page, the table and the chat input stay in place.

---

### User Story 2 - Edit and Ask Without Losing the Conversation (Priority: P2)

An operator corrects a game's revenue in the table, then immediately asks the assistant a
follow-up about it. The conversation they already had stays on screen, and the new answer
uses the corrected value.

**Why this priority**: Editing data and questioning it are now on the same page. If an edit
wiped the chat, or the chat used stale data, the combined layout would be worse than two
separate pages.

**Independent Test**: Ask two questions, then add, edit and delete a game in the table.
Confirm both earlier exchanges are still in the panel, then ask a question that depends on
the edit and confirm the answer reflects it.

**Acceptance Scenarios**:

1. **Given** a conversation with at least one exchange, **When** the operator adds, edits or
   deletes a game, **Then** every earlier message remains visible and unchanged.
2. **Given** the operator has just edited a game, **When** they ask about that game,
   **Then** the answer uses the new value (001 SC-004 continues to hold on the combined
   page).
3. **Given** a reply is still streaming, **When** the operator opens the add or edit form,
   **Then** the reply keeps streaming and is complete when the form is closed.

---

### User Story 3 - Use the Chat on a Narrow Screen (Priority: P3)

An operator on a small laptop window or tablet opens the dashboard. The table fills the
width; a clearly labelled "Ask AI" control opens the assistant as a drawer over the table.
They ask a question, close the drawer to check the table, and reopen it to find the
conversation intact.

**Why this priority**: Side-by-side layouts only work on wide screens. Narrow screens still
need full access to the chat, but this is a secondary use, since the dashboard is an internal
desktop tool.

**Independent Test**: At a 768 px-wide window, confirm the table is full width and the chat
is hidden behind an "Ask AI" control. Open it, ask a question, close it, reopen it, and
confirm the conversation is unchanged.

**Acceptance Scenarios**:

1. **Given** a window narrower than 1280 px, **When** the operator opens the home page,
   **Then** the table uses the full width and an "Ask AI" control is visible without
   scrolling.
2. **Given** the drawer is closed, **When** the operator activates "Ask AI", **Then** the
   chat opens over the table with the input ready for typing.
3. **Given** the drawer is open, **When** the operator closes it (close button, the Escape
   key, or clicking outside it), **Then** it closes and the conversation is kept for the
   next time it opens.
4. **Given** the operator resizes the window across 1280 px, **When** the layout switches
   between panel and drawer, **Then** the conversation is preserved.

---

### Edge Cases

- **Old chat address**: someone opens the former `/chat` address from a bookmark. They are
  taken to the home page with the chat visible (panel on wide screens, drawer opened on
  narrow ones) rather than seeing a "page not found".
- **Empty catalog**: the table shows its empty state and the chat stays usable; the
  assistant answers that there are no games.
- **AI not configured**: the panel shows the configuration message and Retry, as before; the
  table and its add/edit/delete actions are unaffected.
- **Forms and drawer together**: the add/edit dialog opens above the chat drawer and always
  takes keyboard focus; closing the dialog returns focus to where it was.
- **Many games**: with 100 games the table scrolls with the page, while the side panel stays
  in view so the operator can keep asking questions while scrolling.
- **Reload**: reloading the page starts a new, empty conversation (unchanged from 001; chat
  history is session-only).

## Requirements *(mandatory)*

### Functional Requirements

**Layout**

- **FR-001**: The home page MUST show the games table and the assistant together. At window
  widths of 1280 px and above, the assistant MUST appear as a panel beside the table.
- **FR-002**: At widths of 1280 px and above, both the table and the panel MUST be usable
  without horizontal page scrolling. The panel MUST be between 360 px and 440 px wide, and
  the table MUST take the remaining width.
- **FR-003**: The panel MUST stay in view while the table scrolls vertically, and its
  message list MUST scroll independently, keeping the chat input visible at all times.
- **FR-004**: On wide screens the panel MUST always be shown, with no hide control, so the
  layout never shifts while the operator works (post-implementation clarification).
- **FR-005**: At widths below 1280 px, the table MUST use the full width and the assistant
  MUST be reachable from an always-visible "Ask AI" control that opens it as a drawer over
  the content.
- **FR-006**: The drawer MUST close with a close button, the Escape key, or a click outside
  it. When it opens, keyboard focus MUST move to the chat input; when it closes, focus MUST
  return to the "Ask AI" control.

**Conversation continuity**

- **FR-007**: Adding, editing or deleting a game MUST NOT clear, reset or reorder the
  conversation, and MUST NOT interrupt a reply that is streaming.
- **FR-008**: Opening or closing the drawer and resizing the window across the 1280 px
  breakpoint MUST NOT clear the conversation.
- **FR-009**: The assistant MUST keep answering from the live catalog, so an edit made in
  the table is reflected in the next answer (continues 001 FR-013).

**Navigation**

- **FR-010**: The separate Chat tab and Chat page MUST be removed from the navigation. The
  header MUST show only the application name.
- **FR-011**: Visiting the former chat address MUST take the operator to the home page with
  the assistant visible.

**Unchanged behaviour**

- **FR-012**: All assistant behaviour from 001 (FR-012 to FR-021: lookups shown as chips,
  streaming replies, scope limits, not-found handling, follow-ups, errors with Retry,
  2,000-character input limit, suggested questions when empty) MUST work the same in the
  panel and in the drawer.

### Key Entities

- **Conversation**: unchanged from 001. It now lasts for the whole time the home page is
  open, rather than only while the separate chat page was open. It is still discarded on
  reload.
- **Drawer state**: whether the assistant drawer is open or closed (narrow screens only). It is
  not remembered across reloads.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can ask a question and check the answer against the table in zero
  page navigations, down from two (go to Chat, come back to the Dashboard).
- **SC-002**: At 1280 × 800, the table's six data columns, at least 8 table rows, and the
  chat input are all visible at once without any scrolling.
- **SC-003**: In 10 out of 10 trials of "ask, edit a game, ask again", every earlier message
  is still shown and the second answer reflects the edit.
- **SC-004**: At 768 px wide, the operator can open the chat, ask a question and close it
  again in under 15 seconds, with the conversation intact on reopening.
- **SC-005**: The 10 scripted questions from 001's quickstart still produce 10/10 correct
  answers when asked from the panel.
- **SC-006**: No horizontal page scrolling occurs at 768, 1024, 1280 and 1440 px widths, and at
  1024 px every table column is visible without scrolling inside the table.

## Assumptions

- **Desktop-first internal tool**: side by side needs 1280 px so the table keeps all columns
  visible next to a 400 px panel (post-implementation clarification). Between 1024 px (001
  FR-024's "laptop-sized screen") and 1280 px the table gets the full width. Below it the drawer is a convenience, not a fully optimised mobile design.
- **Panel on the right**: the table is the primary content and stays on the left, where the
  operator's attention starts. The chat sits on the right, as in common assistant layouts.
- **Always shown on wide screens**: the panel can't be hidden from 1280 px up, and the drawer
  starts closed on narrow screens. Neither state is remembered across visits.
- **Assistant unchanged**: no new tools, prompts or answer types. Any assistant improvement
  is a separate feature.
- **No new data or API**: the REST API and data model from 001 are untouched.
- **Old address**: redirecting the former chat address is enough; no other links point to it
  outside the app.
