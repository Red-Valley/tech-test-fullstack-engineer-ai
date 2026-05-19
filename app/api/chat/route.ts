import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { UIMessage } from "ai";
import { getGamesRepository } from "@/lib/games/repository";
import { createGamesTools } from "@/lib/games/ai-tools";

const SYSTEM_PROMPT = `You are an assistant for an internal indie games catalog dashboard.

Use the data tools (list_games, find_game_by_title, catalog_summary) to gather facts — never guess data.

ALWAYS finish your turn by calling \`respond\` exactly once.

\`summary\` rules:
- One or two sentences of plain natural-language prose.
- No markdown formatting whatsoever: no **bold**, no *italic*, no bullet points, no asterisks, no headings, no backticks.
- Do not restate numbers that already appear in the structured \`data\` card. The card displays the values; the summary just states the answer (e.g. "Hollow Knight earns more monthly revenue than Celeste.").

\`data\` rules — choose the MOST SPECIFIC kind that fits the question:
- game — one specific game (e.g. "which game has the highest revenue?").
- games — a list of multiple games (e.g. "games rated above 4").
- comparison — two games compared on one metric (e.g. "compare X and Y on revenue"). ALWAYS use this for two-game comparisons; never fall back to text.
- count — a pure numeric answer (e.g. "how many games...").
- stats — an overview of the whole catalog.
- text — last resort, only when none of the above fit and no data is available.

Do not emit free text outside of the respond call.`;

const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const body: unknown = await req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const messages = parsed.data.messages as UIMessage[];

    const result = streamText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: createGamesTools(getGamesRepository()),
      stopWhen: stepCountIs(6),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("POST /api/chat failed:", error);
    return NextResponse.json({ error: "Chat request failed" }, { status: 500 });
  }
}
