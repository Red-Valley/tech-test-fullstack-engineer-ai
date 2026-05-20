# AI Workflow

This document explains how I used AI coding tools during this technical assessment. It is the deliverable for criterion 1 of the evaluation rubric (30%).

## 1. Tooling

I used two AI tools across planning and development.

**Claude Code (terminal)** handled execution of the plan: it generated code, wrote files, ran npm scripts, executed smoke tests, and verified lint and build between phases. It operated against the local repository with full access to the project filesystem.

**Claude in chat** handled planning: I used it to discuss design decisions before any code was generated and to audit Claude Code's outputs after each phase. Decisions that emerged from those conversations were written down in `/docs/decisions-log.md` before being handed off to Claude Code.

Both instances ran Claude Opus 4.7.

Persistent project context lived in `/CLAUDE.md`, a root-level file that Claude Code loads automatically at the start of every session. It contained the code conventions, the bitácora rules, and a "Validated SDK Gotchas" section that grew with each gotcha I uncovered along the way.

What I deliberately did not use: multi-agent orchestration. Claude Code proposed it during one of the plan-review rounds; I rejected it after concluding that the pattern produces critique by construction — each agent justifies its turn by generating objections — and the coordination overhead is not warranted at this project's scale. The decision is recorded in `decisions-log` as "Bounded scope of AI-assisted plan review".

## 2. Workflow Strategy

### Phased development with verification gates

I split the project into 10 discrete, verifiable phases, each with explicit acceptance criteria and a single focused commit. The phases ran sequentially: pre-flight cleanup, data layer, REST API, chat endpoint, dashboard UI, chat UI, UX polish, README, AI_WORKFLOW.md, PR submission.

The reason for not doing single-shot generation is that the assessment evaluates code quality, not just functionality. A 3-hour single prompt produces something that compiles and runs, but it loses control over intermediate decisions and leaves the reviewer with no way to read the project's history. The resulting commit log in this flow tells the construction phase by phase: the reviewer can read each commit's diff and reconstruct what was decided when.

Between phases I ran mechanical verification gates: lint clean, build passes, smoke tests return exit 0, and manual curl over the REST API where applicable. Qualitative verifications — reading the generated code, opening the browser to audit the UI — I did myself between phases.

### Two channels: planning and execution kept separate

The split between Claude in chat (planning) and Claude Code (execution) was deliberate. The two activities have different success criteria: planning needs to produce written decisions with alternatives considered; execution needs to generate code that passes the verification gates.

Mixing them in a single session pollutes the context with discarded alternatives, which raises the probability that the model relapses into ideas already rejected. Keeping them separate, with the written decisions in `/docs/decisions-log.md` serving as the interface between the two channels, kept Claude Code's prompts narrow and unambiguous.

### Bitácora as a continuity mechanism

I kept two working files throughout the project:

- `/docs/prompts-log.md` records every meaningful prompt sent to Claude Code, with its outcome and notes. It is the raw material from which this section and section 3 are distilled.
- `/docs/decisions-log.md` records only decisions that meet three criteria: a real alternative considered, an articulable trade-off, and non-local impact. Decisions that fail any of the three are not logged. The rule is documented in `/CLAUDE.md`.

The bitácora is written as things happen, not at the end. That eliminates retroactive reconstruction (which is where a workflow document turns generic) and yields authentic material for Phase 9.

### What I did not use

Parallel multi-agent orchestration. After my first plan review, I asked Claude Code for a second review using six parallel agents with specialised roles. The review returned 11 additional fixes, of which only 3 survived audit: the rest were either over-engineering outside scope, restatements of decisions already taken, or false positives produced by the format itself (each agent justifies its turn by generating objections). That experience was logged in `decisions-log` and calibrated the rest of the project toward narrower, more focused reviews.

## 3. Selected Prompts

Four prompts that show different facets of working with the tools across the project. Full prompt history lives in `/docs/prompts-log.md`.

### Prompt 1 — Plan lock with four final adjustments (Phase 0.5)

**Goal:** Close the planning phase after a second-round multi-agent review surfaced 11 candidate adjustments, by curating the list down to those actually worth applying and locking the plan.

**Prompt (excerpt):**
> "Apply only the following four adjustments and lock the plan: (1) lock the Phase 4 system prompt verbatim in the plan document so subsequent implementation does not drift; (2) add atomic-write semantics to the repository in Phase 2; (3) align the aggregateGames tool's filters with queryGames; (4) append four SDK v6 gotchas to CLAUDE.md's Validated Gotchas section. The seven remaining suggestions from the multi-agent review are discarded as either production-grade out-of-scope, redundant with applied decisions, or false positives produced by the critique format itself."

**Outcome:** The plan was locked with only the four substantive adjustments; the seven discarded suggestions were noted in `decisions-log` as the entry "Bounded scope of AI-assisted plan review", capturing the lesson that unbounded multi-agent critique formats produce critique by construction.

