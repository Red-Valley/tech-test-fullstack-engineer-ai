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
