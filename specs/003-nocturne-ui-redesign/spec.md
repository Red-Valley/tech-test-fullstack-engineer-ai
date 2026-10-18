# Feature Specification: Nocturne UI Redesign

**Feature Branch**: `submission/jorge-sandoval` (spec directory `003-nocturne-ui-redesign`)

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Nocturne UI redesign of the games dashboard, from the Claude Design handoff exported to design/003 (README, nocturne-theme.css, 7 screenshots). Dark-only high-fidelity theme (Inter, accent #9184d9, fading rules), full-bleed catalog with a docked right rail that switches between the Assistant and a Game editor (add/edit move out of the modal dialog into the rail), dense table with Game + "Developer · Genre" subline, revenue bar, icon actions and sortable column headers, a toolbar with search, genre filter and count persisted in the URL, styled delete confirmation and toasts, restyled chat with New chat, and rows highlighted for the games the assistant's last answer referenced. Keeps the conversation-preservation and below-1280px drawer behaviour from 002; data model, API and assistant tools unchanged."

**Design source**: `design/003/Red-Valley (1).zip` → `design_handoff_games_dashboard_nocturne/`.
The handoff `README.md` and `screenshots/01–07` are the **visual reference** for this spec:
exact colours, sizes and spacing come from there and its `nocturne-theme.css`. This spec
defines **what** the operator can do and what must stay true. Where the two disagree on
behaviour, this spec wins.

## Clarifications

### Session 2026-10-17 (post-implementation)

- Q: SC-002 asked for 12 rows at 1280 × 800, but the handoff's row height (≈52 px at real
  scale) fits 11 under the heading and toolbar. Squeeze the design or correct the target? →
  A: Correct the target. The handoff is the visual source of truth; 11 rows (002 had 8).

**Builds on**: [001](../001-indie-games-dashboard/spec.md) (catalog, API, assistant) and
[002](../002-dashboard-chat-panel/spec.md) (chat beside the table, drawer below 1280 px,
conversation never reset). It supersedes 001 FR-004's browser confirmation box, and 002
FR-002's 360–440 px panel width (see FR-003).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan the Catalog at a Glance (Priority: P1)

An operator opens the dashboard and sees the whole catalog in a dark, dense layout. Each row
shows the game's title with its developer and genre underneath, its monthly revenue with a
small bar comparing it to the top earner, downloads, rating, and compact edit/delete icons.
The assistant sits docked on the right.

**Why this priority**: This is the redesign itself. Every other story is built on the new
layout, and on its own it already makes the table faster to scan: more rows on screen, and
relative revenue visible without reading numbers.

**Independent Test**: At 1470 × 900, open `/` and compare it with
`screenshots/01-default.png`. Confirm the dark theme, the 5-column dense table (Game,
Revenue / mo, Downloads, Rating, actions), the revenue bars, at least 11 rows visible without
scrolling, and the docked Assistant rail.

**Acceptance Scenarios**:

1. **Given** the seeded catalog, **When** the operator opens the dashboard, **Then** the page
   uses the dark Nocturne theme throughout (no light areas), and every game shows title,
   "Developer · Genre", formatted revenue, downloads and rating.
