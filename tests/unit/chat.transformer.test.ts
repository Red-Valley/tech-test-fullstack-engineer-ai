import { describe, expect, it } from 'vitest';
import {
  toChatErrorMessage,
  toChatMessages,
  type UIMessageLike,
} from '@/client/transformers/chat.transformer';

const assistant = (parts: UIMessageLike['parts']): UIMessageLike => ({
  id: 'a1',
  role: 'assistant',
  parts,
});

describe('toChatMessages', () => {
  it('keeps text parts and maps tool parts to name, args and state', () => {
    const [message] = toChatMessages([
      assistant([
        { type: 'step-start' },
        {
          type: 'tool-query_games',
          toolCallId: 'c1',
          state: 'output-available',
          input: { sortBy: 'revenue', limit: 1 },
        },
        { type: 'text', text: 'Starfall Courier, $412,000.' },
      ]),
    ]);
    expect(message.parts).toEqual([
      {
        kind: 'tool',
        id: 'c1',
        name: 'query_games',
        args: { sortBy: 'revenue', limit: 1 },
        state: 'done',
        errorText: undefined,
      },
      { kind: 'text', text: 'Starfall Courier, $412,000.' },
    ]);
  });

  it.each([
    ['input-streaming', 'running'],
    ['input-available', 'running'],
    ['output-available', 'done'],
    ['output-error', 'error'],
    [undefined, 'running'],
  ])('maps tool state %s to %s', (state, expected) => {
    const [message] = toChatMessages([
      assistant([{ type: 'tool-find_game', toolCallId: 'c1', state, input: {} }]),
    ]);
    expect(message.parts[0]).toMatchObject({ kind: 'tool', state: expected });
  });

  it('keeps the error text of a failed tool call', () => {
    const [message] = toChatMessages([
      assistant([
        { type: 'tool-find_game', toolCallId: 'c1', state: 'output-error', errorText: 'bad input' },
      ]),
    ]);
    expect(message.parts[0]).toMatchObject({ state: 'error', errorText: 'bad input', args: {} });
  });

  it('drops system messages, empty text and parts the UI does not render', () => {
    expect(
      toChatMessages([
        { id: 's', role: 'system', parts: [{ type: 'text', text: 'hidden' }] },
        assistant([
          { type: 'reasoning', text: 'thinking' },
          { type: 'text', text: '' },
        ]),
      ]),
    ).toEqual([{ id: 'a1', role: 'assistant', parts: [] }]);
  });
});

describe('toChatErrorMessage', () => {
  it('shows the API error text instead of raw JSON (e.g. the 503 without a key)', () => {
    const error = new Error('{"error":"The chat is not configured: set ANTHROPIC_API_KEY"}');
    expect(toChatErrorMessage(error)).toBe('The chat is not configured: set ANTHROPIC_API_KEY');
  });

  it('falls back to the plain message, and to null without an error', () => {
    expect(toChatErrorMessage(new Error('Failed to fetch'))).toBe('Failed to fetch');
    expect(toChatErrorMessage(undefined)).toBeNull();
  });
});
