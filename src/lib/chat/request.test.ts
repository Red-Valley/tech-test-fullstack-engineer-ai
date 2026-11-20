import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "./request";
import { MAX_ASSISTANT_MESSAGE_LENGTH, MAX_MESSAGES, MAX_USER_MESSAGE_LENGTH } from "./request-limits";

const user = (content: string) => ({ role: "user" as const, content });
const assistant = (content: string) => ({ role: "assistant" as const, content });

const messageOf = (input: unknown) => {
  const result = chatRequestSchema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
};

describe("chatRequestSchema", () => {
  it("accepts a conversation and trims message text", () => {
    const parsed = chatRequestSchema.parse({ messages: [user("  hi  "), assistant("hello"), user("again")] });
    expect(parsed.messages[0].content).toBe("hi");
    expect(parsed.messages).toHaveLength(3);
  });

  it("requires at least one message, reporting an empty list as a validation error (never a crash)", () => {
    const result = chatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(["Send at least one message"]);
    expect(messageOf({})).not.toBeNull();
  });

  it("must start and end with a user message", () => {
    expect(messageOf({ messages: [assistant("hi"), user("q")] })).toMatch(/start and end with a user message/);
    expect(messageOf({ messages: [user("q"), assistant("a")] })).toMatch(/start and end with a user message/);
  });

  it("rejects empty, oversized and over-long conversations", () => {
    expect(messageOf({ messages: [user("   ")] })).toBe("Messages can't be empty");
    expect(messageOf({ messages: [user("x".repeat(MAX_USER_MESSAGE_LENGTH + 1))] })).toMatch(/at most 4000 characters/);
    const many = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => (i % 2 === 0 ? user("q") : assistant("a")));
    expect(messageOf({ messages: many })).toMatch(/at most 30 messages/);
  });

  it("gives replies more room than questions", () => {
    const longReply = (length: number) => ({ messages: [user("q"), assistant("x".repeat(length)), user("q2")] });
    expect(messageOf(longReply(MAX_USER_MESSAGE_LENGTH + 1))).toBeNull(); // too long for a question, fine for a reply
    expect(messageOf(longReply(MAX_ASSISTANT_MESSAGE_LENGTH))).toBeNull();
    expect(messageOf(longReply(MAX_ASSISTANT_MESSAGE_LENGTH + 1))).toMatch(/at most 8000 characters/);
  });

  it("rejects unknown roles", () => {
    expect(messageOf({ messages: [{ role: "system", content: "x" }] })).not.toBeNull();
  });
});
