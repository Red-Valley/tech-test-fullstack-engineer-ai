# Prompts log

Curated log of meaningful prompts, written as the work happens. The raw, complete list is in `docs/prompts-raw.md`.

## Template

```markdown
### <date time> · Phase <N>: <short title> (commit <hash>)
**Tool / session:** Claude Code, main | worktree feat/ui | subagent code-reviewer | Claude chat
**Prompt (excerpt):** "<what I actually asked>"
**What Claude did:** <2–4 lines>
**Issues:** <what went wrong, or "none">
**Review:** <main code-reviewer findings, or "not run">
**My call:** <what I accepted, rejected or changed, and why>
```

---

## Entries

### 2026-11-19 19:09 · Phase 0: workflow capture (C0.1, not committed yet)
**Tool / session:** Claude Code, main + subagent code-reviewer
**Prompt (excerpt):** "Ok lets do this, and start the ai log" (not in `docs/prompts-raw.md`: the prompt hook wasn't installed yet when I sent it; it is the first entry in `docs/conversation-log.md`)
**What Claude did:** Copied the kit's `.claude/` (prompt hook, settings, `code-reviewer` agent) into the repo. Added a Stop hook (`log-conversation.mjs`) that logs each prompt with Claude's text reply to `docs/conversation-log.md`, and a shared `common.mjs`. Created the `AI_WORKFLOW.md` skeleton (§1 filled from repo files, the rest `[MISSING]`). Added rules to `CLAUDE.md` for keeping `AI_WORKFLOW.md` current, and pointed it at the root `PLAN.md`.
**Issues:**
- Claude said the hooks would only work after a session restart. Wrong: Claude Code picked up the new `settings.json` immediately, so both hooks were live mid-session.
- First draft of `AI_WORKFLOW.md` §1 had two claims not backed by the sources ("inside VS Code", and a reason for the reviewer that Claude made up). Claude caught both and reworded them before the review.
- The Stop hook's first version would take harness messages (task notifications, interrupts) as prompts, and could log the same turn twice. The reviewer found it; fixed with stricter detection and a last-logged-prompt id stored in `.git/`.
- Hooks used relative paths and wrote into the session's cwd, so a worktree session would log into its own branch and conflict on merge. Fixed: absolute `$CLAUDE_PROJECT_DIR` paths, and logs always go to the main checkout.
- The prompt hook logged the code-reviewer's hand-back as if Cristian had sent it, because the harness delivers it through `UserPromptSubmit`. That bogus entry is in `docs/prompts-raw.md` (00:06:40); it was left there because that file must never be edited. Fixed for the future: both hooks now skip `<agent-message`/`<task-notification>` messages.
- Known gap: text Claude writes in a turn triggered by a background task (not by Cristian) isn't logged, to avoid duplicates.
**Review:** needs changes → fixed: (1) harness messages taken as prompts and duplicate turns, (2) relative hook paths and worktree logs conflicting on merge, (3) `CLAUDE.md` says `PLAN.md` is at the root while `ARCHITECTURE.md` §3/§11 say `docs/PLAN.md` (**open, needs Cristian's decision**), plus nits (git timeout, image-only prompts, a commit can't hold its own hash) that were fixed. Lint, typecheck and test clean.
**My call:** _TODO (Cristian)_

### 2026-11-19 19:13 · Phase 0: plan moved to docs/, C0.1 verified (C0.1 commit)
**Tool / session:** Claude Code, main
**Prompt (excerpt):** "lets move the plan to docs"
**What Claude did:** Moved `PLAN.md` to `docs/PLAN.md` so it matches ARCHITECTURE.md §3/§11 (this resolves the open reviewer finding in the entry above), and updated the links in `CLAUDE.md`, `AI_WORKFLOW.md` and the plan itself. Used this prompt as the C0.1 live check: both hooks captured it. Ticked C0.1 in the plan.
**Issues:**
- The live check showed the prompt hook storing the IDE's `<ide_opened_file>` tag with the prompt (the Stop hook already stripped it). Fixed by moving the cleanup into `common.mjs` and using it in both hooks. The 00:11:37 entry in `docs/prompts-raw.md` still has the tag (that file is never edited).
- "Ok lets do this, and start the ai log" appears twice in `docs/conversation-log.md`: once from the first hook version (before de-duplication existed) and once from the fixed version. A one-time leftover, left in place because the file is append-only.
- Claude's first re-test of the prompt hook seemed to show it writing nothing. The cause was shell quoting in the test command, not the hook; it passed when re-run with proper JSON input.
**Review:** not re-run (small follow-up to the reviewed C0.1 changes); lint, typecheck, test and format:check clean.
**My call:** _TODO (Cristian)_

### 2026-11-19 19:16 · Phase 0: CI workflow (C0.2 commit)
**Tool / session:** Claude Code, main
**Prompt (excerpt):** "lets commit"
**What Claude did:** Added `.github/workflows/ci.yml` (install → format:check → lint → typecheck → test → build) and `.nvmrc` pinning Node 22. Ran the same steps locally in order (all pass) and checked that the lockfile matches what's installed, so `npm ci` won't fail. Recorded C0.1's hash (`3df0f27`) in `docs/PLAN.md` and `AI_WORKFLOW.md`.
**Issues:** The repo has no GitHub remote yet, so the plan's "Actions run is green" check can't be done until it's pushed.
**Review:** not run (config-only commit; the Phase 0 review was done on C0.1).
**My call:** _TODO (Cristian)_

### 2026-11-19 19:20 · Phase 1: shared contract (C1.1 + C1.2, not committed yet)
**Tool / session:** Claude Code, main + subagent code-reviewer
**Prompt (excerpt):** "The change is too small lets go to the next step and commit two steps at the time"
**What Claude did:** C1.1: turned off `cacheComponents` and `partialPrefetching` in `next.config.ts`. A temporary `runtime = 'nodejs'` route proved the build accepts it, and it was then deleted. C1.2: genre list, Zod schemas (`gameInputSchema`, `gameSchema`, `gameUpdateSchema`), DTO types matching §5.2, and 24 schema tests. Renamed `vitest.config.ts` to `.mts` to clear a Vite deprecation warning. Saved "two plan steps per commit" as a standing preference.
**Issues:**
- `partialPrefetching` couldn't stay on: the Next docs say it requires `cacheComponents` and fails config validation without it. Found by reading the bundled docs before editing.
- The temporary probe route left generated types in `.next/`, so `npm run typecheck` failed after it was deleted. Claude's mistake in the test setup; a rebuild cleared it.
**Review:** ready to merge, no blockers. Fixed: (1) `gameUpdateSchema` accepted `{ title: undefined }` as a non-empty update; (2) the rating tolerance let float noise through (`0.1 + 0.2` stored as `0.30000000000000004`), so it now rounds to one decimal; (3) tests only covered `title`, not `developer`, plus NaN/Infinity and unknown-key cases. Carried forward: PUT must validate with `gameInputSchema` (full replacement per §5.2), not the partial `gameUpdateSchema` (Phase 3); genre matching is case-sensitive, so the AI tool schemas must list the exact values (Phase 6).
**My call:** _TODO (Cristian)_

### 2026-11-19 19:22 · Phase 1: correction, two-step commits were one-off
**Tool / session:** Claude Code, main
**Prompt (excerpt):** "I just deleted the memory.md file since I dont want to do 2 steps every time, just this once"
**What Claude did:** Deleted the leftover memory file and removed the "two plan steps per commit" line from `docs/PLAN.md`. Bundling C1.1 + C1.2 applies to this commit only; later commits go back to one plan step each.
**Issues:** Claude read "commit two steps at the time" as a standing rule and saved it to memory and the plan. Cristian meant it for this commit only. The entry above says it was saved as a standing preference; that is no longer true.
**Review:** not run (no code change).
**My call:** _TODO (Cristian)_

### 2026-11-19 19:30 · Phase 2: SQLite client + repository (C2.1, not committed yet; Phase 1 committed as 1c390b4)
**Tool / session:** Claude Code, main
**Prompt (excerpt):** "lets commit"
**What Claude did:** Committed Phase 1 (`1c390b4`), then built C2.1: `server/db/schema.sql` (UNIQUE COLLATE NOCASE title, CHECK constraints), `server/db/client.ts` (`DB_PATH`, creates the table if missing, one connection kept across `next dev` reloads), `server/http/errors.ts`, and `server/repositories/games.repository.ts` (one static prepared statement per sort/order pair, all filters bound, LIKE wildcards escaped). 16 repository tests on an in-memory DB (40 total). Smoke-tested on a real file through `tsx` with a custom `DB_PATH`.
**Issues:**
- Running the seed and eval scripts needs a TypeScript runner that understands the `@/` alias. Claude had quietly added `tsx` once during setup and removed it because it isn't in the approved stack. This time it asked first, and Cristian approved adding `tsx` as a dev dependency.
- Claude's plan had the seed (C2.1) before the repository (C2.2). That would have forced the seed to run its own SQL, against ARCHITECTURE.md ("the only code that runs SQL"). Claude swapped the two steps in `docs/PLAN.md` and moved `errors.ts` from C3.1 into C2.1 because the repository throws `ConflictError`.
**Review:** not run yet; it runs at the end of Phase 2, after C2.2.
**My call:** _TODO (Cristian)_
