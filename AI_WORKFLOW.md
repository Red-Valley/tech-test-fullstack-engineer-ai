# AI Workflow

How I used AI coding tools on this assessment. The raw record is in [`AI_LOG.md`](AI_LOG.md), in Spanish, and most prompts below are quoted as I wrote them, also in Spanish, with a translation.

## 1. Tools used and why

| Tool | Used for | Why |
|---|---|---|
| **Claude Code** (Opus 5.5) | Planning, implementation, reviews, QA, docs | It sees the whole repo, runs the gates itself, and supports subagents and git worktrees |
| **Claude in Chrome** | Checking the UI in a real browser | Tests can't see focus, layout at 375 px, or how streaming feels |
| **Project kit** (`CLAUDE.md`, `.claude/agents`, `.claude/skills`, `tasks/`) | Giving each agent the same rules and contract | Parallel agents could build against signatures without talking to each other |

## 2. Key prompts and outcomes

### Prompt 1: Provider design

> "Vamos a hacer con una open api key, y para el cliente del chat, recuerda usar un strategy pattern con factory para poder cambiar entre proveedores de api facilmente"
>
> *We'll use an OpenAI key, and for the chat client, remember to use a strategy pattern with a factory so API providers are easy to switch.*

**Outcome:** I rejected the first plan, which fixed Anthropic as the only provider. The result is `lib/ai/providers/`. It paid off later: when OpenAI had no credit, moving to Anthropic took an `.env` change. Making it the default was a small change, plus its tests and docs.

### Prompt 2: Chat track, sent by the coordinating agent to a subagent

> "Implementa el track B (chat con IA) de una prueba técnica: las tareas 05 y 06. [...] Antes de escribir código del AI SDK, lee las docs instaladas en `node_modules/ai/docs/` [...] El kit se escribió sin mirar las versiones instaladas: ya falló con Next 16.4 y MSW 3, y puede fallar aquí también. Ante cualquier duda, manda lo instalado."
>
> *Implement track B (AI chat): tasks 05 and 06. Before writing AI SDK code, read the installed docs. The kit was written without checking installed versions; it already failed with Next 16.4 and MSW 3, and may fail here too. When in doubt, what's installed wins.*

**Outcome:** The warning was added because of what failed in task 01, and it worked. The agent found that `toUIMessageStreamResponse()`, which the task told it to use, is deprecated in `ai` 7, and that `gpt-6-astra` rejects `temperature`, which a skill recommended. It also found that a blank `OPENAI_API_KEY=` only fails once the stream has started, so the factory treats a blank key as missing.

### Prompt 3: Data layer, sent by the coordinating agent to a subagent

> "`lib/games.ts` es un stub con los tipos y firmas del contrato: reemplázalo manteniendo exactamente esas firmas"
>
> *`lib/games.ts` is a stub with the contract's types and signatures: replace it, keeping those signatures exactly.*

The same brief included decisions already made: `strftime` timestamps, exclusive `minRating`, `COALESCE` in `getStats`, and escaping `%` and `_`.

**Outcome:** All 78 backend tests passed on the first run, and the two tracks merged with no conflicts. The agent also added cases nobody requested. For example, a blank title in `findGamesByTitles` would become `%%` and return the whole catalog.

### Prompt 4: Live testing and QA

> "Listo, ya cargue dinero en anthropic y cambie el ai provider , procede a las pruebas, documentemos los hallazgos , y programemos un nuevo task para resolverlos , corre de nuevo el qa engineer para evaluar toda la implementacion y continuar para cerrar las tareas pendientes"
>
> *Done, I funded Anthropic and changed the provider. Run the tests, document the findings, schedule a new task to fix them, run the QA engineer again over the whole implementation, and continue to close the pending tasks.*

**Outcome:** The numbers were right, but with 341 tests passing, real use still found 16 issues, now in [`tasks/09-qa-findings.md`](tasks/09-qa-findings.md). Examples: the answer arrived in one burst after a tool call, a double click on Send cancelled the question, and "Moss and Marrow" didn't match "Moss & Marrow".

### Prompt 5: Independent reviews

Each reviewer was told to verify findings in the code and not to edit anything.

**Outcome:** The reviews found real bugs that tests had missed, such as repeated Esc during a save closing the dialog and leaving the UI unusable (reproduced in Chrome) and `searchGames` truncating silently. I also chose not to apply some findings at that point, and recorded why in `AI_LOG.md`.

## 3. When the AI got it wrong

### The instruction that the model ignored

