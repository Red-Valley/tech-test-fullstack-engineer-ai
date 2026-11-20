import type Anthropic from "@anthropic-ai/sdk";
import type { ChatEvent, ChatMessage } from "./protocol";
import type { ToolBox } from "./tools";

const DEFAULT_MAX_STEPS = 6;
const MAX_OUTPUT_TOKENS = 16000;

export interface RunChatOptions {
  client: Anthropic;
  model: string;
  system: string;
  messages: ChatMessage[];
  tools: ToolBox;
  send: (event: ChatEvent) => void;
  signal?: AbortSignal;
  /** Safety valve: how many model calls (tool rounds plus the final answer) one question may use. */
  maxSteps?: number;
}

/**
 * The tool-calling loop. Each pass streams one model response to the browser as it is generated; if the
 * model asked for tools, they are run, their results are appended, and the model is called again. It ends
 * when the model answers without asking for a tool.
 *
 * Only plain text crosses requests: the browser resends earlier questions and answers, not the lookups made
 * to produce them. That keeps the client unable to forge tool results, at the price of re-querying when a
 * follow-up needs data again (cheap here: the lookups are local).
 */
export async function runChat({
  client,
  model,
  system,
  messages,
  tools,
  send,
  signal,
  maxSteps = DEFAULT_MAX_STEPS,
}: RunChatOptions): Promise<void> {
  const conversation: Anthropic.MessageParam[] = messages.map(({ role, content }) => ({ role, content }));

  for (let step = 0; step < maxSteps; step++) {
    const stream = client.messages.stream(
      { model, max_tokens: MAX_OUTPUT_TOKENS, system, tools: tools.definitions, messages: conversation },
      { signal },
    );
    stream.on("text", (delta) => send({ type: "text", delta }));
    const message = await stream.finalMessage();

    // Check the stop reason before touching the content: a refusal or a length cut-off can leave a
    // tool_use block half-written, and a truncated tool input must never be executed.
    if (message.stop_reason === "refusal") {
      send({ type: "error", message: "The model declined to answer that request." });
      return;
    }
    if (message.stop_reason === "max_tokens") {
      send({ type: "error", message: "The answer hit the length limit and was cut off." });
      return;
    }
    if (message.stop_reason !== "tool_use") return; // the model is done

    // Keep the assistant turn exactly as returned (including any thinking blocks), then answer every
    // tool_use block in a single user message.
    conversation.push({ role: "assistant", content: message.content });

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of message.content) {
      if (block.type !== "tool_use") continue;

      send({ type: "tool_call", id: block.id, name: block.name, input: block.input });
      const { ok, output } = tools.run(block.name, block.input);
      send({ type: "tool_result", id: block.id, ok, output });

      results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output), is_error: !ok });
    }
    conversation.push({ role: "user", content: results });
  }

  send({ type: "error", message: "That needed more lookups than I'm allowed to make. Try asking something more specific." });
}
