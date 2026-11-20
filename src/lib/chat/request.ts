import { z } from "zod";
import { MAX_ASSISTANT_MESSAGE_LENGTH, MAX_MESSAGES, MAX_USER_MESSAGE_LENGTH } from "./request-limits";

const content = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Messages can't be empty")
    .max(max, `Messages must be at most ${max} characters`);

/**
 * The body of POST /api/chat: the conversation so far, as plain text. The caps keep one request from being
 * used to run up an unbounded bill (there is no auth in this app).
 */
export const chatRequestSchema = z
  .object({
    messages: z
      .array(
        z.discriminatedUnion("role", [
          z.object({ role: z.literal("user"), content: content(MAX_USER_MESSAGE_LENGTH) }),
          z.object({ role: z.literal("assistant"), content: content(MAX_ASSISTANT_MESSAGE_LENGTH) }),
        ]),
      )
      .min(1, "Send at least one message")
      .max(MAX_MESSAGES, `A conversation can have at most ${MAX_MESSAGES} messages`),
  })
  // zod still runs this when `.min(1)` above has failed, so an empty list must not be indexed into
  // (it is already reported as "Send at least one message").
  .refine(({ messages }) => messages.length === 0 || (messages[0].role === "user" && messages.at(-1)?.role === "user"), {
    message: "The conversation must start and end with a user message",
    path: ["messages"],
  });
