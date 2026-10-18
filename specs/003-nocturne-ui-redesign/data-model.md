# Data Model: Nocturne UI Redesign

**Date**: 2026-10-17 | **Plan**: [plan.md](plan.md)

Persisted data is unchanged (`Game`, see
[001 data-model](../001-indie-games-dashboard/data-model.md)). The entries below are a URL
value object, client UI state, and one new read-only repository query.

## CatalogView (URL state)

| Field | Type | Default | Valid values | Invalid → |
|---|---|---|---|---|
| `q` | string | `""` | trimmed, ≤ 100 chars | truncated to 100 |
| `genre` | string | `""` (all) | any string; matched case-insensitively against existing genres | no match → empty result (shows the "No games match" state) |
| `sort` | `SortKey` | `"revenue"` | `title` · `revenue` · `downloads` · `rating` | default |
| `dir` | `"asc"` \| `"desc"` | per sort key: `title` → asc, numeric → desc | `asc` · `desc` | default for the key |

Serialization omits fields equal to their default, so `/` is the default view. Grammar:
[contracts/url-state.md](contracts/url-state.md).

`SortKey` → column: `title` → `title`, `revenue` → `monthly_revenue_usd`, `downloads` →
`monthly_downloads`, `rating` → `average_rating`. Ties break by `title` asc.

## Repository additions (read-only)

| Function | Returns | Notes |
|---|---|---|
| `queryCatalog(view)` | `Game[]` | `LIKE %q%` (escaped, case-insensitive) on title OR developer; `lower(genre) = lower(?)`; ORDER BY mapped column + `title` |
| `listGenres()` | `string[]` | distinct genres, A–Z, case-insensitive order |
| `maxRevenue()` | `number` | over the whole catalog (bars don't change with filters); `0` when empty |

`countGames()` (001) provides the "of M" total.

## Client UI state (never persisted)

| State | Owner | Type | Default | Notes |
|---|---|---|---|---|
| `rail` | `DashboardShell` | `{ mode: "chat" } \| { mode: "create" } \| { mode: "edit", game: Game }` | chat | Editing another row replaces `game` (form resets) |
| `drawerOpen` | `DashboardShell` | boolean | false | Below 1280 px; `openEditor` also opens it |
| `highlightIds` | `DashboardShell` | `number[]` | `[]` | Set from `onReferences`; cleared on send, New chat, tag ✕; ids removed on delete |
| `pendingDelete` | `DashboardShell` | `{ id, title } \| null` | null | Drives the one shared `DeleteDialog` |
| `toast` | `DashboardShell` | `{ id, message } \| null` | null | The newest replaces the current one; auto-clear after 2.6 s |
| editor `values`, `errors`, `formError`, `saving` | `GameEditor` | as 001 `GameForm` | from game or empty | Errors clear per field on change |
| search draft | `CatalogToolbar` | string | `view.q` | Pushed to the URL after 250 ms idle |
| conversation | `ChatView` (`useChat`) | messages | [] | New chat = `stop()` then `setMessages([])` |

### Rail transitions

```
chat ──(row Edit | header Add)──► edit/create ──(Back | Cancel | Esc | Save ok)──► chat
edit(A) ──(row Edit B)──► edit(B)            delete ok of shown game ──► chat
```

## Highlight derivation

`referencedGameIds(message)` returns the ids from the tool outputs (research §5). The shell
holds them, and the table intersects them with the visible rows. The tag count uses the full
set (spec US4.4).
