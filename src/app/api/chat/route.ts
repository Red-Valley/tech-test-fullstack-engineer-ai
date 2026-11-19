import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCatalogAgent, resolveLLMConfig } from '@/lib/ai/agent';
import type { ChatStreamEvent } from '@/types/game';

export const runtime = 'nodejs';

const ChatRequestSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string().trim().min(1, 'Message content cannot be empty'),
            }),
        )
        .min(1, 'At least one message is required'),
    model: z.string().optional(),
});

function encodeSseEvent(event: ChatStreamEvent): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function sseHeaders(): HeadersInit {
    return {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
    };
}

function extractTextContent(content: unknown): string {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === 'string') return part;
                if (
                    part &&
                    typeof part === 'object' &&
                    'text' in part &&
                    typeof (part as { text: unknown }).text === 'string'
                ) {
                    return (part as { text: string }).text;
                }
                return '';
            })
            .join('');
    }
    return '';
}

function serializeToolOutput(output: unknown): string {
    if (typeof output === 'string') {
        return output;
    }
    if (output && typeof output === 'object' && 'content' in output) {
        const text = extractTextContent((output as { content: unknown }).content);
        if (text) return text;
    }
    try {
        return JSON.stringify(output);
    } catch {
        return String(output);
    }
}

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            {
                error: 'Invalid chat request',
                issues: parsed.error.flatten().fieldErrors,
            },
            { status: 400 },
        );
    }

    const config = resolveLLMConfig(parsed.data.model);
    if (!config) {
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(
                    encodeSseEvent({
                        type: 'error',
                        message:
                            'No Google AI API key is configured. Add GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) to .env.local and restart the dev server.',
                    }),
                );
                controller.close();
            },
        });
        return new Response(stream, { headers: sseHeaders() });
    }

    const lcMessages = parsed.data.messages.map((m) =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
    );

    const agent = createCatalogAgent(config);

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                const eventStream = agent.streamEvents({ messages: lcMessages }, { version: 'v2' });

                for await (const event of eventStream) {
                    if (event.event === 'on_tool_start') {
                        controller.enqueue(
                            encodeSseEvent({
                                type: 'tool_start',
                                id: event.run_id,
                                name: event.name,
                                input: event.data?.input ?? {},
                            }),
                        );
                    } else if (event.event === 'on_tool_end') {
                        controller.enqueue(
                            encodeSseEvent({
                                type: 'tool_end',
                                id: event.run_id,
                                name: event.name,
                                output: serializeToolOutput(event.data?.output),
                            }),
                        );
                    } else if (event.event === 'on_chat_model_stream') {
                        const text = extractTextContent(event.data?.chunk?.content);
                        if (text.length > 0) {
                            controller.enqueue(
                                encodeSseEvent({
                                    type: 'token',
                                    content: text,
                                }),
                            );
                        }
                    }
                }

                controller.enqueue(
                    encodeSseEvent({
                        type: 'done',
                        model: config.model,
                    }),
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unexpected agent error';
                controller.enqueue(
                    encodeSseEvent({
                        type: 'error',
                        message,
                    }),
                );
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, { headers: sseHeaders() });
}
