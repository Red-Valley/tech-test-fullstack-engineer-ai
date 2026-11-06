---
name: writing-quality-tests
description: How to write high-quality unit and integration tests for this project, backend (Vitest node — repository, route handlers, AI tools, chat route with a mock model) and frontend (Vitest + React Testing Library + user-event + MSW). Use when writing, reviewing or fixing tests. For executing suites use run-backend-tests / run-frontend-tests.
---

# Writing Quality Tests

## What "quality" means here
A good test **fails when behavior breaks and only then**. It reads like a spec, is deterministic, fast (<100 ms typical), and independent of other tests and of implementation details.

## Universal rules
- **Name = behavior:** `it('returns 404 when the game does not exist')`, not `it('works')`.
- **Arrange / Act / Assert**, one behavior per test (multiple `expect`s fine if they describe one outcome).
- **Test the contract, not the internals:** public functions, HTTP responses, what the user sees. No asserting private helpers or call order unless the call *is* the behavior.
- **Factories over fixtures:** `makeGameInput(overrides?)` in `test/factories.ts` with valid defaults; each test overrides only what matters.
- **Deterministic:** no real network, no real LLM, no `Date.now()`/random without control (`vi.useFakeTimers()`, injected values). No shared mutable state across tests.
- **Edge cases are the point:** boundaries (0, 5, 5.01, -1), empty, missing, duplicates, unicode/long strings, not-found, invalid types.
- **No snapshot spam.** Snapshots only for small, stable, intentional output.
- Prefer **fewer integration-style tests** at real seams (repository on a real in-memory SQLite, handler with a real `Request`) over many mock-heavy unit tests.
- Mock only at boundaries you don't own: LLM provider, network (MSW), time.

## Backend patterns (project `backend`, environment `node`)

**Repository against real SQLite in memory**
```ts
// lib/games.test.ts
beforeEach(() => resetDb());                    // DATABASE_PATH=':memory:' set in vitest config
it('sorts by revenue desc and limits', () => {
  createGame(makeGameInput({ title: 'Low', monthly_revenue_usd: 10 }));
  createGame(makeGameInput({ title: 'High', monthly_revenue_usd: 999 }));
  expect(listGames({ sortBy: 'monthly_revenue_usd', order: 'desc', limit: 1 }).map(g => g.title)).toEqual(['High']);
});
it('counts games rated strictly above 4', () => { /* 4.0 excluded, 4.1 included */ });
it('ignores a malicious sortBy (whitelist)', () => { /* expect no throw / default order */ });
```

**Route handlers — call the exported function**
```ts
import { POST } from '@/app/api/games/route';
const req = (body: unknown) => new Request('http://test/api/games', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
it('rejects rating > 5 with VALIDATION_ERROR and field issue', async () => {
  const res = await POST(req(makeGameInput({ average_rating: 7 })));
  expect(res.status).toBe(400);
  expect((await res.json()).error).toMatchObject({ code: 'VALIDATION_ERROR', issues: { average_rating: expect.any(Array) } });
});
// dynamic route: GET(req, { params: Promise.resolve({ id: '1' }) })
```

**AI tools — call `execute` directly** (they're plain functions over the repository): assert output shape, empty results note, `notFound` list, limit cap.

**Chat route — mock model, no network.** The AI SDK ships test utilities in `ai/test` (mock language model + stream simulation helpers; exact class names depend on the installed major — check `node_modules/ai/docs`). Assert: response streams, a tool call triggers the repository, catalog is **not** in the prompt (inspect the mock's received prompt).

## Frontend patterns (project `frontend`, environment `jsdom`)
- Query like a user, in priority: `getByRole` (with `name`) → `getByLabelText` → `getByText`. `getByTestId` only as last resort.
- Interact with `const user = userEvent.setup()`; `await user.type(…)`, `await user.click(…)`.
- Async UI: `await screen.findBy…` / `waitFor`; never arbitrary sleeps.
- Network via **MSW** handlers (`test/msw/handlers.ts`) returning contract-shaped responses, including 400 envelopes. Override per test with `server.use(...)`.
- Mock `next/navigation` (`useRouter`, `usePathname`) in setup; assert `refresh` was called after a successful mutation.
- Async Server Components aren't unit-testable with RTL — test their client children with props, and cover the page in manual/E2E QA.
- Chat UI: test `MessageList`/`ToolCallChip` rendering with hand-built `UIMessage` objects (text part, tool part in each state); test `Chat` sends on Enter and disables while streaming by mocking the transport or `useChat`.

Example:
```tsx
it('shows the server validation error next to the rating field', async () => {
  server.use(http.post('/api/games', () => HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'x', issues: { average_rating: ['Max is 5'] } } }, { status: 400 })));
  const user = userEvent.setup();
  render(<GameFormModal open onClose={vi.fn()} />);
  await user.type(screen.getByLabelText(/title/i), 'Test');
  // … fill others
  await user.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByText('Max is 5')).toBeInTheDocument();
  expect(screen.getByLabelText(/rating/i)).toHaveAttribute('aria-invalid', 'true');
});
```

## Minimum coverage per ticket (time-boxed assessment)
| Area | Must have |
|---|---|
| Repository | CRUD happy paths, filters, sort whitelist, stats with `> 4`, title fuzzy match, not-found |
| API | 201/200/204 happy paths, 400 validation envelope, 400 bad id/JSON, 404 |
| Tools | each tool: happy path + empty/not-found shape |
| Chat route | streams + calls a tool with mock model; missing key → 500 CONFIG_ERROR |
| Dashboard | renders rows formatted, empty state, create flow, validation error, delete confirm |
| Chat UI | suggested prompt sends, tool chip states, stop/disabled while streaming, error + retry |

## Self-review checklist
- [ ] Would this test fail if I broke the feature? (Try it mentally or actually.)
- [ ] Does the name describe the behavior and the condition?
- [ ] Any hidden dependency on order, time, network or another test?
- [ ] Did I cover at least one edge/negative case?