**Reflection:** Agent suggestions are not signal-pure. The reflex of "the AI proposed it, therefore apply it" is the failure mode this prompt was designed to avoid. The discipline is to evaluate each suggestion against the project's actual constraints and reject the ones that fail.

### Prompt 2 — REST API CRUD (Phase 3)

**Goal:** Implement the four REST endpoints (`GET /api/games`, `POST`, `GET/PATCH/DELETE /api/games/[id]`) on top of the existing repository layer, with strict separation between transport and business concerns.

**Prompt (excerpt):**
> "Route handlers handle HTTP concerns only: parsing the request, validating with Zod, calling the repository, formatting the response, and translating errors to status codes. Business logic stays in `/lib`. Centralise error handling in `/lib/api/helpers.ts` with `formatZodError` and `handleUnknownError`: SyntaxError → 400, RepositoryError → 400 with details, unknown → 500 without leaking the message. Next.js 16 uses async dynamic route params; the signature is `{ params: Promise<{ id: string }> }`."

**Outcome:** Four route files generated, each under 60 lines. Ten manual curl tests covered happy paths and error cases (404, 400 with malformed JSON, 400 with Zod validation failures, 204 on delete with no body). All passed on first try.

**Reflection:** Prompts that explicitly state the architectural rule — route handlers do not contain business logic — produce code that reflects that rule. Prompts that leave the rule implicit produce code that conflates concerns and has to be refactored. Spelling out the boundary is cheaper than reviewing for its absence.

### Prompt 3 — Chat endpoint with tool calling (Phase 4)

**Goal:** Build the streaming chat endpoint with four read-only tools (`listGames`, `queryGames`, `getGameByTitle`, `aggregateGames`), provider switching between Anthropic and OpenAI, and a system prompt that constrains the model to grounded answers.

**Prompt (excerpt):**
> "The system prompt is locked verbatim from the plan; do not paraphrase. Each tool defines a Zod inputSchema, wraps its execute body in try/catch, and returns structured `{ error: string }` objects on failure rather than throwing. `getGameByTitle` does three-tier matching: exact case-insensitive first, then substring, then Levenshtein with a distance threshold; when no confident match is found it returns suggestions instead of an error. Use `stopWhen: stepCountIs(5)` to bound multi-step tool calling."

**Outcome:** The endpoint compiled cleanly and the smoke test returned HTTP 200, but the streamed body was empty. There was no visible error: the request succeeded by every external signal. Only after adding an `onError` callback to the stream configuration — which was not in the original prompt — did the actual failure surface: `TypeError: messages.some is not a function`. Section 4 covers the root cause.

**Reflection:** Silent failures are the worst kind because they read as success. The instinct to "trust the green checkmark" must be tempered by the parallel instinct to "verify that the green checkmark means what it claims to mean". Once I added `onError`, the failure became loud, the cause was diagnosable in one read, and the fix was a one-word change. Instrumentation precedes trust.

### Prompt 4 — Chat UI with empirically-typed parts (Phase 6)

**Goal:** Build the chat UI in such a way that the discriminated union for message parts is derived from the wire format actually emitted by the SDK, not from documentation or assumption.

**Prompt (excerpt):**
> "Read the decisions-log entry `Empirical verification of parts[] discriminator shape` and its `Captured evidence (Phase 4)` sub-section. Build `/lib/chat/parts.ts` such that the `MessagePart` union matches the captured JSON exactly: `text` with optional `state: 'streaming' | 'done'`, `step-start` with no other fields, and `tool-${string}` (templated type) with `toolCallId`, `state` cycling through four values, and optional `input`/`output`/`errorText`. Include an `isToolPart` type guard. Use `toolCallId` (not array index) as the React key when rendering tool badges — parts mutate during streaming and an index-based key causes mis-reconciliation."

**Outcome:** The strict types compiled cleanly. The chat UI rendered correctly on the first try for both single-tool queries and multi-step tool sequences (the comparison case calling `getGameByTitle` twice). No defensive `any` casts were needed anywhere in the rendering path.

**Reflection:** Building types from captured evidence is more reliable than building them from documentation, especially when working against a recently-released SDK whose docs and training data diverge. The captured JSON is the source of truth; the docs may be aspirational or stale. Pasting the actual emitted shape into `decisions-log` during Phase 4 paid off twice: first as a diagnostic during Phase 4 itself, and second as a typed reference during Phase 6.

## 4. Where the Model Got It Wrong

The most instructive incident of the project happened in Phase 4, while building the chat endpoint. I want to recount it in detail because the pattern applies to any work against a recently-released SDK.

### Context

The Vercel AI SDK v6 introduced a subtle change in its API: `convertToModelMessages`, the function that translates the client-side message format into the format the LLM expects, became asynchronous. In v5 and earlier it was synchronous. The change is unannounced across much of the public documentation, and most tutorial examples online are out of date.

