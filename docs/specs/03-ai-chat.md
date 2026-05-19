# Specs for "AI Chat"

**Branch:** `feature/ai-chat`

---

## Summary

Users need insights from the game catalog—top revenue earners, rating comparisons, cross-game analysis—without writing queries manually. This feature delivers a conversational chat interface powered by Anthropic (claude-sonnet-4-6 as suggested model) via the Vercel AI SDK, using tool calling so the model fetches only the data it needs and streams answers back in real time.

## Requirements

### Requirement 1 — AI Chat

**User Story:** As a user, I can chat with an AI assistant that answers questions about the game catalog.

**Acceptance Criteria:**
- [ ] AC-1.1: Chat UI that answers questions like: "Which game made the most revenue last month?" "How many games are rated above 4?" "Compare revenue of Game A vs Game B."
- [ ] AC-1.2: Must use tool calling / function calling to query the data.
- [ ] AC-1.3: Do not dump the full DB into the prompt.
- [ ] AC-1.4: Responses must stream.
- [ ] AC-1.5: AI provider: Anthropic claude-sonnet-4-6 via Vercel AI SDK.

---

## Out of Scope

*(none declared)*

## Possible Edge Cases

- EC-1: Empty catalog when AI chat is queried — AI must handle no-results gracefully instead of hallucinating.

## Open Questions

*(none)*
