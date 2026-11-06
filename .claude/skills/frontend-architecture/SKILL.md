---
name: frontend-architecture
description: Frontend architecture and React best practices for this Next.js 16 / React 19 / Tailwind v4 dashboard and chat — server vs client components, data fetching and mutations, component structure, state, forms, accessibility and UX states. Use when building or changing pages, components, layout, the dashboard or the chat UI.
---

# Frontend Architecture

## Principles
1. **Server first.** Pages are Server Components that read data directly from the repository (`lib/games.ts`) — no fetching your own API from the server. Add `'use client'` only on interactive leaves (table controls, forms, modal, chat).
2. **One source of truth per piece of state.** Server data → props from the server + `router.refresh()` after mutations. UI state (open modal, sort column, filter text) → local `useState`, or URL `searchParams` when it should survive reload/share.
3. **Derive, don't sync.** Sorted/filtered rows are computed with `useMemo` from props + UI state; never copy props into state and `useEffect`-sync them.
4. **Every view has four states:** loading, empty, error, success. Design them all.
5. **Accessible by construction:** semantic HTML first (`<table>`, `<button>`, `<label>`, `<dialog>`), ARIA only to fill gaps.

## Layout
```
app/
  layout.tsx            <html>, fonts, <Nav/> (active link via usePathname in a tiny client component)
  page.tsx              Dashboard (server): getStats() + listGames() → <StatsCards/> <GamesTable/>
  loading.tsx           skeleton
  error.tsx             client error boundary with retry
  chat/page.tsx         <Chat/> (client)
components/
  ui/                   Button, Input, Field (label+error), Modal, Spinner, EmptyState — tiny, styled once
  games/                StatsCards, GamesTable, GameFormModal, DeleteGameButton
  chat/                 Chat, MessageList, MessageBubble, ToolCallChip, SuggestedPrompts, ChatInput
lib/
  format.ts             formatUSD, formatNumber, formatRating (Intl, locale fixed to 'en-US' to avoid hydration mismatch)
  api-client.ts         typed fetch wrappers for /api/games returning { ok, data } | { ok:false, error }
```

## Mutations
- Client form → `api-client` → on success `router.refresh()` (inside `startTransition`) and close the modal; on 400 map `error.issues` to field errors; on other errors show a banner/toast.
- Prevent double submit (`isPending` disables the button). Confirm destructive actions.
- `useOptimistic` is a good fit for delete if time allows; keep it simple otherwise.
- Server Actions are a valid alternative, but the assessment explicitly asks for a REST API — use the API so the UI exercises it.

## Forms
- Controlled or `FormData`-based, but validate with the **same Zod schema** (`lib/schema.ts`) client-side for instant feedback; the server remains the authority.
- `<Field label error>` component wires `id`, `htmlFor`, `aria-invalid`, `aria-describedby`.
- Number inputs: `inputMode="decimal"`, `step`, `min`, `max`; coerce with Zod.

## Chat (AI SDK 7 `@ai-sdk/react` — verify in `node_modules/ai/docs`)
- `const { messages, sendMessage, status, stop, error, regenerate } = useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) })`. Input text is local state (the hook no longer owns it).
- Render `message.parts`: `text` → markdown; `tool-<name>` parts → `<ToolCallChip state input output/>` (states like input-streaming / input-available / output-available / output-error).
- Markdown via `react-markdown` + `remark-gfm` (tables). Do **not** enable raw HTML.
- Auto-scroll only if the user is near the bottom; `aria-live="polite"` on the message list; Enter sends, Shift+Enter newline; Stop while `status === 'streaming'`; retry on error.

## Styling (Tailwind v4)
- `@import "tailwindcss";` + `@theme { --color-brand-…; }` in `globals.css`. Design tokens there, not hard-coded hex values scattered in JSX.
- Consistent scale: spacing 4/6/8, radius `rounded-xl` for cards, one accent color, `tabular-nums` for numeric columns, right-align numbers.
- Visible focus (`focus-visible:ring-2`), contrast ≥ 4.5:1, dark mode optional.

## Performance hygiene
- React Compiler / memo: don't sprinkle `useMemo`/`useCallback` everywhere; use them for real derived computations.
- Keep client bundles small: no UI kits, import only what you use.
- Stable `key`s (game `id`, message `id`), never array index for dynamic lists.