This matters because language models learn from corpora frozen at some point in the past. When I asked Claude Code to write the endpoint handler, the model produced the sync form, faithful to the majority of examples it saw during training. The generated code was:

```typescript
const result = streamText({
  model,
  system: SYSTEM_PROMPT,
  messages: convertToModelMessages(messages),  // ← missing await
  tools,
  stopWhen: stepCountIs(5),
});
```

### The silent failure

The smoke test I ran against the endpoint passed. HTTP 200, request completed in reasonable time, no exceptions in stdout. By every external signal, the endpoint worked.

But the response body was empty. No stream, no messages, nothing. And because `streamText` does not surface the exception to the caller — it captures it internally to preserve the stream's contract — the calling code had no way to learn about it.

This is the worst kind of bug: the one that reads as success. Had I trusted the HTTP 200 and moved on to the next phase, the chat would have reached Phase 6 broken, and I would have found out only when opening the browser.

### Diagnosis

When I saw the empty body, my first reaction was not to inspect the code. It was to add instrumentation. I modified the stream configuration to include an `onError` callback:

```typescript
const result = streamText({
  // ...
  onError: ({ error }) => {
    console.error('[chat stream error]', error);
  },
});
```

I re-ran the smoke test. This time stdout revealed:
[chat stream error] TypeError: messages.some is not a function

With that, the bug became visible. `messages.some` only exists on arrays. What was reaching `streamText` was not the expected message array: it was an unresolved Promise. The fix was a one-word change:

```typescript
messages: await convertToModelMessages(messages),
```

### Capture

Before moving to Phase 5, I added a new bullet to the "Validated SDK Gotchas" section of `/CLAUDE.md`:

> `convertToModelMessages` is async in v6. Must be awaited. Silently breaks the stream if not — error only visible via the `onError` callback.

This was not cosmetic. `CLAUDE.md` loads at the start of every Claude Code session, so any future prompt touching this endpoint would have the gotcha in context. The project's institutional memory is built from annotations like this, not from trust in the model's recall.

### Three lessons

**Code that compiles and runs is not the same as code that works.** The compiler and the runtime validated everything they knew how to validate: types correct, syntax legal, no exception thrown to the caller. The code was broken anyway. Mechanical gates are necessary but not sufficient; verification has to reach the observable output, not just the exit code.

**Instrumentation precedes trust.** When something fails silently, the first investment must be to make the failure audible. Adding the `onError` callback did not require knowing what was wrong — only knowing that something was wrong. Once audible, the bug was diagnosable in a single read.

**LLM training corpus drift is real and predictable.** APIs that changed recently are systematically mis-generated by models whose corpus froze before the change. The antidote is not to distrust the model — it is to build mechanisms, like `CLAUDE.md` gotchas, that capture divergences as they are discovered. And to accept that when working with recently-released SDKs, you are collaborating with a model that knows a great deal but also knows out-of-date things.

## 5. Trade-offs and Reflections

Three trade-offs in how I used AI tools during this project deserve naming, and one observation that surprised me.

**I rejected multi-agent orchestration despite the tool suggesting it.** The pattern is fashionable and Claude Code proposed it during the second plan-review round. I ran one round with six parallel agents and audited the output: of 11 proposed adjustments, only 4 survived review. The remaining 7 were either restatements of decisions already taken, over-engineering outside scope, or false positives produced by the format itself. The lesson generalised: agents instructed to critique will produce critique, regardless of whether critique is warranted. For a single-developer 3-hour project, the coordination overhead of multi-agent flows is not amortised by the marginal signal they produce. Recorded in `decisions-log` as "Bounded scope of AI-assisted plan review".

**I wrote this document by hand rather than having Claude Code write it.** The temptation was real: the source material in `prompts-log.md` and `decisions-log.md` is dense enough that a generation prompt would have produced something passable. I declined because authorship of the workflow document is the part of the assessment that cannot be delegated without contradicting itself. A document about how I used AI tools, written by an AI tool, would invert the rubric. The voice in this document is the artefact being evaluated; it has to be mine.

**One thing I would do differently.** The two-channel split (planning in Claude chat, execution in Claude Code) worked, but the handoff between them was manual: I would draft a decision in chat, then paste a prompt into the terminal. With more time I would have explored having the planning channel write directly to `decisions-log.md` and having Claude Code read it as part of every prompt's setup, closing the loop without my having to ferry text across sessions.

**What surprised me, positively:** how much value a 200-line `CLAUDE.md` file produced over the course of the project. It started as project conventions, accumulated SDK gotchas as I discovered them, and by Phase 6 it was functioning as a fast-loading institutional memory that prevented Claude Code from repeating earlier mistakes. The investment was small per gotcha; the compounding return across phases was disproportionate. If I were to start another agent-driven project tomorrow, the first file I would write is the CLAUDE.md.
