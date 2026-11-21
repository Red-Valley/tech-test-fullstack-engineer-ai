import Anthropic from "@anthropic-ai/sdk";
import type { ChatEvent, ChatHistory } from "@/lib/chat/events";
import { ChatRequest, describeInvalidRequest, MAX_BODY_CHARS } from "@/lib/chat/request";
import { SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { chatTools } from "@/lib/chat/tools";

// No `runtime` export: Cache Components is enabled, and route handlers run on Node.js by default.

const MODEL = "claude-opus-5-5";
/** Model calls per question (the SDK's `max_iterations` counts requests, and a tool round takes two). */
const MAX_STEPS = 6;

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "The Anthropic API rejected the API key. Check ANTHROPIC_API_KEY in .env.local.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "The Anthropic API rate limit was reached. Wait a moment and try again.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error${err.status ? ` (${err.status})` : ""}: ${err.message}`;
  }
  return err instanceof Error ? err.message : "Unexpected error.";
}

/** Runs the tool loop and reports progress through `send`. Ends with a `done` event only on a clean finish. */
async function runChat(messages: ChatHistory, signal: AbortSignal, send: (event: ChatEvent) => void) {
  const client = new Anthropic();
  const runner = client.beta.messages.toolRunner(
    {
      model: MODEL,
      // Thinking counts toward this limit, but answers here are short.
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: chatTools,
      messages,
      stream: true,
      // Send the full history every turn instead of using a server-side message thread: this route is stateless.
      thread: false,
      max_iterations: MAX_STEPS,
      output_config: { effort: "low" },
      // Drop (instead of rejecting) thinking blocks if the history ever stops matching what produced them.
      thinking: { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } },
      // If the safety classifiers decline the request on this model, retry it on the recommended fallback.
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01", "thinking-binding-controls-2026-08-01"],
    },
    { signal },
  );

  let lastStopReason: string | null = null;
  let lastTurnHadText = false;
  let sentText = false;
  for await (const turn of runner) {
    for await (const event of turn) {
      // Text before a tool call and the final answer are separate content blocks: keep them visually apart.
      if (event.type === "content_block_start" && event.content_block.type === "text" && sentText) {
        send({ type: "text", delta: "\n\n" });
      }
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        send({ type: "text", delta: event.delta.text });
        sentText = true;
      }
    }

    const message = await turn.finalMessage();
    lastStopReason = message.stop_reason;
    lastTurnHadText = message.content.some((block) => block.type === "text" && block.text.trim() !== "");
    if (message.stop_reason === "refusal") {
      return send({ type: "error", message: "The model declined to answer this request." });
    }
    if (message.stop_reason === "max_tokens") {
      return send({ type: "error", message: "The answer was cut off. Try a narrower question." });
    }
    for (const block of message.content) {
      if (block.type === "tool_use") send({ type: "tool_call", name: block.name, input: block.input });
    }
  }

  // Only a normal end of turn is a finished answer. Anything else (the step limit, a full context window) is
  // reported instead of being stored in the history as if it were complete.
  if (lastStopReason !== "end_turn") {
    return send({
      type: "error",
      message:
        lastStopReason === "tool_use"
          ? `Stopped after ${MAX_STEPS} model calls without a final answer.`
          : `The response ended early (${lastStopReason ?? "no response"}).`,
    });
  }
  // A turn that ends with thinking only would show an empty bubble and store a text-less turn in the history.
  if (!lastTurnHadText) {
    return send({ type: "error", message: "The model returned no answer. Try asking again." });
  }
  // After the loop the runner's params hold the whole conversation, including the final assistant turn.
  send({ type: "done", messages: runner.params.messages as ChatHistory });
}

/** POST /api/chat: streams newline-delimited JSON events (see lib/chat/events.ts). */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 503 },
    );
  }

  const tooLong = () => Response.json({ error: "The conversation is too long. Start a new chat." }, { status: 413 });
  // Refuse a declared oversize body before reading it. A chunked body has no length, so check after reading too.
  if (Number(request.headers.get("content-length")) > MAX_BODY_CHARS) return tooLong();
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return tooLong();

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = ChatRequest.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: describeInvalidRequest(parsed.error), issues: parsed.error.issues }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => {
        if (open) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await runChat(parsed.data.messages as ChatHistory, request.signal, send);
      } catch (err) {
        if (!request.signal.aborted) {
          console.error("chat request failed", err);
          send({ type: "error", message: describeError(err) });
        }
      } finally {
        if (open) controller.close();
        open = false;
      }
    },
    cancel() {
      open = false;
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
