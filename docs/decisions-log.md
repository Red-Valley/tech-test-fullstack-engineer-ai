# Decisions Log (private working document)

Chronological record of meaningful technical and process decisions made during this assessment. Each entry captures the decision, the alternatives considered, and the rationale. This file is NOT part of the final deliverable; it is the source material that will be distilled into README.md and AI_WORKFLOW.md at the end.

---

## [Phase 0] Tooling consolidation: CLAUDE.md as single source of AI context
**Decision:** Use CLAUDE.md as the single project-context file for AI coding tools. Remove AGENTS.md.
**Alternatives considered:** Keep both (CLAUDE.md + AGENTS.md), or migrate to AGENTS.md only.
**Rationale:** The assessment explicitly mentions Claude Code as a tool option, and the project is being built primarily with Claude Code. A single context file avoids divergence and matches Claude Code's native convention. AGENTS.md is more useful in multi-tool environments; not relevant here.

## [Phase 0] Phased development with verification gates
**Decision:** Build the project in 10 discrete phases, each with explicit acceptance criteria and a dedicated commit. Avoid parallel agents or multi-agent orchestration.
**Alternatives considered:** Single end-to-end prompt to Claude Code generating the full project; parallel subagents per feature; worktree-based concurrent development.
**Rationale:** The project scope (CRUD + chat with 4 tools, ~2-3h budget) does not justify the coordination overhead of multi-agent orchestration. Phased execution with verification gates between phases produces auditable output, makes failures isolatable, and yields cleaner commit history. Multi-agent patterns are appropriate at larger scale; using them here would be cargo-cult sophistication.

## [Phase 0] Next.js version: stay on 16.2.6 LTS
**Decision:** Keep the Next.js version installed by the scaffolding (16.2.6 LTS).
**Alternatives considered:** Downgrade to 15.x maintenance LTS.
**Rationale:** 16.2.6 is the current Active LTS line (released May 7, 2026, with two weeks of patch circulation). The ecosystem (Vercel AI SDK v6, Tailwind v4) targets this line. Downgrading would buy no stability and would force documentation gymnastics later.

## [Phase 0] AI context preservation strategy
**Decision:** Preserve provider-specific or version-specific warnings inside CLAUDE.md rather than scattering them across multiple files.
**Alternatives considered:** Keep auxiliary files like AGENTS.md alongside CLAUDE.md as separate notes; or rely on ad-hoc reminders inside individual prompts during each phase.
**Rationale:** A single, in-repo context file that Claude Code loads automatically at every session is more reliable than re-stating constraints in each prompt. Phase 0 surfaced one concrete instance — a Next.js 16 training-data drift warning originally placed in AGENTS.md — and we folded it into a "Notes for AI Coding Tools" section in CLAUDE.md. The same section now also documents Vercel AI SDK v6 conventions (inputSchema, toUIMessageStreamResponse, useChat parts[]) to prevent the model from generating code patterns based on older SDK versions.

## [Phase 0] .env.example committable as template
**Decision:** Override the default .env* ignore rule to allow .env.example into the repository.
**Alternatives considered:** Rename the template to env.example or env.sample (avoiding the dotfile prefix and thus the ignore rule); or document the variables only in the README without a template file.
**Rationale:** .env.example is the convention reviewers expect. A `cp .env.example .env.local` instruction in the README is the standard onboarding pattern, and it fails silently if the template is gitignored. Adding `!.env.example` to .gitignore (after the broader .env* rule) is the canonical fix and signals familiarity with the convention.

## [Phase 0] Verification semantics for ignored files
**Decision:** Use `git check-ignore <path>` (without -v) or `git status` to verify that a file is no longer being ignored, rather than `git check-ignore -v <path>` with an expectation of empty output.
**Alternatives considered:** Trust the -v output as a binary signal (ignored vs not ignored).
**Rationale:** `git check-ignore -v` reports the last matching pattern even when that pattern is a negation rule (`!.env.example`). Empty output only occurs when no pattern matches the path at all. For a file un-ignored by a negation, the correct verification is exit code 1 from `git check-ignore <path>` without -v, or the file's appearance under Untracked in `git status`. This distinction matters when authoring or auditing prompts that include verification steps for AI coding tools — imprecise instructions waste tool turns on phantom failures.

