# Feature Specification: Indie Games Dashboard

**Feature Branch**: `submission/jorge-sandoval` (spec directory `001-indie-games-dashboard`)

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "indie games dashboard with CRUD, REST API and streaming AI chat"

## Clarifications

### Session 2026-10-17

- Q: How should a reviewer run the application locally? → A: Single local process
  (`install` + `dev`), data in a local file, LLM reached via a hosted API key. No containers,
  no separate database server.
- Q: When the operator deletes every game and restarts, should the sample games come back?
  → A: No. Seed only on first run, when no data store exists yet; an emptied catalog stays
  empty after restart.

### Session 2026-10-17 (post-implementation)

- Q: Live testing showed a lookup-then-answer reply needs two model round trips, so text
  starts at 2.6–4.4 s while the lookup indicator appears at 0.9–2.2 s. What must appear within
  3 seconds? → A: The first visible response, either the lookup indicator or text. Text
  latency is documented as a trade-off.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage the Games Catalog (Priority: P1)

An internal operator opens the dashboard and sees every indie game in the catalog with its
title, developer, genre, monthly revenue, monthly downloads and average rating. They can add
a new game, correct the details of an existing one, and remove a game that is no longer
tracked. Changes are visible immediately and survive a page reload.

**Why this priority**: The catalog is the foundation every other capability reads from. With
only this story delivered, the team already has a usable internal tool for keeping game data
accurate.

**Independent Test**: Start the application, confirm the seeded games appear, add a game,
edit it, delete it, reload the page after each step and confirm the list reflects the change.

**Acceptance Scenarios**:

1. **Given** the application is launched for the first time, **When** the operator opens the
   dashboard, **Then** a pre-populated list of at least 10 games is shown with all six
   fields visible for each game.
2. **Given** the dashboard is open, **When** the operator submits the "add game" form with
   valid values for all six fields, **Then** the new game appears in the list without a
   manual refresh and remains after reloading the page.
3. **Given** a game exists, **When** the operator edits one or more of its fields and saves,
   **Then** the list shows the updated values and the previous values are gone.
4. **Given** a game exists, **When** the operator chooses to delete it and confirms,
   **Then** the game is removed from the list and does not reappear after reload.
5. **Given** the add or edit form is open, **When** the operator submits a blank title, a
   negative revenue, a non-integer download count, or a rating outside 0–5, **Then** the
   submission is rejected and a message next to each invalid field explains why.
6. **Given** the operator starts deleting a game, **When** they cancel the confirmation,
   **Then** nothing changes.

---

### User Story 2 - Ask the Assistant About the Catalog (Priority: P2)

An operator switches to the chat view and asks questions in plain language such as
"Which game made the most revenue last month?", "How many games are rated above 4?" or
"Compare revenue of Game A vs Game B." The assistant answers using the live catalog data,
and its reply appears progressively as it is written rather than all at once after a delay.

**Why this priority**: This is the headline capability of the feature and the reason the
dashboard exists beyond a simple table. It depends on Story 1 for data but is independently
demonstrable once any data exists.

**Independent Test**: With the seeded catalog, ask each of the three example questions and
verify the answers against the table. Edit a game's revenue in the dashboard, ask the
revenue question again, and verify the answer reflects the edit.

**Acceptance Scenarios**:

1. **Given** the catalog contains games, **When** the operator asks which game earned the
   most revenue, **Then** the assistant names the correct game and its revenue figure.
2. **Given** the catalog contains games, **When** the operator asks how many games are rated
   above a threshold, **Then** the assistant gives the correct count and may list the games.
3. **Given** two games exist, **When** the operator asks to compare their revenue, **Then**
   the assistant reports both figures and states which is higher and by how much.
4. **Given** the operator sends a question, **When** the assistant begins replying, **Then**
   a first visible response (a lookup indicator or the first words of the reply) appears
   within 3 seconds and the text appears incrementally as it is generated.
5. **Given** the operator has just changed a game's data in the dashboard, **When** they
   ask a question whose answer depends on that field, **Then** the answer uses the new value.
6. **Given** the assistant is answering, **When** it needs catalog data, **Then** the chat
   view shows that a catalog lookup is taking place (and which kind) so the operator can see
   where the answer came from.
7. **Given** the operator asks about a game that is not in the catalog, **When** the
   assistant replies, **Then** it says the game was not found rather than inventing figures.
8. **Given** the operator asks something unrelated to the catalog, **When** the assistant
   replies, **Then** it explains it can only answer questions about the games catalog.
9. **Given** an earlier question in the same conversation, **When** the operator asks a
   follow-up that refers back to it ("and the second highest?"), **Then** the assistant
   understands the reference.

---

### User Story 3 - Access the Catalog Programmatically (Priority: P3)

