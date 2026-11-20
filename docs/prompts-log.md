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
