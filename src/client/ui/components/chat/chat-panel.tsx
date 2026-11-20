import type { ReactNode } from 'react';
import { Button } from '@/client/ui/components/primitives/button';

type ChatPanelProps = {
  canClear: boolean;
  onClear: () => void;
  /** Messages, suggestions or the empty state. */
  children: ReactNode;
  error?: string | null;
  input: ReactNode;
};

/** The chat's frame: header, scrolling body, error line and input. */
export function ChatPanel({ canClear, onClear, children, error, input }: ChatPanelProps) {
  return (
    <section aria-labelledby="chat-heading" className="flex h-full min-h-[28rem] flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="chat-heading" className="text-lg font-semibold">
            Ask the catalog
          </h2>
          <p className="text-xs text-muted">Answers come from the data via tools. Read-only.</p>
        </div>
        {canClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            New chat
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
      {error && (
        <p role="alert" className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {input}
    </section>
  );
}
