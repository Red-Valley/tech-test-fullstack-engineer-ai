# AI workflow

How I used AI tools to build this project. This file is filled in phase by phase from [docs/prompts-log.md](docs/prompts-log.md), [docs/conversation-log.md](docs/conversation-log.md), `docs/prompts-raw.md` and `git log`. A `[MISSING: …]` marker means the history that would fill that part doesn't exist yet.

## 1. Tools and why

**Claude Code.** I used it to write the code, run commands and make commits. It works in the repo and can run the quality gates from `ARCHITECTURE.md` §8 (`lint`, `typecheck`, `test`) itself, so a phase isn't called done until they pass.

**Claude chat for planning.** [MISSING: whether I used Claude chat for planning; nothing in the logs shows it yet]

**`CLAUDE.md` as persistent context.** `CLAUDE.md` imports `ARCHITECTURE.md`, so every session starts with the stack, folder structure, layer rules and conventions already loaded. It also holds the working rules: log every meaningful task in `docs/prompts-log.md`, never write my "My call" notes for me, and run the reviewer before each phase's commit. I wrote the architecture decisions once instead of repeating them in every prompt.

**`code-reviewer` subagent** (`.claude/agents/code-reviewer.md`). A read-only reviewer that checks the diff for correctness, types, API status codes and Zod validation, the AI-tool rules (no full-catalog dumps, math in code, structured errors, prompt-injection awareness), streaming, `CLAUDE.md` conventions and missing tests. It reports findings ranked by severity, only ones it can point to in the code, and never edits. `CLAUDE.md` makes it a required step before every phase's commit, and its findings go into that phase's log entry.

**Logging hooks** (`.claude/settings.json`). A `UserPromptSubmit` hook (`log-prompt.mjs`) appends every prompt I send to `docs/prompts-raw.md`. A `Stop` hook (`log-conversation.mjs`) appends each prompt together with Claude's text reply to `docs/conversation-log.md`. Both always exit 0, so they can never block a prompt. They're there so this document is built from a record and not from memory. Capture started with commit `3df0f27`; earlier prompts (project setup and planning) were not recorded.

## 2. How I worked

The architecture was decided first in `ARCHITECTURE.md`, then turned into a commit-by-commit plan in [`docs/PLAN.md`](docs/PLAN.md). Each commit has a verification step (a test, a `curl`, or a browser check) that has to pass before it lands, on top of `lint`, `typecheck` and `test`. Each phase ends with a `code-reviewer` pass and a prompts-log entry.

- **Pre-build spike:** [MISSING: what the spike was, what it tested, and what it decided]
- **Review after each phase:** the `code-reviewer` subagent ran before each phase commit, and I fixed its findings before committing. Phase 0: the logging hook took harness messages as prompts, and worktree sessions would have written logs onto their own branches. Phase 1: the partial-update schema accepted an empty update, and the rating check let float noise through. Phase 2: `db:reset` deleted the DB file under a running dev server, and two fixture titles ("Shardfall", "Ashfall Run") were close enough to make the fuzzy-name eval ambiguous. Phase 3: the fuzzy title matcher confidently matched invented titles to real games ("Hexmarch 2" → Hexmarch, "the" → Bellwether), and comparing a game with itself reported a tie. [MISSING: later phases]
- **Evals as the check on the AI's output:** [MISSING: eval results from `evals/results/latest.md`]

## 3. Prompts

[MISSING: 4–5 prompts copied from `docs/prompts-raw.md`, covering architecture/planning, tool design, a failure, testing/evals and parallel work, each with its outcome and one line from my "My call" notes]

## 4. When the AI got it wrong

[MISSING: the clearest real case from the log: symptom, how it was caught, root cause, fix, commit hash]

## 5. Parallel work

Planned in `docs/PLAN.md`: worktrees `feat/ui` (`src/client/**`) and `feat/ai` (`src/server/ai/**`, `src/app/api/chat/**`) run at the same time after the API is done, merged `feat/ai` first.

[MISSING: what actually ran in parallel, how it was merged, what went wrong, and why I didn't use more agents]

## 6. Time

[MISSING: spike time and build time, from timestamps]

## 7. Full history

- [docs/prompts-log.md](docs/prompts-log.md): curated entries with outcomes, issues and my decisions.
- [docs/conversation-log.md](docs/conversation-log.md): every prompt and reply.
- `docs/prompts-raw.md`: every prompt, verbatim.
