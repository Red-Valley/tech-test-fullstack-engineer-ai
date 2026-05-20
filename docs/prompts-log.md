# Prompts Log (private working document)

Raw record of meaningful prompts sent to Claude Code during this assessment.
Not part of the final deliverable. Used to source examples for AI_WORKFLOW.md.

---

## [Phase 0] Pre-flight cleanup
**Date:** 2026-05-20
**Tool:** Claude Code
**Prompt:** Audit and cleanup before feature work begins. Concretely: (1) verify AGENTS.md is empty or redundant and delete it; (2) audit .gitignore to include .env, .env.local, node_modules, .next, and .claude/; (3) append two new sections to CLAUDE.md — "Development Phases" listing the 10 phases of the project, and "Code Quality Rules" with explicit constraints (typed returns, business logic outside route handlers, Zod for all external input, no `any`, named exports, files under 200 lines, English-only, no console.log in production paths); (4) initialize /docs/decisions-log.md with three Phase 0 entries (tooling consolidation, phased development, Next.js version pinned to 16.2.6 LTS); (5) append a placeholder Phase 0 entry to /docs/prompts-log.md. Do not commit; report git status at the end.
**Outcome:** Executed in a single pass. Claude Code completed all five tasks and returned a structured report with five additional observations worth auditing manually. Three of those observations led to a follow-up cleanup prompt: (a) .env.example was being silently ignored by .gitignore due to the broader .env* rule; (b) AGENTS.md was not empty — it contained a Next.js 16 drift warning worth preserving in CLAUDE.md; (c) /docs/.gitkeep became redundant once real content was added to the docs/ directory. Two observations did not require action: AGENTS.md not appearing as "deleted" in git status was a no-op because it was generated post-commit by create-next-app and was never tracked; and the .env.example confusion was resolved by the .gitignore fix.
**Notes:** Reinforces the value of always reading Claude Code's full output, not just the success indicator. The .env.example bug would have shipped a broken README otherwise. Took the opportunity to fold the Next.js 16 warning from AGENTS.md into CLAUDE.md so future Claude Code sessions have it in context.

## [Phase 0] Cleanup follow-up
**Date:** 2026-05-20
**Tool:** Claude Code
**Prompt:** Three small fixes after the Phase 0 audit: (1) add `!.env.example` to .gitignore after the `.env*` rule so the template file is committable; (2) append a "Notes for AI Coding Tools" section to CLAUDE.md preserving the Next.js 16 warning that was in AGENTS.md, plus a parallel note about Vercel AI SDK v6 conventions (inputSchema not parameters, toUIMessageStreamResponse not toDataStreamResponse, useChat from @ai-sdk/react with parts[] messages); (3) delete /docs/.gitkeep now that the directory has real content. Verify .env.example is no longer ignored with git check-ignore -v.
**Outcome:** All three fixes applied in a single pass. .env.example now appears under Untracked files in git status, confirming the negation rule works. The "Notes for AI Coding Tools" section was appended to CLAUDE.md verbatim. /docs/.gitkeep was deleted. Claude Code also flagged a precision error in the original brief: I had instructed it to verify with `git check-ignore -v .env.example` and expect empty output, but `-v` reports the last matching rule even when that rule is a negation, so the command correctly returned `.gitignore:35:!.env.example`. The authoritative confirmation is the file's presence under Untracked, not empty output from check-ignore -v.
**Notes:** Captured the `git check-ignore` distinction in decisions-log as a process lesson — it's the kind of tool-detail that empirical Git use can miss. Reinforces the value of reading Claude Code's full reasoning, not just the success flag: a less attentive workflow would have accepted the verification as failed and triggered an unnecessary rollback.

## [Phase Plan] Plan materialization and validation
**Date:** 2026-05-20
**Tool:** Claude Code
**Prompt:** Three-task instruction in sequence: (1) create /docs/plan.md with the full professional plan in English (context, stack, 11 phases with goals/deliverables/acceptance criteria, bitácora conventions, out of scope); (2) update /CLAUDE.md replacing the embedded phase list with a short index pointing to plan.md, appending two new subsections under Code Quality Rules — Bitácora Conventions and Validated SDK Gotchas; (3) restricted plan validation in three categories — future technical risks, internal inconsistencies, omitted decisions — maximum 4 items per category, 2-4 lines each.
**Outcome:** All three tasks completed cleanly. plan.md created (180 lines). CLAUDE.md modified in two sections only as instructed. Validation returned 10 observations (4 risks, 2 inconsistencies, 4 omitted decisions) — 7 incorporated into the plan and 1 explicitly rejected after analysis. The most valuable observations were A.2 (parts[] discriminator shape needs empirical verification before Fase 6) and A.3 (Zod failures inside tool execute must be caught to avoid stream death) — both modify Phase 4 deliverables. The discarded observation was the JSON write-race mutex: the chat tools are read-only by design, so the race surface does not actually exist.
**Decisions logged:** Plan materialization strategy; Read-only chat tools rule
**Notes:** Confirmed the meta-pattern from earlier — Claude Code's independent review produces real signal when scoped to specific categories. Unscoped opinions earlier tended toward generic optimization suggestions; the scoped format (risks/inconsistencies/omissions) returned actionable items only.

