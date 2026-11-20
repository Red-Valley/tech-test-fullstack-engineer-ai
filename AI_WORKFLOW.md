# AI workflow

How I used AI coding tools on this assessment. Built from the prompt log ([docs/prompts-raw.md](docs/prompts-raw.md)), the curated log ([docs/prompts-log.md](docs/prompts-log.md)), the conversation log ([docs/conversation-log.md](docs/conversation-log.md)) and the git history. Every entry in the prompts log has a "My call" line that is still `_TODO_`, because only I can fill it in. The reflections below are therefore marked `[MISSING]` rather than written for me.

## 1. Tools and why

**Claude Code** wrote most of the code and ran the quality gates (lint, typecheck, tests, build) before each commit. I used it in the terminal inside the project folder. I chose it because it can read and change the whole repo, run commands and commit, so each step could be checked in the same session.

**Claude chat for planning:** [MISSING: whether I used Claude chat for planning. Nothing in the repo or logs shows it.]

**The `code-reviewer` subagent** (`.claude/agents/code-reviewer.md`) reviewed each phase before its commit. It is read-only and reports findings ranked by severity, each tied to a line of code. I used it because the agent that wrote the code shouldn't be the only one checking it. It ran nine times, once per phase, and its findings are in the prompts log. Several were real bugs: the chat broke after a stopped tool call, and the fuzzy title matcher matched invented titles to real games.

**The prompt-logging hooks** (`.claude/settings.json`) write every prompt to `docs/prompts-raw.md`, and every prompt with Claude's reply to `docs/conversation-log.md`. I set them up so this document would come from a record rather than from memory. They started capturing at about 19:05 local time, after the first commit, so the planning conversation before that isn't in the logs.

**`CLAUDE.md`** holds the project rules as persistent context: the architecture is final, log every task, never write my "My call" notes, update this file after each phase, and run the reviewer before each commit. It imports `ARCHITECTURE.md`, so every session starts from the same decisions.

**The AI SDK's bundled docs** (`node_modules/ai/docs`), which I read before writing the chat code. This mattered: the installed SDK version had renamed some options since the architecture was written.

## 2. How I worked

I wrote the architecture first (`ARCHITECTURE.md`), then turned it into a commit-by-commit plan in `docs/PLAN.md`: 21 steps across 10 phases. Each step has a verification step (a test, a `curl` call or a browser check) that has to pass before the commit. At the end of each phase I ran the reviewer, fixed what it found, and wrote a log entry. At the time of writing, 19 steps are done; the README and this file are the last two.

- **Pre-build spike:** [MISSING: the spike the assignment asks for. Nothing in the repo or logs records one.]
- **Review after each phase:** nine reviews, Phases 0–8, all in the prompts log. Examples of what they caught: a logging hook that recorded a reviewer's report as my prompt; a fuzzy matcher that called "Hexmarch 2" a match for Hexmarch; a chat that could not recover after a stopped tool call; and a grader that accepted "…which is not bad" as "not found".
- **Evals as the check on the AI's output:** 20 questions × 3 runs on `openai/gpt-oss-120b` through Groq, graded by deterministic rules rather than another model. Final result: **57/60 runs (95%)**, above the 90% threshold. The one failing case, `fuzzy-compare`, gives the right ratio but leaves out the two dollar amounts it's asked for. I committed the result with that limitation noted, instead of tuning the grader until it passed.

## 3. Prompts

**Planning and scope: "lets move the plan to docs"**
The plan file sat at the repo root, but `ARCHITECTURE.md` said `docs/PLAN.md`. I moved it and updated the links. Outcome: one location, matching the architecture (commit `3df0f27`).
Reflection: [MISSING: my "My call" line for this entry]

**Tool design: "lets add the group by genre"**
The "which genre has the highest average revenue" question would have needed one tool call per genre, and the model would have compared the numbers itself, against the rule that all math happens in code. I approved an architecture change, and `aggregate_games` gained `groupBy: 'genre'`, returning the groups sorted highest first (commit `b179656`).
Reflection: [MISSING: my "My call" line for this entry]

**A failure: "The assistant ran into a problem. Please try again."**
I pasted the chat's error after adding a Groq key. The server log showed the real cause, and the fix is in section 4.
Reflection: [MISSING: my "My call" line for this entry]

**Testing and evals: "lets run 20 questions"**
A one-run sample before the full evals. It scored 19/20 and showed the `fuzzy-compare` problem. I then ran the full set of three runs per case: 57/60 (commit `b50a7ca`).
Reflection: [MISSING: my "My call" line for this entry]

The parallel-work decision has no typed prompt in the log, because I made it by choosing from a list. It's covered in section 5.

## 4. When the AI got it wrong

**Symptom:** after I added a Groq key, every question showed "The assistant ran into a problem. Please try again."

**How it was caught:** by me, in the chat. The chat shows only a generic message on purpose, so I read the server log. It said: `The model llama-3.3-70b-versatile does not exist or you do not have access to it.`

**Root cause:** I took that model name from the list in the `@ai-sdk/groq` package and didn't check it against Groq's live model list. The package list was out of date. I had noted in the log that I couldn't confirm the live list without a key, and I still used the name as the default.

**Fix:** I asked Groq's models endpoint which models the key could use, without printing the key. The default became `openai/gpt-oss-120b`. I then asked the three example questions against the running server, and each answered correctly. Commit `558c54a`. The lesson I'd keep: check a model id against the provider's own endpoint, not against an SDK's list of types.

## 5. Parallel work

The plan had two git worktrees running at the same time after the API was done: `feat/ui` for the frontend and `feat/ai` for the chat, split by folder so they couldn't conflict, with `feat/ai` merged first. When the backend was finished (`844dac4`), I was offered three ways to run the parallel work: two sessions I would drive, two background agents, or staying sequential. I chose sequential. No worktrees were created, and every commit is on `main`.

Background subagents still ran alongside my work. Each phase's reviewer ran in the background while I started the next task, and its findings came back as a separate message.

[MISSING: my reason for choosing sequential work over more agents]

## 6. Time

Spike: [MISSING: spike time]

Build: [MISSING: active build time. The commit timestamps run from 18:50 to 22:01 local time on 19 November, a span of 3 h 11 min. That span includes breaks and time between sessions, which the repo doesn't record.]

## 7. Full history

- [docs/prompts-log.md](docs/prompts-log.md): each entry, with what I asked, what changed, the issues and the review findings.
- [docs/conversation-log.md](docs/conversation-log.md): each prompt with Claude's text reply.
- [docs/prompts-raw.md](docs/prompts-raw.md): every prompt, verbatim, from about 19:05 local time onward.
