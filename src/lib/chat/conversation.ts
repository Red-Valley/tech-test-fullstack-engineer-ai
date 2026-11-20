import type { ChatEvent, ChatMessage } from "./protocol";
import { MAX_ASSISTANT_MESSAGE_LENGTH, MAX_MESSAGES } from "./request-limits";

/**
 * What the chat UI keeps in memory, and how server events turn into it. Pure and framework-free so it can
 * be unit-tested; the hook in use-chat-session.ts only adds fetch + React state around it.
 */

export interface ToolCallView {
  id: string;
  name: string;
  input: unknown;
  status: "running" | "done" | "error";
  output?: unknown;
}

/** An assistant reply is an ordered mix of text and tool calls, in the order they happened. */
export type AssistantPart = { kind: "text"; text: string } | { kind: "tool"; call: ToolCallView };

export interface UserMessage {
  id: string;
  role: "user";
  text: string;
}

export interface AssistantMessage {
  id: string;
  role: "assistant";
  parts: AssistantPart[];
  /** Set when the answer could not be completed. */
  error?: string;
}

export type UiMessage = UserMessage | AssistantMessage;

export interface ChatState {
  messages: UiMessage[];
  streaming: boolean;
}

export const initialChatState: ChatState = { messages: [], streaming: false };

let counter = 0;
const newId = () => `m${++counter}`; // not crypto.randomUUID: that is missing on plain-http LAN addresses

export const userMessage = (text: string): UserMessage => ({ id: newId(), role: "user", text });
export const emptyAssistantMessage = (): AssistantMessage => ({ id: newId(), role: "assistant", parts: [] });

/** The reply's text, with the pieces on either side of a tool call kept apart (not glued into one run-on line). */
export const assistantText = (message: AssistantMessage): string =>
  message.parts
    .flatMap((part) => (part.kind === "text" ? [part.text.trim()] : []))
    .filter(Boolean)
    .join("\n\n");

/** Folds a batch of server events into an assistant message without mutating the old one. */
export function applyEvents(message: AssistantMessage, events: ChatEvent[]): AssistantMessage {
  let parts = message.parts;
  let error = message.error;

  for (const event of events) {
    switch (event.type) {
      case "text": {
        const last = parts.at(-1);
        parts =
          last?.kind === "text"
            ? [...parts.slice(0, -1), { kind: "text", text: last.text + event.delta }]
            : [...parts, { kind: "text", text: event.delta }];
        break;
      }
      case "tool_call":
        parts = [...parts, { kind: "tool", call: { id: event.id, name: event.name, input: event.input, status: "running" } }];
        break;
      case "tool_result":
        parts = parts.map((part) =>
          part.kind === "tool" && part.call.id === event.id
            ? { kind: "tool", call: { ...part.call, status: event.ok ? "done" : "error", output: event.output } }
            : part,
        );
        break;
      case "error":
        error = event.message;
        break;
      case "done":
        break;
    }
  }
  return { ...message, parts, error };
}

export type ChatAction =
  /** A new question was asked: `messages` is the history including the empty reply that will be filled in. */
  | { type: "start"; messages: UiMessage[] }
  | { type: "events"; events: ChatEvent[] }
  | { type: "finish" }
  | { type: "fail"; message: string }
  | { type: "reset" };

function updateLastAssistant(messages: UiMessage[], update: (message: AssistantMessage) => AssistantMessage): UiMessage[] {
  const last = messages.at(-1);
  return last?.role === "assistant" ? [...messages.slice(0, -1), update(last)] : messages;
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "start":
      return { messages: action.messages, streaming: true };
    case "events":
      return { ...state, messages: updateLastAssistant(state.messages, (message) => applyEvents(message, action.events)) };
    case "finish": {
      // A reply that never got any content (Stop before the first token) is not worth keeping as an empty bubble.
      const last = state.messages.at(-1);
      const emptyReply = last?.role === "assistant" && last.parts.length === 0 && !last.error;
      return { messages: emptyReply ? state.messages.slice(0, -1) : state.messages, streaming: false };
    }
    case "fail":
      return {
        messages: updateLastAssistant(state.messages, (message) => ({ ...message, error: action.message })),
        streaming: false,
      };
    case "reset":
      return initialChatState;
  }
}

/**
 * What to tell the user when POST /api/chat was refused: the server's own explanation, plus the first
 * validation problem when there is one. Anything that is not an error object falls back to the status code.
 */
export function failureMessage(body: unknown, status: number): string {
  const fallback = `The server answered ${status}. Please try again.`;
  if (typeof body !== "object" || body === null) return fallback;

  const { error, issues } = body as { error?: unknown; issues?: unknown };
  if (typeof error !== "string" || error === "") return fallback;

  const firstIssue = Array.isArray(issues) ? (issues[0] as { message?: unknown } | undefined)?.message : undefined;
  return typeof firstIssue === "string" ? `${error}: ${firstIssue}` : error;
}

/**
 * The conversation as the API wants it: plain text only, and small enough to be accepted.
 *  - Replies that failed are left out (an answer that was cut off is not something to build on), and so
 *    are replies that produced no text.
 *  - A long chat is sent as a rolling window of the most recent messages, starting at a question.
 *  - A very long reply is trimmed; the model only needs its gist to answer a follow-up.
 */
export function toRequestMessages(messages: UiMessage[]): ChatMessage[] {
  const plain = messages.flatMap((message): ChatMessage[] => {
    if (message.role === "user") return [{ role: "user", content: message.text }];
    const content = assistantText(message).trim().slice(0, MAX_ASSISTANT_MESSAGE_LENGTH);
    return message.error || !content ? [] : [{ role: "assistant", content }];
  });

  const recent = plain.slice(-MAX_MESSAGES);
  const firstQuestion = recent.findIndex((message) => message.role === "user");
  return firstQuestion === -1 ? [] : recent.slice(firstQuestion);
}