## [Phase Plan] Design discussion — CRUD scope and parts[] verification strategy
**Date:** 2026-05-20
**Tool:** Claude (planning conversation, separate from Claude Code)
**Prompt:** Working through the validation findings from Claude Code, two items required deeper analysis before incorporation: (a) whether confining chat tools to read-only contradicts the assessment's CRUD requirement, and (b) what is the best technical solution for the parts[] discriminator shape uncertainty in Vercel AI SDK v6.
**Outcome:** Resolved both. (a) The CRUD requirement is fulfilled by the dashboard UI and REST API; the chat tool inventory is a separate design choice and is evaluated under tool-calling capability, not CRUD. Documented in decisions-log as "CRUD scope: writes from dashboard only". (b) Selected a hybrid approach: empirical capture of the parts[] shape during Phase 4 smoke test, then strict typing in Phase 6 based on the captured evidence. Documented in decisions-log as "Empirical verification of parts[] discriminator shape".
**Decisions logged:** CRUD scope: writes from dashboard only, reads from chat; Empirical verification of parts[] discriminator shape
**Notes:** This entry captures a planning conversation, not a Claude Code execution. The two-channel workflow (planning with Claude in chat, execution with Claude Code in terminal) is deliberate: the chat channel surfaces alternatives and produces written decisions before any code is generated, which in turn keeps Claude Code prompts narrow and unambiguous. Worth highlighting in AI_WORKFLOW.md.

## [Phase Plan] Second-round plan review and curation
**Date:** 2026-05-20
**Tool:** Claude Code (multi-agent debate format) + Claude (planning conversation)
**Prompt:** Open-ended request to spawn 6 senior agents in two teams (Team A reviews current plan, Team B designs an independent plan from scratch against the rubric), then synthesize the debate and surface conflicts. Goal: stress-test the plan before committing to execution.
**Outcome:** 6 agents produced ~80k tokens of analysis, converging on 5 strong items, opening 4 debates, listing 8 new SDK gotchas, and producing an 11-item prioritized fix list. After meta-review with Claude (planning conversation), curated down to 4 actionable fixes: lock Phase 4 system prompt, add atomic-write to Phase 2, align aggregateGames.filters shape, add 4 validated SDK v6 gotchas to CLAUDE.md. The remaining 7 fixes were classified as production-grade-but-out-of-scope (1), redundant with applied decisions (2), genuine-but-minor (2), or false positives (4 — driven by the multi-agent format's incentive to produce critique).
**Decisions logged:** Bounded scope of AI-assisted plan review; Atomic write for JSON persistence
**Notes:** Important meta-lesson worth surfacing in AI_WORKFLOW.md: unbounded multi-agent critique formats produce critique by construction. The first plan review (scoped to 3 categories, 4 items per category) returned 70% incorporation rate; the second review (unbounded, debate format) returned 36% incorporation rate at 10x the token cost. The right unit of AI review for this scale is targeted, not exhaustive. After this turn, the plan is locked and execution begins.

## [Phase 0.5] Plan lock: four targeted adjustments
**Date:** 2026-05-20
**Tool:** Claude Code (fresh context post-rewind)
**Prompt:** Apply four locked adjustments to /docs/plan.md and /CLAUDE.md, derived from the curated subset of the second-round review: (1) lock the Phase 4 system prompt verbatim as a deliverable, (2) add atomic-write semantics to Phase 2 repository write operations, (3) align aggregateGames.filters input shape with queryGames.filters for consistency, (4) append four validated v6 SDK gotchas to CLAUDE.md (sendMessage pattern, onError callback, four tool-part states, toolCallId as React key). Plan is locked after this turn; no further plan review.
**Outcome:** [TO FILL after execution]
**Decisions logged:** none (the four fixes implement decisions already logged in earlier entries; this turn is execution of those decisions, not new decisions)
**Notes:** First Claude Code invocation in fresh context after /rewind. Acts as validation that the post-rewind context is clean: the prompt references the locked plan in repo, not the discarded multi-agent debate output.