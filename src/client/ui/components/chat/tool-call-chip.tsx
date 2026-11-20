import type { ToolCallState } from '@/client/domain/chat';
import { cn } from '@/client/lib/cn';

type ToolCallChipProps = {
  name: string;
  args: Record<string, unknown>;
  state: ToolCallState;
  errorText?: string;
};

const STATE_LABEL: Record<ToolCallState, string> = {
  running: 'running',
  done: 'done',
  error: 'failed',
  stopped: 'stopped',
};

const formatArgs = (args: Record<string, unknown>) =>
  Object.entries(args)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(', ');

/** One tool call: its name, arguments and state, so the user can see how an answer was found. */
export function ToolCallChip({ name, args, state, errorText }: ToolCallChipProps) {
  const argText = formatArgs(args);
  return (
    <div
      className={cn(
        'flex max-w-full items-center gap-2 rounded-md border px-2 py-1 font-mono text-xs',
        state === 'error' ? 'border-danger text-danger' : 'border-border text-muted',
      )}
      title={errorText ?? argText}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2 shrink-0 rounded-full',
          state === 'running' && 'animate-pulse bg-accent',
          state === 'done' && 'bg-success',
          state === 'error' && 'bg-danger',
          state === 'stopped' && 'bg-muted',
        )}
      />
      <span className="shrink-0 font-medium text-foreground">{name}</span>
      {argText && <span className="truncate">{argText}</span>}
      <span className="ml-auto shrink-0">{STATE_LABEL[state]}</span>
    </div>
  );
}
