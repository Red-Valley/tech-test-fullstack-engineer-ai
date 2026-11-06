---
name: run-frontend-tests
description: Set up (first time) and run the frontend component test suite with Vitest + jsdom + React Testing Library + user-event + MSW, then interpret failures. Use when you need to execute frontend tests, verify a UI change, or debug a failing component test.
---

# Run Frontend Tests

## Run
```bash
npm run test:front                                      # all frontend tests, once
npx vitest run --project frontend components/games      # filter
npx vitest --project frontend                           # watch mode
npx vitest --project frontend --ui                      # browser UI (needs @vitest/ui)
```
Finish with `npm run typecheck` and `npm run lint`.

## One-time setup (skip if already done)
```bash
npm i -D vitest jsdom @vitejs/plugin-react \
  @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom msw
```
(RTL 16 needs `@testing-library/dom` as an explicit peer — a classic first-run failure.)
The `frontend` project is defined in `vitest.config.mts` (see `run-backend-tests` for the full file).

`test/setup-frontend.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));   // unmocked request = failing test (MSW 3 option name)
afterEach(() => { cleanup(); server.resetHandlers(); vi.clearAllMocks(); });
afterAll(() => server.close());

export const routerMock = { refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => routerMock, usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

// jsdom gaps
Element.prototype.scrollIntoView ??= vi.fn();
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true; };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false; };
```
`test/msw/server.ts`: `export const server = setupServer(...handlers);` with `handlers.ts` returning contract-shaped `Game[]` and error envelopes (`api-contract-patterns`).

## Common failures
| Symptom | Cause | Fix |
|---|---|---|
| `invariant expected app router to be mounted` | `next/navigation` not mocked | Mock in setup (above) |
| `TestingLibraryElementError: Unable to find role…` | Element not accessible, or async not awaited | Use `findBy…`; fix markup (label, role, name) rather than switching to testId |
| `act(...)` warnings | State update after test ended | `await` user events and `findBy`; don't leave pending promises |
| `[MSW] Cannot bypass a request` / unhandled request error | Missing handler | Add handler or `server.use()` in the test |
| `scrollIntoView is not a function` / dialog methods missing | jsdom gaps | Polyfills in setup |
| Intl output differs from expected | Locale/timezone | Fix locale `'en-US'` in `lib/format.ts`; set `TZ=UTC` in the test script if dates matter |
| `ReferenceError: TransformStream / TextEncoderStream` in chat tests | jsdom lacks web streams | Test chat rendering with static `UIMessage` data; mock `useChat` for interaction tests |

## Reporting
Command, `passed/failed/skipped`, each failure with test name + diff + diagnosis (code vs test). Never `.skip`/delete to get green.
