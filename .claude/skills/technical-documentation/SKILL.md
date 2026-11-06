---
name: technical-documentation
description: How to write this project's technical docs — README, AI_WORKFLOW.md, AI_LOG.md entries, PR description, code comments and ADR-style decision notes — clear, accurate, skimmable and evaluator-friendly. Use when creating or updating any documentation, the PR body, or summarizing AI tool usage.
---

# Technical Documentation

README (10%) and AI_WORKFLOW.md (30%) are 40% of the grade. Treat docs as a product.

## Principles
1. **Reader first.** Evaluator with 10 minutes: what is it, how do I run it, does it meet the requirements, what were the trade-offs.
2. **Runnable and verified.** Every command copy-pastes and works on a clean clone. Run them before writing them down.
3. **Specific over generic.** Real prompts, real numbers (time, test counts), real file paths. "Used AI to speed things up" scores nothing.
4. **Skimmable.** Short sections, tables, code blocks, one idea per paragraph. Lead with the answer.
5. **Honest.** State limitations and what the AI got wrong. Credibility is the grade.
6. **Docs-as-code.** Docs change in the same commit as the behavior they describe.
Write docs in English (repo language). Keep tone neutral and concise; no marketing adjectives.

## README.md structure
1. Title + one-sentence description + screenshot/GIF (dashboard + chat streaming with tool chip).
2. **Quick start** — prerequisites (Node 22+, an API key) and ≤3 commands; say the DB auto-seeds.
3. **Features** checklist mapped to the assessment requirements.
4. **Architecture** — small diagram (Mermaid or ASCII) of UI → route handlers / chat route → repository → SQLite; LLM ⇄ tools.
5. **API reference** — endpoint table + error envelope + 2–3 curl examples.
6. **AI chat** — tool table (name, input, purpose), why tools instead of prompt-stuffing, example questions.
7. **Testing** — commands + what's covered.
8. **Trade-offs & assumptions** — "last month" interpretation, `> 4`, SQLite, no pagination/auth, PUT as partial update, money as float.
9. **With more time** — 3–5 concrete items.
10. Project structure (short tree) + link to `AI_WORKFLOW.md`, `tasks/`, `.claude/`.

## AI_LOG.md entry (write during work, 1–2 min each)
```markdown
## [21:40] Task 05 — chat tools
- Tool/agent: Claude Code → backend-developer subagent (worktree wt-chat)
- Prompt: "<verbatim>"
- Outcome: ✅/⚠️/❌ + one line
- Fix/lesson: <what you changed and why>
```

## AI_WORKFLOW.md — answer the 4 required questions explicitly, with headings that mirror them
1. **Tools and why** — e.g. Claude Code (repo-wide context, subagents, skills, worktrees); any other tool and its role.
2. **3–5 concrete prompts and outcomes** — verbatim prompt in a quote block, outcome, what you kept/changed. Cover: contract/scaffold, data layer, chat tools, a QA or review prompt.
3. **When the AI got it wrong** — context → symptom (error message) → how detected (tsc/test/QA agent) → fix → lesson/prevention (e.g. added to `bug-prevention` skill).
4. **Parallel agents / subagents / worktrees** — the setup (`.claude/agents`, `.claude/skills`, `CLAUDE.md`), how tracks A/B ran in worktrees, how QA and reviewer agents gated each ticket, merge/conflict story, what you'd change.
Add a short **timeline** table (task, start–end, agent) and a **reflection** (what to delegate to AI vs not).

## PR description
Fill `.github/PULL_REQUEST_TEMPLATE.md` fully: name, email, **real time spent**, what I built (bullets + GIF), how to run (same commands as README), trade-offs (bullets), checklist ticked only for what truly works. Keep it shorter than the README; link to it.

## Code comments & decisions
- Comment the **why**, not the what. Good: `// strict > per assessment wording "rated above 4"`.
- TSDoc on exported repository functions and tool definitions (inputs, outputs, edge cases).
- Significant decisions → 3-line note in README trade-offs (Context · Decision · Consequence).

## Final checklist
- [ ] Clean clone + README commands work
- [ ] Every requirement visibly addressed
- [ ] AI_WORKFLOW has 4 headed sections with real prompts and a real failure
- [ ] Screenshots current; no secrets in examples
- [ ] Spelling and broken links checked
