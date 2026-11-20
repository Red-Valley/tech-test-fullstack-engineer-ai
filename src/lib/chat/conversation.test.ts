import { describe, expect, it } from "vitest";
import {
  applyEvents,
  assistantText,
  chatReducer,
  emptyAssistantMessage,
  failureMessage,
  initialChatState,
  toRequestMessages,
  userMessage,
  type AssistantMessage,
  type ChatState,
} from "./conversation";
import type { ChatEvent } from "./protocol";
import { chatRequestSchema } from "./request";
import { MAX_ASSISTANT_MESSAGE_LENGTH, MAX_MESSAGES } from "./request-limits";

const call: ChatEvent = { type: "tool_call", id: "t1", name: "search_games", input: { limit: 1 } };
const result: ChatEvent = { type: "tool_result", id: "t1", ok: true, output: { games: [] } };
const text = (delta: string): ChatEvent => ({ type: "text", delta });

describe("applyEvents", () => {
  it("accumulates consecutive text deltas into one part", () => {
    const message = applyEvents(emptyAssistantMessage(), [text("Hel"), text("lo "), text("there")]);
    expect(message.parts).toEqual([{ kind: "text", text: "Hello there" }]);
  });

  it("keeps text and tool calls in the order they happened", () => {
    const message = applyEvents(emptyAssistantMessage(), [text("Let me check. "), call, result, text("Done.")]);
    expect(message.parts.map((part) => part.kind)).toEqual(["text", "tool", "text"]);
    expect(assistantText(message)).toBe("Let me check.\n\nDone.");
  });

  it("marks a tool call running, then done with its output", () => {
    const running = applyEvents(emptyAssistantMessage(), [call]);
    expect(running.parts[0]).toMatchObject({ kind: "tool", call: { id: "t1", status: "running" } });

    const done = applyEvents(running, [result]);
    expect(done.parts[0]).toMatchObject({ kind: "tool", call: { status: "done", output: { games: [] } } });
  });

  it("marks a failed tool call as an error", () => {
    const message = applyEvents(emptyAssistantMessage(), [call, { ...result, ok: false, output: { error: "bad" } }]);
    expect(message.parts[0]).toMatchObject({ call: { status: "error", output: { error: "bad" } } });
  });

  it("matches results to calls by id when several run", () => {
    const second: ChatEvent = { type: "tool_call", id: "t2", name: "compare_games", input: {} };
    const message = applyEvents(emptyAssistantMessage(), [call, second, { type: "tool_result", id: "t2", ok: true, output: 2 }]);
    expect(message.parts.map((p) => p.kind === "tool" && p.call.status)).toEqual(["running", "done"]);
  });

  it("records an error without discarding the text already shown", () => {
    const message = applyEvents(emptyAssistantMessage(), [text("Partial"), { type: "error", message: "Boom" }, { type: "done" }]);
    expect(message.error).toBe("Boom");
    expect(assistantText(message)).toBe("Partial");
  });

  it("does not mutate the message it was given", () => {
    const original = emptyAssistantMessage();
    const frozen = Object.freeze({ ...original, parts: Object.freeze([]) as never });
    expect(() => applyEvents(frozen as AssistantMessage, [text("x"), call])).not.toThrow();
    expect(original.parts).toEqual([]);
  });
});

