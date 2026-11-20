import Anthropic from "@anthropic-ai/sdk";

/**
 * Test double for the Anthropic Messages API.
 *
 * Instead of mocking the SDK, it replaces only the network: the real SDK client is given a `fetch` that
 * answers with scripted Server-Sent-Events, exactly as the API streams them. So the tests exercise the real
 * stream parser, the real tool loop and the real request building; only the model's decisions are scripted.
 */

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  /** What models with always-on thinking return: the text is empty by default, but the signature is not. */
  | { type: "thinking"; thinking: string; signature: string };

type StopReason = "end_turn" | "tool_use" | "max_tokens" | "refusal";

/** The JSON body the app sent to the API, as recorded by the fake. */
export interface RecordedRequest {
  model: string;
  max_tokens: number;
  stream: boolean;
  system: string;
  tools: { name: string; description: string; input_schema: Record<string, unknown> }[];
  messages: { role: string; content: unknown }[];
  [key: string]: unknown;
}

function messageEvents(blocks: Block[], stopReason: StopReason): object[] {
  const events: object[] = [
    {
      type: "message_start",
      message: {
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-test",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 1 },
      },
    },
  ];

  blocks.forEach((block, index) => {
    if (block.type === "thinking") {
      events.push({ type: "content_block_start", index, content_block: { type: "thinking", thinking: "" } });
      if (block.thinking) {
        events.push({ type: "content_block_delta", index, delta: { type: "thinking_delta", thinking: block.thinking } });
      }
      events.push({ type: "content_block_delta", index, delta: { type: "signature_delta", signature: block.signature } });
    } else if (block.type === "text") {
      events.push({ type: "content_block_start", index, content_block: { type: "text", text: "" } });
      // Small pieces, like a real stream.
      for (const piece of block.text.match(/[\s\S]{1,8}/g) ?? []) {
        events.push({ type: "content_block_delta", index, delta: { type: "text_delta", text: piece } });
      }
    } else {
      events.push({
        type: "content_block_start",
        index,
        content_block: { type: "tool_use", id: block.id, name: block.name, input: {} },
      });
      // The input arrives as partial JSON fragments that the SDK has to stitch together.
      const json = JSON.stringify(block.input);
      const middle = Math.floor(json.length / 2);
      for (const fragment of [json.slice(0, middle), json.slice(middle)]) {
        events.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: fragment } });
      }
    }
    events.push({ type: "content_block_stop", index });
  });

  events.push(
    { type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 20 } },
    { type: "message_stop" },
  );
  return events;
}

const sse = (events: object[]) =>
  events.map((event) => `event: ${(event as { type: string }).type}\ndata: ${JSON.stringify(event)}\n\n`).join("");

/** One scripted model turn. Returns a factory because a Response body can only be read once. */
export function modelTurn(blocks: Block[], stopReason: StopReason = "end_turn"): () => Response {
  return () =>
    new Response(sse(messageEvents(blocks, stopReason)), {
      status: 200,
      headers: { "content-type": "text/event-stream", "request-id": "req_test" },
    });
}

export const say = (text: string) => modelTurn([{ type: "text", text }], "end_turn");

export const callTools = (...calls: { id: string; name: string; input: unknown }[]) =>
  modelTurn(calls.map((call) => ({ type: "tool_use" as const, ...call })), "tool_use");

/** An API error, shaped like Anthropic's error bodies. */
export const apiError = (status: number, type: string, message: string) => () =>
  new Response(JSON.stringify({ type: "error", error: { type, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * A real SDK client whose network is the given script: request N is answered with turn N (the last turn
 * repeats if the script runs out). `requests` records every body the app sent.
 */
export function scriptedAnthropic(turns: (() => Response)[]) {
  const requests: RecordedRequest[] = [];

  const fakeFetch = async (_url: unknown, init?: RequestInit) => {
    requests.push(JSON.parse(String(init?.body)));
    return turns[Math.min(requests.length - 1, turns.length - 1)]();
  };

  const client = new Anthropic({ apiKey: "test-key", fetch: fakeFetch as typeof fetch, maxRetries: 0 });
  return { client, requests };
}