- **What happened:** To stop the chat from resuming a request the user had stopped, the AI added a rule to the system prompt.
- **How I detected it:** A live test with the real model: it answered both the stopped question and the new one.
- **How I fixed it:** `app/api/chat/route.ts` now removes any question that never got an answer before calling the model, with a regression test. The live result was then correct.
- **Lesson:** A prompt asks; code enforces. If behavior must hold, put it in code. I also recorded what remains: if a partial answer stays in the history, the model can still resume it.

### A fix that broke something else

- **What happened:** The double-click bug came from Stop appearing under the cursor where Send had been. The first idea, distinct React `key`s, would not have worked because the second click would still land on the new button. The second, ignoring Stop for 500 ms after sending, broke two existing tests, and rightly: a quick Stop is intentional.
- **How I detected it:** Reasoning through the first idea, then the existing test suite for the second.
- **How I fixed it:** The handler now checks `event.detail`, which identifies the second click of a double click without a timer.
- **Lesson:** Keep tests that describe user intent. They caught a fix that solved the reported symptom.

### Outdated instructions in the kit

- **What happened:** The kit gave instructions that no longer matched the installed versions. The Next 16.4 scaffold enables `cacheComponents`, which forbids the `runtime` export the tasks require, and a skill used MSW's `onUnhandledRequest`, which no longer exists.
- **How I detected it:** Reading `node_modules/next/dist/docs` for the first, and `tsc` for the second. Without that fix, a request with no handler would not have failed its test.
- **How I fixed it:** I disabled `cacheComponents` and moved to `onUnhandledFrame`, then updated the skill and `CLAUDE.md`.
- **Lesson:** Pin the versions and have agents read the installed docs. This became part of the later prompts (see Prompt 2).

### Others

- **Wrong diagnosis:** A glued sentence ("word.Found it") looked like a rendering bug. It came from my test script, which concatenated the text blocks. The UI already renders them separately.
- **Dangerous command:** During parallel work, an agent tried `pkill -f "next-server"`, which would also have killed the other track's server. The permission classifier blocked it, and the agent then used the PID and port instead.
- **Wrong identity:** Early commits used the wrong email. I asked for them to be corrected, and the history was rewritten with the tree verified identical.

## 4. Parallel agents, subagents, and worktrees

```text
Task 01 (contract and scaffold)
   ├─► worktree wt-crud  track/crud  tasks 02-04  subagent
   └─► worktree wt-chat  track/chat  tasks 05-06  subagent
                  │
  independent reviewer per track, merge, fixes (task 07)
                  │
  live tests + QA agent ─► task 09 ─► regression QA + code review
```

- **Contract first:** Task 01 committed the types and repository signatures in `tasks/00-OVERVIEW.md`, with `lib/games.ts` as a stub. The chat track built against it before the repository existed.
- **Isolation:** Each track had its own worktree, branch, port, and log file. The merge had no conflicts.
- **Independent checks:** QA and code review ran as separate agents with no edit rights, so the agent that wrote the code wasn't the one judging it.
- **What didn't go smoothly:** Both agents shared one Chrome, and one lost its tab group mid-run. I'd give each its own browser profile. The custom agents also weren't registered in the session, because Claude Code had started in the parent folder, so reviewers ran as general-purpose agents told to follow the `.claude/agents/*.md` files.

### Timeline

Times come from the `AI_LOG.md` entries.

| Time | Work | Who |
|---|---|---|
| 22:50 | Plan, gaps found in the kit, provider decision | Me + Claude Code |
| 23:05 | Task 01: scaffold and contract | Claude Code |
| 23:09 to 23:18 | Tasks 02-04 (CRUD) and 05-06 (chat) in parallel | 2 subagents in worktrees |
| 23:40 | Reviews, merge, fixes; first OpenAI call fails with no credit | 2 reviewers, 2 implementers |
| 00:22 | Live tests with Anthropic, full QA, task 09 written | Claude Code, QA agent, Chrome |
| 02:35 | Task 09 fixes validated live; regression QA, review, and docs | Claude Code, QA and review agents |

## Reflection

- **What worked best:** A written contract, then parallel tracks, then independent reviewers. Most of the human value went into decisions and into rejecting wrong assumptions, not into typing.
- **What tests couldn't catch:** 341 passing tests with a mock model said nothing about burst streaming or "and" vs "&". I would run a real model earlier, and check for provider credit before starting, not at the end.
- **What I'd delegate again:** Scaffolding, CRUD, test writing, and first-pass reviews.
- **What I wouldn't delegate:** Product decisions, accepting or rejecting findings, and judging whether an answer is actually right. Every figure the chat gave was checked against the database, not against the model's confidence.
- **What's still unproven:** OpenAI was never validated live. The README says so.
