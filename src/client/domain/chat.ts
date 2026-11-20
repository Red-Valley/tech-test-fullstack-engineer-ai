// UI-side chat model. The AI SDK's UIMessage is mapped into this in the transformer, so the
// presentational chat components don't depend on the SDK (ARCHITECTURE.md §4.1).

/** 'stopped': the answer ended (e.g. the user pressed Stop) before this call returned. */
export type ToolCallState = 'running' | 'done' | 'error' | 'stopped';

export type ChatPart =
  | { kind: 'text'; text: string }
  | {
      kind: 'tool';
      id: string;
      name: string;
      /** The tool's input, shown as compact "key: value" pairs. */
      args: Record<string, unknown>;
      state: ToolCallState;
      errorText?: string;
    };

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: ChatPart[];
};
