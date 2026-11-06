# CLAUDE.md — Indie Games Dashboard + AI Chat

Always-on project rules. Detailed know-how lives in `.claude/skills/`, specialists live in `.claude/agents/`, work items live in `tasks/`.

## Project in one paragraph
Internal dashboard to CRUD a catalog of indie games (`title`, `developer`, `genre`, `monthly_revenue_usd`, `monthly_downloads`, `average_rating`) plus an AI chat that answers questions about the catalog **via tool calling** with **streamed** responses. Never put the catalog in the prompt. Time-boxed technical assessment (2–3 h): favor working, clean, well-documented software over breadth.

## Stack (verify installed versions in `package.json` before writing version-sensitive code)
| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js **22+** (24 LTS preferred) | AI SDK 7 requires Node ≥ 22 and is ESM-only |
| Framework | **Next.js 16** App Router, React 19, TypeScript `strict` | Turbopack default; `params`/`searchParams` are Promises; `next lint` is gone → use `eslint`; `cacheComponents` stays off because it forbids `runtime` exports |
| Styling | Tailwind CSS v4 | CSS-first config (`@import "tailwindcss"`, `@theme`) |
| Data | SQLite via `better-sqlite3` | `serverExternalPackages: ['better-sqlite3']`; `runtime = 'nodejs'` |
| Validation | Zod | Single source of truth for API bodies **and** tool inputs |
| LLM | Vercel AI SDK **7** (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) | OpenAI by default; strategy + factory in `lib/ai/providers/`, selected with `AI_PROVIDER`. Read `node_modules/ai/docs` for the installed major before coding |
| Tests | Vitest (projects: `backend` = node, `frontend` = jsdom), React Testing Library 16, user-event, MSW | See `run-*-tests` skills |

## Non-negotiables
1. The contract in `tasks/00-OVERVIEW.md` is the source of truth (types, repository signatures, endpoints). Change it only deliberately and update the doc in the same commit.
2. All SQL lives in `lib/games.ts`. Route handlers and AI tools call repository functions — never the DB.
3. Validate every external input with Zod at the boundary (HTTP body, query params, tool input).
4. No `any`, no non-null `!` on external data, no swallowed errors.
5. Secrets only in `.env.local`; keep `.env.example` updated.
6. Every task ends green: `npm run typecheck && npm run lint && npm test`.
7. **Log AI usage**: after every meaningful prompt, append an entry to `AI_LOG.md` (prompt, outcome, what you fixed). This feeds `AI_WORKFLOW.md` (30% of the grade).

## Commands
```bash
npm run dev            # http://localhost:3000 (DB auto-created + seeded in data/)
npm run typecheck      # next typegen && tsc --noEmit
npm run lint           # eslint .
npm run test:back      # vitest --project backend
npm run test:front     # vitest --project frontend
npm test               # both
```

## Team (subagents) and how work flows
| Agent | Owns | Primary skills |
|---|---|---|
| `backend-developer` | `lib/**`, `app/api/**`, DB, AI tools & chat route | backend-architecture, api-contract-patterns, bug-prevention, writing-quality-tests, run-backend-tests |
| `frontend-developer` | `app/**/page.tsx`, `components/**`, UX | frontend-architecture, api-contract-patterns, bug-prevention, writing-quality-tests, run-frontend-tests |
| `qa-engineer` | Verifying tickets against acceptance criteria, test gaps | qa-testing-playbook, writing-quality-tests, run-*-tests |
| `code-reviewer` | Final gate before merge/PR | bug-prevention, *-architecture, api-contract-patterns |

Ticket lifecycle: **implement** (dev agent, with tests) → **verify** (`qa-engineer` runs the QA playbook for the ticket) → **review** (`code-reviewer` on the diff) → fix → commit. Tracks A (tasks 02–04) and B (05–06) may run in parallel git worktrees after task 01.

Docs (README, AI_WORKFLOW.md, PR body) follow the `technical-documentation` skill.
