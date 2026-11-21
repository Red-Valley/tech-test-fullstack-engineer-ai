# Full Stack Engineer (AI) technical assessment

Candidate repository for a timed take-home: an internal dashboard for a catalog of indie games, plus an AI chat that answers questions about the catalog. `README.md` is the brief, with the requirements, stack, evaluation weights, and submission steps. Read it before planning work.

## Current state

No application exists yet. The tracked files are `README.md` (the brief), `.github/PULL_REQUEST_TEMPLATE.md` (the submission PR body), `.gitignore`, and these instruction files. There is no `package.json`, lockfile, task runner, test framework, or CI workflow. When the app is scaffolded, update this file with the layout, the package manager, and the verified commands.

## Requirements that are easy to miss

- The chat must query the catalog through tool calling. Never put the full catalog in the prompt.
- Chat responses must stream.
- The brief fixes the game fields: `title`, `developer`, `genre`, `monthly_revenue_usd`, `monthly_downloads`, `average_rating`.
- The brief fixes the stack: Next.js 14 or later with the App Router, TypeScript, and Tailwind CSS. Storage (SQLite, JSON, or in-memory) and the LLM layer are the candidate's choice.
- `AI_WORKFLOW.md` at the repository root is mandatory and carries 30% of the grade. It records how the candidate used AI coding tools: which tools and why, 3 to 5 real prompts with their outcomes, one moment the AI got it wrong and how it was fixed, and any use of parallel agents, subagents, or worktrees. Every entry must come from what actually happened. Never invent a prompt, an outcome, or an incident.
- README clarity is graded (10%). `README.md` currently holds the brief, so the submission must also explain how to run the app locally.
- Out of scope: auth, deployment, production error handling, and full test coverage. The time limit is 2 to 3 hours, so prefer the smallest implementation that meets each requirement.

## Scaffolding

Checked against the `create-next-app` 16.2.3 source:

- `create-next-app .` refuses to run at the repository root, because `README.md`, `.github/`, `AGENTS.md`, and `CLAUDE.md` are not on its list of allowed existing files.
- By default it writes `AGENTS.md` and `CLAUDE.md` and overwrites existing copies. Pass `--no-agents-md` when its output will be moved into this repository.

Scaffold into a temporary directory or a subdirectory, then merge its `.gitignore` with this one. From Next.js 16.4 (checked in 16.4.2), `next dev` inserts a managed `nextjs-agent-rules` block into an existing `AGENTS.md` and keeps the rest of the file. Commit that block with the work.

## Data and secrets

- `.gitignore` excludes `*.db`, `*.sqlite`, `*.sqlite3`, `.env`, `.env.local`, and `.env.*.local`. With SQLite, the database file is never committed, so a reviewer who clones the repository needs seed data that the code creates. `.env.example` is not ignored and can list the required variables.
- The LLM provider and its API key variable are not chosen yet. Never read or print `.env*` files. A chat run makes paid LLM calls, so run one only when asked.

## Commands

None exist yet. Typecheck, lint, test, and build are unavailable until a `package.json` exists. The package manager is not chosen, and `.gitignore` gives no signal (it lists npm, yarn, and pnpm debug logs).

## Verification

No deterministic checks exist yet. Behavioral acceptance comes from the brief: games CRUD works through the UI and the REST API, and the chat streams an answer, produced through tool calls, for each sample question in `README.md`.

## Submission

- Work goes on a branch named `submission/<your-name>`. The pull request targets `main` of the original assessment repository.
- `origin` is the candidate's copy. No `upstream` remote is configured, and the original repository's URL is not recorded locally.
- The PR body follows `.github/PULL_REQUEST_TEMPLATE.md`: name, email, time spent, what was built, how to run, trade-offs, and the requirement checklist. The candidate supplies the name, email, and time spent.

## Open decisions

- Whether the app lives at the repository root or in a subdirectory.
- The storage and the LLM layer.
- A sample question asks for revenue "last month", but each game has one `monthly_revenue_usd` value and no month dimension.
- Whether `README.md` replaces the brief or keeps it below the submission documentation.