A developer on the team wants to read and modify the catalog from a script or another
internal service without going through the UI. They can list all games, fetch one, create,
update and delete games, and receive clear, structured errors when input is invalid or a
game does not exist.

**Why this priority**: Programmatic access makes the catalog reusable by other tooling and is
a stated deliverable, but it has no standalone value to an operator until Stories 1 and 2
exist.

**Independent Test**: Using any HTTP client, perform list, get, create, update and delete
requests against the seeded catalog and confirm each response has the expected content and
status, including error cases.

**Acceptance Scenarios**:

1. **Given** the catalog has games, **When** a client requests the full list, **Then** every
   game is returned with all six fields plus its identifier.
2. **Given** a valid identifier, **When** a client requests that game, **Then** only that
   game is returned; **Given** an unknown identifier, **Then** a "not found" response is
   returned.
3. **Given** a valid game payload, **When** a client creates a game, **Then** the response
   contains the stored game including its new identifier, and the game is visible in the
   dashboard.
4. **Given** an invalid payload (missing field, wrong type, out-of-range value), **When** a
   client creates or updates a game, **Then** the request is rejected with a response that
   names each invalid field and the reason.
5. **Given** a game exists, **When** a client updates then deletes it, **Then** subsequent
   requests for that game return "not found".

---

### Edge Cases

- **Empty catalog**: the dashboard shows an empty state with a prompt to add a game; the
  assistant answers that there are no games rather than failing.
- **Ties**: when two games share the top value for a metric, the assistant names all tied
  games.
- **Ambiguous or partial game names in chat**: matching is case-insensitive and tolerates
  partial titles; if more than one game matches, the assistant asks which one was meant.
- **Comparing a game with itself or with a missing game**: the assistant explains the
  problem instead of producing a meaningless comparison.
- **AI provider unavailable or misconfigured**: the chat view shows a clear, non-technical
  error and a retry option; the dashboard and API continue to work normally.
- **Reply interrupted mid-stream**: the partial text stays visible, is marked as
  incomplete, and the operator can resend the question.
- **Concurrent edits**: editing or deleting a game that was removed by another request shows
  a "no longer exists" message and refreshes the list.
- **Large values**: revenue and downloads are shown with thousands separators and currency
  formatting; the assistant uses the same human-readable formatting in replies.
- **Very long or empty chat input**: empty messages cannot be sent; input is capped at a
  reasonable length (2,000 characters) with a visible counter when near the limit.

## Requirements *(mandatory)*

### Functional Requirements

**Catalog management**

- **FR-001**: The dashboard MUST display every game in the catalog with its title, developer,
  genre, monthly revenue (USD), monthly downloads and average rating.
- **FR-002**: Operators MUST be able to add a game by supplying all six fields.
- **FR-003**: Operators MUST be able to edit any field of an existing game.
- **FR-004**: Operators MUST be able to delete a game, and MUST confirm before the deletion
  takes effect.
- **FR-005**: The system MUST validate game data on every create and update:
  title and developer are non-empty text of at most 100 characters; genre is non-empty text
  of at most 50 characters; monthly revenue is a number ≥ 0; monthly downloads is a whole
  number ≥ 0; average rating is a number from 0 to 5 inclusive with at most one decimal
  place. Violations MUST be reported per field.
- **FR-006**: Catalog changes MUST persist across page reloads and application restarts.
- **FR-007**: On first launch, when no data store exists yet, the system MUST create it and
  seed the catalog with at least 10 realistic games spanning several genres, developers,
  rating bands and revenue levels so that every example question has a meaningful answer.
  Seeding happens only at that moment: a catalog the operator has emptied MUST remain empty
  after a restart.
- **FR-008**: The dashboard MUST show a clear empty state when the catalog has no games.

**Programmatic access**

- **FR-009**: The system MUST expose the catalog over an HTTP interface supporting: list all
  games, get one game by identifier, create a game, update a game, delete a game.
- **FR-010**: Programmatic responses MUST use a structured, machine-readable format and
  conventional status codes for success, validation failure and not-found.
- **FR-011**: Validation errors returned programmatically MUST identify each offending field
  and the rule it broke, using the same rules as FR-005.

**AI assistant**

- **FR-012**: The chat view MUST let the operator send a plain-language question and receive
  a reply in the same view, with the conversation history visible above the input.
- **FR-013**: The assistant MUST answer catalog questions using the current catalog data at
  the moment of the question, so that edits made in the dashboard are reflected in the very
  next answer.
- **FR-014**: The assistant MUST obtain catalog facts by performing targeted lookups on
  demand (for example: find games matching a name, rank games by a metric, count games
  meeting a condition, fetch specific games for comparison). The complete catalog MUST NOT
  be handed to the assistant up front as part of the question.
