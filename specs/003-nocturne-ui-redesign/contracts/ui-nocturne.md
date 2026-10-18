# Contract: Nocturne UI

**Visual source of truth**: `design/003/` handoff README §1–8, `nocturne-theme.css` and
screenshots. This contract lists the states and interactions the implementation must support,
with the handoff section for each. Pixel values are not repeated here.

## Screens and states

| # | State | Handoff | Screenshot |
|---|---|---|---|
| S1 | Default: catalog + Assistant rail with "Try asking" | §1–5 | 01-default |
| S2 | Lookup pending: outlined chip with spinner, streaming cursor | §5 | 02-chat-tool-pending |
| S3 | Answer done: rows highlighted, "N from last answer" tag, New chat | §3, §5, Highlighting | 03-answer-highlights-rows |
| S4 | Rail editor: Edit {title}, row selected | §6 | 04-edit-rail |
| S5 | Editor validation: accent border + warning line under the field | §6 | 05-edit-validation |
| S6 | Delete confirmation dialog | §7 | 06-delete-confirm |
| S7 | Filter empty state: "No games match" + Clear filters | §4 | 07-empty-filter |
| S8 | Catalog empty: "No games yet" + Add game | §4 | — |
| S9 | Toast: Added / Saved / Deleted {title}; "This game no longer exists." | §8 | — |
| S10 | Below 1280 px: "Ask AI" + drawer holding the rail (chat or editor) | §2 | — |

## Interactions

| Action | Result |
|---|---|
| Click a sort header | URL `sort`/`dir` updated ([url-state.md](url-state.md)); arrow shown on that column only |
| Type in search | URL `q` after 250 ms; count "N of M games"; conversation untouched |
| Pick a genre | URL `genre`; combines with `q` |
| Row ✎ / header "Add game" | Rail → editor (drawer opens below 1280 px); row selected when editing |
| Editor Save ok | Rail → chat; table refreshes with the URL view kept; toast |
| Editor Back / Cancel / Esc | Rail → chat; nothing saved |
| Row 🗑 / editor Delete | Dialog; confirm → removed, toast; editor closes if it showed that game |
| Answer completes with lookups | Rows highlighted; tag shows the count |
| Send a new question | Highlight cleared, then replaced by the new answer's references |
| Tag ✕ | Highlight cleared |
| New chat | Stops streaming; clears messages and highlight; suggestions return |
| Esc | Dialog → editor → drawer, one layer per press |

## Accessibility

- Focus ring on all controls: 2 px accent outline, 2 px offset.
- Icon buttons: `aria-label` = "Edit {title}", "Delete {title}", "Back to assistant",
  "Clear highlight", "Send", "Stop".
- Sort headers: `<th aria-sort>` containing a `<button>`.
- Highlighted row: hidden text "(mentioned in last answer)". Selected row:
  `aria-current="true"`.
- Toast: `role="status"`.
- Contrast: see research §7 (selected-row subline adjusted to 60%).
