# AI Workflow

How I used AI coding tools on this assessment. The raw record is in [`AI_LOG.md`](AI_LOG.md). Most prompts below are quoted as written, in Spanish, with a translation.

I worked hands-on from before 22:50 until 00:20, then left the agents running unattended and reviewed the result in the morning. Where the work happened overnight, this document says the agent did it.

## 1. Tools used and why

| Tool | Used for | Why |
|---|---|---|
| **Claude Code** (Opus 5.5) | Planning, implementation, reviews, QA, docs | It sees the whole repo, runs the gates itself, and supports subagents and git worktrees |
| **Claude Cowork** | Analyzing the project before coding, breaking it into tasks, and creating the agents and skills | To have the plan and the specialists ready before writing code |
| **Google Stitch** | Creating the UI design that the final redesign is based on | To start the redesign from a complete visual design instead of having the coding agent invent one |
| **Claude in Chrome** | Checking the UI in a real browser | Tests can't see focus, layout at 375 px, or how streaming feels |
| **Project kit** (`CLAUDE.md`, `.claude/agents`, `.claude/skills`, `tasks/`) | Giving each agent the same rules and contract | Parallel agents could build against signatures without talking to each other |

## 2. Key prompts and outcomes

### Prompt 1: Analysis, task breakdown, agents, and skills (Claude Cowork)

> " Ayudame a analizar este proyecto y todo lo que deb o hacer y como hacerlo https://github.com/Red-Valley/tech-test-fullstack-engineer-ai"
>
> "Bueno, vamos a hacer un task break down parte por parte para lograr completar esta prueba, ayudame a crear md files que van a hacer las tareas para completar por el equipo de desarollo [...]"
>
> "te parece si preparamos un par de agentes skills para trabajar en este proyecto? [...] vamos a tener un backend developer experto en next js [...] un frontend developer [...] un qa engineer apto para testear la implementaciones un code reviewer capaz de evaluar el codigo antes de despacharlo [...]"
>
> *Help me analyze this project, everything I have to do, and how. Then: let's do a task breakdown, part by part; help me create md files with the tasks for the development team. Then: shall we prepare some agents and skills to work faster? A backend developer, a frontend developer, a QA engineer, and a code reviewer, plus skills for API contracts, QA, bug prevention, writing tests, running tests, architecture, and technical docs.*

**Outcome:** This produced `tasks/` and the 4 agents and 9 skills in `.claude/`. The tasks gave the later parallel work a shared plan. Their weak spot was that they were written without checking installed versions (see section 3).

### Prompt 2: Provider design

> "Vamos a hacer con una open api key, y para el cliente del chat, recuerda usar un strategy pattern con factory para poder cambiar entre proveedores de api facilmente"
>
> *We'll use an OpenAI key, and for the chat client, remember to use a strategy pattern with a factory so API providers are easy to switch.*

**Outcome:** I rejected the first plan, which fixed Anthropic as the only provider. The result is `lib/ai/providers/`. It paid off later: when OpenAI had no credit, moving to Anthropic took an `.env` change. Making it the default was a small change, plus its tests and docs.

### Prompt 3: Chat track, sent by the coordinating agent to a subagent

> "Implementa el track B (chat con IA) de una prueba técnica: las tareas 05 y 06. [...] Antes de escribir código del AI SDK, lee las docs instaladas en `node_modules/ai/docs/` [...] El kit se escribió sin mirar las versiones instaladas: ya falló con Next 16.4 y MSW 3, y puede fallar aquí también. Ante cualquier duda, manda lo instalado."
>
> *Implement track B (AI chat): tasks 05 and 06. Before writing AI SDK code, read the installed docs. The kit was written without checking installed versions; it already failed with Next 16.4 and MSW 3, and may fail here too. When in doubt, what's installed wins.*

**Outcome:** The warning was added because of what failed in task 01, and it worked. The agent found that `toUIMessageStreamResponse()`, which the task told it to use, is deprecated in `ai` 7, and that `gpt-6-astra` rejects `temperature`, which a skill recommended. It also found that a blank `OPENAI_API_KEY=` only fails once the stream has started, so the factory treats a blank key as missing.

