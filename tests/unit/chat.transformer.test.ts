import { describe, expect, it } from 'vitest';
import {
  extractGameIds,
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
  ])('maps tool state %s to %s in the message being streamed', (state, expected) => {
    const [message] = toChatMessages(
      [assistant([{ type: 'tool-find_game', toolCallId: 'c1', state, input: {} }])],
      'a1',
    );
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
    const error = new Error('{"error":"The chat is not configured: set GROQ_API_KEY"}');
    expect(toChatErrorMessage(error)).toBe('The chat is not configured: set GROQ_API_KEY');
  });

  it('falls back to the plain message, and to null without an error', () => {
    expect(toChatErrorMessage(new Error('Failed to fetch'))).toBe('Failed to fetch');
    expect(toChatErrorMessage(undefined)).toBeNull();
  });
});

describe('extractGameIds', () => {
  const game = (id: number, title: string) => ({ id, title, average_rating: 4 });

  it('collects ids from query_games, find_game and compare_games outputs, once each', () => {
    const message = assistant([
      {
        type: 'tool-query_games',
        toolCallId: 'c1',
        state: 'output-available',
        output: { games: [game(1, 'A'), game(2, 'B'), game(3, 'C')], total: 9 },
      },
      {
        type: 'tool-find_game',
        toolCallId: 'c2',
        state: 'output-available',
        output: { game: game(7, 'G'), matchedBy: 'fuzzy' },
      },
      {
        type: 'tool-compare_games',
        toolCallId: 'c3',
        state: 'output-available',
        output: { games: [game(7, 'G'), game(2, 'B')], winner: 'G', ratio: 2 },
      },
      { type: 'text', text: 'done' },
    ]);
    expect(extractGameIds(message)).toEqual([1, 2, 3, 7]);
  });

  it('ignores aggregates, not-found results, running and failed calls', () => {
    const message = assistant([
      {
        type: 'tool-aggregate_games',
        toolCallId: 'a',
        state: 'output-available',
        output: { value: 9, n: 9 },
      },
      {
        type: 'tool-find_game',
        toolCallId: 'b',
        state: 'output-available',
        output: { notFound: true, suggestions: ['X'] },
      },
      { type: 'tool-query_games', toolCallId: 'c', state: 'input-available', input: {} },
      { type: 'tool-query_games', toolCallId: 'd', state: 'output-error', errorText: 'x' },
    ]);
    expect(extractGameIds(message)).toEqual([]);
  });
});

describe('tool calls that can no longer finish', () => {
  const running = assistant([
    { type: 'tool-query_games', toolCallId: 'c1', state: 'input-available', input: {} },
  ]);

  it('stay "running" in the message that is streaming', () => {
    expect(toChatMessages([running], 'a1')[0].parts[0]).toMatchObject({ state: 'running' });
  });

  it('show as "stopped" once that message is no longer streaming (e.g. after Stop)', () => {
    expect(toChatMessages([running])[0].parts[0]).toMatchObject({ state: 'stopped' });
    expect(toChatMessages([running], 'another-id')[0].parts[0]).toMatchObject({
      state: 'stopped',
    });
  });

  it('show a denied call as failed', () => {
    const denied = assistant([{ type: 'tool-find_game', toolCallId: 'c', state: 'output-denied' }]);
    expect(toChatMessages([denied])[0].parts[0]).toMatchObject({ state: 'error' });
  });
});

describe('extractGameIds on results without games', () => {
  it.each([
    [
      'compare_games unresolved',
      { unresolved: [{ title: 'X', notFound: true, suggestions: ['Y'] }] },
    ],
    ['compare_games error', { error: 'Both titles refer to the same game: A' }],
    ['aggregate_games groups', { groups: [{ genre: 'RPG', value: 205000, n: 1 }] }],
    ['find_game ambiguous', { ambiguous: true, candidates: ['Star Racer', 'Star Miner'] }],
  ])('highlights nothing for %s', (_label, output) => {
    expect(
      extractGameIds(
        assistant([{ type: 'tool-x', toolCallId: 'c', state: 'output-available', output }]),
      ),
    ).toEqual([]);
  });
});
