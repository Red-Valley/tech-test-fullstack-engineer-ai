/**
 * Wire format between `POST /api/chat` and the browser.
 *
 * The response is a Server-Sent-Events stream: one JSON-encoded `ChatEvent` per `data:` line. The server
 * emits text as it is generated, plus a `tool_call` / `tool_result` pair for every lookup the model makes,
 * so the UI can show what the assistant is doing. No dependencies: the browser imports this too.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatEvent =
  /** A piece of the assistant's answer text. */
  | { type: "text"; delta: string }
  /** The model asked to run a tool. */
  | { type: "tool_call"; id: string; name: string; input: unknown }
  /** The tool finished. `output` is the result, or `{ error }` when `ok` is false. */
  | { type: "tool_result"; id: string; ok: boolean; output: unknown }
  /** The answer could not be completed. `message` is safe to show to the user. */
  | { type: "error"; message: string }
  /** Always the last event. */
  | { type: "done" };

export const encodeEvent = (event: ChatEvent): string => `data: ${JSON.stringify(event)}\n\n`;

/**
 * Returns a function to feed decoded text chunks into. `onEvent` is called once per complete event,
 * however the network happened to split the bytes. A malformed event is skipped, not fatal.
 */
export function createEventParser(onEvent: (event: ChatEvent) => void): (chunk: string) => void {
  let buffer = "";

  return (chunk) => {
    buffer += chunk;

    for (let end = buffer.indexOf("\n\n"); end !== -1; end = buffer.indexOf("\n\n")) {
      const rawEvent = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);

      const data = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice("data:".length).trimStart())
        .join("\n");
      if (!data) continue;

      try {
        onEvent(JSON.parse(data) as ChatEvent);
      } catch {
        // ignore a malformed event rather than breaking the whole stream
      }
    }
  };
}