### Prompt 4: Data layer, sent by the coordinating agent to a subagent

> "`lib/games.ts` es un stub con los tipos y firmas del contrato: reemplázalo manteniendo exactamente esas firmas"
>
> *`lib/games.ts` is a stub with the contract's types and signatures: replace it, keeping those signatures exactly.*

The same brief included decisions already made: `strftime` timestamps, exclusive `minRating`, `COALESCE` in `getStats`, and escaping `%` and `_`.

**Outcome:** All 78 backend tests passed on the first run, and the two tracks merged with no conflicts. The agent also added cases nobody requested. For example, a blank title in `findGamesByTitles` would become `%%` and return the whole catalog.

### Prompt 5: Live testing and QA

> "Listo, ya cargue dinero en anthropic y cambie el ai provider , procede a las pruebas, documentemos los hallazgos , y programemos un nuevo task para resolverlos , corre de nuevo el qa engineer para evaluar toda la implementacion y continuar para cerrar las tareas pendientes"
>
> *Done, I funded Anthropic and changed the provider. Run the tests, document the findings, schedule a new task to fix them, run the QA engineer again over the whole implementation, and continue to close the pending tasks.*

**Outcome:** The numbers were right, but with 341 tests passing, real use still found 16 issues, now in [`tasks/09-qa-findings.md`](tasks/09-qa-findings.md). Examples: the answer arrived in one burst after a tool call, a double click on Send cancelled the question, and "Moss and Marrow" didn't match "Moss & Marrow".

## 3. When the AI got it wrong

### The instruction that the model ignored

- **What happened:** To stop the chat from resuming a request the user had stopped, the AI added a rule to the system prompt.
- **How it was detected:** The agent ran a live test with the real model, which answered both the stopped question and the new one.
- **How it was fixed:** The agent's first fix deleted unanswered questions in `app/api/chat/route.ts`. It passed live, but the independent code review showed that it broke follow-ups: after a stop, "try again" reached the model with no context. It also missed a stop after a tool finished. The route now closes those turns with a `[No answer: …]` marker, with a regression test per state. Live, the stopped request isn't resumed, and "try again" still works.
- **Lesson:** A prompt asks; code enforces. If behavior must hold, put it in code, then have someone else try to break it. What remains is documented: if a partial answer stays in the history, the model can still resume it.

### The Send and Stop button

- **What happened:** A double click on Send cancelled the question, because Stop appeared under the cursor. The AI rejected distinct React `key`s, reasoning that the second click would still land on the new button. Its next fix, ignoring Stop for 500 ms after sending, broke two existing tests, and rightly: a quick Stop is intentional. Checking `event.detail` fixed that symptom.
- **What it missed:** The rejected `key`s were needed for a worse bug. One click on Stop with a draft in the box sent the draft. React reused the same `<button>` node, which became `type="submit"` during the click, so Chrome submitted the form.
- **How it was detected:** The agent scripted a click in real Chrome while verifying a smaller review finding, then logged the real `click` and `submit` events. Its first regression test passed with or without the fix, because jsdom doesn't reproduce the browser's timing, so it replaced that test with one that checks the cause: Stop and Send must be different DOM nodes.
- **Lesson:** Keep tests that describe user intent, and run a new test against the unfixed code. A passing test proves nothing until you have seen it fail.

### Outdated instructions in the kit

- **What happened:** The kit, whose tasks and skills I created with Claude Cowork before coding, gave instructions that no longer matched the installed versions. The Next 16.4 scaffold enables `cacheComponents`, which forbids the `runtime` export the tasks require, and a skill used MSW's `onUnhandledRequest`, which no longer exists.
- **How it was detected:** The agent read `node_modules/next/dist/docs` for the first, and `tsc` for the second. Without that fix, a request with no handler would not have failed its test.
- **How it was fixed:** The agent disabled `cacheComponents` and moved to `onUnhandledFrame`, then updated the skill and `CLAUDE.md`.
- **Lesson:** Pin the versions and have agents read the installed docs. This became part of the later prompts (see Prompt 3).