2. **Given** games with different revenues, **When** the table renders, **Then** each revenue
   bar's length is proportional to that game's revenue relative to the highest revenue in the
   catalog (the top earner's bar is full length).
3. **Given** a title or developer too long for its column, **When** the row renders, **Then**
   the text is truncated with an ellipsis on one line, and the full text is available on hover.
4. **Given** the table, **When** the operator uses only the keyboard, **Then** every sort
   header, edit and delete control is reachable and shows a clearly visible focus ring.
5. **Given** an empty catalog, **When** the dashboard opens, **Then** it shows "No games yet",
   a short explanation and an "Add game" action.

---

### User Story 2 - Edit Without Leaving the Context (Priority: P2)

The operator clicks the edit icon on a row. The right rail switches from the Assistant to a
Game editor for that game, and the row is marked as being edited. They change a value and
save. The rail returns to the Assistant with the earlier conversation intact, the table
updates, and a short confirmation appears. Deleting asks for confirmation in a styled dialog
and confirms with the same kind of message.

**Why this priority**: Editing used to cover the page with a modal. In the rail, the table
stays visible while editing, and the conversation is one click away. It is the largest
interaction change in the design.

**Independent Test**: Ask the assistant a question. Edit a game from its row, save, and
confirm the rail returns to the same conversation, the table shows the new value, and a
"Saved {title}" message appears. Then delete a game through the confirmation dialog.

**Acceptance Scenarios**:

1. **Given** the Assistant is showing, **When** the operator clicks a row's edit icon,
   **Then** the rail shows "Edit {title}" with all six fields pre-filled, and that row is
   visibly marked as selected.
2. **Given** the editor is open, **When** the operator clicks "Back to assistant" or "Cancel"
   or presses Escape, **Then** the rail returns to the Assistant with the conversation exactly
   as it was, including a reply that was still streaming.
3. **Given** the editor is open, **When** the operator saves valid changes, **Then** the rail
   returns to the Assistant, the table reflects the change, and a "Saved {title}" message
   appears briefly. Adding works the same way, with "Added {title}".
4. **Given** invalid input, **When** the operator saves, **Then** each invalid field is
   outlined and shows its rule message directly below it (same rules and messages as 001
   FR-005), and the message clears as soon as that field is edited.
5. **Given** the operator chooses delete (from the row or from the editor), **When** the
   confirmation dialog appears and they confirm, **Then** the game is removed, the editor
   closes if it was showing that game, and a "Deleted {title}" message appears. Cancelling
   changes nothing.
6. **Given** a game was deleted elsewhere, **When** the operator saves or deletes it,
   **Then** a "This game no longer exists." message appears and the table refreshes.
7. **Given** a window narrower than 1280 px, **When** the operator clicks edit or "Add game",
   **Then** the drawer opens showing the editor.

---

### User Story 3 - Find and Order Games (Priority: P3)

The operator types part of a title or developer into a search box, or picks a genre, and the
table narrows to matching games, with a count such as "3 of 12 games". Clicking a column
header sorts by it, and clicking again reverses the order. The search, genre and sort are
kept in the page address, so reloading or sharing the link shows the same view.

**Why this priority**: With a growing catalog, finding a game is the most common table task.
It is new capability (001 listed search and sort as out of scope), but it is independent of
the redesign's visuals and assistant integration, so it comes after them.

**Independent Test**: Search "lantern" and expect 2 games and "2 of 12 games". Filter genre
"Racing" and expect Neon Drift only. Sort by Rating twice and confirm the order flips. Reload
and confirm all three are kept. Search "zzz" and expect the "No games match" state with
"Clear filters".

**Acceptance Scenarios**:

1. **Given** the full catalog, **When** the operator types in the search box, **Then** after
   a brief pause the table shows only games whose title or developer contains the text
   (case-insensitive), and the count reads "N of 12 games".
2. **Given** the genre filter, **When** the operator opens it, **Then** it lists "All genres"
   followed by every genre in the catalog A–Z, and choosing one shows only that genre's
   games. Search and genre combine.
3. **Given** the table, **When** the operator clicks a column header, **Then** the table is
   sorted by that column: ascending for Game, descending for numeric columns. Clicking the
   same header again reverses the order, and only the active column shows a direction arrow.
   The default is Revenue, highest first.
4. **Given** any search, genre or sort, **When** the page is reloaded, or the link is opened
   in a new tab, **Then** the same view appears.
5. **Given** filters that match nothing, **When** the table renders, **Then** it shows "No
   games match", "Try a different search or genre." and a "Clear filters" action that
   restores the full catalog.
6. **Given** active filters, **When** the operator edits or adds a game, **Then** the filters
   and sort stay applied after the table refreshes.

---

### User Story 4 - See Which Games an Answer Is About (Priority: P4)

The operator asks "How many games are rated above 4?". As the answer arrives, the seven
games it counted light up in the table, and a tag above the table reads "7 from last
answer". Asking a new question replaces the highlight; the tag's ✕ or "New chat" clears it.
The chat itself has a cleaner look: answers without a bubble, outlined lookup chips, a
blinking cursor while text streams, and a "Try asking" list of suggestions.

**Why this priority**: It ties the two halves of the page together. Answers point at rows
the operator can check. It depends on US1's table, and US2/US3 don't need it, so it's last.

**Independent Test**: Ask the three suggested questions in turn and confirm the highlighted
rows match each answer: the top earner only; the 7 games above 4; the 2 compared games.
Then click the tag's ✕ and confirm the highlight clears. Click "New chat" and confirm the
conversation and highlight are cleared.

**Acceptance Scenarios**:

1. **Given** an answer whose lookups returned games, **When** the lookups finish, **Then**
   the referenced games are highlighted in the table, and a tag reads "N from last answer".
   For "most / least / top" questions only the answer's subject (the first-ranked game) is
   highlighted. For counts, comparisons and searches, all returned games are highlighted.
2. **Given** a highlight, **When** the operator sends a new question, clicks the tag's ✕ or
   clicks "New chat", **Then** the highlight is cleared (and replaced by the new answer's
   references, if any).
3. **Given** a highlighted game, **When** it is deleted, **Then** it is removed from the
   highlight and the tag's count updates.
4. **Given** highlighted games hidden by the current filter, **When** the table renders,
   **Then** the tag still shows the full count, and only visible rows are highlighted.
5. **Given** a conversation exists, **When** the operator clicks "New chat", **Then** the
   messages are cleared, the "Try asking" suggestions return, and the rest of the page is
   unchanged.
6. **Given** no conversation, **When** the Assistant shows, **Then** "Try asking" and the
   three suggestions appear at the bottom of the message area, above the input. They are
   hidden once a question is sent.
7. **Given** an answer is streaming, **When** text arrives, **Then** a blinking cursor shows
   at the end of the text until it completes. A stopped or failed answer is marked "Stopped
   — incomplete answer".

---

### Edge Cases

- **Editor open, then a different row's edit**: the editor switches to the new game. Unsaved
  changes to the first are discarded without a prompt (the design has none; changes are
  small and quick to redo).
- **Editor open on a game that gets filtered out**: the editor stays open; the selection
  mark just isn't visible.
- **Escape order**: Escape closes, in order, the delete dialog, then the editor (back to
  the Assistant), then the drawer on narrow screens. One press closes one layer.
- **Highlight from an answer that found nothing** (e.g. a missing game): no highlight and no
  tag.
- **"New chat" while a reply streams**: streaming stops, then the conversation clears.
- **Long genre list**: the genre filter scrolls; it doesn't grow the toolbar.
- **Invalid URL values** (unknown sort column or direction, a genre that no longer exists):
  ignored and treated as the default; the page still renders.
- **Many toasts in a row**: the newest replaces the previous one; they never stack off-screen.
- **Below 1280 px**: the whole rail (Assistant or editor) is the drawer. "Ask AI" opens it on
  the Assistant, edit/Add open it on the editor, and closing the drawer from the editor
  returns the rail to the Assistant for next time.

## Requirements *(mandatory)*

### Functional Requirements

**Look and layout**

- **FR-001**: The application MUST use the Nocturne visual design from the handoff
  (dark-only colour palette, Inter type, fading rules, icon set) on every surface: header,
  table, toolbar, rail, editor, dialogs and messages. There is no light theme.
- **FR-002**: The catalog MUST span the full page width beside the rail, with no centred
  maximum width.
- **FR-003**: From 1280 px, the rail MUST be docked on the right, at least 290 px and at most
  400 px wide (scaling with the window), stay in view while the page scrolls, and scroll its
  own content. This replaces 002 FR-002's 360–440 px range.
- **FR-004**: Below 1280 px, the rail MUST behave as 002's drawer, for both the Assistant and
  the editor. An "Ask AI" button sits beside "Add game".
- **FR-005**: The header MUST show the application name with the accent mark, and an "Add
  game" button on the right.

**Table**

- **FR-006**: The table MUST show, per game: a Game column (title, and "Developer · Genre"
  beneath it), Revenue / mo (amount plus a bar proportional to the catalog's highest
  revenue), Downloads, Rating, and icon buttons for edit and delete labelled "Edit {title}"
  and "Delete {title}" for assistive technology.
- **FR-007**: Number formats MUST stay as in 001 FR-023 ($142,500 / 38,200 / 4.7).
- **FR-008**: Text that doesn't fit MUST truncate with an ellipsis on a single line, with the
  full value available on hover.
- **FR-009**: Each column header MUST sort the table by that column. The first click sorts
  text ascending and numbers descending; repeat clicks reverse. Only the active column shows
  its direction. Default: revenue descending.

**Finding games**

- **FR-010**: A search box MUST filter to games whose title or developer contains the typed
  text, ignoring case, updating after a short pause in typing (≈250 ms).
- **FR-011**: A genre filter MUST offer "All genres" plus every distinct genre in the catalog,
  A–Z, and combine with the search.
- **FR-012**: A count MUST show "N games" when unfiltered and "N of M games" when filtered.
- **FR-013**: Search text, genre, sort column and direction MUST be reflected in the page
  address, restored on reload, and kept across add, edit and delete.
- **FR-014**: When filters match nothing, the table MUST show "No games match" with a "Clear
  filters" action that resets search and genre.

**Editing in the rail**

- **FR-015**: Add and edit MUST open in the rail in place of the Assistant, not in a modal.
  It offers a back control, the six fields in 001's order, and Cancel plus Save ("Add game" /
  "Save changes"; "Saving…" while pending). When editing, it also offers Delete.
