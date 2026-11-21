import { z } from "zod";

export const MAX_MESSAGES = 200;
/** A guard against huge bodies on an endpoint that spends the server's API key. */
export const MAX_BODY_CHARS = 512 * 1024;
/** Every block type this server's own configuration can produce, and so every one the browser may send back. */
export const BLOCK_TYPES = ["text", "thinking", "redacted_thinking", "tool_use", "tool_result", "fallback"] as const;

/**
 * The browser sends back the conversation it received in the previous `done` event, plus the new user turn.
 * The server keeps no state. Content blocks are passed through untouched, because the API ties thinking
 * blocks to the exact conversation that produced them.
 */
export const ChatRequest = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.union([z.string(), z.array(z.looseObject({ type: z.enum(BLOCK_TYPES) }))]),
        }),
      )
      .min(1)
      .max(MAX_MESSAGES, "The conversation is too long. Start a new chat."),
  })
  .refine((body) => body.messages.at(-1)?.role === "user", { message: "The last message must be a user message" });

/** The first problem of an invalid request, worded for the person using the chat. */
export function describeInvalidRequest(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid chat request";
  // A block with an unknown `type` fails the whole union, which Zod reports as a bare "Invalid input".
  return issue.code === "invalid_union" ? "The conversation contains a message block this server does not accept." : issue.message;
}
