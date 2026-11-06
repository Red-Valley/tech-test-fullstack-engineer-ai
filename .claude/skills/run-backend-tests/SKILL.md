---
name: run-backend-tests
description: Set up (first time) and run the backend unit/integration test suite with Vitest — repository, route handlers, AI tools and chat route — then interpret failures. Use when you need to execute backend tests, verify a backend change, or debug a failing backend test.
---

# Run Backend Tests

## Run
```bash
npm run test:back                              # all backend tests, once
npx vitest run --project backend lib/games     # filter by path/name
npx vitest --project backend                   # watch mode while developing
npx vitest run --project backend --coverage    # coverage (needs @vitest/coverage-v8)
```
Always finish with `npm run typecheck` — Vitest strips types and won't catch type errors.

## One-time setup (skip if `vitest.config.mts` already exists)
```bash
npm i -D vitest @vitest/coverage-v8
```
`vitest.config.mts` (shared with the frontend project):
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)) },
  },
  test: {
    projects: [
      { extends: true, test: { name: 'backend', environment: 'node',
          include: ['lib/**/*.test.ts', 'app/api/**/*.test.ts'],
          env: { DATABASE_PATH: ':memory:', AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key', ANTHROPIC_API_KEY: 'test-key' } } },
      { extends: true, test: { name: 'frontend', environment: 'jsdom',
          include: ['components/**/*.test.tsx', 'app/**/*.test.tsx'],
          setupFiles: ['./test/setup-frontend.ts'] } },
    ],
  },
});
```
`test/server-only-stub.ts`: `export {};` (the real `server-only` package throws outside React Server Components).
`package.json` scripts:
```json
"test": "vitest run",
"test:back": "vitest run --project backend",
"test:front": "vitest run --project frontend",
"typecheck": "next typegen && tsc --noEmit"
```

## Reading results / common failures
| Symptom | Likely cause | Fix |
|---|---|---|
| `This module cannot be imported from a Client Component module` | `server-only` not aliased | Add the alias above |
| `Could not locate the bindings file` (better-sqlite3) | Native module built for another Node version | `npm rebuild better-sqlite3`; ensure Node 22+ in both shell and CI |
| Tests pass alone, fail together | Shared DB state | `beforeEach(resetDb)`; never rely on seed data in assertions — create what you assert |
| `Cannot find module '@/…'` | Path alias missing | `resolve.tsconfigPaths: true` in the Vitest config |
| `ERR_REQUIRE_ESM` with `ai` | AI SDK 7 is ESM-only | Keep config/test files as ESM TS; no `require` |
| Chat test hits network / needs key | Real provider used | Inject the mock model from `ai/test` (make `lib/ai/model.ts` overridable) |
| Flaky timestamps | Real clock | `vi.useFakeTimers(); vi.setSystemTime(...)` or assert `expect.any(String)` |

## Reporting
Report: command run, `X passed / Y failed / Z skipped`, and for each failure the test name, the assertion diff, and your diagnosis (code bug vs test bug). Never delete or `.skip` a failing test to get green — fix the cause or flag it.
