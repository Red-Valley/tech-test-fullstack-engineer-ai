import { generateText } from 'ai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anthropicStrategy } from './anthropic';

describe('anthropicStrategy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks the API for no thinking, so the answer streams after a tool call', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('{}', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    await generateText({
      model: anthropicStrategy.createModel(anthropicStrategy.defaultModel),
      prompt: 'Hi',
      maxRetries: 0,
    }).catch(() => undefined);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { thinking?: unknown };
    expect(body.thinking).toEqual({ type: 'disabled' });
  });
});
