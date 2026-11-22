// An offline stand-in for the Anthropic Messages API, so the chat can be run and tested without API credits.
//
// It speaks the real streaming (SSE) protocol, so the actual chat route, tool runner, tools, SQLite database,
// NDJSON stream, and UI all run for real. Only the model is fake. It understands the three sample questions on
// the chat page: it asks for a tool call, then writes an answer computed from the tool's real result.
//
//   npm run mock:anthropic    start it alone on MOCK_PORT (default 4010)
//   npm run dev:mock          start it together with the Next.js dev server
//
// It proves the plumbing works. It cannot show how the real model chooses tool arguments or words an answer.

import http from "node:http";
import { pathToFileURL } from "node:url";

/**
 * @typedef {object} MockOptions
 * @property {number} [port] Port to listen on. 0 (the default) picks a free one.
 * @property {{ status: number, message: string }} [failWith] Answer every request with this Anthropic-style error.
 */

/**
 * @typedef {object} MockRequest
 * @property {string | undefined} beta The `anthropic-beta` header.
 * @property {any} body The parsed request body.
 */

/** @param {any[]} events */
const sse = (events) => events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");

const usd = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

/** The most recent user text in a conversation (skipping tool results). */
function questionOf(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    const text = m.content.find((b) => b.type === "text");
    if (text) return text.text;
  }
  return "";
}

/** The tool result the last user message carries, if any. */
function toolResultOf(messages) {
  const last = messages.at(-1);
  if (last?.role !== "user" || !Array.isArray(last.content)) return null;
  const block = last.content.find((b) => b.type === "tool_result");
  if (!block) return null;
  const raw = typeof block.content === "string" ? block.content : block.content.map((c) => c.text).join("");
  return { isError: Boolean(block.is_error), raw };
}

/** What the mock does for a question: a tool call, then an answer built from that tool's result. */
function planFor(question) {
  const q = question.toLowerCase();
  if (q.includes("most revenue")) {
    return {
      call: { name: "query_games", input: { sort_by: "monthly_revenue_usd", order: "desc", limit: 1 } },
      answer: (d) => `${d.games[0].title} made the most revenue last month: ${usd(d.games[0].monthly_revenue_usd)}.`,
    };
  }
  if (q.includes("rated above 4")) {
    return {
      call: { name: "aggregate_games", input: { metric: "count", filters: { numeric: [{ field: "average_rating", op: ">", value: 4 }] } } },
      answer: (d) => `${d.rows[0].value} games are rated above 4.`,
    };
  }
  const compare = question.match(/compare revenue of (.+?) vs (.+?)\.?$/i);
  if (compare) {
    return {
      call: { name: "query_games", input: { filters: { titles: [compare[1], compare[2]] }, sort_by: "monthly_revenue_usd", order: "desc" } },
      answer: (d) => d.games.map((g) => `${g.title}: ${usd(g.monthly_revenue_usd)}`).join("; ") + ".",
    };
  }
  return null;
}

/**
 * Builds a streaming reply from content blocks.
 * @param {string} id
 * @param {any[]} blocks
 * @param {"end_turn" | "tool_use"} stopReason
 */
function streamReply(id, blocks, stopReason) {
  const events = [
    {
      type: "message_start",
      message: { id, type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } },
    },
  ];
  blocks.forEach((block, index) => {
    if (block.type === "thinking") {
      events.push({ type: "content_block_start", index, content_block: { type: "thinking", thinking: "", signature: "" } });
      events.push({ type: "content_block_delta", index, delta: { type: "signature_delta", signature: `mock-signature-${id}` } });
    } else if (block.type === "text") {
      events.push({ type: "content_block_start", index, content_block: { type: "text", text: "" } });
      for (const word of block.text.match(/\S+\s*/g) ?? []) {
        events.push({ type: "content_block_delta", index, delta: { type: "text_delta", text: word } });
      }
    } else if (block.type === "tool_use") {
      const json = JSON.stringify(block.input);
      events.push({ type: "content_block_start", index, content_block: { type: "tool_use", id: `toolu_${id}`, name: block.name, input: {} } });
      events.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: json.slice(0, 10) } });
      events.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: json.slice(10) } });
    }
    events.push({ type: "content_block_stop", index });
  });
  events.push({ type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 20 } });
  events.push({ type: "message_stop" });
  return sse(events);
}

/**
 * Starts the mock server.
 * @param {MockOptions} [options]
 * @returns {Promise<{ url: string, requests: MockRequest[], close: () => Promise<void> }>}
 */
export async function startMockAnthropic({ port = 0, failWith } = {}) {
  /** @type {MockRequest[]} */
  const requests = [];
  let counter = 0;

  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) {
      res.writeHead(404).end();
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    requests.push({ beta: /** @type {string | undefined} */ (req.headers["anthropic-beta"]), body });

    const id = `mock_${++counter}`;
    if (failWith) {
      res.writeHead(failWith.status, { "content-type": "application/json", "request-id": `req_${id}` });
      res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: failWith.message } }));
      return;
    }

    res.writeHead(200, { "content-type": "text/event-stream", "request-id": `req_${id}` });
    const plan = planFor(questionOf(body.messages));
    const result = toolResultOf(body.messages);
    if (plan && result) {
      const text = result.isError ? `The tool returned an error: ${result.raw}` : plan.answer(JSON.parse(result.raw));
      res.end(streamReply(id, [{ type: "text", text }], "end_turn"));
    } else if (plan) {
      res.end(
        streamReply(id, [{ type: "thinking" }, { type: "text", text: "Mock model: checking the catalog." }, { type: "tool_use", ...plan.call }], "tool_use"),
      );
    } else {
      const text = "Mock model: this is the offline mock. It only understands the three sample questions on the chat page.";
      res.end(streamReply(id, [{ type: "text", text }], "end_turn"));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(undefined));
  });
  const address = /** @type {import("node:net").AddressInfo} */ (server.address());

  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

// Run directly (`npm run mock:anthropic`): listen until stopped.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.MOCK_PORT ?? 4010);
  try {
    const mock = await startMockAnthropic({ port });
    console.log(`Mock Anthropic API listening on ${mock.url}`);
    console.log("Point the app at it with ANTHROPIC_BASE_URL and any ANTHROPIC_API_KEY, or run `npm run dev:mock`.");
  } catch (err) {
    console.error(err && err.code === "EADDRINUSE" ? `Port ${port} is in use. Set MOCK_PORT to another port.` : err);
    process.exit(1);
  }
}