## [Phase Plan] Plan materialization in /docs/plan.md
**Decision:** Materialize the full project plan as /docs/plan.md and reduce CLAUDE.md's phase section to a short index pointing to it.
**Alternatives considered:** Keep the entire plan inline inside CLAUDE.md (one file, everything in one place); or keep the plan only in the planning conversation without committing it to the repo.
**Rationale:** Two distinct readers need two distinct levels of detail. CLAUDE.md is loaded automatically at every Claude Code session and benefits from being short and scannable. The plan itself benefits from being a standalone artifact that the human reviewer can read independently of any AI context. Splitting the documents matches their access patterns and avoids the file growing unbounded.
**Consequence:** Future Claude Code sessions read both files: CLAUDE.md for conventions and quick orientation, plan.md for the authoritative phase specification. The reviewer can read plan.md to understand project intent without parsing AI-tool configuration.

## [Phase Plan] Chat tools are read-only over the catalog
**Decision:** All four chat tools (listGames, queryGames, getGameByTitle, aggregateGames) are read-only. The chat does not mutate the catalog.
**Alternatives considered:** Add write tools (createGame, updateGame, deleteGame) callable from the chat, so the user could say "add a new game with these fields" or "delete Cuphead".
**Rationale:** Write tools triple the surface area (auth implications, undo semantics, concurrency with dashboard writes) for a feature the assessment does not require. The README questions are all read-only ("which game made the most revenue", "how many rated above 4", "compare A vs B"). Keeping writes confined to the dashboard CRUD eliminates the JSON concurrency risk between the two write paths.
**Consequence:** The chat is a read interface over the catalog; the dashboard is the only write surface. Documented explicitly in plan.md and reflected in the tool inventory of Phase 4.

## [Phase Plan] CRUD scope: writes from dashboard only, reads from chat
**Decision:** Implement the full CRUD operations (create, read, update, delete) but expose writes only through the dashboard UI and the REST API. The chat is a read-only consumer of the catalog via four read tools.
**Alternatives considered:** (a) Expose write operations to the chat as additional tools (e.g., createGameTool, updateGameTool, deleteGameTool) so users could mutate the catalog conversationally. (b) Restrict the catalog itself to read-only and skip the write side of the CRUD entirely — but this would fail assessment requirement #1 ("Games CRUD").
**Rationale:** The assessment explicitly requires CRUD (requirement #1), so we build all four operations. It does not require CRUD via chat — the listed chat questions are all read-only ("which game made the most revenue", "how many rated above 4", "compare A vs B"). Confining writes to one surface (dashboard) eliminates concurrency between two write paths, avoids the need for undo semantics or authentication around destructive chat commands, and keeps the chat focused on the capability actually being evaluated: tool calling with streamed structured data. The reviewer sees CRUD demonstrated where it belongs (UI and API) and tool calling demonstrated where it belongs (chat with read tools that compose to answer questions).
**Consequence:** Dashboard UI in Phase 5 has Create / Edit / Delete actions wired to POST / PATCH / DELETE endpoints. Chat tools in Phase 4 never call createGame, updateGame, or deleteGame from the repository. The README Trade-offs section explicitly states this design choice and its rationale.

## [Phase Plan] Empirical verification of parts[] discriminator shape
**Decision:** Verify the actual shape of message.parts[] emitted by the installed Vercel AI SDK v6 version with a temporary diagnostic log during Phase 4 smoke testing, then base the Phase 6 badge-rendering types on the captured evidence rather than on assumed documentation.
**Alternatives considered:** (a) Defensive rendering with `any` types and multiple fallback branches covering known SDK shape variants. (b) Trust the documented shape and write strict types upfront; accept the risk of silent rendering failure if the installed SDK differs. (c) Empirical capture once, then strict types informed by evidence.
**Rationale:** Vercel AI SDK has changed the parts[] discriminator format across minor versions. Documentation lags. The defensive-any approach would violate the project's no-any rule and produce verbose code. The trust-the-docs approach risks Phase 6 shipping with silently broken tool-call badges, which would invisibly tank the UX evaluation since the reviewer would see a chat that answers correctly but never displays that tools were called. The empirical approach costs one extra console.log line in Phase 4 and yields strict typing in Phase 6, against the actually installed SDK behavior.
**Consequence:** Phase 4 smoke test includes a one-shot diagnostic log of JSON.stringify(message.parts, null, 2). The captured output is pasted into this decisions-log as evidence before Phase 6 begins. Phase 6 defines part types as a discriminated union in /lib/chat/parts.ts based on the observed shape, with type guards. No `any` types used.