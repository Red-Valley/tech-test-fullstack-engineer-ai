// Discriminated union for message parts emitted by Vercel AI SDK v6 via
// toUIMessageStreamResponse() and consumed by @ai-sdk/react's useChat().
//
// The shape below was captured EMPIRICALLY during the Phase 4 smoke test
// (sample message: "Compare Hollow Knight and Celeste.") rather than read
// from documentation. See /docs/decisions-log.md, entry "Empirical
// verification of parts[] discriminator shape" → "Captured evidence
// (Phase 4)" for the source JSON.
//
// Three discriminator values appear in the captured run: `step-start`,
// `tool-<toolName>` (the toolName is templated into the type field by
// the SDK), and `text`.

export interface TextPart {
  type: 'text';
  text: string;
  state?: 'streaming' | 'done';
}

export interface StepStartPart {
  type: 'step-start';
}

export type ToolPartState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error';

export interface ToolPart {
  type: `tool-${string}`;
  toolCallId: string;
  state: ToolPartState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

export type MessagePart = TextPart | StepStartPart | ToolPart;

const VALID_STATES: readonly ToolPartState[] = [
  'input-streaming',
  'input-available',
  'output-available',
  'output-error',
];

export function isToolPart(part: unknown): part is ToolPart {
  if (typeof part !== 'object' || part === null) return false;
  const p = part as Record<string, unknown>;
  return (
    typeof p.type === 'string' &&
    p.type.startsWith('tool-') &&
    typeof p.toolCallId === 'string' &&
    typeof p.state === 'string' &&
    (VALID_STATES as readonly string[]).includes(p.state)
  );
}

export function getToolName(part: ToolPart): string {
  return part.type.slice('tool-'.length);
}
