import { describe, expect, it } from "vitest";
import { createEventParser, encodeEvent, type ChatEvent } from "./protocol";

const events: ChatEvent[] = [
  { type: "text", delta: "Hello, 🎮 world\nsecond line" },
  { type: "tool_call", id: "t1", name: "search_games", input: { limit: 1 } },
  { type: "tool_result", id: "t1", ok: true, output: { games: [] } },
  { type: "error", message: "Nope" },
  { type: "done" },
];

function parseAll(chunks: string[]): ChatEvent[] {
  const received: ChatEvent[] = [];
  const feed = createEventParser((event) => received.push(event));
  chunks.forEach(feed);
  return received;
}

describe("event protocol", () => {
  it("encodes each event as a single data line, even when the text contains newlines", () => {
    const encoded = encodeEvent(events[0]);
    expect(encoded.endsWith("\n\n")).toBe(true);
    expect(encoded.trimEnd().split("\n")).toHaveLength(1);
  });

  it("round-trips every event type", () => {
    expect(parseAll(events.map(encodeEvent))).toEqual(events);
  });

  it("reads several events delivered in one chunk", () => {
    expect(parseAll([events.map(encodeEvent).join("")])).toEqual(events);
  });

  it("reassembles events however the network splits them, even one character at a time", () => {
    const wire = events.map(encodeEvent).join("");
    expect(parseAll([...wire])).toEqual(events);
    expect(parseAll([wire.slice(0, 7), wire.slice(7, 90), wire.slice(90)])).toEqual(events);
  });

  it("does not emit an event until it is complete", () => {
    const partial = encodeEvent(events[0]).slice(0, -2);
    expect(parseAll([partial])).toEqual([]);
  });

  it("skips malformed events, comments and unknown fields without breaking the stream", () => {
    const wire = [
      ": keep-alive\n\n",
      "data: {not json}\n\n",
      "event: ping\nid: 5\n\n",
      encodeEvent(events[4]),
    ].join("");
    expect(parseAll([wire])).toEqual([{ type: "done" }]);
  });
});