- **FR-015**: The assistant MUST correctly answer, at minimum, these question types:
  (a) which game is highest or lowest on any of the three numeric metrics;
  (b) how many games satisfy a numeric threshold on any metric, or belong to a genre or
  developer; (c) a side-by-side comparison of two named games on a metric.
- **FR-016**: Assistant replies MUST appear progressively as they are generated; the
  operator MUST NOT have to wait for the full reply before seeing any text.
- **FR-017**: While a lookup is being performed, the chat view MUST indicate that a lookup
  is in progress and, once complete, what kind of lookup was performed.
- **FR-018**: The assistant MUST keep the context of the current conversation so follow-up
  questions can refer to earlier answers.
- **FR-019**: When asked about a game that does not exist, the assistant MUST say so and
  MUST NOT fabricate values.
- **FR-020**: When asked something unrelated to the catalog, the assistant MUST state that it
  only answers questions about the games catalog.
- **FR-021**: If the assistant cannot be reached or fails mid-reply, the chat view MUST show
  a plain-language error and allow the operator to retry, without affecting the dashboard.

**Navigation and presentation**

- **FR-022**: Operators MUST be able to switch between the dashboard view and the chat view
  from anywhere in the application in one action. *Superseded by
  [002-dashboard-chat-panel](../002-dashboard-chat-panel/spec.md): the chat moved onto the
  dashboard.*
- **FR-023**: Monetary values MUST be displayed as US dollars with thousands separators;
  download counts MUST use thousands separators; ratings MUST be shown to one decimal place.
- **FR-024**: The application MUST be usable on a laptop-sized screen without horizontal
  scrolling.

### Key Entities

- **Game**: one indie title tracked by the team. Attributes: identifier (system-assigned,
  stable), title, developer, genre, monthly revenue in USD, monthly downloads, average rating
  (0–5). A game is independent of all other games; there are no relationships between games.
- **Conversation**: the sequence of messages exchanged between the operator and the assistant
  during one visit to the chat view. Each message has a role (operator or assistant), text,
  and — for assistant messages — any catalog lookups performed while composing it.
  Conversations are not retained once the view is closed or reloaded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time operator can add a new game and see it in the list in under 60
  seconds without instructions.
- **SC-002**: On a scripted set of 10 questions covering the three required question types
  against the seeded catalog, the assistant gives the factually correct answer 10 out of 10
  times.
- **SC-003**: A first visible response to a question (a lookup indicator or the first words
  of the reply) appears within 3 seconds of sending it, and reply text is shown as it is
  generated rather than after the whole reply is complete.
- **SC-004**: A change made in the dashboard is reflected in the assistant's very next
  answer, with no restart or manual refresh.
- **SC-005**: Every invalid form submission is blocked and shows a field-level message;
  zero invalid records can be created through either the UI or the programmatic interface.
- **SC-006**: A reviewer can go from a fresh checkout to a running application with the
  seeded catalog in under 5 minutes using the documented steps, with no prerequisites beyond
  a standard JavaScript runtime and an AI provider key (no container runtime, no separate
  database server).
- **SC-007**: A catalog of 100 games is listed and fully rendered within 2 seconds of
  opening the dashboard.
- **SC-008**: A reviewer watching the chat can tell, for every answer, whether the assistant
  consulted the catalog and what it looked up.

## Assumptions

- **Single operator, trusted network**: the dashboard is an internal tool; there is no
  sign-in, no roles and no audit trail. Anyone who can reach it may read and modify data.
- **Small catalog**: the team tracks tens, not thousands, of games. The dashboard shows the
  whole list on one screen; pagination, search and column sorting are not required.
- **"Last month" means the stored monthly figure**: each game stores a single monthly
  revenue and download figure; there is no month-by-month history, so questions about
  "last month" are answered from those figures.
- **Genre is free text**: no fixed list of genres is enforced, so operators can introduce
  new genres without configuration.
- **Duplicate titles are allowed**: identity is the system-assigned identifier, not the
  title. The assistant disambiguates by asking when a name matches several games.
- **Conversation history is session-only**: reloading or leaving the chat view starts a
  fresh conversation. Persisting chat history is out of scope.
- **Data lives locally, single process**: the catalog is stored in a file on the machine
  running the application, inside the application process; there is no shared or hosted
  database, no separate database server and no container orchestration. The application
  starts with one install step and one run step.
- **Out of scope per the assessment brief**: authentication, deployment, production-grade
  error handling and comprehensive automated test coverage.
- **An AI provider is available**: the operator supplies credentials for a language-model
  provider that supports on-demand lookups and incremental replies; without them the chat
  view shows a configuration error and the rest of the application still works.