### Others

- **Wrong diagnosis:** A glued sentence ("word.Found it") looked like a rendering bug. It came from the agent's test script, which concatenated the text blocks. The UI already renders them separately.
- **Dangerous command:** During parallel work, an agent tried `pkill -f "next-server"`, which would also have killed the other track's server. The permission classifier blocked it, and the agent then used the PID and port instead.
- **Redesign regressions:** With 381 tests passing, the new fixed header could hide the focused control on Shift+Tab, and one long genre shrank the search box until typed text was invisible. Independent QA found both in a real browser. Code review found that a `key` on the chat input erased typed text, and that removing the Ask AI wiring broke no test. Each is fixed, and the wiring now has tests that fail without it.
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
- **Independent checks:** QA and code review ran as separate agents with no edit rights, so the agent that wrote the code wasn't the one judging it. The first reviews found bugs that tests had missed, such as repeated Esc during a save closing the dialog and leaving the UI unusable (reproduced in Chrome), and `searchGames` truncating silently.
- **Unattended overnight run:** The agents continued from the approved plan after I stopped. The plan's stop rule held: the PR stayed unopened until I confirmed it in the morning.
- **What didn't go smoothly:** Both agents shared one Chrome, and one lost its tab group mid-run. I'd give each its own browser profile. The custom agents also weren't registered in the session, because Claude Code had started in the parent folder, so reviewers ran as general-purpose agents told to follow the `.claude/agents/*.md` files.

### Timeline

Times come from the `AI_LOG.md` entries. I stopped at 00:20, so everything after that ran unattended until the morning review.

| Time | Work | Who |
|---|---|---|
| Before 22:50 | Project analysis, task breakdown, agents and skills | Me + Claude Cowork |
| 22:50 | Plan, gaps found in the kit, provider decision | Me + Claude Code |
| 23:05 | Task 01: scaffold and contract | Claude Code |
| 23:09 to 23:18 | Tasks 02-04 (CRUD) and 05-06 (chat) in parallel | 2 subagents in worktrees |
| 23:40 | Reviews, merge, fixes; first OpenAI call fails with no credit | 2 reviewers, 2 implementers |
| About 00:20 | Live tests with Anthropic, full QA, task 09 written | Claude Code, QA agent, Chrome (unattended from 00:20) |
| 02:35 | Task 09 fixes validated live; regression QA, review, and docs | Claude Code, QA and review agents (unattended) |
| Morning | Reviewed the result, added the Cowork history, confirmed the PR, translated the log, analyzed the hydration error (dev agent, then QA and code review) | Me + Claude Code, dev, QA, and review agents |
| Morning, after that | UI design in Google Stitch, redesign from it, then independent QA and code review | Me + Google Stitch, Claude Code, QA and review agents |

## Reflection

- **What worked best:** A written contract, then parallel tracks, then independent reviewers. Most of the human value went into decisions and into rejecting wrong assumptions, not into typing.
- **What tests couldn't catch:** 341 passing tests with a mock model said nothing about burst streaming or "and" vs "&". I would run a real model earlier, and check for provider credit before starting, not at the end.
- **What the agents missed:** The Stop draft bug got through the frontend tests, the reviews, and the QA runs. None of them clicked Stop with text in the box in a real browser.
- **What I'd delegate again:** Scaffolding, CRUD, test writing, and first-pass reviews.
- **What I wouldn't delegate:** Product decisions, or the final call on what gets submitted. Overnight, the agent decided which findings to accept and judged the answers itself, comparing the chat's figures against the database. That worked here, but it needs a morning review, and I can't claim I checked each decision as it happened.
- **What unattended work needs:** An approved plan, a clear stop rule for anything outward-facing, and a written log to review afterward. Without `AI_LOG.md` and `tasks/09-qa-findings.md`, I couldn't have reconstructed the night's decisions.
- **What's still unproven:** OpenAI was never validated live. The README says so.
