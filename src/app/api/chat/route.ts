import { createAgentUIStreamResponse } from "ai";
import { agent } from "@/lib/ai/agent";
import { isAiConfigured } from "@/lib/ai/model";
import { jsonError } from "@/lib/api/http";

export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return jsonError(
      500,
      "ai_not_configured",
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key.",
    );
  }

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.messages)) {
    return jsonError(400, "invalid_json", "Body must be { messages: UIMessage[] }.");
  }

  return createAgentUIStreamResponse({
    agent,
    uiMessages: body.messages,
    abortSignal: request.signal,
    sendReasoning: false,
    onError: (error) => {
      console.error("[chat] error", error);
      return "The assistant could not finish this answer. Please try again.";
    },
  });
}
