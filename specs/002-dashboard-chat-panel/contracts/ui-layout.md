# Contract: Home Page Layout & Chat Panel

**Scope**: The user-facing contract for `/` after this feature. The APIs (`/api/games*`,
`/api/chat`) are unchanged; see
[001 contracts](../../001-indie-games-dashboard/contracts/).

## Routes

| Path | Behaviour |
|---|---|
| `/` | Header (app name) · page title + "Add game" · catalog table · assistant |
| `/chat` | `307` redirect to `/#chat` (no page file) |

## Layout by viewport width

| Width | Table | Assistant | Controls |
|---|---|---|---|
| **≥ 1280 px** | left column, `minmax(0, 1fr)` | right column, 400 px, sticky under the header, full remaining viewport height; message list scrolls inside; always shown | none |
| **< 1280 px** | full width | off-screen drawer from the right (`max-w-md`, full height) over a dimmed backdrop | "Ask AI" button next to "Add game"; close (×) button in the drawer header |

Container: `max-w-[1440px]`, 24 px side padding, 24 px gap between columns. The page itself
never scrolls horizontally. Between 1024 and 1279 px the drawer layout gives the table the full width,
so all columns fit.

## Panel / drawer header

`Assistant` title · short helper text ("Answers come from live lookups…") · the close (×)
control on narrow screens only. The `ChatView` body (messages, suggestions, error banner, input) is unchanged
from 001, apart from filling the available height.

## Interactions

| Action | Result |
|---|---|
| Add / edit / delete a game | Table refreshes; conversation and any streaming reply are untouched |
| Ask AI → close → Ask AI (narrow) | Conversation intact; input focused on each open |
| Resize across 1280 px | Conversation intact; panel or drawer follows its own state |
| `Escape` with drawer open and no form dialog open | Drawer closes, focus returns to "Ask AI" |
| `Escape` with the add/edit form open | Only the form closes |
| Click on backdrop | Drawer closes |
| Load `/#chat` (or `/chat`) | Narrow: drawer opens and input is focused. Wide: input is focused. Hash removed from URL |

## Accessibility

- The drawer while open on narrow screens: `role="dialog"`, `aria-modal="true"`,
  `aria-label="Assistant"`. The panel on wide screens: a plain `<aside aria-label="Assistant">`.
- Toggle buttons have `aria-expanded` and `aria-controls` pointing at the panel id.
- The closed drawer is `inert`, so its contents can't be tabbed into while off-screen.
- The add/edit form `<dialog>` (top layer) always renders above the drawer.
