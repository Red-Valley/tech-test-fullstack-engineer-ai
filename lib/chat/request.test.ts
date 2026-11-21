import { describe, expect, it } from "vitest";
import { BLOCK_TYPES, ChatRequest, describeInvalidRequest } from "./request";

// A conversation shaped like the one the server returns in its `done` event: thinking and tool blocks in
// assistant turns, tool results in user turns, and a fallback block.
const history = [
  { role: "user", content: "How many games are rated above 4?" },
  {
    role: "assistant",
    content: [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "redacted_thinking", data: "opaque" },
      { type: "text", text: "I will count them." },
      { type: "tool_use", id: "toolu_1", name: "aggregate_games", input: { metric: "count" } },
    ],
  },
  { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_1", content: '{"rows":[{"value":9}]}' }] },
  { role: "assistant", content: [{ type: "fallback" }, { type: "text", text: "9 games are rated above 4." }] },
  { role: "user", content: "And how many are Puzzle games?" },
];

describe("ChatRequest", () => {
  it("accepts a replayed conversation containing every allowed block type", () => {
    const used = new Set(history.flatMap((m) => (Array.isArray(m.content) ? m.content.map((b) => b.type) : [])));
    // Adding a block type to BLOCK_TYPES without a positive case here fails this test.
    expect(used).toEqual(new Set(BLOCK_TYPES));
    expect(ChatRequest.safeParse({ messages: history }).success).toBe(true);
  });

  it("rejects an unknown block type with a readable message", () => {
    const result = ChatRequest.safeParse({
      messages: [{ role: "assistant", content: [{ type: "image" }] }, { role: "user", content: "hi" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(describeInvalidRequest(result.error)).toMatch(/does not accept/);
  });

  it("requires the last message to come from the user", () => {
    const result = ChatRequest.safeParse({ messages: history.slice(0, -1) });
    expect(result.success).toBe(false);
    if (!result.success) expect(describeInvalidRequest(result.error)).toMatch(/last message/);
  });
});