- **FR-016**: Validation rules and messages MUST be the same as 001 FR-005. Errors show under
  each field and clear when that field changes.
- **FR-017**: While a game is open in the editor, its row MUST be marked as selected.
- **FR-018**: On successful save, the rail MUST return to the Assistant and a confirmation
  message ("Added {title}" / "Saved {title}") MUST appear for about 2.6 seconds.
- **FR-019**: Deleting MUST ask for confirmation in a styled dialog ("Delete {title}?", "It
  will be removed from the catalog. This cannot be undone.", Cancel / "Delete game").
  On success: close it, close the editor if it showed that game, and show "Deleted {title}".
  This replaces 001 FR-004's browser confirmation box.
- **FR-020**: When a game no longer exists, saving or deleting it MUST show "This game no
  longer exists." and refresh the table.
- **FR-021**: The conversation MUST survive the editor taking over the rail. Switching back
  shows every earlier message, and any reply that was streaming keeps streaming (continues
  002 FR-007).

**Assistant and highlights**

- **FR-022**: The Assistant MUST keep all 001 chat behaviour (lookups, chips, streaming,
  scope limits, not-found handling, follow-ups, errors with Retry, 2,000-character limit),
  restyled per the handoff: user messages in a bubble, assistant answers without one,
  outlined lookup chips, a streaming cursor, a "Stopped — incomplete answer" marker, and a
  "Try asking" suggestion list.
- **FR-023**: A "New chat" control, shown only when a conversation exists, MUST stop any
  streaming reply, clear the conversation and clear the highlight.
- **FR-024**: When an answer's lookups return games, those games MUST be highlighted in the
  table: only the first-ranked game for ranking lookups; all returned games for count,
  comparison and search lookups. A toolbar tag MUST show "N from last answer" with a clear
  (✕) control.
- **FR-025**: The highlight MUST be cleared on a new question, on "New chat" and from the
  tag. Deleted games MUST drop out of it.

**Accessibility and states**

- **FR-026**: Every interactive element MUST have visible hover, pressed, focus (a 2 px
  accent outline) and disabled states.
- **FR-027**: Escape MUST close one layer at a time: the dialog, then the editor, then the
  drawer.
- **FR-028**: Confirmation messages MUST be announced to assistive technology.

**Unchanged**

- **FR-029**: The data model, REST API, chat API, assistant tools and prompt MUST NOT change.

### Key Entities

- **Game**: unchanged from 001.
- **Catalog view**: search text, genre, sort column and direction. It lives in the page
  address.
- **Rail mode**: Assistant, Add, or Edit (with the game being edited). Not remembered across
  reloads.
- **Highlight**: the set of games referenced by the last answer. Not remembered across
  reloads.
- **Conversation**: unchanged from 002, plus it can now be cleared with "New chat".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 1470 × 900 the dashboard matches the handoff screenshots 01–07 for each
  corresponding state, judged side by side: same layout, colours, type scale and components.
- **SC-002**: At 1280 × 800, at least 11 table rows and the assistant input are visible
  without scrolling (002 required 8; corrected from 12 after implementation, see Clarifications).
- **SC-003**: Finding a named game by search takes under 5 seconds from opening the page.
- **SC-004**: For each of the three suggested questions, the highlighted rows match the
  answer's subject exactly, 3 out of 3.
- **SC-005**: In 10 out of 10 "ask, edit in the rail, save" trials, the conversation is
  intact afterwards (continues 002 SC-003).
- **SC-006**: Body text and labels meet a 4.5:1 contrast ratio against their background,
  including on highlighted and selected rows. Large headings and icons meet 3:1.
- **SC-007**: Every action (sort, search, filter, edit, save, delete, New chat, clearing the
  highlight) can be completed with the keyboard alone.
- **SC-008**: The 10 scripted assistant questions from 001 still give 10/10 correct answers
  after the redesign, and no horizontal page scroll occurs at 768, 1024, 1280 and 1440 px.

## Assumptions

- **Dark only**: the handoff is explicitly dark-only. No light theme or theme switch.
- **Handoff wins on visuals, this spec wins on behaviour**: exact sizes, spacing and colours
  come from the handoff. Where it is silent (unsaved-edit switching, invalid URLs, toast
  stacking), the defaults above apply.
- **Search, genre and sort are new scope**: 001 deliberately left them out. The design adds
  them; they work on the catalog already loaded for the page, which is fine at this scale
  (tens of games). There is no pagination.
- **Highlights are derived from the lookups already returned to the chat**: no assistant,
  tool or API change is needed (FR-029).
- **Revenue bar scale**: relative to the highest revenue in the *whole* catalog, not the
  filtered view, so bars don't jump when filtering.
- **One new visual dependency is acceptable**: an icon set, which the handoff names.
- **Prototype code is reference only**: the handoff's HTML prototypes and their supporting
  script illustrate behaviour; the product is rebuilt in the existing codebase, and their
  code isn't copied.
