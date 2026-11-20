import type { ChatMessage, ChatPart, ToolCallState } from '@/client/domain/chat';

// Structural input types: just the fields of the AI SDK's UIMessage that the UI uses. Typed
// here instead of imported so transformers keep depending only on domain types (§4.1).
type UIPartLike = {
  type: string;
  text?: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};
export type UIMessageLike = { id: string; role: string; parts: readonly UIPartLike[] };

const TOOL_STATES: Record<string, ToolCallState> = {
  'input-streaming': 'running',
  'input-available': 'running',
  'output-available': 'done',
  'output-error': 'error',
  'output-denied': 'error',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toPart(part: UIPartLike, isLive: boolean): ChatPart | null {
  if (part.type === 'text') return part.text ? { kind: 'text', text: part.text } : null;
  if (part.type.startsWith('tool-') && part.toolCallId) {
    return {
      kind: 'tool',
      id: part.toolCallId,
      name: part.type.slice('tool-'.length),
      args: isRecord(part.input) ? part.input : {},
      state: toolState(part.state, isLive),
      errorText: part.errorText,
    };
  }
  // Not shown: reasoning, step markers, sources, and `dynamic-tool` parts (none of this app's
  // tools are dynamic; render them here if one is ever added).
  return null;
}

function toolState(state: string | undefined, isLive: boolean): ToolCallState {
  const mapped = TOOL_STATES[state ?? ''] ?? 'running';
  // A call can only still be running in the message that is streaming right now. Anywhere
  // else (e.g. after Stop) it would pulse "running" forever, so it is shown as stopped.
  return mapped === 'running' && !isLive ? 'stopped' : mapped;
}

/**
 * System messages and parts the UI doesn't render are dropped. `streamingMessageId` is the
 * message currently being streamed, if any; tool calls elsewhere can't still be running.
 */
export function toChatMessages(
  messages: readonly UIMessageLike[],
  streamingMessageId?: string,
): ChatMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== 'user' && message.role !== 'assistant') return [];
    const isLive = message.id === streamingMessageId;
    const parts = message.parts
      .map((part) => toPart(part, isLive))
      .filter((part): part is ChatPart => part !== null);
    return [{ id: message.id, role: message.role, parts }];
  });
}

/**
 * useChat reports HTTP failures with the response body as the message. Our API sends
 * { error: "..." }; show that text instead of raw JSON.
 */
export function toChatErrorMessage(error: Error | undefined): string | null {
  if (!error) return null;
  try {
    const body: unknown = JSON.parse(error.message);
    if (isRecord(body) && typeof body.error === 'string') return body.error;
  } catch {
    // Not JSON: fall through to the message itself.
  }
  return error.message || 'Something went wrong. Please try again.';
}

const gameIdOf = (value: unknown): number[] =>
  isRecord(value) && typeof value.id === 'number' && typeof value.title === 'string'
    ? [value.id]
    : [];

/**
 * Ids of the games an answer's tools returned: query_games and compare_games give `games`,
 * find_game gives `game`. Aggregates and not-found results contribute nothing. The table
 * highlights these rows (ARCHITECTURE.md §4.5).
 */
export function extractGameIds(message: UIMessageLike): number[] {
  const ids = message.parts.flatMap((part) => {
    if (!part.type.startsWith('tool-') || part.state !== 'output-available') return [];
    const output = part.output;
    if (!isRecord(output)) return [];
    const games = Array.isArray(output.games) ? output.games : [];
    return [...games.flatMap(gameIdOf), ...gameIdOf(output.game)];
  });
  return [...new Set(ids)];
}
