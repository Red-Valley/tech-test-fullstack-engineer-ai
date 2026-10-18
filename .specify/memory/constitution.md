# Indie Games Dashboard Constitution

## Core Principles

### I. Time-Boxed, Requirement-Driven Scope

The assessment has a hard 2–3 hour limit. Every unit of work MUST trace to one of the four
stated requirements (Games CRUD, REST API, AI Chat with tool calling + streaming, Dashboard +
Chat UI) or to a mandatory deliverable (`AI_WORKFLOW.md`, README, PR description). Items the
brief declares out of scope — auth, deployment, production error handling, full test coverage —
MUST NOT be built. Any "nice to have" MUST be deferred and recorded as a trade-off in the PR.

Rationale: the evaluation rewards a complete, working slice over a polished partial one. Scope
discipline is the only way to finish all weighted areas inside the time box.

### II. Tool-Calling AI, Never Prompt-Stuffing (NON-NEGOTIABLE)

The chat assistant MUST answer catalog questions by invoking typed tools/functions that query
the data layer. The full catalog MUST NOT be serialised into the system or user prompt. Each
tool MUST have a narrow, documented purpose (e.g. list/filter games, aggregate a metric,
compare two games) and MUST return only the data needed to answer. Assistant responses MUST
stream token-by-token to the UI.

Rationale: tool use and streaming are explicit grading criteria; prompt-stuffing fails the
brief regardless of answer quality and does not scale past a toy dataset.

### III. Single Source of Truth for Catalog Data

The `Game` entity has exactly six fields — `title`, `developer`, `genre`,
`monthly_revenue_usd`, `monthly_downloads`, `average_rating` — plus a system-managed `id`.
All reads and writes (UI, REST routes, AI tools) MUST go through one shared data-access
module; no caller may touch storage directly. Input crossing the API boundary MUST be
validated against a shared schema so the UI, API, and AI tools agree on shape and types.

Rationale: one access layer keeps CRUD, API, and chat consistent and makes the AI tools
trivially correct by construction.

### IV. Simplicity and Readable Code

Use Next.js 14+ App Router with TypeScript (strict mode) and Tailwind CSS. Prefer the
smallest working abstraction: flat module layout, co-located components, no speculative
generalisation, no new dependency without a stated reason. Functions and files MUST be
small enough to read in one sitting; names MUST describe intent. Lint and type-check MUST
pass before a commit.

Rationale: code quality is 20% of the grade and reviewers read the diff cold; clarity beats
cleverness.

### V. Documented AI Workflow (NON-NEGOTIABLE)

`AI_WORKFLOW.md` MUST be maintained incrementally while working, not reconstructed at the
end. It MUST record: which AI tools were used and why; 3–5 concrete prompts with their
outcomes; at least one case where the AI was wrong and how it was corrected; and how parallel
agents, subagents, or worktrees were used, if at all. Spec Kit artifacts (spec, plan, tasks)
count as evidence of workflow and MUST be referenced from it.

Rationale: this file carries the single largest evaluation weight (30%); honest, specific
notes written in the moment are more credible than a retrospective summary.

## Technology & Scope Constraints

- **Framework**: Next.js 14+ (App Router), TypeScript, Tailwind CSS. No alternative frontend
  framework.
- **LLM layer**: any SDK/provider that supports tool calling and streaming (Anthropic SDK,
  Vercel AI SDK, OpenAI SDK, OpenRouter, LangChain/LangGraph). The chosen provider and model
  MUST be configurable via environment variables and documented in the README.
- **Storage**: local only — SQLite, JSON file, or in-memory. A seed dataset MUST be provided
  so the dashboard and chat are demonstrable immediately after `install && dev`.
- **Secrets**: API keys live in `.env.local` (git-ignored). An `.env.example` MUST list every
  required variable.
- **Out of scope** (MUST NOT be implemented): authentication/authorisation, deployment
  configuration, production-grade error handling, comprehensive test suites.

## Development Workflow & Submission

- Work happens on branch `submission/jorge-sandoval`, opened as a PR against `main`.
- Spec Kit flow is followed in order: constitution → specify → plan → tasks → implement.
  Each stage's output lives under `specs/` and is committed.
- Commits are small and scoped to one concern; messages use the imperative mood and state
  the "why" when it is not obvious.
- Before opening the PR, the following gates MUST pass:
  1. `lint` and `tsc --noEmit` succeed.
  2. Games CRUD, REST API, streaming chat, and tool calling are each demonstrated manually.
  3. `README.md` explains how to run locally in under five commands.
  4. `AI_WORKFLOW.md` satisfies all four required sections.
  5. The PR body follows `.github/PULL_REQUEST_TEMPLATE.md`: name, email, time spent, what
     was built, how to run, trade-offs, and the completed checklist.

## Governance

This constitution supersedes ad-hoc preferences for the duration of the assessment. Any
spec, plan, or task that conflicts with it MUST be revised or must document an explicit,
justified exception in its Complexity/Trade-offs section.

**Amendments**: edit this file, bump the version per the policy below, update the Sync
Impact Report, and commit with a message of the form
`docs: amend constitution to vX.Y.Z (<summary>)`.

**Versioning**: semantic. MAJOR for removing or redefining a principle; MINOR for adding a
principle/section or materially expanding guidance; PATCH for clarifications and wording.

**Compliance review**: `/speckit-plan` and `/speckit-analyze` check artifacts against these
principles; the pre-PR gates in Development Workflow are the final review.

**Version**: 1.0.0 | **Ratified**: 2026-10-17 | **Last Amended**: 2026-10-17