describe("chatReducer", () => {
  const start = (state: ChatState = initialChatState) =>
    chatReducer(state, { type: "start", messages: [...state.messages, userMessage("Q"), emptyAssistantMessage()] });

  it("start → events → finish produces a finished answer", () => {
    let state = start();
    expect(state.streaming).toBe(true);

    state = chatReducer(state, { type: "events", events: [text("Answer")] });
    state = chatReducer(state, { type: "finish" });

    expect(state.streaming).toBe(false);
    expect(state.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(assistantText(state.messages[1] as AssistantMessage)).toBe("Answer");
  });

  it("only ever updates the newest assistant message", () => {
    let state = start();
    state = chatReducer(state, { type: "events", events: [text("First")] });
    state = chatReducer(state, { type: "finish" });
    state = start(state);
    state = chatReducer(state, { type: "events", events: [text("Second")] });

    expect(state.messages.filter((m) => m.role === "assistant").map((m) => assistantText(m as AssistantMessage))).toEqual([
      "First",
      "Second",
    ]);
  });

  it("fail attaches the error to the reply and stops streaming", () => {
    const state = chatReducer(start(), { type: "fail", message: "Server down" });
    expect(state.streaming).toBe(false);
    expect((state.messages[1] as AssistantMessage).error).toBe("Server down");
  });

  it("ignores events when there is no assistant message to update", () => {
    expect(chatReducer(initialChatState, { type: "events", events: [text("x")] })).toEqual(initialChatState);
  });

  it("drops an empty reply when the stream ends without content (e.g. Stop before the first token)", () => {
    const state = chatReducer(start(), { type: "finish" });
    expect(state.messages.map((m) => m.role)).toEqual(["user"]);
    expect(state.streaming).toBe(false);
  });

  it("keeps a reply on finish when it has text, a tool call or an error", () => {
    for (const events of [[text("hi")], [call]]) {
      const state = chatReducer(chatReducer(start(), { type: "events", events }), { type: "finish" });
      expect(state.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    }
    const failed = chatReducer(chatReducer(start(), { type: "fail", message: "x" }), { type: "finish" });
    expect(failed.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("reset clears everything", () => {
    expect(chatReducer(start(), { type: "reset" })).toEqual(initialChatState);
  });
});

describe("failureMessage", () => {
  it("shows the server's explanation, with the first validation issue when there is one", () => {
    const body = { error: "Validation failed", issues: [{ field: "messages", message: "Messages can't be empty" }] };
    expect(failureMessage(body, 400)).toBe("Validation failed: Messages can't be empty");
    expect(failureMessage({ error: "The AI chat isn't configured yet." }, 503)).toBe("The AI chat isn't configured yet.");
  });

  it("falls back to the status when the body is not an error object", () => {
    for (const body of [null, "<html>oops</html>", { nope: 1 }, 42]) {
      expect(failureMessage(body, 502)).toBe("The server answered 502. Please try again.");
    }
  });
});

describe("toRequestMessages", () => {
  const answered = (content: string): AssistantMessage => applyEvents(emptyAssistantMessage(), [text(content)]);

  it("sends only plain text, in order", () => {
    const messages = [userMessage("Q1"), applyEvents(emptyAssistantMessage(), [call, result, text("A1")]), userMessage("Q2")];
    expect(toRequestMessages(messages)).toEqual([
      { role: "user", content: "Q1" },
      { role: "assistant", content: "A1" },
      { role: "user", content: "Q2" },
    ]);
  });

  it("keeps a long chat acceptable to the server: a rolling window that starts and ends with a question", () => {
    // 20 earlier exchanges plus the new question = 41 messages, more than the server allows.
    const longChat = [
      ...Array.from({ length: 20 }, (_, i) => [userMessage(`Q${i}`), answered(`A${i}`)]).flat(),
      userMessage("latest question"),
    ];
    const sent = toRequestMessages(longChat);

    expect(sent.length).toBeLessThanOrEqual(MAX_MESSAGES);
    expect(sent[0].role).toBe("user"); // the window must not open on a reply
    expect(sent.at(-1)).toEqual({ role: "user", content: "latest question" });
    expect(chatRequestSchema.safeParse({ messages: sent }).success).toBe(true);
  });

  it("trims a reply that is longer than the server accepts", () => {
    const [question, reply] = toRequestMessages([userMessage("Q"), answered("x".repeat(MAX_ASSISTANT_MESSAGE_LENGTH + 500)), userMessage("Q2")]);
    expect(question.content).toBe("Q");
    expect(reply.content).toHaveLength(MAX_ASSISTANT_MESSAGE_LENGTH);
  });

  it("keeps narration and answer apart in the history sent back to the model", () => {
    const reply = applyEvents(emptyAssistantMessage(), [text("I'll look that up. "), call, result, text("The top game is X.")]);
    const [, assistant] = toRequestMessages([userMessage("Q"), reply, userMessage("Q2")]);
    expect(assistant.content).toBe("I'll look that up.\n\nThe top game is X.");
  });

  it("leaves out failed and empty replies", () => {
    const failed = { ...answered("cut off mid-sent"), error: "Network" };
    const empty = emptyAssistantMessage();
    expect(toRequestMessages([userMessage("Q1"), failed, userMessage("Q2"), empty])).toEqual([
      { role: "user", content: "Q1" },
      { role: "user", content: "Q2" },
    ]);
  });
});
