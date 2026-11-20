import { handle, HttpError, parseBody } from "@/lib/api";
import { runChat } from "@/lib/chat/agent";
import { getClient, getModel, hasCredentials } from "@/lib/chat/anthropic";
import { chatRequestSchema } from "@/lib/chat/request";
import { eventStreamResponse } from "@/lib/chat/stream";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { createToolBox } from "@/lib/chat/tools";
import { getGames } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat  { messages: [{ role, content }] }
 * Answers with a Server-Sent-Events stream of ChatEvents (see lib/chat/protocol.ts).
 */
export const POST = handle(async (request: Request) => {
  const { messages } = await parseBody(chatRequestSchema, request);

  if (!hasCredentials()) {
    throw new HttpError(503, "The AI chat isn't configured yet. Set ANTHROPIC_API_KEY in .env.local and restart the server.");
  }

  const games = getGames();
  return eventStreamResponse(
    (send, signal) =>
      runChat({
        client: getClient(),
        model: getModel(),
        system: buildSystemPrompt(games.summary()),
        messages,
        tools: createToolBox(games),
        send,
        signal,
      }),
    request.signal,
  );
});
