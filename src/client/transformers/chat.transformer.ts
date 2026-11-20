import type { ChatMessage, ChatPart, ToolCallState } from '@/client/domain/chat';

// Structural input types: just the fields of the AI SDK's UIMessage that the UI uses. Typed
// here instead of imported so transformers keep depending only on domain types (§4.1).
type UIPartLike = {
  type: string;
  text?: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  errorText?: string;
};
export type UIMessageLike = { id: string; role: string; parts: readonly UIPartLike[] };

const TOOL_STATES: Record<string, ToolCallState> = {
  'input-streaming': 'running',
  'input-available': 'running',
  'output-available': 'done',
  'output-error': 'error',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toPart(part: UIPartLike): ChatPart | null {
  if (part.type === 'text') return part.text ? { kind: 'text', text: part.text } : null;
  if (part.type.startsWith('tool-') && part.toolCallId) {
    return {
      kind: 'tool',
      id: part.toolCallId,
      name: part.type.slice('tool-'.length),
      args: isRecord(part.input) ? part.input : {},
      // Unknown or missing states (e.g. a call still being streamed) count as running.
      state: TOOL_STATES[part.state ?? ''] ?? 'running',
      errorText: part.errorText,
    };
  }
  return null; // reasoning, step markers, sources…: not shown in this UI
}

/** System messages and parts the UI doesn't render are dropped. */
export function toChatMessages(messages: readonly UIMessageLike[]): ChatMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== 'user' && message.role !== 'assistant') return [];
    const parts = message.parts.map(toPart).filter((part): part is ChatPart => part !== null);
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
