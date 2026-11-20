@ARCHITECTURE.md

## Project memory

- Architecture decisions live in `ARCHITECTURE.md` (imported above) and are final. The phase plan lives in `docs/PLAN.md`; tick a step's checkbox in the commit that completes it, and add that commit's hash in the next commit (a commit can't contain its own hash).
- Every prompt I send is captured automatically in `docs/prompts-raw.md` by a hook. Never edit that file.
- Every prompt plus your text reply is captured automatically in `docs/conversation-log.md` by a Stop hook. Never edit that file either.

## AI_WORKFLOW.md: keep it current

`AI_WORKFLOW.md` is built while we work, not at the end. After each phase's prompts-log entry, update the sections that phase gives facts for (prompts, reviewer findings, mistakes, worktrees, timestamps). Rules:

- Use only facts that trace to `docs/prompts-log.md`, `docs/prompts-raw.md`, `docs/conversation-log.md`, `git log`, `.claude/`, `CLAUDE.md`, `ARCHITECTURE.md` or `evals/results/latest.md`.
- Replace a `[MISSING: …]` marker only when the source exists. Otherwise leave it.
- Reflections in §3 come from my "My call" notes. If they're still `_TODO (Cristian)_`, leave a `[MISSING]` marker; never write them for me.
- First person, plain, no marketing words.

## Prompts log: update it after every phase or meaningful task

When you finish a phase or any meaningful task, append an entry to `docs/prompts-log.md` using the template at the top of that file. Rules:

- **Prompt:** a short excerpt of what I actually asked, copied from `docs/prompts-raw.md`. Don't paraphrase it into something better.
- **What you did:** a few lines, plus the commit hash if there is one.
- **Issues:** anything that went wrong, including your own mistakes (wrong assumption, failing test, a fix that needed a second attempt). Be specific and honest; this log is graded material.
- **My call:** leave this as `_TODO (Cristian)_`. Only I fill it in. Never write my opinions or decisions for me.
- Never delete or rewrite earlier entries.

## Reviews

After each phase, before committing, run the `code-reviewer` subagent on the changes and note its main findings in that phase's log entry.
