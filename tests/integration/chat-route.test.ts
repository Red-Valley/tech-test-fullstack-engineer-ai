import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatHandler, MISSING_KEY_MESSAGE } from '@/server/ai/chat';
import { createTools } from '@/server/ai/tools';
import { openDatabase } from '@/server/db/client';
import { createGamesRepository } from '@/server/repositories/games.repository';
import { createGamesService } from '@/server/services/games.service';
import { GAMES_FIXTURE } from '../fixtures/games.fixture';

// Level 2 (ARCHITECTURE.md §7.2): the real route wiring with the SDK's mock model.
// No API key, no network: runs in CI.

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

/** Step 1: the model asks for query_games. Step 2: it answers in several text chunks. */
const scriptedModel = () =>
  new MockLanguageModelV4({
    doStream: [
      {
        stream: simulateReadableStream({
          chunks: [
            {
              type: 'tool-call',
              toolCallId: 'call-1',
              toolName: 'query_games',
              input: JSON.stringify({ sortBy: 'revenue', order: 'desc', limit: 1 }),
            },
            { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
          ],
        }),
      },
      {
        stream: simulateReadableStream({
          chunkDelayInMs: 5,
          chunks: [
            { type: 'text-start', id: 't1' },
            { type: 'text-delta', id: 't1', delta: 'Lantern Drift ' },
            { type: 'text-delta', id: 't1', delta: 'made the most: ' },
            { type: 'text-delta', id: 't1', delta: '$310,000.' },
            { type: 'text-end', id: 't1' },
            { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
          ],
        }),
      },
    ],
  });

const userMessage = (text: string) => ({
  id: 'm1',
  role: 'user',
  parts: [{ type: 'text', text }],
});

const post = (body: unknown) =>
  new Request('http://test/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

/** Reads the SSE body, counting network chunks and collecting the JSON events. */
async function readStream(response: Response) {
  if (!response.body) throw new Error('expected a streamed body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let chunks = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks++;
    raw += decoder.decode(value, { stream: true });
  }
  const events = raw
    .split('\n')
    .filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]')
    .map((line) => JSON.parse(line.slice(6)) as { type: string } & Record<string, unknown>);
  return { chunks, events };
}

let model: MockLanguageModelV4;
let handler: ReturnType<typeof createChatHandler>;

beforeEach(() => {
  const repo = createGamesRepository(openDatabase(':memory:'));
  repo.createMany(GAMES_FIXTURE);
  model = scriptedModel();
  handler = createChatHandler({
    hasKey: () => true,
    getModel: () => model,
    getTools: () => createTools(createGamesService(repo)),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('POST /api/chat with a tool call', () => {
  it('runs the tool and sends its result back to the model', async () => {
    const response = await handler(post({ messages: [userMessage('Top revenue last month?')] }));
    const { events } = await readStream(response);

    const toolOutput = events.find((e) => e.type === 'tool-output-available');
    expect(toolOutput).toMatchObject({
      toolCallId: 'call-1',
      output: { total: 18, games: [{ title: 'Lantern Drift', monthly_revenue_usd: 310000 }] },
    });

    // Second model call: its prompt must contain the tool result from the real catalog.
    expect(model.doStreamCalls).toHaveLength(2);
    const secondPrompt = JSON.stringify(model.doStreamCalls[1].prompt);
    expect(secondPrompt).toContain('tool-result');
    expect(secondPrompt).toContain('Lantern Drift');
  });

  it('streams the answer: an event stream whose text arrives in several chunks', async () => {
    const response = await handler(post({ messages: [userMessage('Top revenue last month?')] }));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const { chunks, events } = await readStream(response);
    const deltas = events.filter((e) => e.type === 'text-delta').map((e) => e.delta);
    expect(deltas).toEqual(['Lantern Drift ', 'made the most: ', '$310,000.']);
    expect(chunks).toBeGreaterThan(1);
  });

  it('sends the system prompt and the tools to the model', async () => {
    await readStream(await handler(post({ messages: [userMessage('hi')] })));
    const firstCall = model.doStreamCalls[0];
    expect(JSON.stringify(firstCall.prompt)).toContain('indie games');
    expect(firstCall.tools?.map((t) => t.name).sort()).toEqual([
      'aggregate_games',
      'compare_games',
      'find_game',
      'query_games',
    ]);
  });

  it('hides model errors behind a generic message in the stream', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    model = new MockLanguageModelV4({
      doStream: async () => {
        throw new Error('upstream secret detail');
      },
    });
    const { events } = await readStream(await handler(post({ messages: [userMessage('hi')] })));
    const error = events.find((e) => e.type === 'error');
    expect(error).toMatchObject({
      errorText: 'The assistant ran into a problem. Please try again.',
    });
    expect(JSON.stringify(events)).not.toContain('secret');
  });
});

describe('POST /api/chat request checks', () => {
  it('returns 503 with a clear message when ANTHROPIC_API_KEY is missing', async () => {
    const noKey = createChatHandler({
      hasKey: () => false,
      getModel: () => model,
      getTools: () => {
        throw new Error('must not be reached');
      },
    });
    const response = await noKey(post({ messages: [userMessage('hi')] }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: MISSING_KEY_MESSAGE });
  });

  it('the real route also answers 503 when the env var is empty', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const { POST } = await import('@/app/api/chat/route');
    const response = await POST(post({ messages: [userMessage('hi')] }));
    expect(response.status).toBe(503);
  });

  it.each([
    ['malformed JSON', '{oops'],
    ['no messages field', { prompt: 'hi' }],
    ['an empty messages array', { messages: [] }],
    ['messages that are not UI messages', { messages: [{ foo: 'bar' }] }],
  ])('returns 400 for %s', async (_label, body) => {
    const response = await handler(post(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('error');
    expect(model.doStreamCalls).toHaveLength(0);
  });
});

describe('POST /api/chat conversation history', () => {
  it('accepts a follow-up whose history has a stopped (incomplete) tool call', async () => {
    const history = [
      userMessage('Top revenue?'),
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          // The user pressed Stop while this tool call was running: input but no output.
          {
            type: 'tool-query_games',
            toolCallId: 'stopped-call',
            state: 'input-available',
            input: { sortBy: 'revenue', order: 'desc', limit: 1 },
          },
        ],
      },
      { ...userMessage('Try again please'), id: 'm2' },
    ];
    const response = await handler(post({ messages: history }));
    const { events } = await readStream(response);
    expect(events.find((e) => e.type === 'error')).toBeUndefined();
    expect(events.some((e) => e.type === 'text-delta')).toBe(true);
  });
});

describe('POST /api/chat step limit', () => {
  it('stops after 5 model steps even if the model keeps calling tools', async () => {
    const toolStep = () => ({
      stream: simulateReadableStream({
        chunks: [
          {
            type: 'tool-call' as const,
            toolCallId: `call-${Math.random()}`,
            toolName: 'query_games',
            input: '{}',
          },
          {
            type: 'finish' as const,
            finishReason: { unified: 'tool-calls' as const, raw: undefined },
            usage,
          },
        ],
      }),
    });
    model = new MockLanguageModelV4({ doStream: async () => toolStep() });
    await readStream(await handler(post({ messages: [userMessage('loop forever')] })));
    expect(model.doStreamCalls).toHaveLength(5);
  });
});
