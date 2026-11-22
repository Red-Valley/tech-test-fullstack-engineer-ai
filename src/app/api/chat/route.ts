import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { getGeminiModel, hasGoogleApiKey } from '@/lib/ai/provider';
import { CATALOG_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { catalogTools } from '@/lib/ai/tools';

export const runtime = 'nodejs';

/**
 * POST /api/chat
 * Native streaming AI chat endpoint backed by database tools and Google Gemini 3.8 Flash.
 * Never dumps the full database into prompts; all data is fetched via tool calls.
 */
export async function POST(req: NextRequest) {
  try {
    if (!hasGoogleApiKey()) {
      return NextResponse.json(
        {
          error:
            'Google Gemini API key is missing. Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local to enable the AI assistant.',
        },
        { status: 503 }
      );
    }

    let body: { messages?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'A messages array is required in the request body' }, { status: 400 });
    }

    // Convert UI messages into model messages compatible with streamText
    const modelMessages = await convertToModelMessages(body.messages as UIMessage[]);
    const model = getGeminiModel('gemini-3.8-flash');

    const result = streamText({
      model,
      system: CATALOG_SYSTEM_PROMPT,
      messages: modelMessages,
      tools: catalogTools,
      stopWhen: stepCountIs(5), // Multi-step tool execution limit
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during AI processing';
    console.error('POST /api/chat error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
