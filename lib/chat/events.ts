import type Anthropic from "@anthropic-ai/sdk";

/** The conversation as the Messages API sees it. The client stores it opaquely and replays it unchanged. */
export type ChatHistory = Anthropic.Beta.Messages.BetaMessageParam[];

/** One newline-delimited JSON event of the `/api/chat` response stream. */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; name: string; input: unknown }
  | { type: "done"; messages: ChatHistory }
  | { type: "error"; message: string };
