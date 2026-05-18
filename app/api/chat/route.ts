import { NextRequest } from "next/server";
import OpenAI from "openai";
import { toolDefinitions, runTool } from "@/lib/tools";
import type { ChatMessage } from "@/lib/types";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = new OpenAI({ apiKey: process.env.APENAI_API_KEY });

const SYSTEM = `You are an assistant for an indie games catalog dashboard.
You have access to tools to query the database.
Always use tools to get data — never make up numbers.
Be concise and direct in your answers.`;

export async function POST(req: NextRequest) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const openaiMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM },
    ...messages.map((m) => ({ role: m.role, content: m.content } as ChatCompletionMessageParam)),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await processWithTools(openaiMessages, controller, encoder);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function processWithTools(
  messages: ChatCompletionMessageParam[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  while (true) {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      tools: toolDefinitions,
      messages,
      stream: true,
    });

    let assistantText = "";
    const toolCallAccumulators: Record<string, { id: string; name: string; arguments: string }> = {};
    let finishReason: string | null = null;

    for await (const chunk of response) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      finishReason = choice.finish_reason ?? finishReason;
      const delta = choice.delta;

      if (delta.content) {
        assistantText += delta.content;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.content })}\n\n`));
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallAccumulators[idx]) {
            toolCallAccumulators[idx] = { id: tc.id ?? "", name: tc.function?.name ?? "", arguments: "" };
          }
          if (tc.id) toolCallAccumulators[idx].id = tc.id;
          if (tc.function?.name) toolCallAccumulators[idx].name = tc.function.name;
          if (tc.function?.arguments) toolCallAccumulators[idx].arguments += tc.function.arguments;
        }
      }
    }

    const toolCalls = Object.values(toolCallAccumulators);

    messages.push({
      role: "assistant",
      content: assistantText || null,
      tool_calls: toolCalls.length > 0
        ? toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          }))
        : undefined,
    });

    if (finishReason !== "tool_calls" || toolCalls.length === 0) break;

    for (const tc of toolCalls) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ tool_call: tc.name })}\n\n`));
      const input = JSON.parse(tc.arguments || "{}") as Record<string, unknown>;
      const result = runTool(tc.name, input);
      messages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }
}
