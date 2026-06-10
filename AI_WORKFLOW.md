# AI Workflow Documentation

This document provides a detailed account of how Artificial Intelligence coding tools and assistants were leveraged to develop, debug, and optimize the intelligent agent driving this indie games catalog.

---

## 1. Tools Used and Justification

- **Claude (Anthropic):** Utilized as the primary co-pilot for architectural design, debugging, and TypeScript type safety enforcement.
- **GitHub Copilot Extension (Visual Studio Code):** Used as an inline, context-aware autocomplete assistant during the manual refactoring of the components and JSON data modeling.
- **Why?:** The project demanded integrating the modern **(`@openrouter/ai-sdk-provider`)** within a strict **TypeScript** and **Next.js (App Router)** environment. This specific assistance workflow was selected due to its deep comprehension of streaming design patterns, Zod validation schemas, and the rapidly evolving type contracts between major versions of Vercel's AI SDK.

---

## 2. Concrete Prompts and Outcomes

The following are the key prompts utilized during the co-creation and debugging sessions, along with their engineering outcomes:

### Prompt 1: Project Structuring and Architecture (Conversational AI)
* **Prompt:** `"I need to build an AI-powered chat assistant inside a Next.js App Router project that queries a local JSON game catalog. What is the cleanest folder structure to separate the API route, the JSON data storage, and the frontend client layout?"`
* **Outcome:** The assistant generated a scalable folder structure recommending `app/api/chat/route.ts` for the streaming endpoint, `lib/games.ts` for file I/O operations, and a clean separation for the client-side dashboard, preventing coupling issues from the start

### Prompt 2: Synthetic Test Data Generation (GitHub Copilot Inline Suggestion)
* **Context/Trigger:** Creating the local database file `data/games.json` and initializing the first object array.
* **Outcome:** By providing the first game schema object, GitHub Copilot automatically generated a balanced dataset of 8 realistic indie games, populating fields for `title`, `developer`, `genre`, `monthly_revenue_usd`, `monthly_downloads`, and `average_rating` with varied metrics for proper testing.

### Prompt 3: Frontend Layout and Advanced Tailwind Styling (Conversational AI)
* **Prompt:** `"Help me design a modern, cyber-dark UI dashboard layout for this indie games catalog using Tailwind CSS. The screen must be split: 60% grid for game cards with a neon hover glow, and 40% for the dedicated AI Assistant chat window with a smooth scrollbar."`
* **Outcome:** The AI provided the full JSX architecture utilizing Lucide icons, glassmorphism (`backdrop-blur`), and radial gradients (`bg-[radial-gradient(...)]`) that made the dashboard visually striking, responsive, and highly polished.

### Prompt 4: Quality Control & Code Optimization (GitHub Copilot Inline Suggestion)
* **Context/Trigger:** Typing `onSubmit={handleChatSubmit}` inside the chat form component while refactoring code.
* **Outcome:** GitHub Copilot automatically predicted and generated the inline refactor to bind the standard `handleSubmit` and `handleInputChange` functions provided natively by the `useChat` hook, stripping out redundant local `useState` synchronization logic and optimizing the frontend state machine.

### Prompt 5: Core Feature Implementation: Tool Calling (Conversational AI)
* **Prompt:** `"I want the AI chat model to automatically execute a local function called 'get_game_catalog' whenever a user asks questions about finances, earnings, downloads, or rankings. Provide the Zod schema and the tool definition for the backend."`
* **Outcome:** The assistant generated the strict Zod object schema and structured the metadata parameters so the LLM could interpret exactly when and how to call the local catalog function.
---

## 3. Turning Point: When the AI Got It Wrong & The Manual Solution

### The Failure: Wrong provider SDK

During an intermediate phase, the chat route was using `@ai-sdk/openai` with the model string `nex-agi/nex-n2-pro:free`. This caused silent failures because the OpenAI provider does not know how to route OpenRouter model strings — the API calls were being sent to the wrong endpoint entirely.

### The Strategic Manual Solution

Three interconnected fixes were applied:

1. **Switching to the correct provider:** Replaced `@ai-sdk/openai` with `@openrouter/ai-sdk-provider` and initialized it with `createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })`. This ensured requests were routed correctly to OpenRouter's infrastructure.

2. **Activating the iterative multi-step loop:** Added `stopWhen: stepCountIs(3)` (the v6 equivalent of `maxSteps`) to allow the model to complete the full tool-call cycle: call tool → receive data → write final answer.

3. **Fixing the system prompt to prevent verbose tool narration:** The model was describing its intent to call the tool before actually calling it. This was resolved by adding explicit rules to the system prompt: never narrate tool usage, always call the tool directly, and answer concisely from the returned data.

---

## 4. Code Organization Refactor

As a final quality step, the original monolithic `page.tsx` (~320 lines) was refactored into focused, single-responsibility components:

| File | Responsibility |
|---|---|
| `app/components/GameCard.tsx` | Renders a single game card with delete functionality |
| `app/components/CreateGameModal.tsx` | Handles the create game form and modal state |
| `app/components/ChatPanel.tsx` | Self-contained chat UI with its own `useChat` hook |
| `app/page.tsx` | Reduced to ~236 lines of pure orchestration logic |

This separation demonstrates clear component boundaries, improves maintainability, and follows standard Next.js App Router conventions.

---

## 5. Parallel Agents / Subagents / Worktrees

While complex branching Git worktrees were not used, this project heavily utilized an **Autonomous Workspace Agent (In-IDE Coding Agent)** rather than a simple conversational chatbot. 

Instead of requiring manual copy-pasting, the integrated IDE agent was granted direct read and write file system permissions. This allowed for an advanced agentic workflow where the developer acted as an architectural supervisor, and the AI agent independently executed file modifications across the codebase.

### Agentic Execution Workflow:
1. **Context Gathering:** The workspace agent indexed the entire Next.js project tree to understand dependencies, local JSON schema handling, and Vercel AI SDK constraints.
2. **Multi-File Autonomous Editing:** Upon receiving high-level instructions (e.g., updating TypeScript types, fixing streaming data keys, or resolving the multi-step execution logic), the agent autonomously opened, modified, and saved changes directly within `app/api/chat/route.ts` and `app/page.tsx`.
3. **Human-in-the-Loop Validation:** Once the agent finalized its edits, the developer ran the Next.js compilation server to manually audit and validate the live streaming functionality.