import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { z } from "zod";
import { getGames } from "../../../lib/games";

export const runtime = "nodejs";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(request: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response("Missing OPENROUTER_API_KEY", { status: 500 });
  }

  try {
    const { messages } = await request.json();

    const result = streamText({
      model: openrouter("nex-agi/nex-n2-pro:free"),
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(3),
      system: `You are a helpful assistant for an indie games catalog dashboard.
Rules:
- ALWAYS call get_game_catalog first before answering any question about games.
- NEVER explain that you are going to call a tool, just call it directly.
- Answer concisely and directly based on the data returned by the tool.
- Do not narrate your process, just provide the answer.`,
      tools: {
        get_game_catalog: tool({
          description:
            "Get the complete catalog of indie games with title, genre, monthly_revenue_usd, monthly_downloads, and average_rating.",
          inputSchema: z.object({}),
          execute: async () => {
            return await getGames();
          },
        }),
      },
      onError: (error) => {
        console.error("[streamText error]", error);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[Chat POST error]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}