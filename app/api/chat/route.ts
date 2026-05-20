import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type LanguageModel,
  type UIMessage,
} from 'ai';
import { NextResponse } from 'next/server';
import { chatTools } from './tools';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a data assistant for an indie games catalog. You answer questions about the catalog by calling the provided tools. You never invent data: if a tool returns no results, say so explicitly.

Tool selection rules:
- For questions about counts or list scopes ("how many games...", "list all..."), call listGames.
- For ranking, filtering by metric, or "top N" questions, call queryGames.
- For questions referring to a specific game by title (e.g., "Hollow Knight", "tell me about Celeste"), first call getGameByTitle to resolve the title to a game record. If the result is { notFound: true }, surface the suggestions to the user and ask which one they meant.
- For aggregate questions ("average rating across X", "total revenue", "max downloads"), call aggregateGames.
- For comparisons between two named games, call getGameByTitle twice in the same step to resolve both titles, then present a structured side-by-side comparison.

Response style:
- Be concise. One short paragraph for simple answers, a brief structured list for comparisons or rankings.
- Format currency as USD with thousands separators (e.g., $120,000).
- Format ratings to one decimal place.
- Never include raw tool output verbatim; phrase the answer naturally for a human reader.
- If a tool returns a structured error object ({ error, reason }), explain the issue plainly to the user without exposing internal details.

Constraints:
- Do not assume catalog state beyond what tools return.
- Do not call write operations: there are none, and the catalog is mutated only through the dashboard UI.
- Do not chain more than 5 tool calls in a single response (the runtime enforces this).`;

type ProviderResolution =
  | { ok: true; model: LanguageModel }
  | {
      ok: false;
      status: 503;
      body: { error: string; provider: string };
    };

function resolveProvider(): ProviderResolution {
  const requested = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
  if (requested === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        ok: false,
        status: 503,
        body: { error: 'PROVIDER_NOT_CONFIGURED', provider: 'anthropic' },
      };
    }
    return { ok: true, model: anthropic('claude-sonnet-4-5') }; // latest as of May 2026; update if SDK rejects
  }
  if (requested === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      return {
        ok: false,
        status: 503,
        body: { error: 'PROVIDER_NOT_CONFIGURED', provider: 'openai' },
      };
    }
    return { ok: true, model: openai('gpt-4o-mini') }; // latest as of May 2026; update if SDK rejects
  }
  return {
    ok: false,
    status: 503,
    body: { error: 'PROVIDER_NOT_CONFIGURED', provider: requested },
  };
}

export async function POST(request: Request): Promise<Response> {
  const provider = resolveProvider();
  if (!provider.ok) {
    return NextResponse.json(provider.body, { status: provider.status });
  }

  let messages: UIMessage[];
  try {
    const body = (await request.json()) as { messages: UIMessage[] };
    messages = body.messages;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    // convertToModelMessages is ASYNC in v6 (returns Promise<ModelMessage[]>);
    // older SDK versions were sync. Forgetting the await silently breaks the
    // stream because streamText receives a Promise where it expects an array.
    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: provider.model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: chatTools,
      stopWhen: stepCountIs(5),
      onError: ({ error }) => {
        console.error('[streamText onError]', error);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown upstream error';
    return NextResponse.json(
      { error: 'PROVIDER_UPSTREAM', detail },
      { status: 502 },
    );
  }
}
