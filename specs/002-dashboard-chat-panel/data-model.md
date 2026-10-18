# Data Model: Dashboard Chat Panel

**Date**: 2026-10-17 | **Plan**: [plan.md](plan.md)

No persisted data changes. The `Game` entity, the REST API and the chat API are exactly as in
[001 data-model](../001-indie-games-dashboard/data-model.md).

## UI state (client only, never persisted)

| State | Owner | Type | Default | Changes when | Survives |
|---|---|---|---|---|---|
| Conversation | `ChatView` (`useChat`) | `ChatMessage[]` | `[]` | user sends; reply streams | table edits, drawer open/close, resize. **Lost on reload** |
| `drawerOpen` | `ChatPanel` | `boolean` | `false` (drawer closed) | "Ask AI", close button, Escape, backdrop click, `#chat` on load | everything except reload |

### State transitions: drawer (< 1280 px)

```
closed ──(Ask AI | load with #chat)──► open ──(close | Esc | backdrop)──► closed
  focus: on open → chat input        on close → "Ask AI" button
```

### Panel (≥ 1280 px)

Always shown; no state. (A Hide/Show toggle was built and then removed after review, because
it shifted the layout; see the spec's post-implementation clarification.)

Resizing never changes the drawer state, so crossing the 1280 px breakpoint never remounts
the conversation.
