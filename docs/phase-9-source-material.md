# Phase 9 source material (working scratchpad)

Quick-reference summary of the strongest material for /AI_WORKFLOW.md, distilled from /docs/prompts-log.md and /docs/decisions-log.md. This file is a private working document; it will not be referenced by /README.md.

## Strongest "model got it wrong" candidate

The convertToModelMessages async incident in Phase 4. Full details:
- Phase: 4 (chat endpoint with tool calling)
- File affected: /app/api/chat/route.ts
- Symptom: smoke test POST returned 200; stream was empty; the onError callback logged "TypeError: messages.some is not a function"
- Root cause: convertToModelMessages became async in Vercel AI SDK v6 (was sync in v5 and earlier); the model wrote the sync form, matching older training data
- Fix: added `await` before convertToModelMessages(messages)
- Meta-detail: the onError callback was an addition from a CLAUDE.md gotcha registered earlier; without it the smoke test would have appeared to succeed
- Subsequent action: appended a new bullet to CLAUDE.md's Validated SDK Gotchas section so future sessions cannot repeat the mistake

## Strongest prompts to feature (4 recommended)

1. Phase Plan — second-round multi-agent review (or the curation that followed): demonstrates how the AI's own suggestions are not signal-pure; six agents produced 11 fixes of which only 4 were grounded. The lesson is that unbounded critique formats produce critique by construction.

2. Phase 4 — chat endpoint with tool calling: the most technically dense prompt in the project, with locked verbatim system prompt, four tools, empirical parts[] capture, provider switching, structured error returns. Shows that high-stakes prompts benefit from spelling everything out rather than relying on the model's defaults.

3. Phase 2 — repository layer with the slug rule example/literal conflict: a minor but illustrative example where Claude Code chose example-fidelity over rule-literal-fidelity for the slug "Don't Starve!". Recorded in decisions-log; shows that judgment calls below the architectural threshold can still warrant logging when they affect primary keys.

4. Phase 6 — chat UI with empirical parts[] typing: demonstrates the "code against evidence, not against documentation" principle. The parts[] discriminator shape was captured live during Phase 4 smoke testing and pasted into decisions-log; Phase 6's strict types were derived from that captured JSON.

## Workflow strategy notes

Two-channel split (planning in this Claude chat, execution in Claude Code terminal). Phased development with verification gates. Bitácora: prompts-log.md captures every meaningful prompt; decisions-log.md captures only decisions meeting three criteria (real alternative considered, articulable trade-off, non-local impact). Option B for bitácora writes after Phase 1 calibration confirmed Claude Code could apply the threshold correctly. Multi-agent orchestration rejected after second-round review demonstrated it produces critique-by-construction.

## Tools used

- Claude Code (in terminal): all code generation, file writes, npm script execution, lint/build verification, smoke test execution.
- Claude (this chat session, planning channel): prompt design, plan validation, design discussions, mid-phase audits.
- Both running Claude Sonnet 4.5.
- CLAUDE.md (~5 KB of project context) loaded automatically at each Claude Code session.

## What was deliberately NOT used

- Multi-agent parallel orchestration: rejected as inappropriate for the scope (3-hour budget, single-developer scale).
- Cursor, GitHub Copilot, or other competing IDEs: Claude Code was sufficient.
- shadcn AI Elements: scope expansion not warranted; standard primitives covered the chat UI.
